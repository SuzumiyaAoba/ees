import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Search, List, Upload, Settings, ArrowLeftRight, Plus, FolderOpen, Eye, Moon, Sun } from 'lucide-react'
import { SearchInterface } from '@/components/SearchInterface'
import { EmbeddingList } from '@/components/EmbeddingList'
import { FileUpload } from '@/components/FileUpload'
import { CreateEditEmbedding } from '@/components/CreateEditEmbedding'
import { ProviderManagement } from '@/components/ProviderManagement'
import { ModelMigration } from '@/components/ModelMigration'
import { EmbeddingDetailModal } from '@/components/EmbeddingDetailModal'
import { UploadDirectoryManagement } from '@/components/UploadDirectoryManagement'
import { EmbeddingVisualization } from '@/components/EmbeddingVisualization'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/design-system/components/Logo'
import { useDarkMode } from '@/hooks/useDarkMode'
import { apiClient } from '@/services/api'
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

type TabType = 'search' | 'list' | 'create' | 'upload' | 'directories' | 'visualize' | 'migration' | 'config'

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
  { id: 'directories', label: 'Directories', icon: FolderOpen },
  { id: 'visualize', label: 'Visualize', icon: Eye },
  { id: 'migration', label: 'Migration', icon: ArrowLeftRight },
  { id: 'config', label: 'Config', icon: Settings },
]

const VALID_TABS: TabType[] = ['search', 'list', 'create', 'upload', 'directories', 'visualize', 'migration', 'config']

function AppContent() {
  const { isDark, toggleTheme } = useDarkMode()

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

  const handleSearchResultSelect = async (result: SearchResult) => {
    // Optimistically open with minimal data, then hydrate with full embedding
    setSelectedEmbedding({
      id: result.id,
      uri: result.uri,
      text: result.text,
      model_name: result.model_name,
      embedding: [],
      created_at: result.created_at,
      updated_at: result.updated_at,
    })
    setIsDetailModalOpen(true)

    try {
      const full = await apiClient.getEmbedding(result.uri, result.model_name)
      setSelectedEmbedding(full)
    } catch (e) {
      console.error('Failed to load embedding details from search result:', e)
    }
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
      case 'directories':
        return <UploadDirectoryManagement />
      case 'visualize':
        return <EmbeddingVisualization />
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

  // Check if current tab should use full width
  const isFullWidthTab = activeTab === 'visualize'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Logo size="md" variant={isDark ? 'white' : 'gradient'} />

            {/* Navigation Tabs */}
            <Tabs className="flex-1">
              <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-lg">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      active={activeTab === tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>

            {/* Theme Toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              className="rounded-full shrink-0"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full ${isFullWidthTab ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        {renderActiveTab()}
      </main>

      {/* Footer */}
      {!isFullWidthTab && (
        <footer className="border-t mt-auto bg-card/50 backdrop-blur-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <span className="inline-block w-2 h-2 bg-success rounded-full mr-1.5"></span>
                  Online
                </Badge>
              </div>
              <p className="hidden sm:block">Built with React + TypeScript + Tailwind CSS</p>
            </div>
          </div>
        </footer>
      )}

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