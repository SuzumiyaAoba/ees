import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ees/core'],

  // Monorepo configuration
  outputFileTracingRoot: path.join(__dirname, '../../'),

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
