export function safeExternal(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch {}
}
export function vintedUrl(value: string | undefined): string | undefined {
  const safe = safeExternal(value);
  if (!safe) return;
  const u = new URL(safe);
  if (
    /^(www\.)?vinted\.(com|co\.uk|fr|de|es|it|nl|be|pt|pl|cz|at|lt|lu|ie)$/.test(u.hostname) &&
    /^\/items\/\d+(?:-|\/|$)/.test(u.pathname)
  ) {
    u.search = '';
    u.hash = '';
    return u.href;
  }
}
export function isStale(last: string | undefined, now = Date.now()) {
  return !last || !Number.isFinite(Date.parse(last)) || now - Date.parse(last) > 7 * 86400000;
}
