/**
 * Tests for ModelMigration component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@/__tests__/test-utils'
import userEvent from '@testing-library/user-event'
import { ModelMigration } from '../ModelMigration'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import * as apiClientModule from '@/services/api'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'
import * as useModelsModule from '@/hooks/useModels'

// Mock the API client
vi.mock('@/services/api', () => ({
  apiClient: {
    checkModelCompatibility: vi.fn(),
    migrateEmbeddings: vi.fn(),
    getModelsList: vi.fn(),
  },
}))

// Mock the useEmbeddings hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useProviderModels: vi.fn(),
}))

vi.mock('@/hooks/useModels', () => ({
  useModels: vi.fn(),
}))

vi.mock('@/components/ui/FormSelect', () => ({
  FormSelect: ({ label, value, onChange, options, required }: any) => (
    <div>
      {label && (
        <label>
          {label}
          {required ? '*' : ''}
        </label>
      )}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select an option</option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
}))

const getSelectTrigger = (labelText: string): HTMLElement => {
  const label = screen.getByText(labelText)
  const selectElement = label.parentElement?.querySelector('select')
  if (selectElement instanceof HTMLElement) {
    return selectElement
  }

  const trigger =
    label.parentElement?.querySelector('[role="combobox"]') ?? label.nextElementSibling

  if (!(trigger instanceof HTMLElement)) {
    throw new Error(`Select trigger not found for ${labelText}`)
  }

  return trigger
}

const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  labelText: string,
  optionText: string
) => {
  const trigger = getSelectTrigger(labelText)

  if (trigger.tagName.toLowerCase() === 'select') {
    await user.selectOptions(trigger, optionText)
  } else {
    await user.click(trigger)
    const option = await screen.findByRole('option', { name: optionText })
    await user.click(option)
  }
}

const chooseModels = async (
  user: ReturnType<typeof userEvent.setup>,
  fromModel: string,
  toModel: string
) => {
  await selectOption(user, 'From Model', fromModel)
  await selectOption(user, 'To Model', toModel)
}

// Mock data
const mockModels = [
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    provider: 'ollama',
    dimensions: 768,
  },
  {
    name: 'text-embedding-3-small',
    displayName: 'Text Embedding 3 Small',
    provider: 'openai',
    dimensions: 1536,
  },
  {
    name: 'text-embedding-3-large',
    provider: 'openai',
    dimensions: 3072,
  },
]

const mockCompatibilitySuccess = {
  compatible: true,
  reason: 'Both models have similar dimensions',
  similarityScore: 0.85,
}

const mockCompatibilityFailure = {
  compatible: false,
  reason: 'Dimension mismatch: 768 vs 3072',
  similarityScore: 0.3,
}

const mockMigrationResult = {
  totalProcessed: 100,
  successful: 95,
  failed: 5,
  duration: 5000,
  details: [
    { id: 1, uri: 'doc1', status: 'success' as const },
    { id: 2, uri: 'doc2', status: 'success' as const },
    { id: 3, uri: 'doc3', status: 'error' as const, error: 'Failed to generate embedding' },
  ],
}

describe('ModelMigration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for useProviderModels
    vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
      data: mockModels,
      isLoading: false,
      error: null,
    } as any)

    vi.mocked(useModelsModule.useModels).mockReturnValue({
      models: mockModels,
      loading: false,
      error: null,
      fetchModels: vi.fn(),
      createModel: vi.fn(),
      updateModel: vi.fn(),
      deleteModel: vi.fn(),
      activateModel: vi.fn(),
    } as any)
  })

  describe('Rendering', () => {
    it('should render model migration component without crashing', async () => {
      renderWithQueryClient(<ModelMigration />)

      expect(screen.getByText('Model Migration')).toBeInTheDocument()
    })

    it('should render model selection dropdowns', async () => {

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
        expect(screen.getByText('To Model')).toBeInTheDocument()
      })
    })

    it('should render check compatibility button', async () => {

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('Check Compatibility')).toBeInTheDocument()
      })
    })
  })

  describe('Model Selection', () => {
    it('should load models on mount', async () => {
      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(useModelsModule.useModels).toHaveBeenCalled()
      })
    })

    it('should display loaded models in dropdowns', async () => {

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getAllByText('Nomic Embed Text').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Text Embedding 3 Small').length).toBeGreaterThan(0)
      })
    })

    it('should update from model on selection', async () => {
      const user = userEvent.setup()

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await selectOption(user, 'From Model', 'nomic-embed-text')

      expect(getSelectTrigger('From Model')).toHaveTextContent('Nomic Embed Text')
    })

    it('should update to model on selection', async () => {
      const user = userEvent.setup()

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('To Model')).toBeInTheDocument()
      })

      await selectOption(user, 'To Model', 'text-embedding-3-small')

      expect(getSelectTrigger('To Model')).toHaveTextContent('Text Embedding 3 Small')
    })

    it('should disable check compatibility button when models not selected', async () => {

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        const checkButton = screen.getByText('Check Compatibility')
        expect(checkButton).toBeDisabled()
      })
    })
  })

  describe('Compatibility Check', () => {
    it('should call compatibility check API when button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(apiClientModule.apiClient.checkModelCompatibility).toHaveBeenCalledWith({
          sourceModel: 'nomic-embed-text',
          targetModel: 'text-embedding-3-small',
        })
      })
    })

    it('should display success message when models are compatible', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText(/Models are compatible/)).toBeInTheDocument()
      })
    })

    it('should display error message when models are incompatible', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilityFailure)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-large')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText(/Models are incompatible/)).toBeInTheDocument()
        expect(screen.getByText(/Dimension mismatch/)).toBeInTheDocument()
      })
    })

    it('should display similarity score when available', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText(/Similarity score: 85.0%/)).toBeInTheDocument()
      })
    })
  })

  describe('Migration Options', () => {
    it('should display migration options when models are compatible', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Migration Options')).toBeInTheDocument()
        expect(screen.getByText('Preserve original embeddings')).toBeInTheDocument()
        expect(screen.getByText('Continue on errors')).toBeInTheDocument()
      })
    })

    it('should toggle preserve original option', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Preserve original embeddings')).toBeInTheDocument()
      })

      const preserveLabel = screen.getByText('Preserve original embeddings')
      const preserveCheckbox = preserveLabel.parentElement?.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(preserveCheckbox).not.toBeChecked()

      await user.click(preserveCheckbox)
      expect(preserveCheckbox).toBeChecked()
    })

    it('should update batch size input', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText(/Batch size:/)).toBeInTheDocument()
      })

      const batchSizeInput = screen.getByText(/Batch size:/).parentElement?.querySelector('input') as HTMLInputElement
      expect(batchSizeInput).toHaveValue(100)

      await user.clear(batchSizeInput)
      await user.type(batchSizeInput, '50')
      expect(batchSizeInput).toHaveValue(50)
    })
  })

  describe('Migration Execution', () => {
    it('should display start migration button when compatible', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })
    })

    it('should call migration API when start button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)
      vi.mocked(apiClientModule.apiClient.migrateEmbeddings).mockResolvedValue(mockMigrationResult)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Migration')
      await user.click(startButton)

      await waitFor(() => {
        expect(apiClientModule.apiClient.migrateEmbeddings).toHaveBeenCalledWith({
          fromModel: 'nomic-embed-text',
          toModel: 'text-embedding-3-small',
          options: {
            preserveOriginal: false,
            batchSize: 100,
            continueOnError: true,
          },
        })
      })
    })

    it('should display migration results after completion', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)
      vi.mocked(apiClientModule.apiClient.migrateEmbeddings).mockResolvedValue(mockMigrationResult)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Migration')
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('Migration Results')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument() // Total processed
        expect(screen.getByText('95')).toBeInTheDocument() // Successful
        expect(screen.getByText('5')).toBeInTheDocument() // Failed
      })
    })

    it('should call onMigrationComplete callback when provided', async () => {
      const onMigrationComplete = vi.fn()
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)
      vi.mocked(apiClientModule.apiClient.migrateEmbeddings).mockResolvedValue(mockMigrationResult)

      renderWithQueryClient(<ModelMigration onMigrationComplete={onMigrationComplete} />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Migration')
      await user.click(startButton)

      await waitFor(() => {
        expect(onMigrationComplete).toHaveBeenCalledWith(mockMigrationResult)
      })
    })

    it('should display failed items when present', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)
      vi.mocked(apiClientModule.apiClient.migrateEmbeddings).mockResolvedValue(mockMigrationResult)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Migration')
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('Failed Items:')).toBeInTheDocument()
        expect(screen.getByText('doc3')).toBeInTheDocument()
        expect(screen.getByText('Failed to generate embedding')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when model loading fails', async () => {
      vi.mocked(useModelsModule.useModels).mockReturnValue({
        models: [],
        loading: false,
        error: 'Failed to load models',
        fetchModels: vi.fn(),
        createModel: vi.fn(),
        updateModel: vi.fn(),
        deleteModel: vi.fn(),
        activateModel: vi.fn(),
      } as any)

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load models')).toBeInTheDocument()
      })
    })

    it('should display error when compatibility check fails', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockRejectedValue(new Error('Check failed'))

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Check failed')).toBeInTheDocument()
      })
    })

    it('should display error when migration fails', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClientModule.apiClient.checkModelCompatibility).mockResolvedValue(mockCompatibilitySuccess)
      vi.mocked(apiClientModule.apiClient.migrateEmbeddings).mockRejectedValue(new Error('Migration failed'))

      renderWithQueryClient(<ModelMigration />)

      await waitFor(() => {
        expect(screen.getByText('From Model')).toBeInTheDocument()
      })

      await chooseModels(user, 'nomic-embed-text', 'text-embedding-3-small')

      const checkButton = screen.getByText('Check Compatibility')
      await user.click(checkButton)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      const startButton = screen.getByText('Start Migration')
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Migration failed')).toBeInTheDocument()
      })
    })
  })
})
