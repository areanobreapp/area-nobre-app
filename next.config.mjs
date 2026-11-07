/** @type {import('next').NextConfig} */
const isHomologation =
  process.env.APP_ENV === 'homologation' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'homologation';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    if (!isHomologation) {
      return [];
    }

    return [
      {
        // Aplica cabeçalho noindex e nofollow estritamente no ambiente de homologação
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
