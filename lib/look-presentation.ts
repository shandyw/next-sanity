import type { Look, LookFind, LookItem } from './looks';
import { stegaClean } from 'next-sanity';

const categoryIcons: Record<string, string> = {
  accessories: 'belt',
  activewear: 'sportsbra',
  bags: 'bag',
  boots: 'boots',
  bras: 'bra',
  croptops: 'top',
  dresses: 'dress',
  eveningwear: 'eveningwear',
  hats: 'pamela',
  heels: 'high-heels',
  intimates: 'bodysuit',
  jeans: 'jeans',
  outerwear: 'outerwear',
  panties: 'panties',
  pants: 'jeans-1',
  sandals: 'sandal',
  shapewear: 'body',
  shirts: 'shirt-3',
  shoes: 'shoe',
  shorts: 'short',
  skirts: 'skirt-distressed',
  sneakers: 'shoe',
  sunglasses: 'sunglasses',
  sweaters: 'sweater',
  swimwear: 'swimsuit',
  tanks: 'shirt',
  tops: 'shirttop',
};

export function findCategoryIcon(slug?: string) {
  return `/img/product-icons/${categoryIcons[slug || ''] || 'shirt'}.svg`;
}

export function eligibleLookItems(look: Look): (LookItem & { find: LookFind })[] {
  return (look.items || []).filter((item): item is LookItem & { find: LookFind } =>
    Boolean(item.find?._id && !item.find._id.startsWith('drafts.')),
  );
}

export function groupLookItems(look: Look) {
  const items = eligibleLookItems(look);
  return {
    essential: items.filter((item) => stegaClean(item.placementRole) !== 'alternative'),
    alternative: items.filter((item) => stegaClean(item.placementRole) === 'alternative'),
  };
}

export function findDisplayTitle(find: LookFind) {
  return find.editorialTitle?.trim() || find.title;
}

export function relatedLooks(current: Look, looks: Look[], now = new Date()) {
  const seen = new Set([current._id.replace(/^drafts\./, '')]);
  return looks
    .filter((look) => {
      const id = look._id.replace(/^drafts\./, '');
      if (
        seen.has(id) ||
        look._id.startsWith('drafts.') ||
        !look.publishedAt ||
        new Date(look.publishedAt) > now
      )
        return false;
      seen.add(id);
      return true;
    })
    .sort(
      (a, b) => Number(b.occasion === current.occasion) - Number(a.occasion === current.occasion),
    )
    .slice(0, 3);
}
