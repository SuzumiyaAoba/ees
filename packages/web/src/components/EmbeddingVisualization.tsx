import { useState, useEffect, useRef } from 'react'
import Plot from 'react-plotly.js'
import type { PlotMouseEvent } from 'plotly.js'
import Plotly from 'plotly.js'
import { Eye, RefreshCw, Loader2, X } from 'lucide-react'
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
  Embedding,
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
  const [modelName, setModelName] = useState<string>('')
  const [limit, setLimit] = useState<number>(100)
  const [perplexity, setPerplexity] = useState<number>(30)
  const [nNeighbors, setNNeighbors] = useState<number>(15)
  const [minDist, setMinDist] = useState<number>(0.1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisualizeEmbeddingResponse | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // Side panel state for displaying embedding details
  const [selectedEmbedding, setSelectedEmbedding] = useState<Embedding | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const plotDivRef = useRef<HTMLElement | null>(null)

  // Free text input state
  const [inputText, setInputText] = useState<string>('')
  const [inputPoints, setInputPoints] = useState<VisualizationPoint[]>([])
  const [loadingInput, setLoadingInput] = useState(false)

  // Load available models from DB on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiClient.getDistinctEmbeddingModels()
        setAvailableModels(response.models)
        // Set first model as default
        if (response.models.length > 0 && !modelName) {
          setModelName(response.models[0])
        }
      } catch (e) {
        console.error('Failed to load models:', e)
      }
    }

    loadModels()
  }, [])


  const handleVisualize = async () => {
    setLoading(true)
    setError(null)
    setInputPoints([]) // Clear previous input points

    try {
      const response = await apiClient.visualizeEmbeddings({
        method,
        dimensions,
        model_name: modelName,
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

  const handlePlotText = async () => {
    if (!inputText.trim() || !data) {
      return
    }

    setLoadingInput(true)
    setError(null)

    try {
      // Create temporary embedding with unique URI
      const tempUri = `temp://input-${Date.now()}`

      const embedding = await apiClient.createEmbedding({
        uri: tempUri,
        text: inputText,
        model_name: modelName,
      })

      // Re-visualize with same limit as original visualization
      const updatedResponse = await apiClient.visualizeEmbeddings({
        method,
        dimensions,
        model_name: modelName,
        limit, // Use same limit as current visualization
        perplexity: method === 'tsne' ? perplexity : undefined,
        n_neighbors: method === 'umap' ? nNeighbors : undefined,
        min_dist: method === 'umap' ? minDist : undefined,
      })

      console.log('[Plot Text Debug]', {
        tempUri,
        totalPointsReturned: updatedResponse.points.length,
        requestedLimit: limit,
        pointUris: updatedResponse.points.slice(0, 5).map(p => p.uri),
        hasInputPoint: updatedResponse.points.some(p => p.uri === tempUri),
      })

      // Find the input point in the new visualization
      const inputPoint = updatedResponse.points.find(p => p.uri === tempUri)

      if (inputPoint) {
        setInputPoints([inputPoint])
        setData(updatedResponse)
      } else {
        // Input point not found - this can happen if there are more embeddings than the limit
        setError(`Input text could not be visualized. The visualization is limited to ${limit} points. Try increasing the limit in the visualization parameters.`)
      }

      // Clean up temporary embedding
      await apiClient.deleteEmbedding(embedding.id)
    } catch (e) {
      console.error('Failed to plot text:', e)
      setError(e instanceof Error ? e.message : 'Failed to plot text')
    } finally {
      setLoadingInput(false)
    }
  }

  const handlePointClick = async (event: Readonly<PlotMouseEvent>) => {
    if (!data || !event.points || event.points.length === 0) {
      return
    }

    const firstPoint = event.points[0]
    // 2D uses pointIndex, 3D uses pointNumber
    const pointIndex = firstPoint.pointIndex ?? firstPoint.pointNumber ?? (firstPoint as any).pointIndices?.[0]

    if (pointIndex === undefined || pointIndex === null) {
      return
    }

    const point = data.points[pointIndex]
    if (!point) {
      return
    }

    setLoadingDetail(true)
    try {
      const embedding = await apiClient.getEmbedding(point.uri, point.model_name)
      setSelectedEmbedding(embedding)
    } catch (e) {
      console.error('Failed to load embedding details:', e)
      setError(e instanceof Error ? e.message : 'Failed to load embedding details')
    } finally {
      setLoadingDetail(false)
    }
  }

  const renderPlot = () => {
    if (!data) return null

    const traces = []

    // Main trace with all points
    const mainTrace = dimensions === 2 ? render2DPlot(data.points) : render3DPlot(data.points)
    traces.push(mainTrace)

    // Add input points trace if exists
    if (inputPoints.length > 0) {
      const inputTrace = dimensions === 2 ? render2DInputPlot(inputPoints) : render3DInputPlot(inputPoints)
      traces.push(inputTrace)
    }

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
          data={traces}
          layout={layout}
          config={{ responsive: true }}
          style={{ width: '100%', height: '600px' }}
          onInitialized={(_figure, graphDiv) => {
            plotDivRef.current = graphDiv

            // Add native Plotly event listeners (react-plotly.js onClick doesn't work reliably)
            const plotlyDiv = graphDiv as unknown as Plotly.PlotlyHTMLElement

            plotlyDiv.on('plotly_click', (eventData: Plotly.PlotMouseEvent) => {
              handlePointClick(eventData)
            })
          }}
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
      text: points.map(p => p.uri),
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
      text: points.map(p => p.uri),
      marker: {
        size: 5,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
      },
      hovertemplate: '<b>%{text}</b><br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>',
    }
  }

  const render2DInputPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      mode: 'markers+text' as 'markers',
      type: 'scatter' as const,
      name: 'Your Input',
      text: points.map(() => 'Your Input'),
      textposition: 'top center' as 'top center',
      textfont: {
        size: 14,
        color: '#ff6b00',
        family: 'Arial, sans-serif',
      },
      marker: {
        size: 20,
        color: '#ff6b00',
        symbol: 'star' as 'star',
        line: {
          color: '#ffffff',
          width: 3,
        },
        opacity: 1,
      },
      hovertemplate: '<b>Your Input</b><br>X: %{x:.3f}<br>Y: %{y:.3f}<extra></extra>',
    }
  }

  const render3DInputPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers+text' as 'markers',
      type: 'scatter3d' as const,
      name: 'Your Input',
      text: points.map(() => 'Your Input'),
      textposition: 'top center' as 'top center',
      textfont: {
        size: 10,
        color: '#ff6b00',
        family: 'Arial, sans-serif',
      },
      marker: {
        size: 5,
        color: '#ff6b00',
        symbol: 'diamond' as 'diamond',
        line: {
          color: '#ffffff',
          width: 2,
        },
        opacity: 1,
      },
      hovertemplate: '<b>Your Input</b><br>X: %{x:.3f}<br>Y: %{y:.3f}<br>Z: %{z:.3f}<extra></extra>',
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
              {availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the model to visualize embeddings
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

          {/* Grid Layout: Plot + Detail Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plot Area */}
            <div className={selectedEmbedding ? "lg:col-span-2" : "lg:col-span-3"}>
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
            </div>

            {/* Detail Side Panel */}
            {selectedEmbedding && (
              <div className="lg:col-span-1">
                <Card className="p-4 sticky top-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">Document Details</h4>
                      <Badge variant="secondary" className="text-xs">{selectedEmbedding.model_name}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmbedding(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                    {/* URI */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">URI</label>
                      <p className="mt-1 font-mono text-sm break-all">{selectedEmbedding.uri}</p>
                    </div>

                    {/* Original Content */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {selectedEmbedding.original_content ? 'Original Content' : 'Text Content'}
                      </label>
                      <Card className="mt-1 p-3 bg-muted/30">
                        <p className="text-sm whitespace-pre-wrap break-words overflow-y-auto">
                          {selectedEmbedding.original_content || selectedEmbedding.text}
                        </p>
                      </Card>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Text Input Section */}
      {data && !loading && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Plot Custom Text</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your own text to see where it would be positioned in the current visualization
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="input-text" className="block text-sm font-medium mb-2">
                Your Text
              </label>
              <textarea
                id="input-text"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter text to visualize its position among the existing embeddings..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loadingInput}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The text will be embedded using {modelName} and plotted on the graph
              </p>
            </div>

            <Button
              onClick={handlePlotText}
              disabled={loadingInput || !inputText.trim()}
              className="w-full"
            >
              {loadingInput ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Plotting Text...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Plot Text on Graph
                </>
              )}
            </Button>
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

      {/* Loading Detail Indicator */}
      {loadingDetail && (
        <div className="fixed bottom-4 right-4 bg-background p-4 rounded-lg shadow-lg border z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading embedding details...</p>
          </div>
        </div>
      )}
    </div>
  )
}
