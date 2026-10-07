import { stegaClean } from 'next-sanity';
import type { DocumentContent } from './types';

export type ShoppingSection = 'closet' | 'finds';
export function shoppingSection(product: DocumentContent): ShoppingSection {
  return stegaClean(product.shoppingSection) === 'finds' ? 'finds' : 'closet';
}
export function shoppingPrice(product: DocumentContent) {
  return shoppingSection(product) === 'finds' && !product.priceMaintained
    ? undefined
    : product.listingPrice;
}
export function shoppingSizes(product: DocumentContent): string[] {
  return shoppingSection(product) === 'finds'
    ? stegaClean(product.availableSizes || [])
    : product.size
      ? [stegaClean(product.size)]
      : [];
}
export function sectionProducts(all: DocumentContent[], section: ShoppingSection) {
  return all
    .filter((product) => shoppingSection(product) === section)
    .map((product) => ({
      ...product,
      listingPrice: shoppingPrice(product),
    }));
}
