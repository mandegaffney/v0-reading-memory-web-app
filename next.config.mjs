/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export is only needed for Railway/self-hosted deployments.
  // On Vercel, Next.js is served natively — do not set output:'export'.
  // To deploy to Railway, set STATIC_EXPORT=true in your environment.
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,

  // Trailing slashes keep Express directory-index serving consistent
  // (only relevant when STATIC_EXPORT=true).
  trailingSlash: process.env.STATIC_EXPORT === 'true' ? true : undefined,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Required when output:'export' (no image optimisation server).
    // Safe to leave on at all times.
    unoptimized: true,
  },

  // Dev proxy: forward /api/* requests to the Express backend on port 3001.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      {
        source:      '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
