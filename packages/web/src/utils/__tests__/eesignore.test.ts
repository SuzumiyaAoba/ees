/**
 * Tests for .eesignore functionality
 */

import { describe, expect, it } from 'vitest'
import {
  parseIgnorePatterns,
  getDefaultIgnorePatterns,
  shouldIgnore,
  loadEesignoreFromFiles,
  filterFiles,
} from '../eesignore'

describe('eesignore', () => {
  describe('parseIgnorePatterns', () => {
    it('should parse ignore patterns correctly', () => {
      const content = `
# This is a comment
node_modules
*.log
dist/
!important.log
      `.trim()

      const patterns = parseIgnorePatterns(content)
      expect(patterns).toEqual([
        'node_modules',
        '*.log',
        'dist/',
        '!important.log',
      ])
    })

    it('should handle empty content', () => {
      const patterns = parseIgnorePatterns('')
      expect(patterns).toEqual([])
    })

    it('should filter out comments and empty lines', () => {
      const content = `
# Comment line
node_modules

# Another comment
*.log
      `.trim()

      const patterns = parseIgnorePatterns(content)
      expect(patterns).toEqual(['node_modules', '*.log'])
    })
  })

  describe('getDefaultIgnorePatterns', () => {
    it('should return default ignore patterns', () => {
      const patterns = getDefaultIgnorePatterns()
      expect(patterns).toContain('node_modules')
      expect(patterns).toContain('.DS_Store')
      expect(patterns).toContain('*.log')
    })
  })

  describe('shouldIgnore', () => {
    it('should ignore files matching patterns', () => {
      const patterns = ['node_modules', '*.log', 'dist/']
      
      expect(shouldIgnore('node_modules/file.js', patterns)).toBe(true)
      expect(shouldIgnore('app.log', patterns)).toBe(true)
      expect(shouldIgnore('dist/build.js', patterns)).toBe(true)
      expect(shouldIgnore('src/app.js', patterns)).toBe(false)
    })

    it('should handle negation patterns', () => {
      const patterns = ['*.log', '!important.log']
      
      expect(shouldIgnore('app.log', patterns)).toBe(true)
      expect(shouldIgnore('important.log', patterns)).toBe(false)
    })

    it('should handle directory patterns', () => {
      const patterns = ['dist/', 'build/']
      
      expect(shouldIgnore('dist/file.js', patterns)).toBe(true)
      expect(shouldIgnore('build/asset.css', patterns)).toBe(true)
      expect(shouldIgnore('src/file.js', patterns)).toBe(false)
    })

    it('should handle nested paths', () => {
      const patterns = ['node_modules']
      
      expect(shouldIgnore('node_modules/package/index.js', patterns)).toBe(true)
      expect(shouldIgnore('src/node_modules/file.js', patterns)).toBe(true) // node_modules appears in path
    })
  })

  describe('loadEesignoreFromFiles', () => {
    it('should load .eesignore from files', async () => {
      const mockEesignoreFile = new File(['node_modules\n*.log'], '.eesignore', { type: 'text/plain' })
      const mockFile1 = new File(['content'], 'file1.txt', { type: 'text/plain' })
      
      Object.defineProperty(mockEesignoreFile, 'webkitRelativePath', { value: '.eesignore' })
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'file1.txt' })

      // Mock the text() method
      Object.defineProperty(mockEesignoreFile, 'text', {
        value: vi.fn().mockResolvedValue('node_modules\n*.log'),
        writable: true
      })

      const patterns = await loadEesignoreFromFiles([mockEesignoreFile, mockFile1] as any)
      
      expect(patterns).toEqual(['node_modules', '*.log'])
    })

    it('should return default patterns when no .eesignore file', async () => {
      const mockFile1 = new File(['content'], 'file1.txt', { type: 'text/plain' })
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'file1.txt' })

      const patterns = await loadEesignoreFromFiles([mockFile1] as any)
      
      expect(patterns).toEqual(getDefaultIgnorePatterns())
    })

    it('should handle .eesignore in subdirectory', async () => {
      const mockEesignoreFile = new File(['*.tmp'], '.eesignore', { type: 'text/plain' })
      const mockFile1 = new File(['content'], 'file1.txt', { type: 'text/plain' })
      
      Object.defineProperty(mockEesignoreFile, 'webkitRelativePath', { value: 'subdir/.eesignore' })
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'subdir/file1.txt' })

      // Mock the text() method
      Object.defineProperty(mockEesignoreFile, 'text', {
        value: vi.fn().mockResolvedValue('*.tmp'),
        writable: true
      })

      const patterns = await loadEesignoreFromFiles([mockEesignoreFile, mockFile1] as any)
      
      expect(patterns).toEqual(['*.tmp'])
    })
  })

  describe('filterFiles', () => {
    it('should filter files based on ignore patterns', () => {
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'app.log', { type: 'text/plain' })
      const mockFile3 = new File(['content3'], 'src/app.js', { type: 'text/plain' })
      
      Object.defineProperty(mockFile1, 'webkitRelativePath', { value: 'file1.txt' })
      Object.defineProperty(mockFile2, 'webkitRelativePath', { value: 'app.log' })
      Object.defineProperty(mockFile3, 'webkitRelativePath', { value: 'src/app.js' })

      const patterns = ['*.log']
      const filtered = filterFiles([mockFile1, mockFile2, mockFile3], patterns)
      
      expect(filtered).toHaveLength(2)
      expect(filtered).toContain(mockFile1)
      expect(filtered).toContain(mockFile3)
      expect(filtered).not.toContain(mockFile2)
    })

    it('should handle files without webkitRelativePath', () => {
      const mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const mockFile2 = new File(['content2'], 'app.log', { type: 'text/plain' })
      
      // No webkitRelativePath property
      const patterns = ['*.log']
      const filtered = filterFiles([mockFile1, mockFile2], patterns)
      
      expect(filtered).toHaveLength(1)
      expect(filtered).toContain(mockFile1)
      expect(filtered).not.toContain(mockFile2)
    })

    it('should handle empty file list', () => {
      const patterns = ['*.log']
      const filtered = filterFiles([], patterns)
      
      expect(filtered).toEqual([])
    })
  })
})
