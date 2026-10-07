import type { DocumentContent, SearchParams } from './types';
import { stegaClean } from 'next-sanity';
import { shoppingSizes } from './shopping';
export const pageSize = 12;
export function values(params: SearchParams, key: string) {
  const v = params[key];
  return (Array.isArray(v) ? v : v ? [v] : []).map((s) => s.trim()).filter(Boolean);
}
export function first(params: SearchParams, key: string) {
  return values(params, key)[0] || '';
}
export function archiveUrl(base: string, params: SearchParams, page?: number) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'page' || k === 'review') return;
    (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean).forEach((s) => q.append(k, s));
  });
  if (page && page > 1) q.set('page', String(page));
  return base + (q.size ? '?' + q.toString() : '');
}
export function browse(all: DocumentContent[], params: SearchParams, shop = false) {
  const query = first(params, 'q').toLowerCase();
  const categories = values(params, 'category');
  const brands = values(params, 'brand');
  const sizes = values(params, 'size');
  const formats = values(params, 'format');
  const availability = values(params, 'availability');
  const conditions = values(params, 'condition');
  const retailers = values(params, 'retailer');
  const tried = values(params, 'tried');
  const min = first(params, 'min_price');
  const max = first(params, 'max_price');
  let items = all.filter((d) => {
    const price = shop ? d.listingPrice : d.priceWhenReviewed;
    return (
      (!query ||
        [
          d.title,
          d.excerpt,
          d.description,
          d.fitNotes,
          d.brand?.title,
          ...(d.categories || []).map((c) => c.title),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)) &&
      (!categories.length || d.categories?.some((c) => categories.includes(c.slug || c._id))) &&
      (!brands.length || brands.includes(stegaClean(d.brand?.title || ''))) &&
      (!sizes.length ||
        (shop
          ? shoppingSizes(d).some((size) => sizes.includes(size))
          : sizes.includes(stegaClean(d.sizeWorn || '')))) &&
      (!conditions.length || conditions.includes(stegaClean(d.condition || ''))) &&
      (!retailers.length || retailers.includes(stegaClean(d.retailer || ''))) &&
      (!tried.length || tried.includes(d.personallyTried === true ? 'yes' : 'no')) &&
      (!formats.length || formats.includes(d.format || '') || d.format === 'both') &&
      (!availability.length || availability.includes(d.availability || 'unknown')) &&
      (!min || (Number.isFinite(Number(min)) && price !== undefined && price >= Number(min))) &&
      (!max || (Number.isFinite(Number(max)) && price !== undefined && price <= Number(max)))
    );
  });
  const sort = first(params, 'sort');
  items = items.sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'price_asc' || sort === 'price_desc') {
      const av = shop ? a.listingPrice : a.priceWhenReviewed;
      const bv = shop ? b.listingPrice : b.priceWhenReviewed;
      if (av === undefined) return bv === undefined ? 0 : 1;
      if (bv === undefined) return -1;
      return sort === 'price_asc' ? av - bv : bv - av;
    }
    return (
      (shop ? b.createdAt || '' : b.publishedAt || '').localeCompare(
        shop ? a.createdAt || '' : a.publishedAt || '',
      ) || a._id.localeCompare(b._id)
    );
  });
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const requested = Number(first(params, 'page'));
  const page = Number.isSafeInteger(requested) ? Math.min(pages, Math.max(1, requested)) : 1;
  return { items: items.slice((page - 1) * pageSize, page * pageSize), count, pages, page };
}
