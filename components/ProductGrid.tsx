import type { DocumentContent, Settings } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { ProductResults } from './ProductResults';

export function ProductGrid({
  items,
  settings,
}: {
  items: DocumentContent[];
  settings?: Settings;
}) {
  return (
    <ProductResults resultKey={JSON.stringify(items.map((item) => item._id))}>
      {items.map((d) => (
        <li className="review-card" key={d._id}>
          <ProductCard product={d} settings={settings} />
        </li>
      ))}
    </ProductResults>
  );
}
