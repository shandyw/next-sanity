import Link from 'next/link';
import { siteUrl } from '@/lib/seo';

export type BreadcrumbItem = { label: string; href: string };

/** Render one compact trail and its matching structured data above page content. */
export function Breadcrumbs({ items }: { items: [BreadcrumbItem, ...BreadcrumbItem[]] }) {
  const root = siteUrl();
  const structured = root && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, root).href,
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumbs container">
        <ol>
          {items.map((item, index) => (
            <li key={`${item.href}-${index}`}>
              {index > 0 && (
                <span className="breadcrumbs__separator" aria-hidden="true">
                  /
                </span>
              )}
              {index === items.length - 1 ? (
                <span aria-current="page" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
        />
      )}
    </>
  );
}
