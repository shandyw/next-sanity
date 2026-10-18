import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { siteUrl } from '@/lib/seo';
const editorialSerif = localFont({
  src: '../public/fonts/lora/lora-latin-600-normal.woff2',
  variable: '--font-editorial-serif',
  weight: '600',
  style: 'normal',
  display: 'swap',
  preload: true,
  fallback: ['serif'],
  adjustFontFallback: 'Times New Roman',
});
const editorialScript = localFont({
  src: '../public/fonts/dancing-script/dancing-script-latin-wght-normal.woff2',
  variable: '--font-editorial-script',
  weight: '400 700',
  display: 'swap',
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: 'CurvyGirlReviews', template: '%s | CurvyGirlReviews' },
  description: 'Real Curves. Unfiltered Reviews.',
  icons: { icon: '/img/ico.png' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${editorialSerif.variable} ${editorialScript.variable}`}>
      <body>{children}</body>
    </html>
  );
}
