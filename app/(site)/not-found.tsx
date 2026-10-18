import { EditorialHero } from '@/components/EditorialHero';

export default function NotFound() {
  return (
    <main id="main">
      <EditorialHero
        title="Page not found"
        intro="This article may not be published yet."
        cta={{ label: 'Browse reviews', href: '/reviews' }}
      />
    </main>
  );
}
