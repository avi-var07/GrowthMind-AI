/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow connecting to backend API
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
