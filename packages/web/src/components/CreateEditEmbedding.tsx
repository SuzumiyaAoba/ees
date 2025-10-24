import { useState, useEffect } from 'react'
import { FileText, Loader2, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useCreateEmbedding, useUpdateEmbedding, useModels } from '@/hooks/useEmbeddings'
import { ErrorCard } from '@/components/shared/ErrorCard'
import type { Embedding, TaskType } from '@/types/api'

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

  const { mutate: createEmbedding, isPending: isCreating, error: createError } = useCreateEmbedding()
  const { mutate: updateEmbedding, isPending: isUpdating, error: updateError } = useUpdateEmbedding()
  const { data: modelsData } = useModels()

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
        { id: editingEmbedding.id, data: { text, model_name: modelName || undefined } },
        {
          onSuccess: () => {
            handleReset()
            onEditComplete?.()
          },
        }
      )
    } else {
      // Create new embedding
      if (!uri.trim()) return

      createEmbedding(
        {
          uri,
          text,
          model_name: modelName || undefined,
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
            <div>
              <label className="text-sm font-medium">URI</label>
              <Input
                placeholder="e.g., file://document.txt or doc:12345"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                required
                disabled={isSubmitting || isEditMode}
                className={isEditMode ? 'bg-muted cursor-not-allowed' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isEditMode ? 'URI cannot be changed when editing' : 'Unique identifier for the embedding'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Text Content</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter the text content to generate embedding for..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Model (Optional)</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Default Model</option>
                {modelsData?.models
                  .filter((model) => model.available)
                  .map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.displayName || model.name}
                    </option>
                  ))}
              </select>
            </div>

            {!isEditMode && (
              <div>
                <label className="text-sm font-medium block mb-2">
                  Task Types (Optional - for models that support it)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {TASK_TYPES.map((taskType) => (
                    <label
                      key={taskType.value}
                      className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTaskTypes.includes(taskType.value)}
                        onChange={() => handleTaskTypeToggle(taskType.value)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{taskType.label}</div>
                        <div className="text-xs text-muted-foreground">{taskType.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedTaskTypes.length > 0
                    ? `${selectedTaskTypes.length} task type(s) selected - will create ${selectedTaskTypes.length} embedding(s)`
                    : 'Select one or more task types to create specialized embeddings (e.g., "Document Retrieval" + "Clustering")'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || !text.trim() || (!isEditMode && !uri.trim())}>
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
              Leave empty to use the default model, or select a specific model for specialized use cases.
              Different models may produce embeddings with different dimensions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
