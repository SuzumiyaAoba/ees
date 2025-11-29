'use client'

import { useState, useEffect, Suspense, startTransition, useDeferredValue } from 'react'
import { FileText, Calendar, Tag, Layers, Code, FileCode, Hash, Loader2 } from 'lucide-react'
import { apiClient } from '@/shared/api'
import { MarkdownRenderer } from '@/shared/ui'
import type { Embedding } from '@/shared/types/api'

interface DocumentPreviewProps {
  documentId: number | null
}

type TabType = 'metadata' | 'content' | 'original' | 'embedding'

export function DocumentPreview({ documentId }: DocumentPreviewProps) {
  const [document, setDocument] = useState<Embedding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renderMarkdown, setRenderMarkdown] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('content')

  const deferredDocumentId = useDeferredValue(documentId)
  const deferredDocument = useDeferredValue(document)

  useEffect(() => {
    if (deferredDocumentId === null) {
      startTransition(() => {
        setDocument(null)
        setLoading(false)
      })
      return
    }

    const abortController = new AbortController()

    startTransition(() => {
      setLoading(true)
    })

    loadDocument(deferredDocumentId, abortController.signal)

    return () => {
      abortController.abort()
    }
  }, [deferredDocumentId])

  const loadDocument = async (id: number, signal: AbortSignal) => {
    try {
      const listResponse = await apiClient.getEmbeddings({ limit: 1000 })

      if (signal.aborted) return

      const embedding = listResponse.embeddings.find(e => e.id === id)

      if (!embedding) {
        throw new Error('Document not found')
      }

      const fullDoc = await apiClient.getEmbedding(embedding.uri, embedding.model_name)

      if (signal.aborted) return

      startTransition(() => {
        setDocument(fullDoc)
        setError(null)
        setLoading(false)
        setActiveTab('content')
      })
    } catch (err) {
      if (signal.aborted) return

      startTransition(() => {
        setError(err instanceof Error ? err.message : 'Failed to load document')
        setLoading(false)
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const formatUri = (uri: string) => {
    if (uri.startsWith('file://')) {
      return uri.split('/').pop() || uri
    }
    return uri
  }

  const isMarkdownContent = deferredDocument && (
    deferredDocument.converted_format === 'markdown' ||
    deferredDocument.text.includes('```') ||
    deferredDocument.text.includes('#')
  )

  if (documentId === null) {
    return (
      <div className="h-full flex-center">
        <div className="text-center">
          <FileText className="h-24 w-24 mx-auto mb-6 text-neutral-700 opacity-30" />
          <h2 className="heading-4 mb-2">Select a document</h2>
          <p className="text-small">Choose a document from the sidebar to preview</p>
        </div>
      </div>
    )
  }

  if (loading && !deferredDocument) {
    return (
      <div className="h-full flex-center">
        <div className="text-center">
          <div className="spinner h-12 w-12 mb-4 mx-auto" />
          <p className="text-body">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error && !deferredDocument) {
    return (
      <div className="h-full flex-center">
        <div className="text-center">
          <div className="bg-error/10 border border-error/30 rounded-2xl p-6">
            <p className="text-error text-lg">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  const tabs: { id: TabType; label: string; show: boolean }[] = [
    { id: 'content', label: 'Content', show: true },
    { id: 'original', label: 'Original Content', show: !!deferredDocument?.original_content },
    { id: 'metadata', label: 'Metadata', show: true },
    { id: 'embedding', label: 'Embedding Vector', show: true },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-card rounded-none border-b border-neutral-800/50 px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="heading-3 truncate">
                {deferredDocument ? formatUri(deferredDocument.uri) : formatUri(document.uri)}
              </h1>
              {loading && deferredDocument && (
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge-primary">
                <Tag className="h-3 w-3" />
                {deferredDocument?.model_name ?? document.model_name}
              </span>
              {(deferredDocument?.task_type ?? document.task_type) && (
                <span className="badge-accent">
                  <Layers className="h-3 w-3" />
                  {deferredDocument?.task_type ?? document.task_type}
                </span>
              )}
              {(deferredDocument?.converted_format ?? document.converted_format) && (
                <span className="badge-success">
                  <FileCode className="h-3 w-3" />
                  Converted to {deferredDocument?.converted_format ?? document.converted_format}
                </span>
              )}
            </div>
          </div>

          {isMarkdownContent && activeTab === 'content' && (
            <button
              onClick={() => setRenderMarkdown(!renderMarkdown)}
              className="btn-secondary"
            >
              {renderMarkdown ? (
                <>
                  <Code className="h-4 w-4" />
                  Show Raw
                </>
              ) : (
                <>
                  <FileCode className="h-4 w-4" />
                  Render Markdown
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-800/50 bg-neutral-900/30 px-8">
        <div className="flex gap-1">
          {tabs.filter(tab => tab.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-3 text-sm font-medium transition-all duration-200
                border-b-2 -mb-[1px]
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-300 bg-primary-500/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <Suspense fallback={
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex-center p-12">
                  <div className="spinner h-8 w-8" />
                  <span className="ml-3 text-neutral-500">Loading metadata...</span>
                </div>
              </div>
            }>
              {deferredDocument && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="heading-6 mb-4 text-gradient-primary">Metadata</h2>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-accent-400" />
                      <div>
                        <div className="text-neutral-500 text-xs mb-1">Created</div>
                        <div className="text-neutral-300">{formatDate(deferredDocument.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-accent-400" />
                      <div>
                        <div className="text-neutral-500 text-xs mb-1">Updated</div>
                        <div className="text-neutral-300">{formatDate(deferredDocument.updated_at)}</div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-start gap-3">
                      <FileText className="h-4 w-4 text-accent-400 mt-1" />
                      <div className="flex-1">
                        <div className="text-neutral-500 text-xs mb-1">URI</div>
                        <code className="text-neutral-300 text-xs break-all font-mono bg-neutral-900/50 px-2 py-1 rounded">
                          {deferredDocument.uri}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-accent-400" />
                      <div>
                        <div className="text-neutral-500 text-xs mb-1">Dimensions</div>
                        <div className="text-neutral-300 font-mono">{deferredDocument.embedding.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Suspense>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <Suspense fallback={
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex-center p-12">
                  <div className="spinner h-8 w-8" />
                  <span className="ml-3 text-neutral-500">Loading content...</span>
                </div>
              </div>
            }>
              {deferredDocument && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="heading-6 mb-4 text-gradient-primary">
                    Content
                  </h2>

                  {renderMarkdown && isMarkdownContent ? (
                    <Suspense fallback={
                      <div className="flex-center p-12">
                        <div className="spinner h-8 w-8" />
                        <span className="ml-3 text-neutral-500">Rendering markdown...</span>
                      </div>
                    }>
                      <div className="markdown-container">
                        <MarkdownRenderer content={deferredDocument.text} />
                      </div>
                    </Suspense>
                  ) : (
                    <pre className="code-block whitespace-pre-wrap break-words overflow-x-auto">
                      {deferredDocument.text}
                    </pre>
                  )}
                </div>
              )}
            </Suspense>
          )}

          {/* Original Content Tab */}
          {activeTab === 'original' && (
            <Suspense fallback={
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex-center p-12">
                  <div className="spinner h-8 w-8" />
                  <span className="ml-3 text-neutral-500">Loading original content...</span>
                </div>
              </div>
            }>
              {deferredDocument?.original_content && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="heading-6 mb-4 text-gradient-accent">Original Content (Org-mode)</h2>
                  <pre className="code-block whitespace-pre-wrap break-words overflow-x-auto">
                    {deferredDocument.original_content}
                  </pre>
                </div>
              )}
            </Suspense>
          )}

          {/* Embedding Vector Tab */}
          {activeTab === 'embedding' && (
            <Suspense fallback={
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex-center p-12">
                  <div className="spinner h-8 w-8" />
                  <span className="ml-3 text-neutral-500">Loading embedding vector...</span>
                </div>
              </div>
            }>
              {deferredDocument && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="heading-6 mb-4 text-gradient-primary">Embedding Vector</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-accent-400" />
                      <div>
                        <div className="text-neutral-500 text-xs mb-1">Dimensions</div>
                        <div className="text-neutral-300 font-mono">{deferredDocument.embedding.length}</div>
                      </div>
                    </div>
                    {deferredDocument.embedding.length > 0 && (
                      <div>
                        <div className="text-neutral-500 text-xs mb-2">First 10 values</div>
                        <div className="code-block">
                          <code className="text-xs">
                            [{deferredDocument.embedding.slice(0, 10).map(v => v.toFixed(6)).join(', ')}
                            {deferredDocument.embedding.length > 10 ? ', ...' : ''}]
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
