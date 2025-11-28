import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Document Browser - EES',
  description: 'Browse and preview embedded documents',
}

export default function NewUILayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
