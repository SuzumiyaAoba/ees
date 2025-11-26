/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

const apiRoot = resolve(__dirname, 'src')

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [{ find: '@', replacement: apiRoot }]
  },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 30000, // 30 second timeout for E2E tests
    hookTimeout: 30000, // 30 second timeout for setup/teardown
    env: {
      NODE_ENV: 'test'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    },
    pool: 'forks', // Use forked processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true // Use single fork to avoid conflicts with external services
      }
    }
  }
})
