/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'media.thereformation.com' },
      { protocol: 'https', hostname: 'us.sandro-paris.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'thum.io' },
    ],
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ['*.kirk.replit.dev', '*.replit.dev', '*.repl.co', 'localhost', '127.0.0.1', '0.0.0.0'],
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    /** Safety net if a page is still statically generated with slow Supabase fetches */
    staticPageGenerationTimeout: 120,
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/((?!api/sitemap|_next/static|_next/image|favicon).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/.local/**',
          '**/.cache/**',
          '**/.upm/**',
          '**/client/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
