'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, Search } from 'lucide-react'
import { apiClient } from '@/shared/api'
import { Input } from '@/shared/ui'
import type { Embedding } from '@/shared/types/api'

interface DocumentTreeProps {
  onDocumentSelect: (id: number) => void
  selectedDocumentId: number | null
}

interface TreeNode {
  id: string
  label: string
  type: 'folder' | 'document'
  documentId?: number
  children?: TreeNode[]
  metadata?: {
    modelName?: string
    createdAt?: string
  }
}

export function DocumentTree({ onDocumentSelect, selectedDocumentId }: DocumentTreeProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    const formatDocumentLabel = (uri: string): string => {
      // Extract filename from URI
      if (uri.startsWith('file://')) {
        return uri.split('/').pop() || uri
      }
      return uri
    }

    const buildTree = (embeddings: Embedding[]): TreeNode[] => {
      // Group by model name
      const modelGroups = embeddings.reduce((acc, emb) => {
        const modelName = emb.model_name
        if (!acc[modelName]) {
          acc[modelName] = []
        }
        acc[modelName].push(emb)
        return acc
      }, {} as Record<string, Embedding[]>)

      // Build tree structure
      return Object.entries(modelGroups).map(([modelName, docs]) => ({
        id: `model-${modelName}`,
        label: modelName,
        type: 'folder' as const,
        metadata: { modelName },
        children: docs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(doc => ({
            id: `doc-${doc.id}`,
            label: formatDocumentLabel(doc.uri),
            type: 'document' as const,
            documentId: doc.id,
            metadata: {
              modelName: doc.model_name,
              createdAt: doc.created_at,
            },
          })),
      }))
    }

    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getEmbeddings({ limit: 1000 })
      const tree = buildTree(response.embeddings)
      setTreeData(tree)

      // Auto-expand first level
      const firstLevelIds = tree.map(node => node.id)
      setExpandedNodes(new Set(firstLevelIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query.trim()) return nodes

    const lowerQuery = query.toLowerCase()

    return nodes.reduce((acc, node) => {
      const matchesLabel = node.label.toLowerCase().includes(lowerQuery)
      const filteredChildren = node.children ? filterTree(node.children, query) : []

      if (matchesLabel || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren,
        })
      }

      return acc
    }, [] as TreeNode[])
  }

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = node.documentId === selectedDocumentId
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-variant
            ${isSelected ? 'bg-primary-container text-on-primary-container' : ''}
          `}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleNode(node.id)
            } else if (node.documentId) {
              onDocumentSelect(node.documentId)
            }
          }}
        >
          {node.type === 'folder' && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}

          <span className="flex-shrink-0">
            {node.type === 'folder' ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </span>

          <span className="flex-1 truncate text-sm">
            {node.label}
          </span>

          {node.type === 'folder' && node.children && (
            <span className="text-xs text-muted-foreground">
              {node.children.length}
            </span>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredTree = filterTree(treeData, searchQuery)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant">
        <h2 className="text-lg font-semibold mb-3">Documents</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-muted-foreground">
            Loading documents...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-error">
            {error}
          </div>
        )}

        {!loading && !error && filteredTree.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No documents found
          </div>
        )}

        {!loading && !error && filteredTree.length > 0 && (
          <div className="py-2">
            {filteredTree.map(node => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  )
}
