import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Zap } from 'lucide-react'
import type { Embedding } from '@/types/api'

interface EmbeddingDetailModalProps {
  embedding: Embedding | null
  open: boolean
  onClose: () => void
}

export function EmbeddingDetailModal({ embedding, open, onClose }: EmbeddingDetailModalProps) {
  if (!embedding) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatUri = (uri: string) => {
    if (uri.startsWith('file://')) {
      return uri.split('/').pop() || uri
    }
    return uri
  }

  return (
    <Dialog open={open} onClose={onClose} className="w-full max-w-4xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <DialogTitle>Embedding Details</DialogTitle>
          <Badge variant="secondary">{embedding.model_name}</Badge>
          {embedding.task_type && (
            <Badge variant="outline" className="bg-blue-50">
              {embedding.task_type}
            </Badge>
          )}
        </div>
      </DialogHeader>

      <DialogContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">ID</label>
            <p className="mt-1 font-mono text-sm">{embedding.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
            <p className="mt-1 font-medium">{embedding.embedding.length}</p>
          </div>
        </div>

        {/* URI */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">URI</label>
          <p className="mt-1 font-mono text-sm break-all">{embedding.uri}</p>
          <p className="text-xs text-muted-foreground mt-1">Display name: {formatUri(embedding.uri)}</p>
        </div>

        {/* Conversion Information */}
        {embedding.converted_format && (
          <Alert variant="success">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Converted from org-mode to {embedding.converted_format}
            </AlertDescription>
          </Alert>
        )}

        {/* Text Content */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            {embedding.converted_format ? 'Converted Content (Markdown)' : 'Text Content'}
          </label>
          <Card className="mt-2 p-4 bg-muted/30">
            <p className="text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
              {embedding.text}
            </p>
          </Card>
        </div>

        {/* Original Content */}
        {embedding.original_content && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Original Content (Org-mode)</label>
            <Card className="mt-2 p-4 bg-muted/30">
              <p className="text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto font-mono">
                {embedding.original_content}
              </p>
            </Card>
          </div>
        )}

        {/* Embedding Vector Information */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Embedding Vector</label>
          <div className="mt-2 space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">Dimensions:</span>
              <span className="font-medium">{embedding.embedding.length}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">First 10 values:</span>
              <Card className="mt-1 p-3 bg-muted/30">
                {embedding.embedding.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Loading embedding vector...</span>
                ) : (
                  <code className="text-xs font-mono block overflow-x-auto">
                    [{embedding.embedding.slice(0, 10).map(v => v.toFixed(6)).join(', ')}
                    {embedding.embedding.length > 10 ? ', ...' : ''}]
                  </code>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created</label>
            <p className="mt-1 text-sm">{formatDate(embedding.created_at)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="mt-1 text-sm">{formatDate(embedding.updated_at)}</p>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
