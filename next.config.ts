import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }] },
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
