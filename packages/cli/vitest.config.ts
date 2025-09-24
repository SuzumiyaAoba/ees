/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/core': resolve(__dirname, '../core/src'),
      '@ees/core': resolve(__dirname, '../core/src'),
      // Core package internal aliases (must match the @/ used within core package)
      '@/entities/embedding/api/embedding': resolve(__dirname, '../core/src/entities/embedding/api/embedding'),
      '@/entities': resolve(__dirname, '../core/src/entities'),
      '@/shared': resolve(__dirname, '../core/src/shared')
    }
  },
  test: {
    globals: true,
    environment: 'node',
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
    }
  }
})