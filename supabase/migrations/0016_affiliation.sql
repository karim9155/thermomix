-- ============================================================
-- INOCASA / Thermomix Tunisie — advisors phase 4: affiliate links
-- Run this AFTER 0015_remuneration.sql.
-- ============================================================

-- An advisor shares /parrainage/<code>. Opening it records a click and
-- leaves the code in a cookie; the customer then shops as usual, and the
-- order is attributed to the advisor when the server saves it (domain I).
--
-- Rules agreed for this shop:
--   * the LAST link opened wins;
--   * attribution is PERMANENT: once a customer account is linked to an
--     advisor it stays linked (until another advisor's link is opened),
--     on every device, with no expiry window;
--   * an advisor is never attributed their own purchases.

-- ---------- CLICKS ----------
-- One row per opening of a link (I4, I8). visitor_id is a random id kept
-- in its own cookie, so repeated openings from one browser count as one
-- visitor in the conversion rate.

create table if not exists affiliate_clicks (
  id          bigint generated always as identity primary key,
  advisor_id  uuid not null references advisors(user_id) on delete cascade,
  visitor_id  text not null,
  landing     text,
  created_at  timestamptz not null default now()
);

create index if not exists affiliate_clicks_advisor_idx on affiliate_clicks (advisor_id, created_at desc);

alter table affiliate_clicks enable row level security;
-- Intentionally no policies — service-role only.

-- ---------- CUSTOMER ATTRIBUTION ----------
-- Which advisor a customer account belongs to. What makes attribution
-- permanent: the cookie only has to survive until the customer signs in
-- once, then the link lives here.
--
-- clicked_at is when the winning link was opened, so a click synced late
-- (from a second device) can't overwrite a newer one: last click wins by
-- click time, not by sync time.

create table if not exists customer_attributions (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  advisor_id  uuid not null references advisors(user_id) on delete cascade,
  source      text not null default 'lien' check (source in ('lien', 'admin')),
  clicked_at  timestamptz not null,
  updated_at  timestamptz not null default now()
);

create index if not exists customer_attributions_advisor_idx on customer_attributions (advisor_id);

alter table customer_attributions enable row level security;
-- Intentionally no policies — service-role only.

-- ---------- ORDERS ----------
-- How a WEB order got its advisor: through a link, or reassigned by the
-- admin (I9). Advisor order forms don't need it — the advisor wrote them.

alter table orders
  add column if not exists attribution_source text;

alter table orders
  drop constraint if exists orders_attribution_source_check;
alter table orders
  add constraint orders_attribution_source_check
  check (attribution_source is null or attribution_source in ('lien', 'admin'));

-- ---------- LAST-CLICK UPSERT ----------
/**
 * Records that a customer followed an advisor's link at p_clicked_at.
 * Keeps whichever click is most recent, and never attributes an advisor
 * to themselves. Returns the advisor the customer ends up attributed to.
 *
 * In the database so the comparison and the write are one statement —
 * two devices syncing at once can't both win.
 */
create or replace function record_customer_attribution(
  p_user uuid,
  p_advisor uuid,
  p_clicked_at timestamptz
)
returns uuid language plpgsql as $$
declare
  result uuid;
begin
  if p_user = p_advisor then
    select advisor_id into result from customer_attributions where user_id = p_user;
    return result;
  end if;

  insert into customer_attributions (user_id, advisor_id, source, clicked_at)
  values (p_user, p_advisor, 'lien', p_clicked_at)
  on conflict (user_id) do update
     set advisor_id = excluded.advisor_id,
         source     = 'lien',
         clicked_at = excluded.clicked_at,
         updated_at = now()
   where customer_attributions.clicked_at < excluded.clicked_at;

  select advisor_id into result from customer_attributions where user_id = p_user;
  return result;
end;
$$;

revoke all on function record_customer_attribution(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function record_customer_attribution(uuid, uuid, timestamptz) to service_role;
