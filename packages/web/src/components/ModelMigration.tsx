import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Input } from './ui/Input'
import { apiClient } from '@/services/api'
import type { ModelInfo, MigrationResponse, CompatibilityResponse } from '@/types/api'

interface ModelMigrationProps {
  onMigrationComplete?: (result: MigrationResponse) => void
}

export function ModelMigration({ onMigrationComplete }: ModelMigrationProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [fromModel, setFromModel] = useState('')
  const [toModel, setToModel] = useState('')
  const [compatibility, setCompatibility] = useState<CompatibilityResponse | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Migration options
  const [preserveOriginal, setPreserveOriginal] = useState(false)
  const [batchSize, setBatchSize] = useState(100)
  const [continueOnError, setContinueOnError] = useState(true)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getModels()
      setModels(response.models)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const checkCompatibility = async () => {
    if (!fromModel || !toModel) return

    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.checkModelCompatibility({
        sourceModel: fromModel,
        targetModel: toModel,
      })
      setCompatibility(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check compatibility')
      setCompatibility(null)
    } finally {
      setLoading(false)
    }
  }

  const performMigration = async () => {
    if (!fromModel || !toModel || !compatibility?.compatible) return

    setMigrating(true)
    setError(null)
    setMigrationResult(null)

    try {
      const result = await apiClient.migrateEmbeddings({
        fromModel,
        toModel,
        options: {
          preserveOriginal,
          batchSize,
          continueOnError,
        },
      })
      setMigrationResult(result)
      onMigrationComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  const getCompatibilityColor = (compatible: boolean, score?: number) => {
    if (!compatible) return 'text-red-600'
    if (score && score >= 0.8) return 'text-green-600'
    if (score && score >= 0.6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Model Migration</h2>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">From Model</label>
            <select
              value={fromModel}
              onChange={(e) => {
                setFromModel(e.target.value)
                setCompatibility(null)
                setMigrationResult(null)
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || migrating}
            >
              <option value="">Select source model</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.displayName || model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To Model</label>
            <select
              value={toModel}
              onChange={(e) => {
                setToModel(e.target.value)
                setCompatibility(null)
                setMigrationResult(null)
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || migrating}
            >
              <option value="">Select target model</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.displayName || model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compatibility Check */}
        <div className="mb-6">
          <Button
            onClick={checkCompatibility}
            disabled={!fromModel || !toModel || loading}
            className="mb-4"
          >
            {loading ? 'Checking...' : 'Check Compatibility'}
          </Button>

          {compatibility && (
            <div className={`p-4 rounded-md border ${compatibility.compatible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`font-medium ${getCompatibilityColor(compatibility.compatible, compatibility.similarityScore)}`}>
                {compatibility.compatible ? '✓ Models are compatible' : '✗ Models are incompatible'}
              </div>
              {compatibility.reason && (
                <div className="text-sm text-gray-600 mt-1">{compatibility.reason}</div>
              )}
              {compatibility.similarityScore && (
                <div className="text-sm text-gray-600 mt-1">
                  Similarity score: {(compatibility.similarityScore * 100).toFixed(1)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Migration Options */}
        {compatibility?.compatible && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-3">Migration Options</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preserveOriginal}
                  onChange={(e) => setPreserveOriginal(e.target.checked)}
                  className="mr-2"
                  disabled={migrating}
                />
                Preserve original embeddings
              </label>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <span className="mr-2">Batch size:</span>
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    min="1"
                    max="1000"
                    className="w-20"
                    disabled={migrating}
                  />
                </label>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={continueOnError}
                  onChange={(e) => setContinueOnError(e.target.checked)}
                  className="mr-2"
                  disabled={migrating}
                />
                Continue on errors
              </label>
            </div>
          </div>
        )}

        {/* Migration Action */}
        {compatibility?.compatible && (
          <div className="mb-6">
            <Button
              onClick={performMigration}
              disabled={migrating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {migrating ? 'Migrating...' : 'Start Migration'}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}

        {/* Migration Results */}
        {migrationResult && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-medium text-blue-800 mb-3">Migration Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Processed</div>
                <div className="text-lg">{migrationResult.totalProcessed}</div>
              </div>
              <div>
                <div className="font-medium text-green-600">Successful</div>
                <div className="text-lg text-green-600">{migrationResult.successful}</div>
              </div>
              <div>
                <div className="font-medium text-red-600">Failed</div>
                <div className="text-lg text-red-600">{migrationResult.failed}</div>
              </div>
              <div>
                <div className="font-medium">Duration</div>
                <div className="text-lg">{(migrationResult.duration / 1000).toFixed(1)}s</div>
              </div>
            </div>

            {migrationResult.details.some(d => d.status === 'error') && (
              <div className="mt-4">
                <div className="font-medium text-red-600 mb-2">Failed Items:</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {migrationResult.details
                    .filter(d => d.status === 'error')
                    .map((detail, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-mono text-red-600">{detail.uri}</span>
                        {detail.error && <span className="text-gray-600 ml-2">{detail.error}</span>}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}