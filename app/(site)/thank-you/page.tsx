import { pageMetadata } from '@/lib/seo';

export const metadata = {
  ...pageMetadata('Thank You!', 'Newsletter signup confirmation.', '/thank-you'),
  robots: { index: false, follow: true },
};

export default function ThankYou() {
  return (
    <main id="main" className="container thank-you-page">
      <h1 className="visually-hidden">Newsletter confirmation</h1>
      <section aria-labelledby="thank-you-title">
        <h2 id="thank-you-title" className="headline-lg">
          Thank You!
        </h2>
        <p className="body-lg">
          You will be the first to know when I add something to my closet. Stay tuned...
        </p>
        <a className="btn btn-accent" href="/reviews">
          Read Reviews
        </a>
      </section>
    </main>
  );
}
