import { useState } from 'react'
import { FileText, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useCreateEmbedding, useUpdateEmbedding, useModels } from '@/hooks/useEmbeddings'
import { ErrorCard } from '@/components/shared/ErrorCard'

export function CreateEditEmbedding() {
  const [uri, setUri] = useState('')
  const [text, setText] = useState('')
  const [modelName, setModelName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const { mutate: createEmbedding, isPending: isCreating, error: createError } = useCreateEmbedding()
  const { mutate: updateEmbedding, isPending: isUpdating, error: updateError } = useUpdateEmbedding()
  const { data: modelsData } = useModels()

  const isSubmitting = isCreating || isUpdating
  const error = createError || updateError

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editId !== null) {
      // Update existing embedding
      updateEmbedding(
        { id: editId, data: { text, model_name: modelName || undefined } },
        {
          onSuccess: () => {
            setText('')
            setEditId(null)
            setModelName('')
          },
        }
      )
    } else {
      // Create new embedding
      if (!uri.trim()) return

      createEmbedding(
        { uri, text, model_name: modelName || undefined },
        {
          onSuccess: () => {
            setUri('')
            setText('')
            setModelName('')
          },
        }
      )
    }
  }

  const handleReset = () => {
    setUri('')
    setText('')
    setModelName('')
    setEditId(null)
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editId !== null ? 'Edit Embedding' : 'Create New Embedding'}
          </CardTitle>
          <CardDescription>
            {editId !== null
              ? 'Update the text content of an existing embedding'
              : 'Generate an embedding for text content'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {editId === null && (
              <div>
                <label className="text-sm font-medium">URI</label>
                <Input
                  placeholder="e.g., file://document.txt or doc:12345"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier for the embedding
                </p>
              </div>
            )}

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

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting || !text.trim() || (editId === null && !uri.trim())}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {editId !== null ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {editId !== null ? 'Update Embedding' : 'Create Embedding'}
                  </>
                )}
              </Button>
              {(uri || text || modelName || editId !== null) && (
                <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
                  Reset
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
