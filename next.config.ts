import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  // Ship page styles with HTML so first paint does not wait for a CSS request.
  experimental: { inlineCss: true },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  outputFileTracingIncludes: { '/*': ['./public/img/hero/**/*'] },
  async redirects() {
    return [{ source: '/:path*/index.html', destination: '/:path*', permanent: true }];
  },
  async headers() {
    return [
      { source: '/studio/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};
export default config;
