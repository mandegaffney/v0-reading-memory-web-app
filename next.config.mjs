/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for production — Express serves the `out/` folder on Railway.
  // In development, the Next.js dev server handles routing normally.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // Trailing slashes make Express's directory-index serving match Next.js URLs.
  trailingSlash: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Required for static export (no Next.js image optimisation server)
    unoptimized: true,
  },

  // Dev proxy: forward /api/* requests to the Express backend on port 3001.
  // Not used in production (output:'export' has no server to apply rewrites).
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
