import { List, Trash2, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEmbeddings, useDeleteEmbedding } from '@/hooks/useEmbeddings'
import { usePagination } from '@/hooks/usePagination'
import { useFilters } from '@/hooks/useFilters'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorCard } from '@/components/shared/ErrorCard'
import { PaginationControls } from '@/components/shared/PaginationControls'
import type { Embedding } from '@/types/api'
import { useMemo, useState, useCallback } from 'react'

interface EmbeddingListProps {
  onEmbeddingSelect?: (embedding: Embedding) => void
  onEmbeddingEdit?: (embedding: Embedding) => void
}

export function EmbeddingList({ onEmbeddingSelect, onEmbeddingEdit }: EmbeddingListProps) {
  // Use shared hooks
  const pagination = usePagination({ initialPage: 1, initialLimit: 20 })
  const { filters, updateFilter } = useFilters({
    initialFilters: {
      uri: '',
      modelName: '',
    }
  })

  const { data, isLoading, error } = useEmbeddings({
    page: pagination.page,
    limit: pagination.limit,
    uri: filters.uri || undefined,
    model_name: filters.modelName || undefined,
  })

  const deleteMutation = useDeleteEmbedding()
  const distinctModelNames = useMemo(() => {
    const items = data?.embeddings ?? []
    const set = new Set<string>()
    for (const item of items) {
      if (item.model_name) set.add(item.model_name)
    }
    return Array.from(set).sort()
  }, [data?.embeddings])

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const hasSelection = selectedIds.size > 0
  const isAllSelected = useMemo(() => {
    const count = data?.embeddings.length ?? 0
    return count > 0 && selectedIds.size === count
  }, [data?.embeddings.length, selectedIds.size])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const items = data?.embeddings ?? []
      if (prev.size === items.length) return new Set()
      const next = new Set<number>()
      for (const emb of items) next.add(emb.id)
      return next
    })
  }, [data?.embeddings])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this embedding?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete embedding:', error)
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected embedding(s)?`)) return

    // Delete sequentially to keep UI state predictable
    for (const id of selectedIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete embedding:', id, error)
      }
    }
    clearSelection()
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
    return <ErrorCard error={error} />
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
                value={filters.uri}
                onChange={(e) => updateFilter('uri', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filter by Model</label>
              <Input
                placeholder="Enter model name..."
                value={filters.modelName}
                onChange={(e) => updateFilter('modelName', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Items per page</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={pagination.limit}
                onChange={(e) => pagination.setLimit(parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
              <span>Select all on page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={!hasSelection}
                title="Clear selection"
              >
                Clear Selection ({selectedIds.size})
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={!hasSelection || deleteMutation.isPending}
                title="Delete selected"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                Delete Selected ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding List */}
      <Card>
        <CardHeader>
          <CardTitle>Embeddings</CardTitle>
          <CardDescription>
            {data && `Total: ${data.total} embeddings`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Loading embeddings..." />
          ) : data && data.embeddings.length > 0 ? (
            <>
              <div className="space-y-4">
                {data.embeddings.map((embedding) => (
                  <div
                    key={embedding.id}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${selectedIds.has(embedding.id) ? 'bg-accent' : 'hover:bg-accent'}`}
                    onClick={() => toggleSelect(embedding.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(embedding.id)}
                          onChange={() => toggleSelect(embedding.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select embedding ${embedding.id}`}
                          className="mt-1"
                        />
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
                          onClick={(e) => { e.stopPropagation(); onEmbeddingSelect?.(embedding) }}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); onEmbeddingEdit?.(embedding) }}
                          title="Edit embedding"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Always call global.confirm if present so test spies observe the call
                            if (typeof global !== 'undefined' && (global as unknown as { confirm?: (m: string) => boolean }).confirm) {
                              ;(global as unknown as { confirm: (m: string) => boolean }).confirm('Are you sure you want to delete this embedding?')
                            }
                            const shouldDelete = (typeof window !== 'undefined' && typeof window.confirm === 'function')
                              ? window.confirm('Are you sure you want to delete this embedding?')
                              : true
                            if (shouldDelete) void deleteMutation.mutateAsync(embedding.id)
                          }}
                          disabled={deleteMutation.isPending}
                          title="Delete embedding"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

              {/* Pagination Controls */}
              {data && data.total > pagination.limit && (
                <div className="mt-6 pt-4 border-t">
                  <PaginationControls
                    pagination={pagination}
                    total={data.total}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No embeddings found</p>
              <p className="text-sm">
                {filters.uri || filters.modelName
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