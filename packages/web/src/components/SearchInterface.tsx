import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useSearchEmbeddings } from '@/hooks/useEmbeddings'
import type { SearchResult } from '@/types/api'

interface SearchInterfaceProps {
  onResultSelect?: (result: SearchResult) => void
}

export function SearchInterface({ onResultSelect }: SearchInterfaceProps) {
  const [query, setQuery] = useState('')
  const [searchParams, setSearchParams] = useState<{
    query: string
    limit: number
    threshold: number
    metric: 'cosine' | 'euclidean' | 'dot_product'
  }>({
    query: '',
    limit: 10,
    threshold: 0.7,
    metric: 'cosine',
  })

  // const { data: models } = useProviderModels()
  const { data: searchResults, isLoading: isSearching, error } = useSearchEmbeddings(searchParams)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchParams(prev => ({ ...prev, query: '' }))
      return
    }

    const timer = setTimeout(() => {
      setSearchParams(prev => ({ ...prev, query }))
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = () => {
    if (query.trim()) {
      setSearchParams(prev => ({ ...prev, query }))
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

          {/* Search Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Limit</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={searchParams.limit}
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  limit: parseInt(e.target.value) || 10
                }))}
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
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  threshold: parseFloat(e.target.value) || 0.7
                }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Metric</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchParams.metric}
                onChange={(e) => setSearchParams(prev => ({
                  ...prev,
                  metric: e.target.value as 'cosine' | 'euclidean' | 'dot_product'
                }))}
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
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Found {searchResults.total_results} results for "{searchResults.query}"
              using {searchResults.model_name} model
            </CardDescription>
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
                    <span className="text-sm font-mono bg-primary text-primary-foreground px-2 py-1 rounded">
                      {formatSimilarity(result.similarity)}
                    </span>
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