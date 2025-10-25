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
  ClusteringMethod,
  TaskType,
  TaskTypeMetadata,
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
  const [taskType, setTaskType] = useState<TaskType | undefined>(undefined)
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeMetadata[]>([])
  const [isLoadingTaskTypes, setIsLoadingTaskTypes] = useState(false)
  const [limit, setLimit] = useState<number>(100)
  const [perplexity, setPerplexity] = useState<number>(30)
  const [nNeighbors, setNNeighbors] = useState<number>(15)
  const [minDist, setMinDist] = useState<number>(0.1)

  // Seed mode state
  const [seedMode, setSeedMode] = useState<'fixed' | 'random' | 'custom'>('fixed')
  const [customSeed, setCustomSeed] = useState<number>(42)
  const [lastUsedSeed, setLastUsedSeed] = useState<number | undefined>(undefined)

  // Clustering state
  const [clusteringEnabled, setClusteringEnabled] = useState<boolean>(false)
  const [clusteringMethod, setClusteringMethod] = useState<ClusteringMethod>('kmeans')
  const [nClusters, setNClusters] = useState<number>(5)
  const [eps, setEps] = useState<number>(0.5)
  const [minSamples, setMinSamples] = useState<number>(5)
  const [autoClusters, setAutoClusters] = useState<boolean>(false)
  const [minClusters, setMinClusters] = useState<number>(2)
  const [maxClusters, setMaxClusters] = useState<number>(10)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisualizeEmbeddingResponse | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // Side panel state for displaying embedding details
  const [selectedEmbedding, setSelectedEmbedding] = useState<Embedding | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<number | undefined>(undefined)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const plotDivRef = useRef<HTMLElement | null>(null)
  
  // Hover info state for fixed position display
  const [hoverInfo, setHoverInfo] = useState<{
    uri: string
    coordinates: number[]
    isInputPoint: boolean
    cluster?: number
    originalDocument?: string
    mouseX?: number
    mouseY?: number
  } | null>(null)
  const unhoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredUriRef = useRef<string | null>(null)
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [hoverDelayMs, setHoverDelayMs] = useState(200) // 200ms default for more responsive loading
  const [showHoverInfo, setShowHoverInfo] = useState(true) // Toggle for Hover Information visibility

  // Free text input state
  const [inputText, setInputText] = useState<string>('')
  const [inputPoints, setInputPoints] = useState<VisualizationPoint[]>([])
  const [loadingInput, setLoadingInput] = useState(false)

  // Store input text content locally for display when clicked
  const [inputTextContent, setInputTextContent] = useState<{uri: string, text: string, modelName: string} | null>(null)

  // Calculate tooltip position based on mouse quadrant relative to plot area
  const getTooltipPositionClasses = (mouseX?: number, mouseY?: number): string => {
    if (mouseX === undefined || mouseY === undefined || !plotDivRef.current) {
      return 'top-4 right-4' // Default position
    }

    // Get plot area bounding rectangle
    const plotRect = plotDivRef.current.getBoundingClientRect()

    // Calculate mouse position relative to plot area
    const relativeX = mouseX - plotRect.left
    const relativeY = mouseY - plotRect.top

    // Determine which quadrant the mouse is in relative to plot center
    const isLeft = relativeX < plotRect.width / 2
    const isTop = relativeY < plotRect.height / 2

    // Place tooltip in opposite diagonal quadrant
    if (isLeft && isTop) {
      // Mouse in top-left → tooltip in bottom-right
      return 'bottom-4 right-4'
    } else if (isLeft && !isTop) {
      // Mouse in bottom-left → tooltip in top-right
      return 'top-4 right-4'
    } else if (!isLeft && isTop) {
      // Mouse in top-right → tooltip in bottom-left
      return 'bottom-4 left-4'
    } else {
      // Mouse in bottom-right → tooltip in top-left
      return 'top-4 left-4'
    }
  }

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

  // Load task types when model changes
  useEffect(() => {
    const loadTaskTypes = async () => {
      if (!modelName) return

      setIsLoadingTaskTypes(true)
      try {
        const response = await apiClient.getTaskTypes(modelName)
        setTaskTypeOptions(response.task_types)

        // Clear task type if model doesn't support them
        if (response.task_types.length === 0) {
          setTaskType(undefined)
        } else if (taskType !== undefined) {
          // If user has already selected a task type, validate it's still supported
          const isSupported = response.task_types.some(t => t.value === taskType)
          if (!isSupported) {
            setTaskType(undefined)
          }
        }
        // If taskType is undefined, leave it as "All Types" - don't auto-select
      } catch (error) {
        console.error('Failed to load task types:', error)
        // On error, clear task types (model doesn't support them)
        setTaskTypeOptions([])
        setTaskType(undefined)
      } finally {
        setIsLoadingTaskTypes(false)
      }
    }

    loadTaskTypes()
  }, [modelName])

  // Handle hover events
  const handlePlotHover = useCallback((eventData: Readonly<Plotly.PlotMouseEvent>) => {
    // Clear any pending unhover timeout
    if (unhoverTimeoutRef.current) {
      clearTimeout(unhoverTimeoutRef.current)
      unhoverTimeoutRef.current = null
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
          cluster: inputPoints[0].cluster,
          originalDocument: inputTextContent?.text,
          mouseX: eventData.event?.clientX,
          mouseY: eventData.event?.clientY,
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
          // If hovering over the same point, keep the existing timeout and skip
          if (lastHoveredUriRef.current === dataPoint.uri) {
            console.log('[3D Debug] Same point - keeping existing timeout:', dataPoint.uri)
            return
          }

          // Different point: clear any existing timeout before starting new one
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
            console.log('[3D Debug] Cleared timeout for previous point')
          }

          lastHoveredUriRef.current = dataPoint.uri
          console.log('[3D Debug] New hover target:', dataPoint.uri)

          // Set basic hover info immediately
          setHoverInfo({
            uri: dataPoint.uri,
            coordinates: dataPoint.coordinates,
            isInputPoint: false,
            cluster: dataPoint.cluster,
            mouseX: eventData.event?.clientX,
            mouseY: eventData.event?.clientY,
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
    console.log('[3D Debug] Unhover event')

    // Clear any existing unhover timeout
    if (unhoverTimeoutRef.current) {
      clearTimeout(unhoverTimeoutRef.current)
    }

    // DON'T clear hover timeout - let it complete even after unhover
    // This allows the document fetch to complete for quick cursor movements
    // The timeout will be cleared when hovering over a different point instead

    // DON'T clear lastHoveredUriRef - keep it so that returning to the same point
    // won't trigger a new fetch if one is already in progress or completed

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
      // Get cluster from input points
      if (inputPoints.length > 0) {
        setSelectedCluster(inputPoints[0].cluster)
      }
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

    // Store cluster information
    setSelectedCluster(point.cluster)

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


  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (unhoverTimeoutRef.current) {
        clearTimeout(unhoverTimeoutRef.current)
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
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
        task_type: taskType,
        limit,
        perplexity: method === 'tsne' ? perplexity : undefined,
        n_neighbors: method === 'umap' ? nNeighbors : undefined,
        min_dist: method === 'umap' ? minDist : undefined,
        seed_mode: seedMode,
        seed: seedMode === 'custom' ? customSeed : undefined,
        clustering: clusteringEnabled ? {
          enabled: true,
          method: clusteringMethod,
          n_clusters: clusteringMethod !== 'dbscan' && !autoClusters ? nClusters : undefined,
          eps: clusteringMethod === 'dbscan' ? eps : undefined,
          min_samples: clusteringMethod === 'dbscan' ? minSamples : undefined,
          auto_clusters: (clusteringMethod === 'kmeans' || clusteringMethod === 'hierarchical') ? autoClusters : undefined,
          min_clusters: autoClusters ? minClusters : undefined,
          max_clusters: autoClusters ? maxClusters : undefined,
        } : undefined,
      })

      setData(response)
      // Store the actual seed used
      if (response.parameters.seed !== undefined) {
        setLastUsedSeed(response.parameters.seed)
      }
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
        seed_mode: seedMode,
        seed: seedMode === 'custom' ? customSeed : undefined,
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

            // Set up event listeners directly on the graphDiv
            const plotlyDiv = graphDiv as unknown as Plotly.PlotlyHTMLElement

            plotlyDiv.on?.('plotly_click', (eventData: Plotly.PlotMouseEvent) => {
              handlePointClick(eventData)
            })

            plotlyDiv.on?.('plotly_hover', (eventData: Plotly.PlotMouseEvent) => {
              handlePlotHover(eventData)
            })

            plotlyDiv.on?.('plotly_unhover', () => {
              handlePlotUnhover()
            })
          }}
        />
      </div>
    )
  }

  const render2DPlot = (points: VisualizationPoint[]) => {
    const hasClusterData = points.some(p => p.cluster !== undefined)

    // Define distinct colors for clusters
    const clusterColors = [
      '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
      '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
      '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
      '#e5c494', '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada'
    ]

    let markerConfig: Record<string, unknown>

    if (hasClusterData) {
      // Map cluster IDs to colors
      const colors = points.map(p => {
        const cluster = p.cluster ?? -1
        if (cluster === -1) return '#808080' // Gray for noise
        return clusterColors[cluster % clusterColors.length]
      })

      markerConfig = {
        size: 8,
        color: colors,
        line: {
          color: '#ffffff',
          width: 1,
        },
      }
    } else {
      markerConfig = {
        size: 8,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
      }
    }

    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      mode: 'markers' as const,
      type: 'scatter' as const,
      marker: markerConfig,
      hovertemplate: '<extra></extra>',
      showlegend: false,
    }
  }

  const render3DPlot = (points: VisualizationPoint[]) => {
    const hasClusterData = points.some(p => p.cluster !== undefined)

    // Define distinct colors for clusters
    const clusterColors = [
      '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
      '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
      '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
      '#e5c494', '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada'
    ]

    let markerConfig: Record<string, unknown>

    if (hasClusterData) {
      // Map cluster IDs to colors
      const colors = points.map(p => {
        const cluster = p.cluster ?? -1
        if (cluster === -1) return '#808080' // Gray for noise
        return clusterColors[cluster % clusterColors.length]
      })

      markerConfig = {
        size: 3,
        color: colors,
        line: {
          color: '#ffffff',
          width: 0.5,
        },
      }
    } else {
      markerConfig = {
        size: 3,
        color: points.map((_, i) => i),
        colorscale: 'Viridis' as const,
        showscale: true,
        line: {
          width: 0,
        },
      }
    }

    return {
      x: points.map(p => p.coordinates[0]),
      y: points.map(p => p.coordinates[1]),
      z: points.map(p => p.coordinates[2]),
      mode: 'markers' as const,
      type: 'scatter3d' as const,
      marker: markerConfig,
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
            <>
              <Badge variant="secondary" className="text-xs">
                {data.total_points} points · {data.method.toUpperCase()} · {data.dimensions}D
              </Badge>
              {data.clustering && (
                <Badge variant="default" className="text-xs">
                  {data.clustering.n_clusters} clusters · {data.clustering.method.toUpperCase()}
                </Badge>
              )}
            </>
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

              {/* Task Type Filter */}
              {!isLoadingTaskTypes && taskTypeOptions.length > 0 && (
                <div>
                  <label htmlFor="task-type" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                    Task Type
                  </label>
                  <select
                    id="task-type"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={taskType || ''}
                    onChange={(e) => setTaskType(e.target.value ? e.target.value as TaskType : undefined)}
                    title={taskTypeOptions.find(opt => opt.value === taskType)?.description}
                  >
                    <option value="">All Types</option>
                    {taskTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filter by document task type
                  </p>
                </div>
              )}

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

              {/* Seed Mode Section - Only for non-deterministic methods */}
              {(method === 'tsne' || method === 'umap') && (
                <div className="border-t pt-4 space-y-3">
                  <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                    Random Seed
                  </label>
                  <div className="space-y-2">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={seedMode}
                      onChange={(e) => setSeedMode(e.target.value as 'fixed' | 'random' | 'custom')}
                    >
                      <option value="fixed">Fixed (42) - Reproducible</option>
                      <option value="random">Random - Different each time</option>
                      <option value="custom">Custom - Specify seed</option>
                    </select>

                    {seedMode === 'custom' && (
                      <div>
                        <label htmlFor="custom-seed" className="block text-xs font-medium mb-1 text-muted-foreground">
                          Seed Value
                        </label>
                        <Input
                          id="custom-seed"
                          type="number"
                          min="0"
                          value={customSeed}
                          onChange={(e) => setCustomSeed(Number(e.target.value))}
                          className="h-9"
                        />
                      </div>
                    )}

                    {lastUsedSeed !== undefined && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        Last used seed: <span className="font-mono font-semibold">{lastUsedSeed}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Controls visualization randomness. Fixed seed ensures identical results for the same data.
                  </p>
                </div>
              )}

              {/* Clustering Section */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Clustering
                  </label>
                  <button
                    type="button"
                    onClick={() => setClusteringEnabled(!clusteringEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      clusteringEnabled ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        clusteringEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {clusteringEnabled && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                        Algorithm
                      </label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={clusteringMethod}
                        onChange={(e) => setClusteringMethod(e.target.value as ClusteringMethod)}
                      >
                        <option value="kmeans">K-means</option>
                        <option value="dbscan">DBSCAN</option>
                        <option value="hierarchical">Hierarchical</option>
                      </select>
                    </div>

                    {(clusteringMethod === 'kmeans' || clusteringMethod === 'hierarchical') && (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground uppercase">
                            Auto Determine (BIC)
                          </label>
                          <button
                            type="button"
                            onClick={() => setAutoClusters(!autoClusters)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              autoClusters ? 'bg-primary' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                autoClusters ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {autoClusters ? (
                          <>
                            <div>
                              <label htmlFor="min-clusters" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                                Min Clusters to Test
                              </label>
                              <Input
                                id="min-clusters"
                                type="number"
                                min="2"
                                max="20"
                                value={minClusters}
                                onChange={(e) => setMinClusters(Number(e.target.value))}
                                className="h-9"
                              />
                              <p className="text-xs text-muted-foreground mt-1">2-20</p>
                            </div>
                            <div>
                              <label htmlFor="max-clusters" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                                Max Clusters to Test
                              </label>
                              <Input
                                id="max-clusters"
                                type="number"
                                min="2"
                                max="20"
                                value={maxClusters}
                                onChange={(e) => setMaxClusters(Number(e.target.value))}
                                className="h-9"
                              />
                              <p className="text-xs text-muted-foreground mt-1">2-20</p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label htmlFor="n-clusters" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                              Number of Clusters
                            </label>
                            <Input
                              id="n-clusters"
                              type="number"
                              min="2"
                              max="20"
                              value={nClusters}
                              onChange={(e) => setNClusters(Number(e.target.value))}
                              className="h-9"
                            />
                            <p className="text-xs text-muted-foreground mt-1">2-20</p>
                          </div>
                        )}
                      </>
                    )}

                    {clusteringMethod === 'dbscan' && (
                      <>
                        <div>
                          <label htmlFor="eps" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                            Epsilon (ε)
                          </label>
                          <Input
                            id="eps"
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={eps}
                            onChange={(e) => setEps(Number(e.target.value))}
                            className="h-9"
                          />
                          <p className="text-xs text-muted-foreground mt-1">0.1-10.0</p>
                        </div>
                        <div>
                          <label htmlFor="min-samples-cluster" className="block text-xs font-medium mb-2 text-muted-foreground uppercase">
                            Min Samples
                          </label>
                          <Input
                            id="min-samples-cluster"
                            type="number"
                            min="1"
                            max="50"
                            value={minSamples}
                            onChange={(e) => setMinSamples(Number(e.target.value))}
                            className="h-9"
                          />
                          <p className="text-xs text-muted-foreground mt-1">1-50</p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Show Hover Information
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHoverInfo(!showHoverInfo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showHoverInfo ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showHoverInfo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Display tooltip when hovering over points (only visible when Information panel is closed)
                  </p>

                  <div>
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
                      disabled={!showHoverInfo}
                    />
                    <p className="text-xs text-muted-foreground">100-10000ms</p>
                  </div>
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

              {/* Floating Hover Info - Visible when right panel is closed and showHoverInfo is enabled */}
              {hoverInfo && !showDetailPanel && showHoverInfo && (
                <div className={`absolute ${getTooltipPositionClasses(hoverInfo.mouseX, hoverInfo.mouseY)} w-80 max-w-[calc(100%-2rem)] p-4 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-lg shadow-lg z-20 animate-in fade-in duration-200`}>
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
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase">Document</span>
                      <div className="mt-1 p-3 bg-muted/30 rounded border h-32 overflow-y-auto">
                        {hoverInfo.originalDocument ? (
                          <p className="text-xs whitespace-pre-wrap break-words">
                            {hoverInfo.originalDocument}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Hover for {hoverDelayMs}ms to load document...
                          </p>
                        )}
                      </div>
                    </div>
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
                    {hoverInfo.cluster !== undefined && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Cluster</span>
                        <div className="mt-1">
                          <Badge variant={hoverInfo.cluster === -1 ? "secondary" : "default"} className="text-xs">
                            {hoverInfo.cluster === -1 ? 'Noise' : `Cluster ${hoverInfo.cluster}`}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {hoverInfo.isInputPoint && (
                      <div className="text-xs text-primary font-medium">
                        ✨ This is your input text
                      </div>
                    )}
                    {!hoverInfo.isInputPoint && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Document</span>
                        <div className="mt-1 p-3 bg-muted/30 rounded border h-32 overflow-y-auto">
                          {hoverInfo.originalDocument ? (
                            <p className="text-xs whitespace-pre-wrap break-words">
                              {hoverInfo.originalDocument}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Hover for {hoverDelayMs}ms to load document...
                            </p>
                          )}
                        </div>
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

                    {selectedCluster !== undefined && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Cluster</span>
                        <div className="mt-1">
                          <Badge variant={selectedCluster === -1 ? "secondary" : "default"} className="text-xs">
                            {selectedCluster === -1 ? 'Noise' : `Cluster ${selectedCluster}`}
                          </Badge>
                        </div>
                      </div>
                    )}

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
                  {data.clustering && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <span className="text-xs font-semibold">Clustering</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Algorithm:</span>
                        <span className="font-medium">{data.clustering.method.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clusters Found:</span>
                        <span className="font-medium">{data.clustering.n_clusters}</span>
                      </div>
                      {data.clustering.parameters.n_clusters !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target Clusters:</span>
                          <span className="font-medium">{data.clustering.parameters.n_clusters}</span>
                        </div>
                      )}
                      {data.clustering.parameters.eps !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Epsilon:</span>
                          <span className="font-medium">{data.clustering.parameters.eps}</span>
                        </div>
                      )}
                      {data.clustering.parameters.min_samples !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min Samples:</span>
                          <span className="font-medium">{data.clustering.parameters.min_samples}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Cluster Legend */}
              {data.clustering && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3">Cluster Legend</h4>
                  <div className="space-y-2">
                    {Array.from({ length: data.clustering.n_clusters }, (_, i) => {
                      const clusterColors = [
                        '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
                        '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
                        '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
                        '#e5c494', '#b3b3b3', '#8dd3c7', '#ffffb3', '#bebada'
                      ]
                      const color = clusterColors[i % clusterColors.length]
                      const count = data.points.filter(p => p.cluster === i).length

                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-white"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium">Cluster {i}</span>
                          </div>
                          <span className="text-muted-foreground">{count} points</span>
                        </div>
                      )
                    })}
                    {data.points.some(p => p.cluster === -1) && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-white"
                            style={{ backgroundColor: '#808080' }}
                          />
                          <span className="font-medium">Noise</span>
                        </div>
                        <span className="text-muted-foreground">
                          {data.points.filter(p => p.cluster === -1).length} points
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
