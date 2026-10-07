import type { Metadata } from 'next';
import './globals.css';
import { siteUrl } from '@/lib/seo';
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: 'CurvyGirlReviews', template: '%s | CurvyGirlReviews' },
  description: 'Real Curves. Unfiltered Reviews.',
  icons: { icon: '/img/ico.png' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
