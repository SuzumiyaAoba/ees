/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
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