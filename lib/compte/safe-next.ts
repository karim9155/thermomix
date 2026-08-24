/**
 * `next` arrives from a query string or a form field, i.e. from the user.
 * Only ever accept a same-site absolute path so a crafted link cannot turn
 * our post-login redirect into an open redirect to another origin.
 * '//evil.com' is a protocol-relative URL, hence the second check.
 *
 * Client-safe (no server-only imports) — the auth forms need it too.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return '/compte'
  if (!next.startsWith('/') || next.startsWith('//')) return '/compte'
  return next
}
