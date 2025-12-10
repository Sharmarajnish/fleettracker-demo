/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // Disable strict mode for demo purposes
  reactStrictMode: false,
};

module.exports = nextConfig;
