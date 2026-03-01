/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://nullpriest.xyz/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
