import { useState, useEffect } from 'react'
import { FileText, Loader2, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { FormSelect } from '@/components/ui/FormSelect'
import { useCreateEmbedding, useUpdateEmbedding } from '@/hooks/useEmbeddings'
import { useModels } from '@/hooks/useModels'
import { ErrorCard } from '@/components/shared/ErrorCard'
import { apiClient } from '@/services/api'
import type { Embedding, TaskType, TaskTypeMetadata } from '@/types/api'

const TASK_TYPES: Array<{ value: TaskType; label: string; description: string }> = [
  { value: 'retrieval_document', label: 'Document Retrieval', description: 'For indexing documents for search' },
  { value: 'retrieval_query', label: 'Query Retrieval', description: 'For search queries (use in search, not for indexing)' },
  { value: 'clustering', label: 'Clustering', description: 'For grouping similar documents' },
  { value: 'classification', label: 'Classification', description: 'For categorizing documents' },
  { value: 'semantic_similarity', label: 'Semantic Similarity', description: 'For measuring text similarity' },
  { value: 'question_answering', label: 'Question Answering', description: 'For Q&A systems' },
  { value: 'fact_verification', label: 'Fact Verification', description: 'For verifying factual statements' },
  { value: 'code_retrieval', label: 'Code Retrieval', description: 'For searching code snippets' },
]

interface CreateEditEmbeddingProps {
  editingEmbedding?: Embedding | null
  onEditComplete?: () => void
}

export function CreateEditEmbedding({ editingEmbedding, onEditComplete }: CreateEditEmbeddingProps) {
  const [uri, setUri] = useState('')
  const [text, setText] = useState('')
  const [modelName, setModelName] = useState('')
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([])
  const [taskTypeOptions, setTaskTypeOptions] = useState<TaskTypeMetadata[]>([])
  const [isLoadingTaskTypes, setIsLoadingTaskTypes] = useState(false)

  const { mutate: createEmbedding, isPending: isCreating, error: createError } = useCreateEmbedding()
  const { mutate: updateEmbedding, isPending: isUpdating, error: updateError } = useUpdateEmbedding()
  const { models } = useModels()

  // Filter out 'default' models and transform to match expected format
  const availableModels = models
    .filter(m => m.name !== 'default')
    .map(m => ({
      name: m.name,
      displayName: m.displayName || m.name
    }))

  const isSubmitting = isCreating || isUpdating
  const error = createError || updateError
  const isEditMode = !!editingEmbedding

  // Populate form when editing
  useEffect(() => {
    if (editingEmbedding) {
      setUri(editingEmbedding.uri)
      setText(editingEmbedding.text)
      setModelName(editingEmbedding.model_name)
      setSelectedTaskTypes([])
    } else {
      // Clear form when switching back to create mode
      setUri('')
      setText('')
      setModelName('')
      setSelectedTaskTypes([])
    }
  }, [editingEmbedding])

  // Load task types when model changes
  useEffect(() => {
    const loadTaskTypes = async () => {
      // If no model selected, use first available model to check task type support
      let modelToCheck = modelName

      if (!modelToCheck && availableModels.length > 0) {
        const firstAvailable = availableModels[0]
        modelToCheck = firstAvailable?.name || ''
      }

      if (!modelToCheck) return

      setIsLoadingTaskTypes(true)
      try {
        const response = await apiClient.getTaskTypes(modelToCheck)
        setTaskTypeOptions(response.task_types)

        // Clear selected task types if they're not supported by the new model
        if (response.task_types.length === 0) {
          setSelectedTaskTypes([])
        } else {
          setSelectedTaskTypes(prev =>
            prev.filter(taskType =>
              response.task_types.some(t => t.value === taskType)
            )
          )
        }
      } catch (error) {
        console.error('Failed to load task types:', error)
        setTaskTypeOptions([])
        setSelectedTaskTypes([])
      } finally {
        setIsLoadingTaskTypes(false)
      }
    }

    loadTaskTypes()
  }, [modelName, availableModels])

  const handleTaskTypeToggle = (taskType: TaskType) => {
    setSelectedTaskTypes(prev =>
      prev.includes(taskType)
        ? prev.filter(t => t !== taskType)
        : [...prev, taskType]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditMode && editingEmbedding) {
      // Update existing embedding
      updateEmbedding(
        { id: editingEmbedding.id, data: { text, model_name: modelName } },
        {
          onSuccess: () => {
            handleReset()
            onEditComplete?.()
          },
        }
      )
    } else {
      // Create new embedding
      if (!uri.trim() || !modelName) return

      createEmbedding(
        {
          uri,
          text,
          model_name: modelName,
          task_types: selectedTaskTypes.length > 0 ? selectedTaskTypes : undefined
        },
        {
          onSuccess: () => {
            handleReset()
          },
        }
      )
    }
  }

  const handleReset = () => {
    setUri('')
    setText('')
    setModelName('')
    setSelectedTaskTypes([])
    onEditComplete?.()
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? <Save className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {isEditMode ? 'Edit Embedding' : 'Create New Embedding'}
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update the text content and regenerate the embedding vector'
              : 'Generate an embedding for text content'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="URI"
              helpText={isEditMode ? 'URI cannot be changed when editing' : 'Unique identifier for the embedding'}
            >
              <Input
                placeholder="e.g., file://document.txt or doc:12345"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                required
                disabled={isSubmitting || isEditMode}
                className={isEditMode ? 'bg-muted cursor-not-allowed' : ''}
              />
            </FormField>

            <FormField label="Text Content">
              <Textarea
                className="min-h-[400px] max-h-[600px]"
                placeholder="Enter the text content to generate embedding for..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </FormField>

            <FormSelect
              label="Model"
              value={modelName}
              onChange={setModelName}
              disabled={isSubmitting}
              options={availableModels.map((model) => ({
                value: model.name,
                label: model.displayName,
              }))}
            />

            {!isEditMode && !isLoadingTaskTypes && taskTypeOptions.length > 0 && (
              <div>
                <label className="block label-large mb-3">
                  Task Types (Optional - for models that support it)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {taskTypeOptions.map((taskType) => {
                    const taskTypeInfo = TASK_TYPES.find(t => t.value === taskType.value)
                    if (!taskTypeInfo) return null

                    return (
                      <label
                        key={taskType.value}
                        className="flex items-start gap-2 cursor-pointer hover:bg-primary/[0.08] p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTaskTypes.includes(taskType.value as TaskType)}
                          onChange={() => handleTaskTypeToggle(taskType.value as TaskType)}
                          disabled={isSubmitting}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="label-large">{taskTypeInfo.label}</div>
                          <div className="body-small text-on-surface-variant">{taskTypeInfo.description}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <p className="body-small text-on-surface-variant mt-2">
                  {selectedTaskTypes.length > 0
                    ? `${selectedTaskTypes.length} task type(s) selected - will create ${selectedTaskTypes.length} embedding(s)`
                    : 'Select one or more task types to create specialized embeddings (e.g., "Document Retrieval" + "Clustering")'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || !text.trim() || !modelName || (!isEditMode && !uri.trim())}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isEditMode ? 'Update Embedding' : 'Create Embedding'}
                  </>
                )}
              </Button>
              {(uri || text || modelName || isEditMode) && (
                <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
                  {isEditMode ? 'Cancel' : 'Reset'}
                </Button>
              )}
            </div>
          </form>

          {error && <ErrorCard error={error} className="mt-4" />}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">Creating Embeddings</h4>
            <p className="text-muted-foreground">
              Provide a unique URI and text content. The system will generate an embedding vector
              that can be used for semantic search and similarity comparisons.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">URI Format</h4>
            <p className="text-muted-foreground">
              Use descriptive URIs like <code className="text-xs bg-muted px-1 py-0.5 rounded">file://docs/readme.md</code> or{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">doc:user-guide-123</code>.
              URIs must be unique across the same model.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">Model Selection</h4>
            <p className="text-muted-foreground">
              Select a model from those registered in Config. Different models may produce embeddings
              with different dimensions. Models must be registered in the Config section before use.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
