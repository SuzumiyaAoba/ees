import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { Eye, RefreshCw, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { apiClient } from '@/services/api'
import type {
  ReductionMethod,
  VisualizationDimensions,
  VisualizeEmbeddingResponse,
  VisualizationPoint,
} from '@/types/api'
import { ErrorCard } from '@/components/shared/ErrorCard'

interface MethodConfig {
  id: ReductionMethod
  label: string
  description: string
  color: string
}

const methods: MethodConfig[] = [
  {
    id: 'pca',
    label: 'PCA',
    description: 'Principal Component Analysis - Fast, deterministic, preserves global variance',
    color: 'bg-blue-500',
  },
  {
    id: 'tsne',
    label: 't-SNE',
    description: 't-SNE - Preserves local structure, good for clusters',
    color: 'bg-green-500',
  },
  {
    id: 'umap',
    label: 'UMAP',
    description: 'UMAP - Fast, preserves both local and global structure',
    color: 'bg-purple-500',
  },
]

export function EmbeddingVisualization() {
  const [method, setMethod] = useState<ReductionMethod>('pca')
  const [dimensions, setDimensions] = useState<VisualizationDimensions>(2)
  const [modelName, setModelName] = useState<string>('all')
  const [limit, setLimit] = useState<number>(100)
  const [perplexity, setPerplexity] = useState<number>(30)
  const [nNeighbors, setNNeighbors] = useState<number>(15)
  const [minDist, setMinDist] = useState<number>(0.1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisualizeEmbeddingResponse | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // Load available models from DB on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiClient.getDistinctEmbeddingModels()
        setAvailableModels(response.models)
      } catch (e) {
        console.error('Failed to load models:', e)
      }
    }

    loadModels()
  }, [])

  const handleVisualize = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.visualizeEmbeddings({
        method,
        dimensions,
        model_name: modelName !== 'all' ? modelName : undefined,
        limit,
        perplexity: method === 'tsne' ? perplexity : undefined,
        n_neighbors: method === 'umap' ? nNeighbors : undefined,
        min_dist: method === 'umap' ? minDist : undefined,
      })

      setData(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to visualize embeddings')
    } finally {
      setLoading(false)
    }
  }

  const renderPlot = () => {
    if (!data) return null

    const trace = dimensions === 2 ? render2DPlot(data.points) : render3DPlot(data.points)

    const layout = {
      title: {
        text: `${data.method.toUpperCase()} - ${data.dimensions}D Visualization (${data.total_points} points)`,
      },
      hovermode: 'closest' as const,
      autosize: true,
      height: 600,
      ...(dimensions === 3 && {
        scene: {
          xaxis: { title: { text: 'Component 1' } },
          yaxis: { title: { text: 'Component 2' } },
          zaxis: { title: { text: 'Component 3' } },
        },
      }),
      ...(dimensions === 2 && {
        xaxis: { title: { text: 'Component 1' } },
        yaxis: { title: { text: 'Component 2' } },
      }),
    }

    return (
      <div className="w-full">
        <Plot
          data={[trace]}
          layout={layout}
          config={{ responsive: true }}
          style={{ width: '100%', height: '600px' }}
        />
      </div>
    )
  }

  const render2DPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      mode: 'markers' as const,
      type: 'scatter' as const,
      text: points.map(p => `ID: ${p.id}`),
      marker: {
        size: 8,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
      },
      hovertemplate: '<b>%{text}</b><br>X: %{x:.3f}<br>Y: %{y:.3f}<extra></extra>',
    }
  }

  const render3DPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      text: points.map(p => `ID: ${p.id}`),
      marker: {
        size: 5,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
      },
      hovertemplate: '<b>%{text}</b><br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>',
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Embedding Visualization</h2>
        <p className="text-muted-foreground">
          Visualize embeddings using dimensionality reduction techniques (PCA, t-SNE, UMAP)
        </p>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Visualization Parameters</h3>

        <div className="space-y-4">
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Reduction Method</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    method === m.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${m.color}`} />
                    <span className="font-semibold">{m.label}</span>
                    {method === m.id && <Badge variant="secondary" className="ml-auto">Selected</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium mb-2">Dimensions</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDimensions(2)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  dimensions === 2
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-semibold">2D</span>
                <p className="text-xs text-muted-foreground">Two-dimensional scatter plot</p>
              </button>
              <button
                type="button"
                onClick={() => setDimensions(3)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                  dimensions === 3
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-semibold">3D</span>
                <p className="text-xs text-muted-foreground">Three-dimensional scatter plot</p>
              </button>
            </div>
          </div>

          {/* Model Name Filter */}
          <div>
            <label htmlFor="model-name" className="block text-sm font-medium mb-2">
              Model Name
            </label>
            <select
              id="model-name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            >
              <option value="all">All Models</option>
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Select a specific model or visualize all embeddings
            </p>
          </div>

          {/* Limit */}
          <div>
            <label htmlFor="limit" className="block text-sm font-medium mb-2">
              Maximum Points (1-10000)
            </label>
            <Input
              id="limit"
              type="number"
              min="1"
              max="10000"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>

          {/* Method-specific parameters */}
          {method === 'tsne' && (
            <div>
              <label htmlFor="perplexity" className="block text-sm font-medium mb-2">
                Perplexity (5-50)
              </label>
              <Input
                id="perplexity"
                type="number"
                min="5"
                max="50"
                value={perplexity}
                onChange={(e) => setPerplexity(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Controls the balance between local and global structure preservation
              </p>
            </div>
          )}

          {method === 'umap' && (
            <>
              <div>
                <label htmlFor="n-neighbors" className="block text-sm font-medium mb-2">
                  Number of Neighbors (2-100)
                </label>
                <Input
                  id="n-neighbors"
                  type="number"
                  min="2"
                  max="100"
                  value={nNeighbors}
                  onChange={(e) => setNNeighbors(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Larger values result in more global structure preservation
                </p>
              </div>

              <div>
                <label htmlFor="min-dist" className="block text-sm font-medium mb-2">
                  Minimum Distance (0.0-1.0)
                </label>
                <Input
                  id="min-dist"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={minDist}
                  onChange={(e) => setMinDist(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Controls how tightly points are packed in the low-dimensional space
                </p>
              </div>
            </>
          )}

          {/* Visualize Button */}
          <Button
            onClick={handleVisualize}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Visualization...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Visualize Embeddings
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <ErrorCard
          title="Visualization Error"
          error={error}
        />
      )}

      {/* Results */}
      {data && !loading && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Visualization Result</h3>
              <p className="text-sm text-muted-foreground">
                {data.total_points} points reduced using {data.method.toUpperCase()} to {data.dimensions}D
              </p>
            </div>
            <Button
              onClick={handleVisualize}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Plot */}
          {renderPlot()}

          {/* Parameters Info */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Parameters Used</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Method:</span>{' '}
                <span className="font-medium">{data.method.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dimensions:</span>{' '}
                <span className="font-medium">{data.dimensions}D</span>
              </div>
              {data.parameters.perplexity !== undefined && (
                <div>
                  <span className="text-muted-foreground">Perplexity:</span>{' '}
                  <span className="font-medium">{data.parameters.perplexity}</span>
                </div>
              )}
              {data.parameters.n_neighbors !== undefined && (
                <div>
                  <span className="text-muted-foreground">N Neighbors:</span>{' '}
                  <span className="font-medium">{data.parameters.n_neighbors}</span>
                </div>
              )}
              {data.parameters.min_dist !== undefined && (
                <div>
                  <span className="text-muted-foreground">Min Distance:</span>{' '}
                  <span className="font-medium">{data.parameters.min_dist}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Info Alert */}
      {!data && !loading && !error && (
        <Alert>
          <Eye className="h-4 w-4" />
          <div className="ml-3">
            <h4 className="font-semibold">Getting Started</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your visualization parameters above and click "Visualize Embeddings" to generate
              a 2D or 3D scatter plot of your embedding data.
            </p>
          </div>
        </Alert>
      )}
    </div>
  )
}
