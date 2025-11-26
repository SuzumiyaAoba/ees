import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EES Dashboard',
  description: 'EES - Embeddings API Service Dashboard',
  viewport: 'width=device-width, initial-scale=1.0',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
