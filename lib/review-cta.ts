import { stegaClean } from 'next-sanity';

export function reviewAmazonCta(category?: { title?: string }) {
  const title = stegaClean(category?.title)?.trim().toLowerCase();
  if (!title) return 'Shop this item on Amazon';

  const exceptions: Record<string, string> = {
    jeans: 'pair of jeans',
    pants: 'pair of pants',
    shorts: 'pair of shorts',
    sunglasses: 'pair of sunglasses',
    accessories: 'accessory',
    dresses: 'dress',
    swimwear: 'swimsuit',
    activewear: 'activewear piece',
    eveningwear: 'eveningwear piece',
    outerwear: 'outerwear piece',
    shapewear: 'shapewear piece',
  };
  const singular = exceptions[title] ||
    (title.endsWith('ies') ? `${title.slice(0, -3)}y` : title.endsWith('s') && !title.endsWith('ss') ? title.slice(0, -1) : title);
  return `Shop this ${singular} on Amazon`;
}
