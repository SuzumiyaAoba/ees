/**
 * Client-side hydration entry point
 * This file is used to hydrate the server-rendered app on the client
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import './index.css'

// Hydrate the server-rendered HTML
ReactDOM.hydrateRoot(
  document.getElementById('root')!,
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
