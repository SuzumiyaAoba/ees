/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@/core': resolve(__dirname, '../core/src'),
      '@ees/core': resolve(__dirname, '../core/src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    }
  }
})