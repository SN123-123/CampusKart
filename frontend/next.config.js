/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000';

const nextConfig = {
  // Same job as the old Vite proxy: the browser only talks to :3000,
  // Next forwards /api and /uploads to the Express backend so cookies keep working.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
