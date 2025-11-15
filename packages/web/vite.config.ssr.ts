import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// SSR-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    ssr: true,
    outDir: 'dist/server',
    rollupOptions: {
      input: './src/entry-server.tsx',
      output: {
        format: 'es',
      },
    },
  },
  ssr: {
    // Don't externalize these packages in SSR
    noExternal: ['react', 'react-dom'],
  },
})
