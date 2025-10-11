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

  describe('Concurrent Upload', () => {
    it('should display concurrency control in directory mode', async () => {
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

      // Initially, concurrency control should not be visible
      expect(screen.queryByText('Upload Concurrency')).not.toBeInTheDocument()

      // Switch to directory mode
      const modeSelect = screen.getByDisplayValue('Individual Files')
      await user.selectOptions(modeSelect, 'directory')

      // Now concurrency control should be visible
      expect(screen.getByText('Upload Concurrency')).toBeInTheDocument()
      expect(screen.getByText('Number of files to upload simultaneously (1-10)')).toBeInTheDocument()
    })

    it('should update concurrency value when slider changes', async () => {
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

      // Switch to directory mode
      const modeSelect = screen.getByDisplayValue('Individual Files')
      await user.selectOptions(modeSelect, 'directory')

      // Find the concurrency slider
      const slider = screen.getByText('Upload Concurrency').parentElement?.querySelector('input[type="range"]')
      expect(slider).toBeInTheDocument()

      if (slider) {
        // Default value should be 3
        expect(slider).toHaveValue('3')

        // Change to 5
        fireEvent.change(slider, { target: { value: '5' } })
        expect(slider).toHaveValue('5')

        // The display value should also update
        const displayValue = screen.getByText('5')
        expect(displayValue).toBeInTheDocument()
      }
    })

    it('should upload files with controlled concurrency', async () => {
      const uploadPromises: Array<() => void> = []
      let activeUploads = 0
      let maxConcurrentUploads = 0

      const mockMutateAsync = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          activeUploads++
          maxConcurrentUploads = Math.max(maxConcurrentUploads, activeUploads)

          // Store resolve function to control when upload completes
          uploadPromises.push(() => {
            activeUploads--
            resolve({})
          })
        })
      })

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

      // Switch to directory mode
      const modeSelect = screen.getByDisplayValue('Individual Files')
      fireEvent.change(modeSelect, { target: { value: 'directory' } })

      await waitFor(() => {
        expect(screen.getByText('Upload Concurrency')).toBeInTheDocument()
      })

      // Set concurrency to 2
      const slider = screen.getByText('Upload Concurrency').parentElement?.querySelector('input[type="range"]')
      if (slider) {
        fireEvent.change(slider, { target: { value: '2' } })
      }

      // Create 5 files with webkitRelativePath
      const mockFile1 = new File(['test1'], 'test1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['test2'], 'test2.txt', { type: 'text/plain' })
      const mockFile3 = new File(['test3'], 'test3.txt', { type: 'text/plain' })
      const mockFile4 = new File(['test4'], 'test4.txt', { type: 'text/plain' })
      const mockFile5 = new File(['test5'], 'test5.txt', { type: 'text/plain' })

      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'dir/test1.txt' })
      Object.defineProperty(mockFile2, 'webkitRelativePath', { value: 'dir/test2.txt' })
      Object.defineProperty(mockFile3, 'webkitRelativePath', { value: 'dir/test3.txt' })
      Object.defineProperty(mockFile4, 'webkitRelativePath', { value: 'dir/test4.txt' })
      Object.defineProperty(mockFile5, 'webkitRelativePath', { value: 'dir/test5.txt' })

      const fileInput = screen.getByTestId('file-upload')

      // Create a mock FileList
      const mockFileList = {
        0: mockFile1,
        1: mockFile2,
        2: mockFile3,
        3: mockFile4,
        4: mockFile5,
        length: 5,
        item: (index: number) => [mockFile1, mockFile2, mockFile3, mockFile4, mockFile5][index],
        [Symbol.iterator]: function* () {
          yield mockFile1
          yield mockFile2
          yield mockFile3
          yield mockFile4
          yield mockFile5
        }
      } as FileList

      // Trigger file selection
      const changeEvent = {
        target: {
          files: mockFileList
        }
      } as React.ChangeEvent<HTMLInputElement>

      fireEvent.change(fileInput, changeEvent)

      // Wait for files to be added
      await waitFor(() => {
        expect(screen.getByText('test1.txt')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Click "Upload All"
      const uploadAllButton = screen.getByText(/Upload All/)
      fireEvent.click(uploadAllButton)

      // Wait for first batch to start
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled()
      }, { timeout: 1000 })

      // Give time for uploads to start
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify that at most 2 uploads are active at once
      expect(maxConcurrentUploads).toBeLessThanOrEqual(2)

      // Complete all uploads
      while (uploadPromises.length > 0) {
        const resolve = uploadPromises.shift()
        if (resolve) resolve()
        await new Promise(r => setTimeout(r, 10))
      }
    })
  })

  describe('Directory Upload', () => {
    it('should switch to directory mode', async () => {
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

      const modeSelect = screen.getByDisplayValue('Individual Files')
      await user.selectOptions(modeSelect, 'directory')

      expect(screen.getByText('Upload Directory')).toBeInTheDocument()
      expect(screen.getByText('Select a directory to upload all files (respects .eesignore patterns)')).toBeInTheDocument()
    })

    it('should handle directory file selection', async () => {
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

      // Switch to directory mode
      const modeSelect = screen.getByDisplayValue('Individual Files')
      fireEvent.change(modeSelect, { target: { value: 'directory' } })

      // Create mock files with webkitRelativePath
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })
      const mockEesignoreFile = new File(['node_modules\n*.log'], '.eesignore', { type: 'text/plain' })
      
      // Add webkitRelativePath property
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'subdir/file1.txt' })
      Object.defineProperty(mockFile2, 'webkitRelativePath', { value: 'subdir/file2.txt' })
      Object.defineProperty(mockEesignoreFile, 'webkitRelativePath', { value: '.eesignore' })
      
      // Mock the text() method for .eesignore file
      Object.defineProperty(mockEesignoreFile, 'text', {
        value: vi.fn().mockResolvedValue('node_modules\n*.log'),
        writable: true
      })

      const fileInput = screen.getByTestId('file-upload')
      
      // Create a mock FileList
      const mockFileList = {
        0: mockFile1,
        1: mockFile2,
        2: mockEesignoreFile,
        length: 3,
        item: (index: number) => [mockFile1, mockFile2, mockEesignoreFile][index],
        [Symbol.iterator]: function* () {
          yield mockFile1
          yield mockFile2
          yield mockEesignoreFile
        }
      } as FileList

      // Simulate file selection by directly calling the onChange handler
      const changeEvent = {
        target: {
          files: mockFileList
        }
      } as React.ChangeEvent<HTMLInputElement>

      // Get the component instance and call handleFileSelect directly
      const component = screen.getByTestId('file-upload').closest('div')?.parentElement
      if (component) {
        // Trigger the change event
        fireEvent.change(fileInput, changeEvent)
      }

      // Wait for async processing to complete
      await waitFor(() => {
        const controls = screen.getByTestId('upload-controls')
        expect(controls).toBeInTheDocument()
        expect(controls.textContent).toMatch(/3 file\(s\) selected/)
      }, { timeout: 3000 })
    })

    it('should display filtering information', async () => {
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

      // Switch to directory mode
      const modeSelect = screen.getByDisplayValue('Individual Files')
      fireEvent.change(modeSelect, { target: { value: 'directory' } })

      // Create mock files
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })
      const mockEesignoreFile = new File(['node_modules\n*.log'], '.eesignore', { type: 'text/plain' })
      
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'subdir/file1.txt' })
      Object.defineProperty(mockFile2, 'webkitRelativePath', { value: 'subdir/file2.txt' })
      Object.defineProperty(mockEesignoreFile, 'webkitRelativePath', { value: '.eesignore' })
      
      // Mock the text() method for .eesignore file
      Object.defineProperty(mockEesignoreFile, 'text', {
        value: vi.fn().mockResolvedValue('node_modules\n*.log'),
        writable: true
      })

      const fileInput = screen.getByTestId('file-upload')
      
      // Create a mock FileList
      const mockFileList = {
        0: mockFile1,
        1: mockFile2,
        2: mockEesignoreFile,
        length: 3,
        item: (index: number) => [mockFile1, mockFile2, mockEesignoreFile][index],
        [Symbol.iterator]: function* () {
          yield mockFile1
          yield mockFile2
          yield mockEesignoreFile
        }
      } as FileList

      // Simulate file selection by directly calling the onChange handler
      const changeEvent = {
        target: {
          files: mockFileList
        }
      } as React.ChangeEvent<HTMLInputElement>

      // Get the component instance and call handleFileSelect directly
      const component = screen.getByTestId('file-upload').closest('div')?.parentElement
      if (component) {
        // Trigger the change event
        fireEvent.change(fileInput, changeEvent)
      }

      // Wait for async processing to complete
      await waitFor(() => {
        const controls = screen.getByTestId('upload-controls')
        expect(controls).toBeInTheDocument()
        expect(controls.textContent).toMatch(/\(3 of 3 after filtering\)/)
      }, { timeout: 3000 })
    })
  })
})
