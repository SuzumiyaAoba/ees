/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ees/core'],

  // ESLint configuration
  eslint: {
    // Only fail on errors, not warnings
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    // Only fail on errors, not warnings
    ignoreBuildErrors: false,
  },

  // Redirect /api requests to the backend API server
  async rewrites() {
    const apiPort = process.env.API_PORT || '3000'
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${apiPort}/:path*`,
      },
    ]
  },

  // Webpack configuration for handling worker files
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })
    return config
  },
}

export default nextConfig
