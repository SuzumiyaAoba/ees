'use client'

import { useState } from 'react'
import { DocumentTree } from '@/widgets/document-tree'
import { DocumentPreview } from '@/widgets/document-preview'

export default function NewDocumentUI() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Document Tree */}
      <aside className="w-80 border-r border-outline-variant overflow-y-auto">
        <DocumentTree
          onDocumentSelect={setSelectedDocumentId}
          selectedDocumentId={selectedDocumentId}
        />
      </aside>

      {/* Main Content - Document Preview */}
      <main className="flex-1 overflow-y-auto">
        <DocumentPreview documentId={selectedDocumentId} />
      </main>
    </div>
  )
}
