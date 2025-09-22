/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, '../core/src'),
      '@/core/shared/database/connection': resolve(__dirname, '../core/src/shared/database/connection'),
      '@/core/shared/models': resolve(__dirname, '../core/src/shared/models'),
    }
  },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 30000, // 30 second timeout for E2E tests
    hookTimeout: 30000, // 30 second timeout for setup/teardown
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