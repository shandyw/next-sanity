import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  const root = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/studio', '/api/', '/*?*'] },
    ...(root ? { sitemap: new URL('/sitemap.xml', root).href } : {}),
  };
}
