/**
 * Tests for FileUpload component
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '../FileUpload'
import { renderWithQueryClient } from '@/__tests__/test-utils'
import * as useEmbeddingsModule from '@/hooks/useEmbeddings'

// Mock the useUploadFile and useProviderModels hooks
vi.mock('@/hooks/useEmbeddings', () => ({
  useUploadFile: vi.fn(),
  useProviderModels: vi.fn(),
}))

// Mock data
const mockModels = [
  { name: 'nomic-embed-text', provider: 'ollama' },
  { name: 'text-embedding-3-small', provider: 'openai' },
  { name: 'text-embedding-3-large', provider: 'openai' },
]

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render file upload component without crashing', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      expect(screen.getByText('File Upload Configuration')).toBeInTheDocument()
    })

    it('should render upload configuration section', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      expect(screen.getByText('Embedding Model')).toBeInTheDocument()
      expect(screen.getByText('Use default model')).toBeInTheDocument()
    })

    it('should render file drop zone', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      expect(screen.getByText('Upload Files')).toBeInTheDocument()
      expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument()
    })

    it('should render select files button', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      expect(screen.getByText('Select Files')).toBeInTheDocument()
    })
  })

  describe('Model Selection', () => {
    it('should display default model option', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const modelSelect = screen.getByText('Embedding Model').parentElement?.querySelector('select')
      expect(modelSelect).toBeInTheDocument()
      expect(screen.getByText('Use default model')).toBeInTheDocument()
    })

    it('should display available models from provider', () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      expect(screen.getByText('nomic-embed-text')).toBeInTheDocument()
      expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument()
      expect(screen.getByText('text-embedding-3-large')).toBeInTheDocument()
    })

    it('should update selected model when changed', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const modelSelect = screen.getByText('Embedding Model').parentElement?.querySelector('select')
      expect(modelSelect).toBeInTheDocument()

      if (modelSelect) {
        await user.selectOptions(modelSelect, 'nomic-embed-text')
        expect(modelSelect).toHaveValue('nomic-embed-text')
      }
    })
  })

  describe('File Selection', () => {
    it('should allow selecting files via input', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('multiple')

      // Create a mock file
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })
    })

    it('should display file list when files are selected', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Upload Queue')).toBeInTheDocument()
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })
    })

    it('should format file size correctly', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['a'.repeat(1024)], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText(/1 KB/)).toBeInTheDocument()
      })
    })

    it('should allow selecting multiple files', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = new File(['test1'], 'test1.txt', { type: 'text/plain' })
      const file2 = new File(['test2'], 'test2.txt', { type: 'text/plain' })
      await user.upload(fileInput, [file1, file2])

      await waitFor(() => {
        expect(screen.getByText('test1.txt')).toBeInTheDocument()
        expect(screen.getByText('test2.txt')).toBeInTheDocument()
        expect(screen.getByText(/2 file\(s\) selected/)).toBeInTheDocument()
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should activate drop zone on drag over', async () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const dropZone = screen.getByText(/drag & drop files here/i).closest('div')
      expect(dropZone).toBeInTheDocument()

      if (dropZone) {
        fireEvent.dragOver(dropZone, {
          dataTransfer: { files: [] },
        })

        await waitFor(() => {
          expect(screen.getByText('Drop files here')).toBeInTheDocument()
        })
      }
    })

    it('should deactivate drop zone on drag leave', async () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const dropZone = screen.getByText(/drag & drop files here/i).closest('div')
      expect(dropZone).toBeInTheDocument()

      if (dropZone) {
        // Activate
        fireEvent.dragOver(dropZone, {
          dataTransfer: { files: [] },
        })

        await waitFor(() => {
          expect(screen.getByText('Drop files here')).toBeInTheDocument()
        })

        // Deactivate
        fireEvent.dragLeave(dropZone, {
          dataTransfer: { files: [] },
        })

        await waitFor(() => {
          expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('File Management', () => {
    it('should remove individual files', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      // Find and click the remove button (X icon)
      const removeButtons = screen.getAllByRole('button')
      const removeButton = removeButtons.find((btn) => {
        const svg = btn.querySelector('svg')
        return svg !== null && btn.textContent === ''
      })

      expect(removeButton).toBeInTheDocument()

      if (removeButton) {
        await user.click(removeButton)

        await waitFor(() => {
          expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
        })
      }
    })

    it('should clear all files', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = new File(['test1'], 'test1.txt', { type: 'text/plain' })
      const file2 = new File(['test2'], 'test2.txt', { type: 'text/plain' })
      await user.upload(fileInput, [file1, file2])

      await waitFor(() => {
        expect(screen.getByText('test1.txt')).toBeInTheDocument()
        expect(screen.getByText('test2.txt')).toBeInTheDocument()
      })

      const clearButton = screen.getByText('Clear All')
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText('test1.txt')).not.toBeInTheDocument()
        expect(screen.queryByText('test2.txt')).not.toBeInTheDocument()
        expect(screen.queryByText('Upload Queue')).not.toBeInTheDocument()
      })
    })

    it('should display upload controls when files are present', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument()
        expect(screen.getByText(/Upload All/)).toBeInTheDocument()
      })
    })
  })

  describe('Upload Functionality', () => {
    it('should call upload mutation when uploading a file', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockResolvedValue({})

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      // Find and click the individual upload button
      const uploadButtons = screen.getAllByRole('button')
      const uploadButton = uploadButtons.find((btn) => btn.textContent === 'Upload')

      expect(uploadButton).toBeInTheDocument()

      if (uploadButton) {
        await user.click(uploadButton)

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalledWith({
            file,
            modelName: undefined,
          })
        })
      }
    })

    it('should disable upload all button when no pending files', async () => {
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      // No files added yet, Upload All should not be visible
      expect(screen.queryByText(/Upload All/)).not.toBeInTheDocument()
    })

    it('should handle upload errors', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Upload failed'))

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      const uploadButtons = screen.getAllByRole('button')
      const uploadButton = uploadButtons.find((btn) => btn.textContent === 'Upload')

      if (uploadButton) {
        await user.click(uploadButton)

        await waitFor(() => {
          expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
          expect(screen.getByText('Retry')).toBeInTheDocument()
        })
      }
    })

    it('should allow retrying failed uploads', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Upload failed'))

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      const uploadButtons = screen.getAllByRole('button')
      const uploadButton = uploadButtons.find((btn) => btn.textContent === 'Upload')

      if (uploadButton) {
        await user.click(uploadButton)

        await waitFor(() => {
          expect(screen.getByText('Retry')).toBeInTheDocument()
        })

        const retryButton = screen.getByText('Retry')
        await user.click(retryButton)

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalledTimes(2)
        })
      }
    })
  })

  describe('Status Display', () => {
    it('should display pending count correctly', async () => {
      const user = userEvent.setup()
      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = new File(['test1'], 'test1.txt', { type: 'text/plain' })
      const file2 = new File(['test2'], 'test2.txt', { type: 'text/plain' })
      await user.upload(fileInput, [file1, file2])

      await waitFor(() => {
        expect(screen.getByText(/2 file\(s\) selected/)).toBeInTheDocument()
        expect(screen.getByText(/2 pending/)).toBeInTheDocument()
      })
    })

    it('should display success count after successful upload', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockResolvedValue({})

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      const uploadButtons = screen.getAllByRole('button')
      const uploadButton = uploadButtons.find((btn) => btn.textContent === 'Upload')

      if (uploadButton) {
        await user.click(uploadButton)

        await waitFor(() => {
          expect(screen.getByText(/1 completed/)).toBeInTheDocument()
        })
      }
    })

    it('should display error count after failed upload', async () => {
      const user = userEvent.setup()
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Upload failed'))

      vi.mocked(useEmbeddingsModule.useProviderModels).mockReturnValue({
        data: mockModels,
        isLoading: false,
        error: null,
      } as any)

      vi.mocked(useEmbeddingsModule.useUploadFile).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      renderWithQueryClient(<FileUpload />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })

      const uploadButtons = screen.getAllByRole('button')
      const uploadButton = uploadButtons.find((btn) => btn.textContent === 'Upload')

      if (uploadButton) {
        await user.click(uploadButton)

        await waitFor(() => {
          expect(screen.getByText(/1 failed/)).toBeInTheDocument()
        })
      }
    })
  })
})
