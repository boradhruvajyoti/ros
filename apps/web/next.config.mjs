/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ros/shared-types', '@ros/utils'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
