'use client'

import { useState, useEffect } from 'react'
import { FileText, Calendar, Tag, Layers, Code, FileCode } from 'lucide-react'
import { apiClient } from '@/shared/api'
import { Badge, Card, Button, MarkdownRenderer } from '@/shared/ui'
import type { Embedding } from '@/shared/types/api'

interface DocumentPreviewProps {
  documentId: number | null
}

export function DocumentPreview({ documentId }: DocumentPreviewProps) {
  const [document, setDocument] = useState<Embedding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renderMarkdown, setRenderMarkdown] = useState(true)

  useEffect(() => {
    if (documentId === null) {
      setDocument(null)
      return
    }

    loadDocument(documentId)
  }, [documentId])

  const loadDocument = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      // First get the list to find the URI and model_name
      const listResponse = await apiClient.getEmbeddings({ limit: 1000 })
      const embedding = listResponse.embeddings.find(e => e.id === id)

      if (!embedding) {
        throw new Error('Document not found')
      }

      // Then fetch full details
      const fullDoc = await apiClient.getEmbedding(embedding.uri, embedding.model_name)
      setDocument(fullDoc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatUri = (uri: string) => {
    if (uri.startsWith('file://')) {
      return uri.split('/').pop() || uri
    }
    return uri
  }

  const isMarkdownContent = document && (
    document.converted_format === 'markdown' ||
    document.text.includes('```') ||
    document.text.includes('#')
  )

  if (documentId === null) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a document to preview</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        <div className="text-center">
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-outline-variant bg-surface-variant px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-2 truncate">
              {formatUri(document.uri)}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Tag className="h-3 w-3 mr-1" />
                {document.model_name}
              </Badge>
              {document.task_type && (
                <Badge variant="outline">
                  <Layers className="h-3 w-3 mr-1" />
                  {document.task_type}
                </Badge>
              )}
              {document.converted_format && (
                <Badge variant="outline" className="bg-success/10">
                  Converted from org-mode to {document.converted_format}
                </Badge>
              )}
            </div>
          </div>

          {isMarkdownContent && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRenderMarkdown(!renderMarkdown)}
              className="gap-2"
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
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadata */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <p>{formatDate(document.created_at)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated</span>
                </div>
                <p>{formatDate(document.updated_at)}</p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span>URI</span>
                </div>
                <p className="font-mono text-xs break-all">{document.uri}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Layers className="h-4 w-4" />
                  <span>Dimensions</span>
                </div>
                <p>{document.embedding.length}</p>
              </div>
            </div>
          </Card>

          {/* Content Preview */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {document.converted_format ? 'Converted Content (Markdown)' : 'Content'}
            </h2>

            {renderMarkdown && isMarkdownContent ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MarkdownRenderer content={document.text} />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-muted/30 p-4 rounded-lg">
                {document.text}
              </pre>
            )}
          </Card>

          {/* Original Content (if exists) */}
          {document.original_content && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Original Content (Org-mode)</h2>
              <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-muted/30 p-4 rounded-lg">
                {document.original_content}
              </pre>
            </Card>
          )}

          {/* Embedding Vector Preview */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Embedding Vector</h2>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Dimensions: {document.embedding.length}
              </div>
              {document.embedding.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">First 10 values:</div>
                  <code className="text-xs font-mono block overflow-x-auto bg-muted/30 p-3 rounded">
                    [{document.embedding.slice(0, 10).map(v => v.toFixed(6)).join(', ')}
                    {document.embedding.length > 10 ? ', ...' : ''}]
                  </code>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
