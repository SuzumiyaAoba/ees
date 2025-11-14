import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FormSelect } from '@/components/ui/FormSelect'
import { apiClient } from '@/services/api'
import { useModels } from '@/hooks/useModels'
import type { MigrationResponse, CompatibilityResponse } from '@/types/api'

interface ModelMigrationProps {
  onMigrationComplete?: (result: MigrationResponse) => void
}

export function ModelMigration({ onMigrationComplete }: ModelMigrationProps) {
  const { models, loading: loadingModels, error: modelsError } = useModels()
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)

  // Filter out 'default' models
  const availableModels = models.filter(m => m.name !== 'default')
  const [fromModel, setFromModel] = useState('')
  const [toModel, setToModel] = useState('')
  const [compatibility, setCompatibility] = useState<CompatibilityResponse | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Migration options
  const [preserveOriginal, setPreserveOriginal] = useState(false)
  const [batchSize, setBatchSize] = useState(100)
  const [continueOnError, setContinueOnError] = useState(true)

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
        <h2 className="headline-medium mb-6">Model Migration</h2>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormSelect
            label="From Model"
            value={fromModel}
            onChange={(value) => {
              setFromModel(value)
              setCompatibility(null)
              setMigrationResult(null)
            }}
            options={[
              { value: '', label: 'Select source model' },
              ...availableModels.map((model) => ({
                value: model.name,
                label: model.displayName || model.name,
              })),
            ]}
            placeholder="Select source model"
            disabled={loading || migrating || loadingModels}
          />

          <FormSelect
            label="To Model"
            value={toModel}
            onChange={(value) => {
              setToModel(value)
              setCompatibility(null)
              setMigrationResult(null)
            }}
            options={[
              { value: '', label: 'Select target model' },
              ...availableModels.map((model) => ({
                value: model.name,
                label: model.displayName || model.name,
              })),
            ]}
            placeholder="Select target model"
            disabled={loading || migrating || loadingModels}
          />
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
            <div className={`p-4 rounded-md border ${compatibility.compatible ? 'bg-success/10 dark:bg-success/20 border-success/30' : 'bg-destructive/10 dark:bg-destructive/20 border-destructive/30'}`}>
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
              variant="gradient"
            >
              {migrating ? 'Migrating...' : 'Start Migration'}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {(error || modelsError) && (
          <div className="mb-6 p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 rounded-md">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-600 text-sm mt-1">{error || modelsError}</div>
          </div>
        )}

        {/* Migration Results */}
        {migrationResult && (
          <div className="p-4 bg-info/10 dark:bg-info/20 border border-info/30 rounded-md">
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