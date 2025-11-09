import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, FileText, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormField } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSearchEmbeddings, useProviderModels, useEmbeddings } from '@/hooks/useEmbeddings'
import { useFilters } from '@/hooks/useFilters'
import { ErrorCard } from '@/components/shared/ErrorCard'
import { QuickLookPopup } from '@/components/QuickLookPopup'
import { SearchResultCard } from '@/components/SearchResultCard'
import { apiClient } from '@/services/api'
import type { SearchResult, TaskType, TaskTypeMetadata } from '@/types/api'

interface SearchInterfaceProps {
  onResultSelect?: (result: SearchResult) => void
}

export function SearchInterface({ onResultSelect }: SearchInterfaceProps) {
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeMetadata[]>([])
  const [isLoadingTaskTypes, setIsLoadingTaskTypes] = useState(false)
  const [renderMarkdown, setRenderMarkdown] = useState(false)
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic')

  // Quick look state
  const [quickLookItem, setQuickLookItem] = useState<SearchResult | null>(null)
  const [quickLookMarkdown, setQuickLookMarkdown] = useState(false)

  // Use shared filters hook
  const { filters: searchParams, updateFilter } = useFilters({
    initialFilters: {
      query: '',
      limit: 10,
      threshold: 0.7,
      metric: 'cosine' as 'cosine' | 'euclidean' | 'dot_product',
      model_name: undefined as string | undefined,
      task_type: undefined as TaskType | undefined,
      query_title: undefined as string | undefined,
    }
  })

  // Convert single task_type to both query_task_type and document_task_type for API
  const searchApiParams = {
    ...searchParams,
    query_task_type: searchParams.task_type,
    document_task_type: searchParams.task_type,
  }

  // Semantic search (vector similarity)
  const { data: semanticResults, isLoading: isSemanticSearching, error: semanticError } = useSearchEmbeddings(searchApiParams)

  // Keyword search (fetch all embeddings and filter client-side)
  const { data: allEmbeddings, isLoading: isLoadingEmbeddings, error: keywordError } = useEmbeddings({
    limit: 1000, // Fetch a large number for keyword search
    model_name: searchParams.model_name,
  })

  // Filter embeddings by keyword (partial match in text or URI)
  // Only include embeddings with retrieval task types
  const keywordResults = useMemo(() => {
    if (!query.trim() || !allEmbeddings) return null

    const queryLower = query.toLowerCase()
    const filtered = allEmbeddings.embeddings.filter(
      (emb) => {
        // Only include retrieval task types (retrieval_query or retrieval_document)
        const isRetrievalType = emb.task_type?.startsWith('retrieval')
        if (!isRetrievalType) return false

        return (
          emb.text.toLowerCase().includes(queryLower) ||
          emb.uri.toLowerCase().includes(queryLower)
        )
      }
    )

    // Transform to SearchResult format
    return {
      results: filtered.slice(0, searchParams.limit).map(emb => ({
        ...emb,
        similarity: 1.0, // No similarity score for keyword search
      })),
      query,
      model_name: searchParams.model_name || 'all',
      limit: searchParams.limit,
      metric: 'keyword',
      total_results: filtered.length,
    }
  }, [query, allEmbeddings, searchParams.limit, searchParams.model_name])

  // Select results based on search mode
  const searchResults = searchMode === 'semantic' ? semanticResults : keywordResults
  const isSearching = searchMode === 'semantic' ? isSemanticSearching : isLoadingEmbeddings
  const error = searchMode === 'semantic' ? semanticError : keywordError

  const { data: modelsData } = useProviderModels()

  // When models are loaded, set default model to the first available one if not selected yet
  useEffect(() => {
    if (!modelsData) return
    if (searchParams.model_name) return

    const firstAvailable = modelsData[0]
    if (firstAvailable?.name) {
      updateFilter('model_name', firstAvailable.name)
    }
  }, [modelsData, searchParams.model_name, updateFilter])

  // Load task types when model changes
  useEffect(() => {
    const loadTaskTypes = async () => {
      if (!searchParams.model_name) return

      setIsLoadingTaskTypes(true)
      try {
        const response = await apiClient.getTaskTypes(searchParams.model_name)
        setTaskTypeOptions(response.task_types)

        // If current task type is not supported by the new model, reset to the first available
        // If no task types available, clear the task_type
        if (response.task_types.length === 0) {
          updateFilter('task_type', undefined)
        } else {
          const isSupported = response.task_types.some(t => t.value === searchParams.task_type)
          if (!isSupported) {
            updateFilter('task_type', response.task_types[0].value as TaskType)
          }
        }
      } catch (error) {
        console.error('Failed to load task types:', error)
        // On error, clear task types (model doesn't support them)
        setTaskTypeOptions([])
        updateFilter('task_type', undefined)
      } finally {
        setIsLoadingTaskTypes(false)
      }
    }

    loadTaskTypes()
  }, [searchParams.model_name])

  // Debounced search for query
  useEffect(() => {
    if (!query.trim()) {
      updateFilter('query', '')
      return
    }

    const timer = setTimeout(() => {
      updateFilter('query', query)
    }, 500)

    return () => clearTimeout(timer)
  }, [query, updateFilter])

  // Debounced search for title
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter('query_title', title || undefined)
    }, 500)

    return () => clearTimeout(timer)
  }, [title, updateFilter])

  const handleSearch = () => {
    if (query.trim()) {
      updateFilter('query', query)
      updateFilter('query_title', title || undefined)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {searchMode === 'semantic' ? 'Semantic Search' : 'Keyword Search'}
          </CardTitle>
          <CardDescription>
            {searchMode === 'semantic'
              ? 'Search for similar embeddings using natural language queries'
              : 'Search for exact keyword matches in text and URI'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <Button
              size="sm"
              variant={searchMode === 'semantic' ? 'default' : 'ghost'}
              onClick={() => setSearchMode('semantic')}
              className="gap-2"
            >
              Semantic
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'keyword' ? 'default' : 'ghost'}
              onClick={() => setSearchMode('keyword')}
              className="gap-2"
            >
              Keyword
            </Button>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
              ) : (
                <Search className="h-5 w-5 text-on-surface-variant" />
              )}
            </div>
            <input
              type="text"
              placeholder={searchMode === 'semantic' ? 'Enter your search query...' : 'Enter keywords to search...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full h-14 pl-12 pr-4 rounded-full bg-gray-200 text-on-surface placeholder:text-on-surface-variant focus:outline-none transition-all body-large"
            />
          </div>

          {/* Title input for retrieval_document task type - Semantic search only */}
          {searchMode === 'semantic' && searchParams.task_type === 'retrieval_document' && (
            <FormField
              label="Title (optional)"
              helpText="Providing a title improves search accuracy for document retrieval"
            >
              <Input
                placeholder="Enter document title for better accuracy..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
            </FormField>
          )}

          {/* Search Options */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${searchMode === 'semantic' && taskTypeOptions.length > 0 ? 'lg:grid-cols-6' : searchMode === 'semantic' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
            <FormSelect
              label="Model"
              value={searchParams.model_name || ''}
              onChange={(value) => updateFilter('model_name', value)}
              options={modelsData?.map((model) => ({
                value: model.name,
                label: model.displayName || model.name,
              })) || []}
            />
            {searchMode === 'semantic' && !isLoadingTaskTypes && taskTypeOptions.length > 0 && (
              <FormSelect
                label="Task Type"
                value={searchParams.task_type || ''}
                onChange={(value) => updateFilter('task_type', value ? value as TaskType : undefined)}
                options={[
                  { value: '', label: 'All Types' },
                  ...taskTypeOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
                helpText="Task type for both query and documents"
              />
            )}
            <FormField label="Limit">
              <Input
                type="number"
                min="1"
                max="100"
                value={searchParams.limit}
                onChange={(e) => updateFilter('limit', parseInt(e.target.value) || 10)}
              />
            </FormField>
            {searchMode === 'semantic' && (
              <>
                <FormField label="Threshold">
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={searchParams.threshold}
                    onChange={(e) => updateFilter('threshold', parseFloat(e.target.value) || 0.7)}
                  />
                </FormField>
                <FormSelect
                  label="Metric"
                  value={searchParams.metric}
                  onChange={(value) => updateFilter('metric', value as 'cosine' | 'euclidean' | 'dot_product')}
                  options={[
                    { value: 'cosine', label: 'Cosine' },
                    { value: 'euclidean', label: 'Euclidean' },
                    { value: 'dot_product', label: 'Dot Product' },
                  ]}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {error && <ErrorCard error={error} />}

      {searchResults && searchResults.results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {searchResults.total_results} results for "{searchResults.query}"
                  using {searchResults.model_name} model
                </CardDescription>
                <div className="text-sm text-muted-foreground pt-2">
                  Showing {searchResults.results.length} of {searchResults.total_results} results
                  {searchResults.results.length < searchResults.total_results &&
                    ` (increase limit to see more)`}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRenderMarkdown(!renderMarkdown)}
                className="gap-2"
              >
                {renderMarkdown ? (
                  <>
                    <FileText className="h-4 w-4" />
                    Show Raw
                  </>
                ) : (
                  <>
                    <FileCode className="h-4 w-4" />
                    Render Markdown
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  renderMarkdown={renderMarkdown}
                  onLongPress={(result) => {
                    setQuickLookItem(result)
                    setQuickLookMarkdown(renderMarkdown)
                  }}
                  onSelect={() => onResultSelect?.(result)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.results.length === 0 && searchParams.query && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title={`No results found for "${searchParams.query}"`}
              description="Try adjusting your search query or filters"
              size="md"
            />
          </CardContent>
        </Card>
      )}

      {/* Quick Look Popup */}
      {quickLookItem && (
        <QuickLookPopup
          item={quickLookItem}
          onClose={() => setQuickLookItem(null)}
          renderMarkdown={quickLookMarkdown}
          onToggleMarkdown={() => setQuickLookMarkdown(!quickLookMarkdown)}
        />
      )}
    </div>
  )
}