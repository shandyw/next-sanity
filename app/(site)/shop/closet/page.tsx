import { getSettings } from '@/lib/content';
import { ClosetBanner } from '@/components/ClosetBanner';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Shop My Closet',
  'Shop clothing, shoes, and accessories from my personal closet on Vinted.',
  '/shop/closet',
);

export default async function Page() {
  const settings = await getSettings();
  return (
    <main id="main" className="container closet-destination">
      <ClosetBanner settings={settings} headingLevel="h1" />
    </main>
  );
}
