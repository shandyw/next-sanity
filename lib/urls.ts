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
export function youtubeEmbedUrl(value: string | undefined): string | undefined {
  const safe = safeExternal(value);
  if (!safe) return;
  const url = new URL(safe);
  let id: string | undefined;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v') || undefined;
    else if (/^\/(shorts|embed)\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[2];
  } else if (url.hostname === 'youtu.be' || url.hostname === 'www.youtu.be') {
    if (/^\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[1];
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
export function safeBackgroundVideoUrl(value: string | undefined): string | undefined {
  const safe = safeVideoUrl(value);
  if (!safe) return;
  return /\.(mp4|webm)$/i.test(new URL(safe, 'https://local.invalid').pathname) ? safe : undefined;
}
export function closetShopUrl(value: string | undefined): string | undefined {
  const safe = safeExternal(value);
  if (!safe) return;
  const url = new URL(safe);
  const valid =
    /^(www\.)?vinted\.(com|co\.uk|fr|de|es|it|nl|be|pt|pl|cz|at|lt|lu|ie)$/.test(url.hostname) &&
    /^\/member\/\d+(?:-[A-Za-z0-9_-]+)?\/?$/.test(url.pathname);
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
