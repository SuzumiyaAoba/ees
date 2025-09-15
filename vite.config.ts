import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    ssr: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.ts'),
      output: {
        entryFileNames: 'index.js',
        format: 'cjs'
      },
      external: ['hono', 'zod', 'effect', 'drizzle-orm', '@libsql/client', 'ollama', 'ml-distance', 'path', 'fs', 'node:path', 'node:fs', '@hono/zod-openapi', '@hono/swagger-ui', '@hono/node-server']
    },
    target: 'node18',
    minify: false
  },
  esbuild: {
    platform: 'node'
  },
  server: {
    hmr: false
  },
  test: {
    globals: true,
    environment: 'node'
  }
})