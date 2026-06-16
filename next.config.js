/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'intertexe.com' },
      { protocol: 'https', hostname: 'www.intertexe.com' },
      { protocol: 'https', hostname: 'media.thereformation.com' },
      { protocol: 'https', hostname: 'us.sandro-paris.com' },
      { protocol: 'https', hostname: 'intl.isabelmarant.com' },
      { protocol: 'https', hostname: 'staud.clothing' },
      { protocol: 'https', hostname: 'lagence.com' },
      { protocol: 'https', hostname: 'faithfullthebrand.com' },
      { protocol: 'https', hostname: 'www.zimmermann.com' },
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
  /** Seconds before static generation times out (default 60). Top-level in Next 15+. */
  staticPageGenerationTimeout: 120,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/((?!api/|_next/static|_next/image|favicon).*)',
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
