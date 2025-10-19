import { useState, useEffect, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import type { PlotMouseEvent } from 'plotly.js'
import Plotly from 'plotly.js'
import { Eye, Loader2, X, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  const [plotInitialized, setPlotInitialized] = useState(false)
  
  // Hover info state for fixed position display
  const [hoverInfo, setHoverInfo] = useState<{
    uri: string
    coordinates: number[]
    isInputPoint: boolean
    originalDocument?: string
  } | null>(null)
  const unhoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredUriRef = useRef<string | null>(null)
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [hoverDelayMs, setHoverDelayMs] = useState(200) // 200ms default for more responsive loading

  // Free text input state
  const [inputText, setInputText] = useState<string>('')
  const [inputPoints, setInputPoints] = useState<VisualizationPoint[]>([])
  const [loadingInput, setLoadingInput] = useState(false)
  
  // Store input text content locally for display when clicked
  const [inputTextContent, setInputTextContent] = useState<{uri: string, text: string, modelName: string} | null>(null)

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

  // Handle hover events
  const handlePlotHover = useCallback((eventData: Readonly<Plotly.PlotMouseEvent>) => {
    // Clear any pending unhover timeout
    if (unhoverTimeoutRef.current) {
      clearTimeout(unhoverTimeoutRef.current)
      unhoverTimeoutRef.current = null
    }

    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (eventData.points && eventData.points.length > 0) {
      const point = eventData.points[0]
      const curveNumber = point.curveNumber

      // curveNumber 0: data points
      // curveNumber 1: input points (if exists)
      // curveNumber 2: highlight point (if exists)

      if (curveNumber === 1 && inputPoints.length > 0) {
        // Hovering over input point
        setHoverInfo({
          uri: inputPoints[0].uri,
          coordinates: inputPoints[0].coordinates,
          isInputPoint: true,
          originalDocument: inputTextContent?.text,
        })
      } else if (curveNumber === 0 && data) {
        // Hovering over data point
        // 2D uses pointIndex, 3D uses pointNumber
        const pointIndex = point.pointIndex ?? point.pointNumber

        console.log('[3D Debug] Hover event:', {
          pointIndex,
          pointNumber: point.pointNumber,
          pointIndexDirect: point.pointIndex,
          curveNumber,
          dataPointsCount: data.points.length,
          dimensions
        })

        // Validate pointIndex exists
        if (pointIndex === undefined || pointIndex === null) {
          console.warn('Could not determine point index from hover event:', point)
          return
        }

        const dataPoint = data.points[pointIndex]
        console.log('[3D Debug] Data point lookup:', {
          pointIndex,
          found: !!dataPoint,
          uri: dataPoint?.uri,
          model_name: dataPoint?.model_name
        })

        if (dataPoint) {
          // Debounce: ignore if we're already processing the same point
          if (lastHoveredUriRef.current === dataPoint.uri) {
            console.log('[3D Debug] Debounced - same point:', dataPoint.uri)
            return
          }

          // Clear any existing timeout before starting new one
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
          }

          lastHoveredUriRef.current = dataPoint.uri
          console.log('[3D Debug] New hover target:', dataPoint.uri)

          // Set basic hover info immediately
          setHoverInfo({
            uri: dataPoint.uri,
            coordinates: dataPoint.coordinates,
            isInputPoint: false,
          })

          // Capture dataPoint values in local variables for closure
          const uri = dataPoint.uri
          const modelName = dataPoint.model_name

          // Schedule fetching original document after delay
          console.log('[3D Debug] Scheduling fetch in', hoverDelayMs, 'ms')
          hoverTimeoutRef.current = setTimeout(async () => {
            console.log('[3D Debug] Fetching document for:', uri, modelName)
            try {
              const embedding = await apiClient.getEmbedding(uri, modelName)
              console.log('[3D Debug] Document fetched successfully:', {
                uri: embedding.uri,
                hasOriginalContent: !!embedding.original_content,
                hasText: !!embedding.text,
                contentLength: (embedding.original_content || embedding.text)?.length
              })
              // Safety check: only update if still hovering over the same point
              setHoverInfo(prev => prev && prev.uri === uri ? {
                ...prev,
                originalDocument: embedding.original_content || embedding.text
              } : prev)
            } catch (error) {
              console.error('[3D Debug] Failed to fetch document:', error)
            }
          }, hoverDelayMs)
        } else {
          console.warn('[3D Debug] No data point at index:', pointIndex)
        }
      }
    }
  }, [data, inputPoints, hoverDelayMs, inputTextContent, dimensions])

  const handlePlotUnhover = useCallback(() => {
    // Clear any existing timeout
    if (unhoverTimeoutRef.current) {
      clearTimeout(unhoverTimeoutRef.current)
    }

    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Clear last hovered URI so next hover will trigger
    lastHoveredUriRef.current = null

    // Don't clear hover info immediately - keep it visible until next hover
    // This allows users to read the information even after moving cursor away
  }, [])

  const handlePointClick = useCallback(async (event: Readonly<PlotMouseEvent>) => {
    if (!event.points || event.points.length === 0) {
      return
    }

    const firstPoint = event.points[0]
    const curveNumber = firstPoint.curveNumber

    // Check if clicked on input point (second trace)
    if (curveNumber === 1 && inputTextContent) {
      // Display locally stored input text content
      setSelectedEmbedding({
        id: 0,
        uri: inputTextContent.uri,
        text: inputTextContent.text,
        model_name: inputTextContent.modelName,
        embedding: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        original_content: undefined,
        converted_format: undefined,
      })
      return
    }

    // Handle normal data points
    if (!data) {
      return
    }

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
  }, [data, inputTextContent])


  // Setup event listeners when hoverDelayMs changes or plot is initialized
  useEffect(() => {
    if (!plotInitialized || !plotDivRef.current) return

    const plotlyDiv = plotDivRef.current as unknown as Plotly.PlotlyHTMLElement

    // Remove existing listeners
    plotlyDiv.removeAllListeners?.('plotly_hover')
    plotlyDiv.removeAllListeners?.('plotly_unhover')
    plotlyDiv.removeAllListeners?.('plotly_click')

    // Add event listeners with current handlers
    plotlyDiv.on('plotly_click', (eventData: Plotly.PlotMouseEvent) => {
      handlePointClick(eventData)
    })

    plotlyDiv.on('plotly_hover', (eventData: Plotly.PlotMouseEvent) => {
      handlePlotHover(eventData)
    })

    plotlyDiv.on('plotly_unhover', () => {
      handlePlotUnhover()
    })

    // Cleanup function
    return () => {
      if (unhoverTimeoutRef.current) {
        clearTimeout(unhoverTimeoutRef.current)
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      // Clean up Plotly event listeners
      if (plotDivRef.current) {
        const div = plotDivRef.current as unknown as Plotly.PlotlyHTMLElement
        div.removeAllListeners?.('plotly_hover')
        div.removeAllListeners?.('plotly_unhover')
        div.removeAllListeners?.('plotly_click')
      }
    }
  }, [plotInitialized, handlePlotHover, handlePlotUnhover, handlePointClick])


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

    // Store input text content locally for display when clicked
    const tempUri = `temp://input-${Date.now()}`
    setInputTextContent({
      uri: tempUri,
      text: inputText,
      modelName: modelName,
    })

    let embeddingId: number | null = null

    try {
      // Create temporary embedding with unique URI
      const embedding = await apiClient.createEmbedding({
        uri: tempUri,
        text: inputText,
        model_name: modelName,
      })
      
      embeddingId = embedding.id

      // Verify the embedding can be retrieved before visualization
      // Retry up to 5 times with exponential backoff
      let embeddingVerified = false
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await apiClient.getEmbedding(tempUri, modelName)
          embeddingVerified = true
          break
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)))
        }
      }

      if (!embeddingVerified) {
        throw new Error('Failed to verify embedding creation')
      }

      // Wait longer to ensure database transaction is fully committed and indexed
      // This is especially important for visualization queries that use ORDER BY
      await new Promise(resolve => setTimeout(resolve, 500))

      // Re-visualize with include_uris to ensure the input text is included
      // include_uris are added on top of limit, so this will show limit + 1 points
      const updatedResponse = await apiClient.visualizeEmbeddings({
        method,
        dimensions,
        model_name: modelName,
        limit,
        perplexity: method === 'tsne' ? perplexity : undefined,
        n_neighbors: method === 'umap' ? nNeighbors : undefined,
        min_dist: method === 'umap' ? minDist : undefined,
        include_uris: [tempUri], // Adds input text on top of limit
      })

      // Find the input point in the visualization
      const inputPoint = updatedResponse.points.find(p => p.uri === tempUri)

      if (inputPoint) {
        // Successfully found the input point
        // Filter out the input point from main data to avoid duplication
        const mainPoints = updatedResponse.points.filter(p => p.uri !== tempUri)

        setInputPoints([inputPoint])
        setData({
          method: updatedResponse.method,
          dimensions: updatedResponse.dimensions,
          parameters: updatedResponse.parameters,
          points: mainPoints,
          total_points: mainPoints.length,
        })
      } else {
        // This should not happen with include_uris, but handle it gracefully
        const debugInfo = updatedResponse.debug_info
        let errorMessage = 'Input text could not be visualized.'
        
        if (debugInfo) {
          if (debugInfo.include_uris_found === 0 && debugInfo.include_uris_failed && debugInfo.include_uris_failed.length > 0) {
            errorMessage = `Failed to fetch embedding for: ${debugInfo.include_uris_failed.join(', ')}. The embedding may not be stored in the database.`
          } else if (debugInfo.include_uris_found === 0) {
            errorMessage = 'Input embedding not found in database. Please try again.'
          } else {
            errorMessage = 'Input embedding was fetched but not included in visualization. This is unexpected.'
          }
        } else {
          errorMessage = 'Input text could not be visualized. The server may need to be restarted to apply updates.'
        }
        
        setError(errorMessage)
      }
    } catch (e) {
      console.error('Failed to plot text:', e)
      setError(e instanceof Error ? e.message : 'Failed to plot text')
    } finally {
      // Always clean up temporary embedding
      if (embeddingId !== null) {
        try {
          await apiClient.deleteEmbedding(embeddingId)
        } catch (deleteError) {
          console.error('Failed to delete temporary embedding:', deleteError)
        }
      }
      setLoadingInput(false)
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

    // Highlight selected point
    if (selectedEmbedding) {
      // Find the selected point in data or inputPoints
      let selectedPoint: VisualizationPoint | null = null
      
      // Check if it's the input point
      if (inputPoints.length > 0 && inputPoints[0].uri === selectedEmbedding.uri) {
        selectedPoint = inputPoints[0]
      } else {
        // Check in main data points
        selectedPoint = data.points.find(
          p => p.uri === selectedEmbedding.uri && p.model_name === selectedEmbedding.model_name
        ) || null
      }

      if (selectedPoint) {
        const highlightTrace = dimensions === 2 
          ? render2DHighlightPlot([selectedPoint]) 
          : render3DHighlightPlot([selectedPoint])
        traces.push(highlightTrace)
      }
    }

    const layout = {
      hovermode: 'closest' as const,
      hoverdistance: 20,
      autosize: true,
      margin: { t: 20, r: 20, b: 40, l: 40 },
      uirevision: 'true', // Preserve zoom/pan state across updates
      ...(dimensions === 3 && {
        scene: {
          xaxis: { title: { text: 'Component 1' } },
          yaxis: { title: { text: 'Component 2' } },
          zaxis: { title: { text: 'Component 3' } },
          camera: {
            eye: { x: 1.5, y: 1.5, z: 1.5 }
          }
        },
      }),
      ...(dimensions === 2 && {
        xaxis: { title: { text: 'Component 1' } },
        yaxis: { title: { text: 'Component 2' } },
      }),
      hoverlabel: {
        namelength: -1,
        align: 'left' as const,
      },
    }

    return (
      <div className="w-full h-full">
        <Plot
          data={traces}
          layout={layout}
          config={{ responsive: true, displayModeBar: true }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
          onInitialized={(_figure, graphDiv) => {
            plotDivRef.current = graphDiv
            setPlotInitialized(true)
            // Event listeners are managed by useEffect to allow updates when handlers change
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
      marker: {
        size: 8,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
      },
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  const render3DPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      marker: {
        size: 3,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
        line: {
          width: 0,
        },
      },
      hovertemplate: '<extra></extra>',
      showlegend: false,
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
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  const render3DInputPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      name: 'Your Input',
      marker: {
        size: 8,
        color: '#ff6b00',
        symbol: 'diamond' as 'diamond',
        line: {
          color: '#ffffff',
          width: 1.5,
        },
        opacity: 1,
      },
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  const render2DHighlightPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      mode: 'markers' as const,
      type: 'scatter' as const,
      name: 'Selected',
      marker: {
        size: 20,
        color: '#ef4444',
        symbol: 'circle' as const,
        line: {
          color: '#ffffff',
          width: 3,
        },
        opacity: 0.8,
      },
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  const render3DHighlightPlot = (points: VisualizationPoint[]) => {
    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      name: 'Selected',
      marker: {
        size: 15,
        color: '#ef4444',
        symbol: 'circle' as const,
        line: {
          color: '#ffffff',
          width: 2,
        },
        opacity: 0.8,
      },
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  // Sidebar toggle state
  const [showControls, setShowControls] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(true)

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight">Embedding Visualization</h2>
          {data && (
            <Badge variant="secondary" className="text-xs">
              {data.total_points} points · {data.method.toUpperCase()} · {data.dimensions}D
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Controls */}
        {showControls ? (
          <div className="w-80 border-r bg-background overflow-y-auto flex flex-col">
            {/* Controls Header with Close Button */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Controls</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowControls(false)}
                className="gap-2 h-8"
                title="Hide control panel"
              >
                <span className="text-xs">Hide</span>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Method Selection */}
              <div>
                <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase">Method</label>
                <div className="space-y-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        method === m.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${m.color}`} />
                        <span className="font-medium text-sm">{m.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-tight line-clamp-2">
                        {m.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase">Dimensions</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDimensions(2)}
                    className={`flex-1 p-2 rounded-lg border transition-all text-sm font-medium ${
                      dimensions === 2
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    onClick={() => setDimensions(3)}
                    className={`flex-1 p-2 rounded-lg border transition-all text-sm font-medium ${
                      dimensions === 3
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    3D
                  </button>
                </div>
              </div>

              {/* Model Name Filter */}
              <div>
                <label htmlFor="model-name" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                  Model
                </label>
                <select
                  id="model-name"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Limit */}
              <div>
                <label htmlFor="limit" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                  Max Points
                </label>
                <Input
                  id="limit"
                  type="number"
                  min="1"
                  max="10000"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-9"
                />
              </div>

              {/* Method-specific parameters */}
              {method === 'tsne' && (
                <div>
                  <label htmlFor="perplexity" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                    Perplexity
                  </label>
                  <Input
                    id="perplexity"
                    type="number"
                    min="5"
                    max="50"
                    value={perplexity}
                    onChange={(e) => setPerplexity(Number(e.target.value))}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground mt-1">5-50</p>
                </div>
              )}

              {method === 'umap' && (
                <>
                  <div>
                    <label htmlFor="n-neighbors" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                      Neighbors
                    </label>
                    <Input
                      id="n-neighbors"
                      type="number"
                      min="2"
                      max="100"
                      value={nNeighbors}
                      onChange={(e) => setNNeighbors(Number(e.target.value))}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">2-100</p>
                  </div>

                  <div>
                    <label htmlFor="min-dist" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                      Min Distance
                    </label>
                    <Input
                      id="min-dist"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={minDist}
                      onChange={(e) => setMinDist(Number(e.target.value))}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground mt-1">0.0-1.0</p>
                  </div>
                </>
              )}

              <div className="border-t pt-4">
                {/* Visualize Button */}
                <Button
                  onClick={handleVisualize}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualize
                    </>
                  )}
                </Button>
              </div>

              {/* Text Input Section - Compact */}
              {data && !loading && (
                <div className="border-t pt-4 space-y-3">
                  <label className="block text-xs font-medium text-muted-foreground uppercase">
                    Plot Custom Text
                  </label>
                  <textarea
                    id="input-text"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter text to plot..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={loadingInput}
                  />
                  <Button
                    onClick={handlePlotText}
                    disabled={loadingInput || !inputText.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {loadingInput ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Plotting...
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-2" />
                        Plot Text
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Settings */}
              {showSettings && (
                <div className="border-t pt-4 space-y-3">
                  <label className="block text-xs font-medium text-muted-foreground uppercase">
                    Hover Delay (ms)
                  </label>
                  <Input
                    type="number"
                    value={hoverDelayMs}
                    onChange={(e) => setHoverDelayMs(Number(e.target.value))}
                    min="100"
                    max="10000"
                    step="100"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">100-10000ms</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="w-full"
              >
                ⚙️ {showSettings ? 'Hide' : 'Show'} Settings
              </Button>
            </div>
          </div>
        ) : (
          /* Collapsed Left Panel Toggle */
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(true)}
              className="absolute top-4 left-0 z-10 rounded-l-none rounded-r-md border-l-0 h-16 px-2 shadow-md hover:shadow-lg transition-shadow"
              title="Show control panel"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Center - Visualization Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Error Display */}
          {error && (
            <div className="p-4 border-b">
              <ErrorCard
                title="Visualization Error"
                error={error}
              />
            </div>
          )}

          {/* No Data State */}
          {!data && !loading && !error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Ready to Visualize</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your parameters in the left panel and click "Visualize" to generate
                  a 2D or 3D scatter plot of your embeddings.
                </p>
              </div>
            </div>
          )}

          {/* Visualization */}
          {data && !loading && (
            <div className="flex-1 overflow-auto relative">
              <div className="h-full p-4">{renderPlot()}</div>

              {/* Floating Hover Info - Visible when right panel is closed */}
              {hoverInfo && !showDetailPanel && (
                <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] p-4 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-lg shadow-lg z-20 animate-in fade-in slide-in-from-right-2 duration-200">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    {hoverInfo.isInputPoint && <span>🎯</span>}
                    Hover Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">URI</span>
                      <p className="font-mono text-xs break-all mt-1">{hoverInfo.uri}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">Coordinates</span>
                      <p className="font-mono text-xs mt-1">
                        {hoverInfo.coordinates.map((c, i) =>
                          `${['X', 'Y', 'Z'][i]}: ${c.toFixed(3)}`
                        ).join(' | ')}
                      </p>
                    </div>
                    {hoverInfo.isInputPoint && (
                      <div className="text-xs text-primary font-medium">
                        ✨ This is your input text
                      </div>
                    )}
                    {hoverInfo.originalDocument ? (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Document</span>
                        <div className="mt-1 p-3 bg-muted/30 rounded border max-h-32 overflow-y-auto">
                          <p className="text-xs whitespace-pre-wrap break-words">
                            {hoverInfo.originalDocument}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        Hover for {hoverDelayMs}ms to load document...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating visualization...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Information */}
        {data && !loading && (
          showDetailPanel ? (
            <div className="w-96 border-l bg-background overflow-y-auto flex flex-col">
              {/* Info Header with Close Button */}
              <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Information</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailPanel(false)}
                  className="gap-2 h-8"
                  title="Hide information panel"
                >
                  <span className="text-xs">Hide</span>
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Hover Info */}
              {hoverInfo && (
                <div className="p-4 bg-primary/5 border-2 border-primary/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    {hoverInfo.isInputPoint && <span>🎯</span>}
                    Hover Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">URI</span>
                      <p className="font-mono text-xs break-all mt-1">{hoverInfo.uri}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">Coordinates</span>
                      <p className="font-mono text-xs mt-1">
                        {hoverInfo.coordinates.map((c, i) =>
                          `${['X', 'Y', 'Z'][i]}: ${c.toFixed(3)}`
                        ).join(' | ')}
                      </p>
                    </div>
                    {hoverInfo.isInputPoint && (
                      <div className="text-xs text-primary font-medium">
                        ✨ This is your input text
                      </div>
                    )}
                    {hoverInfo.originalDocument ? (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Document</span>
                        <div className="mt-1 p-3 bg-muted/30 rounded border max-h-32 overflow-y-auto">
                          <p className="text-xs whitespace-pre-wrap break-words">
                            {hoverInfo.originalDocument}
                          </p>
                        </div>
                      </div>
                    ) : !hoverInfo.isInputPoint && (
                      <div className="text-xs text-muted-foreground italic">
                        Hover for {hoverDelayMs}ms to load document...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Embedding Details */}
              {selectedEmbedding && (
                <div className="p-4 bg-muted/30 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Selected Point</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmbedding(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">URI</span>
                      <p className="font-mono text-xs break-all mt-1">{selectedEmbedding.uri}</p>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">Model</span>
                      <Badge variant="secondary" className="text-xs mt-1">{selectedEmbedding.model_name}</Badge>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {selectedEmbedding.original_content ? 'Original Content' : 'Text'}
                      </span>
                      <div className="mt-1 p-3 bg-background rounded border max-h-64 overflow-y-auto">
                        <p className="text-xs whitespace-pre-wrap break-words">
                          {selectedEmbedding.original_content || selectedEmbedding.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parameters Info */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">Parameters</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="font-medium">{data.method.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">{data.dimensions}D</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Points:</span>
                    <span className="font-medium">{data.total_points}</span>
                  </div>
                  {data.parameters.perplexity !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Perplexity:</span>
                      <span className="font-medium">{data.parameters.perplexity}</span>
                    </div>
                  )}
                  {data.parameters.n_neighbors !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Neighbors:</span>
                      <span className="font-medium">{data.parameters.n_neighbors}</span>
                    </div>
                  )}
                  {data.parameters.min_dist !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Dist:</span>
                      <span className="font-medium">{data.parameters.min_dist}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          ) : (
            /* Collapsed Right Panel Toggle */
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailPanel(true)}
                className="absolute top-4 right-0 z-10 rounded-r-none rounded-l-md border-r-0 h-16 px-2 shadow-md hover:shadow-lg transition-shadow"
                title="Show information panel"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )
        )}
      </div>

      {/* Loading Detail Indicator */}
      {loadingDetail && (
        <div className="fixed bottom-4 right-4 bg-background p-4 rounded-lg shadow-lg border z-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading details...</p>
          </div>
        </div>
      )}
    </div>
  )
}
