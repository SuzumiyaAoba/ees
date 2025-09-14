import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ees',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['hono', 'zod']
    },
    target: 'node18',
    minify: false
  },
  esbuild: {
    platform: 'node'
  },
  test: {
    globals: true,
    environment: 'node'
  }
})