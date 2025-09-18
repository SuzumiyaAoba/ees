import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    target: 'node18',
    ssr: true,
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:crypto',
        'node:buffer',
        'node:stream',
        'node:util',
        'node:events',
        'node:http',
        'node:https',
        'node:url',
        'node:querystring',
        'node:os',
        'node:process',
        '@ees/core'
      ]
    }
  },
  esbuild: {
    platform: 'node'
  }
})