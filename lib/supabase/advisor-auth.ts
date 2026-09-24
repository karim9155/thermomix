/**
 * Cookie-based session client for the ADVISOR area (/conseiller).
 *
 * Not a new client: it is the customer area's cached client under a name
 * that says where it is used. One Supabase Auth system, one cookie — an
 * advisor is an auth.users row with an `advisors` row, the same way an
 * admin is one with an `admin_users` row.
 *
 * Sharing the one cache() instance matters. Supabase refresh tokens are
 * single-use, and two independent clients racing to refresh the same
 * near-expiry token make the loser sign the user out (see the note in
 * lib/supabase/admin-auth.ts). A request in /conseiller that ever touched
 * both a "customer" and an "advisor" client would reintroduce that race.
 *
 * Subject to RLS: through this client an advisor can read their own
 * `advisors` row (migration 0013) and nothing else. Every real read and
 * write goes through lib/supabase/admin.ts after the guard has confirmed
 * who is asking.
 */
export { createClient } from '@/lib/supabase/customer-auth'
