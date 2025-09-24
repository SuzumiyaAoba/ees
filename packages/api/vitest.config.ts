/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, '../core/src'),
      '@/core/shared/database/connection': resolve(__dirname, '../core/src/shared/database/connection'),
      '@/core/shared/models': resolve(__dirname, '../core/src/shared/models'),
      // Core package internal aliases for when API imports from core that uses @/ internally
      '@/entities/embedding/api/embedding': resolve(__dirname, '../core/src/entities/embedding/api/embedding'),
      '@/entities': resolve(__dirname, '../core/src/entities'),
      '@/shared': resolve(__dirname, '../core/src/shared')
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