/**
 * Server-side rendering entry point
 * This file is used to render the app on the server
 */
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import App from '@/App'

export function render(): string {
  const html = ReactDOMServer.renderToString(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  return html
}
