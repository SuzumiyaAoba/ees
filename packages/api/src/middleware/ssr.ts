/**
 * Server-Side Rendering (SSR) middleware for Hono
 * Renders React application on the server and sends HTML to client
 */
import type { Context } from 'hono'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface SSROptions {
  mode: 'development' | 'production'
  clientDistPath: string
  serverDistPath: string
}

interface ViteManifest {
  [key: string]: {
    file: string
    css?: string[]
    imports?: string[]
  }
}

/**
 * Create SSR middleware for serving the web application
 */
export function createSSRMiddleware(options: SSROptions) {
  const { mode, clientDistPath, serverDistPath } = options

  return async (c: Context) => {
    try {
      // In development mode, we don't use SSR - Vite handles it
      if (mode === 'development') {
        // Proxy to Vite dev server
        const viteUrl = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'
        const response = await fetch(new URL(c.req.url.replace(c.req.url.split('/').slice(0, 3).join('/'), viteUrl)))
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        })
      }

      // Production SSR
      const url = new URL(c.req.url)

      // Load the server entry
      const { render } = await import(join(serverDistPath, 'entry-server.js'))

      // Load the template
      const template = await readFile(
        join(clientDistPath, 'index.html'),
        'utf-8'
      )

      // Render the app HTML
      const appHtml = await render(url.pathname)

      // Load manifest for asset URLs
      const manifestPath = join(clientDistPath, '.vite/manifest.json')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as ViteManifest

      // Get the entry point from manifest
      const entryKey = 'src/entry-client.tsx'
      const entry = manifest[entryKey]

      if (!entry) {
        throw new Error(`Entry point ${entryKey} not found in manifest`)
      }

      // Build script tags
      const scripts = `<script type="module" src="/${entry.file}"></script>`

      // Build preload links for CSS and other assets
      const preloadLinks = (entry.css || [])
        .map((css) => `<link rel="stylesheet" href="/${css}">`)
        .join('\n')

      // Replace placeholders in template
      const html = template
        .replace('<!--preload-links-->', preloadLinks)
        .replace('<!--app-html-->', appHtml)
        .replace('<!--app-scripts-->', scripts)

      return c.html(html)
    } catch (error) {
      console.error('SSR Error:', error)

      // Fallback to basic HTML in case of error
      return c.html(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>EES Dashboard</title>
          </head>
          <body>
            <div id="root"></div>
            <script>
              console.error('SSR failed, application may not render correctly');
            </script>
          </body>
        </html>
      `, 500)
    }
  }
}

/**
 * Serve static assets from client dist
 */
export function createStaticMiddleware(clientDistPath: string) {
  return async (c: Context) => {
    const url = new URL(c.req.url)
    const filePath = join(clientDistPath, url.pathname)

    try {
      const content = await readFile(filePath)

      // Determine content type
      const ext = filePath.split('.').pop()
      const contentTypes: Record<string, string> = {
        'js': 'application/javascript',
        'css': 'text/css',
        'html': 'text/html',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
      }

      const contentType = contentTypes[ext || ''] || 'application/octet-stream'

      // Convert Buffer to Uint8Array for Response
      const buffer = new Uint8Array(content)

      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  }
}
