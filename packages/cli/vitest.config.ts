/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'

const cliRoot = resolve(__dirname, './src')

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [{ find: '@', replacement: cliRoot }]
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
