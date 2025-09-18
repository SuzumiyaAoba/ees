import { useState } from 'react'
import { List, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEmbeddings, useDeleteEmbedding } from '@/hooks/useEmbeddings'
import type { Embedding } from '@/types/api'

interface EmbeddingListProps {
  onEmbeddingSelect?: (embedding: Embedding) => void
}

export function EmbeddingList({ onEmbeddingSelect }: EmbeddingListProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [uriFilter, setUriFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const { data, isLoading, error } = useEmbeddings({
    page,
    limit,
    uri: uriFilter || undefined,
    model_name: modelFilter || undefined,
  })

  const deleteMutation = useDeleteEmbedding()

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this embedding?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete embedding:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatUri = (uri: string) => {
    // Extract filename from file paths or show full URI for other types
    if (uri.startsWith('file://')) {
      return uri.split('/').pop() || uri
    }
    return uri
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Embedding Collection
          </CardTitle>
          <CardDescription>
            Browse and manage your embedded documents and texts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Filter by URI</label>
              <Input
                placeholder="Enter URI to filter..."
                value={uriFilter}
                onChange={(e) => setUriFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filter by Model</label>
              <Input
                placeholder="Enter model name..."
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Items per page</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Embeddings</CardTitle>
              {data && (
                <CardDescription>
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, data.total)} of {data.total} embeddings
                </CardDescription>
              )}
            </div>
            {data && data.total > limit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(data.total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(data.total / limit)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-2">Loading embeddings...</span>
            </div>
          ) : data && data.embeddings.length > 0 ? (
            <div className="space-y-4">
              {data.embeddings.map((embedding) => (
                <div
                  key={embedding.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" title={embedding.uri}>
                        {formatUri(embedding.uri)}
                      </h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>ID: {embedding.id}</span>
                        <span>Model: {embedding.model_name}</span>
                        <span>Created: {formatDate(embedding.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEmbeddingSelect?.(embedding)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(embedding.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {truncateText(embedding.text)}
                  </p>

                  <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                    <span>Embedding dimensions: {embedding.embedding.length}</span>
                    <span>Last updated: {formatDate(embedding.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No embeddings found</p>
              <p className="text-sm">
                {uriFilter || modelFilter
                  ? 'Try adjusting your filters'
                  : 'Upload files or create embeddings to get started'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}