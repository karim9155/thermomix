# Task list — INOCASA boutique

Five independent tasks. **Do them one at a time**, in order, committing after each.
Do not start the next task until the previous one is committed and its checks pass.

## Before you start

```bash
git clone <repo> && cd boutique-main
pnpm install
cp .env.example .env.local   # ask Karim for the real values
pnpm dev
```

Read `AGENTS.md` first. **This is Next.js 16 and it has breaking changes from
older versions** — when you touch routing, images, or config, read the relevant
guide in `node_modules/next/dist/docs/` instead of relying on memory.

Facts that apply to every task:

- Styling is **plain CSS in `app/globals.css`** — no CSS modules, no styled
  components. Follow the existing class-name style (`kebab-case`, e.g.
  `.admin-stat-grid`).
- Responsive breakpoints live in one block at the **bottom** of `globals.css`:
  `1100px` (tablet), `760px` (phone), `420px` (small phone). Add mobile rules
  there, not scattered through the file.
- DB migrations are numbered and additive in `supabase/migrations/`. The last
  one is `0004_admin_rls.sql`, so your next is `0005_...`. **Never edit an
  existing migration** — they have already been run.
- Run each migration by hand in the Supabase SQL editor. There is no migration CLI.
- Admin auth already uses Supabase Auth (`auth.uid()`), see
  `lib/supabase/admin-auth.ts` and `lib/admin/guard.ts`. Follow that pattern.
- After every task: `npx tsc --noEmit` must exit 0.

---

## Task 1 — Merge the admin dashboard and Livraisons into one "Commandes" page

Right now the admin has two separate pages that belong together. Merge them.

**Current state**
- `app/admin-r/(dashboard)/page.tsx` — stat cards (`getDashboardStats()`)
- `app/admin-r/(dashboard)/livraisons/page.tsx` — order list (`<LivraisonsTable>`)
- `app/admin-r/(dashboard)/livraisons/[reference]/page.tsx` — single order detail
- Nav lives in `components/admin/admin-shell.tsx` → `NAV_ITEMS`

**What to do**

1. Make the index page (`app/admin-r/(dashboard)/page.tsx`) render **both**:
   the stat cards it already has, then the `<LivraisonsTable>` below them.
   Title it **"Commandes"**.
2. Delete `app/admin-r/(dashboard)/livraisons/page.tsx`.
3. **Keep** `livraisons/[reference]/page.tsx` — the per-order detail page is
   still needed. Only the list page is redundant.
4. In `admin-shell.tsx`, collapse the two `NAV_ITEMS` entries ("Tableau de bord"
   and "Livraisons") into one: `{ href: '/admin-r', label: 'Commandes', Icon: Truck }`.
5. Grep for anything still linking to `/admin-r/livraisons` (the old list URL)
   and repoint it to `/admin-r`. Links to `/admin-r/livraisons/<reference>`
   stay as they are.

**Acceptance checks**
- `/admin-r` shows stat cards *and* the order table on one page.
- `/admin-r/livraisons/<some-reference>` still opens the order detail.
- Sidebar has one "Commandes" entry, no dead "Livraisons" link.
- `npx tsc --noEmit` exits 0.

---

## Task 2 — Admin can set an estimated delivery time per order

**What to do**

1. New migration `supabase/migrations/0005_estimated_delivery.sql`:
   ```sql
   alter table orders
     add column if not exists estimated_delivery text;
   ```
   Use `text` (not a date) so the admin can write "2–3 jours" or "Lundi 15",
   which is how this actually gets communicated. Run it in the SQL editor.
2. Copy the existing three-file pattern used by `delivery_status` exactly —
   don't invent a new one:
   - `lib/admin/orders.ts:147` → `updateDeliveryStatus()` (the DB write; note it
     takes an `admin.id` for the audit trail — do the same)
   - `app/admin-r/(dashboard)/livraisons/[reference]/actions.ts` →
     `updateDeliveryStatusAction()` (the `'use server'` action)
   - `components/admin/delivery-status-control.tsx` (the client control)

   So you add `updateEstimatedDelivery()`, a matching action, and an
   `estimated-delivery-control.tsx` beside the status control.
4. Show the value on the order list too, so the admin sees it at a glance.

**Careful:** the orders table has **no anon RLS policies** by design — it is
only reachable server-side via the secret key (`lib/supabase/admin.ts`). Keep
the write server-side. Do not add an anon policy on `orders`.

**Acceptance checks**
- Setting a value and reloading persists it.
- Empty/unset renders cleanly (no "null" on screen).
- `npx tsc --noEmit` exits 0.

---

## Task 3 — Customer accounts, order tracking, PDF invoice

**The big one.** Do the sub-steps in order and commit after each — do not try
to land this in one commit.

Use **Supabase Auth**, the same system the admin login already uses. Do not add
a second auth system (no NextAuth, no custom JWT).

### 3a — Schema

Migration `0006_customer_accounts.sql`:
```sql
alter table orders
  add column if not exists user_id uuid references auth.users(id);

create index if not exists orders_user_idx on orders (user_id);
```

Then RLS so a logged-in customer can read **their own** orders and nothing else:
```sql
create policy "customer reads own orders"
  on orders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "customer reads own order items"
  on order_items for select
  to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));
```
**Select only.** Customers must never insert or update orders directly —
order creation stays server-side in `app/api/commande/route.ts`.

### 3b — Signup / login

- Customer routes under `/compte` (keep `/admin-r` untouched — different area,
  different guard).
- `/compte/inscription`, `/compte/connexion`, and the account page `/compte`.
- Reuse the existing cookie/session helpers in `lib/supabase/` rather than
  writing new ones.
- **The route guard is `proxy.ts` at the repo root**, with
  `matcher: ['/admin-r/:path*']`. (Next 16 renamed `middleware.ts` → `proxy.ts`
  — `lib/supabase/middleware.ts` is *only* a cookie-client factory, not the
  guard.) Extend it carefully: a customer must NOT gain admin access. Admin
  status is the `admin_users` row check, and that stays the only thing gating
  `/admin-r`. If you add a matcher for `/compte`, keep the two checks separate.

### 3c — Require an account to check out

- `app/api/commande/route.ts` creates orders today. Attach the logged-in
  `user_id` when creating.
- Redirect to login from checkout when logged out, returning the user to
  checkout afterwards so the cart isn't lost.
- **Ask Karim before deleting guest checkout entirely.** His words were "the
  user need to make an account to complete the commande" — confirm whether
  existing guest orders (rows with `user_id` null) must still work. Don't
  break historical orders.

### 3d — Account page

`/compte` lists that customer's orders: reference, date, total, delivery
status, and the estimated delivery from Task 2. Order detail shows the items.

### 3e — PDF invoice

- Download button, enabled **only when `delivery_status = 'livree'`**.
- No PDF library is installed. Add one — `@react-pdf/renderer` or `pdfkit` are
  both fine; pick one and stick to it.
- **Generate it in a server route, not the browser**, and re-check ownership
  server-side (`order.user_id === auth.uid()`). Never trust an order reference
  from the client alone — otherwise anyone can enumerate other people's invoices.
- Invoice needs: INOCASA details, order reference, date, line items with HT
  prices, TVA 19%, total TTC. Match the existing wording in
  `lib/admin/order-format.ts`.

**Acceptance checks**
- A logged-out visitor cannot reach `/compte`.
- Customer A cannot see customer B's order (test with two accounts — this is
  the check that matters most).
- A customer cannot reach `/admin-r`.
- Invoice button only appears on delivered orders, and the PDF opens.
- `npx tsc --noEmit` exits 0.

---

## Task 4 — Rebuild the top navbar to match the original site

⚠️ **KARIM: paste the navbar screenshot here, plus each button → destination
link, before handing this file over. This task is not actionable without it.**

```
TODO — replace with:
  [screenshot]
  Button label → URL
  Button label → URL
  ...
```

**What to do**

- Header markup is in `components/boutique.tsx` (~line 174, `<header className="site-header">`),
  driven by a `NAV_ITEMS` array. Styles are `.site-header` / `.site-header nav`
  in `globals.css`.
- Match the structure in the screenshot, with each label pointing at the URL
  Karim listed.
- **Mobile matters.** The current header wraps the nav onto its own scrollable
  row at ≤760px (see the responsive block at the bottom of `globals.css`).
  If you add many more links, that row will get cramped — a proper hamburger
  drawer is likely the right call at that point. Check it at 375px before
  you call it done.
- Keep the existing right-hand actions (language, search, cart, IC mark) and
  keep the cart badge working.

**Acceptance checks**
- Every link goes where the list says.
- Header is usable at 375px, 768px, 1440px.
- Cart badge still updates when adding an item.
- `npx tsc --noEmit` exits 0.

---

## Task 5 — Swipeable product gallery on mobile

**Current state:** `components/product-detail.tsx` — `selectedIndex` state, one
main `<Image>`, and a row of thumbnail buttons. Up to 12 images
(`MAX_THUMBNAILS`). Styles: `.detail-image`, `.thumbs` in `globals.css`.

**What to do**

- Let the user swipe left/right on the main image on touch devices to move
  through the gallery.
- Prefer a **CSS scroll-snap carousel** (`scroll-snap-type: x mandatory` on a
  horizontally scrollable track, `scroll-snap-align: center` on each slide)
  over a JS drag library. It's native, accessible, and adds no dependency.
- Keep `selectedIndex` in sync so the thumbnails still highlight the current
  image, and clicking a thumbnail still scrolls the track to it.
- **Do not regress desktop.** On desktop the current click-thumbnail-to-swap
  behaviour must stay exactly as it is.
- Images are `object-fit: cover` filling the frame — keep that.

**Acceptance checks**
- Swiping on a phone moves through images; the active thumbnail follows.
- Clicking a thumbnail on desktop still swaps the main image.
- No horizontal scrollbar leaks onto the page body.
- Works on the TM7 (12 images) and Couteaux (2 images) — check the 2-image case,
  carousels often break with few slides.
- `npx tsc --noEmit` exits 0.

---

## Before pushing

```bash
npx tsc --noEmit          # must exit 0
pnpm build                # must succeed
```

Check every page you touched at **375px** and **1440px**.

`AGENTS.md` is written by `next dev` — if it shows as modified, commit it with
your work rather than reverting it.
