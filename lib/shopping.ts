import { catalogSource, catalogPlacements, closetStatus } from './catalog';
import { isAmazonProduct } from './amazon';
import { stegaClean } from 'next-sanity';
import type { DocumentContent } from './types';

export type ShoppingSection = 'closet' | 'finds';
export function shoppingSection(product: DocumentContent): ShoppingSection {
  return catalogSource(product) === 'amazon' ? 'finds' : 'closet';
}
export function shoppingPrice(product: DocumentContent) {
  return isAmazonProduct(product) ||
    (shoppingSection(product) === 'finds' && !product.priceMaintained)
    ? undefined
    : product.listingPrice;
}
export function shoppingSizes(product: DocumentContent): string[] {
  return isAmazonProduct(product)
    ? []
    : shoppingSection(product) === 'finds'
      ? stegaClean(product.availableSizes || [])
      : product.size
        ? [stegaClean(product.size)]
        : [];
}
export function sectionProducts(all: DocumentContent[], section: ShoppingSection) {
  return all
    .filter(
      (product) =>
        !product.archived &&
        catalogPlacements(product).includes(section) &&
        (section !== 'closet' || closetStatus(product) !== 'sold'),
    )
    .map((product) => ({
      ...product,
      listingPrice: shoppingPrice(product),
    }));
}
