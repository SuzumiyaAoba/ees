import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Search, List, Upload, Settings, Database, ArrowLeftRight, Plus } from 'lucide-react'
import { SearchInterface } from '@/components/SearchInterface'
import { EmbeddingList } from '@/components/EmbeddingList'
import { FileUpload } from '@/components/FileUpload'
import { CreateEditEmbedding } from '@/components/CreateEditEmbedding'
import { ProviderManagement } from '@/components/ProviderManagement'
import { ModelMigration } from '@/components/ModelMigration'
import { EmbeddingDetailModal } from '@/components/EmbeddingDetailModal'
import type { Embedding, SearchResult } from '@/types/api'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

type TabType = 'search' | 'list' | 'create' | 'upload' | 'config' | 'migration'

interface TabItem {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: TabItem[] = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'list', label: 'Browse', icon: List },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'migration', label: 'Migration', icon: ArrowLeftRight },
  { id: 'config', label: 'Config', icon: Settings },
]

const VALID_TABS: TabType[] = ['search', 'list', 'create', 'upload', 'config', 'migration']

function AppContent() {
  // Get initial tab from URL hash or default to 'search'
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.slice(1) as TabType
    return VALID_TABS.includes(hash) ? hash : 'search'
  }

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab)
  const [selectedEmbedding, setSelectedEmbedding] = useState<Embedding | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingEmbedding, setEditingEmbedding] = useState<Embedding | null>(null)

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as TabType
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  const handleSearchResultSelect = (result: SearchResult) => {
    console.log('Selected search result:', result)
    // You could open a modal or navigate to a detail view here
  }

  const handleEmbeddingSelect = (embedding: Embedding) => {
    setSelectedEmbedding(embedding)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    // Keep embedding data for a moment to allow smooth close animation
    setTimeout(() => setSelectedEmbedding(null), 200)
  }

  const handleEmbeddingEdit = (embedding: Embedding) => {
    setEditingEmbedding(embedding)
    handleTabChange('create')
  }

  const handleEditComplete = () => {
    setEditingEmbedding(null)
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'search':
        return <SearchInterface onResultSelect={handleSearchResultSelect} />
      case 'list':
        return <EmbeddingList onEmbeddingSelect={handleEmbeddingSelect} onEmbeddingEdit={handleEmbeddingEdit} />
      case 'create':
        return <CreateEditEmbedding editingEmbedding={editingEmbedding} onEditComplete={handleEditComplete} />
      case 'upload':
        return <FileUpload />
      case 'migration':
        return <ModelMigration onMigrationComplete={(result) => {
          console.log('Migration completed:', result)
          // You could show a notification or refresh the embeddings list
        }} />
      case 'config':
        return <ProviderManagement />
      default:
        return <SearchInterface onResultSelect={handleSearchResultSelect} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">EES Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Embedding Engine Service Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <p>EES Dashboard - Embedding Engine Service Management Interface</p>
            <p>Built with React + TypeScript</p>
          </div>
        </div>
      </footer>

      {/* Embedding Detail Modal */}
      <EmbeddingDetailModal
        embedding={selectedEmbedding}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App