import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSearchEmbeddings, useModels } from '@/hooks/useEmbeddings'
import { useFilters } from '@/hooks/useFilters'
import { ErrorCard } from '@/components/shared/ErrorCard'
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

  const { data: searchResults, isLoading: isSearching, error } = useSearchEmbeddings(searchApiParams)
  const { data: modelsData } = useModels()

  // When models are loaded, set default model to the first available one if not selected yet
  useEffect(() => {
    if (!modelsData?.models) return
    if (searchParams.model_name) return

    const firstAvailable = modelsData.models.find((m) => m.available)
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

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Semantic Search
          </CardTitle>
          <CardDescription>
            Search for similar embeddings using natural language queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {/* Title input for retrieval_document task type */}
          {searchParams.task_type === 'retrieval_document' && (
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                placeholder="Enter document title for better accuracy..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Providing a title improves search accuracy for document retrieval
              </p>
            </div>
          )}

          {/* Search Options */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${taskTypeOptions.length > 0 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
            <div>
              <label className="text-sm font-medium">Model</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchParams.model_name || ''}
                onChange={(e) => updateFilter('model_name', e.target.value)}
              >
                {modelsData?.models
                  .filter((model) => model.available)
                  .map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
              </select>
            </div>
            {!isLoadingTaskTypes && taskTypeOptions.length > 0 && (
              <div>
                <label className="text-sm font-medium">Task Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={searchParams.task_type || ''}
                  onChange={(e) => updateFilter('task_type', e.target.value ? e.target.value as TaskType : undefined)}
                  title={taskTypeOptions.find(opt => opt.value === searchParams.task_type)?.description}
                >
                  <option value="">All Types</option>
                  {taskTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Task type for both query and documents
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Limit</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={searchParams.limit}
                onChange={(e) => updateFilter('limit', parseInt(e.target.value) || 10)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Threshold</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={searchParams.threshold}
                onChange={(e) => updateFilter('threshold', parseFloat(e.target.value) || 0.7)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Metric</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchParams.metric}
                onChange={(e) => updateFilter('metric', e.target.value as 'cosine' | 'euclidean' | 'dot_product')}
              >
                <option value="cosine">Cosine</option>
                <option value="euclidean">Euclidean</option>
                <option value="dot_product">Dot Product</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {error && <ErrorCard error={error} />}

      {searchResults && searchResults.results.length > 0 && (
        <Card>
          <CardHeader>
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
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.results.map((result) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onResultSelect?.(result)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{result.uri}</h4>
                    <Badge variant="default" className="font-mono">
                      {formatSimilarity(result.similarity)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                    {result.text}
                  </p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Model: {result.model_name}</span>
                    <span>Created: {new Date(result.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.results.length === 0 && searchParams.query && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No results found for "{searchParams.query}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}