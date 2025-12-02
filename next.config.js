/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Optimize build performance
  swcMinify: true, // Use SWC for faster minification

  // Reduce build memory usage
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Increase timeouts and payload limits for large file downloads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    instrumentationHook: true, // Enable instrumentation for background services
  },

  // Disable response body size limit for streaming large files
  async headers() {
    return [
      {
        source: '/api/retrieve-file',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
}

module.exports = nextConfig
