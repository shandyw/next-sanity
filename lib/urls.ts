export function safeExternal(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch {}
}
export function safeVideoUrl(value: string | undefined): string | undefined {
  if (value?.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) {
    return value;
  }
  return safeExternal(value);
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

export function closetShopUrl(value: string | undefined): string | undefined {
  const safe = safeExternal(value);
  if (!safe) return;
  const url = new URL(safe);
  const valid =
    /^(www\.)?vinted\.(com|co\.uk|fr|de|es|it|nl|be|pt|pl|cz|at|lt|lu|ie)$/.test(
      url.hostname,
    ) && /^\/member\/\d+(?:-[A-Za-z0-9_-]+)?\/?$/.test(url.pathname);
  if (valid) {
    url.search = '';
    url.hash = '';
    return url.href;
  }
}

/** Gift-list destination is distinct from an item/affiliate URL. */
export function giftListUrl(value?: string): string | undefined {
  const safe = safeExternal(value);
  if (!safe) return;
  const url = new URL(safe);
  if (
    !/^(www\.)?amazon\.(com|ca|co\.uk)$/.test(url.hostname) ||
    !/^\/(hz\/wishlist\/ls|registry\/wishlist|wishlist\/ls)\/[A-Za-z0-9]+/.test(url.pathname)
  )
    return;
  for (const key of ['tag', 'ascsubtag', 'linkCode', 'linkId']) url.searchParams.delete(key);
  return url.href;
}
