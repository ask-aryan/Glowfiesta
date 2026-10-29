/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/play',
        destination: '/player',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
