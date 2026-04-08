import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['youtube-dl-exec'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

export default nextConfig
