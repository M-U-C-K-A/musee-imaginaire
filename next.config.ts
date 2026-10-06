import type { NextConfig } from 'next';

/**
 * GITHUB_PAGES=true → export statique (dossier out/) pour GitHub Pages.
 * NEXT_PUBLIC_BASE_PATH → préfixe du site de projet (ex. /musee-imaginaire).
 */
const isPages = process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  basePath,
  ...(isPages
    ? { output: 'export', trailingSlash: true }
    : {
        async headers() {
          return [
            {
              source: '/art/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
          ];
        },
      }),
};

export default nextConfig;
