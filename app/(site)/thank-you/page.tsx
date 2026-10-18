import { pageMetadata } from '@/lib/seo';
import { EditorialHero } from '@/components/EditorialHero';

export const metadata = {
  ...pageMetadata('Thank You!', 'Newsletter signup confirmation.', '/thank-you'),
  robots: { index: false, follow: true },
};

export default function ThankYou() {
  return (
    <main id="main">
      <EditorialHero
        title="Thank You!"
        intro="You will be the first to know when I add something to my closet. Stay tuned..."
        cta={{ label: 'Read Reviews', href: '/reviews' }}
      />
    </main>
  );
}
