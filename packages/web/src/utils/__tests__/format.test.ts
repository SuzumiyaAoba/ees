import { describe, it, expect } from 'vitest'
import { formatFileSize, getTextByteSize, getTextFileSize } from '../format'

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
    expect(formatFileSize(1023)).toBe('1023 Bytes')
  })

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(2048)).toBe('2 KB')
  })

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1572864)).toBe('1.5 MB')
    expect(formatFileSize(5242880)).toBe('5 MB')
  })

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
    expect(formatFileSize(1610612736)).toBe('1.5 GB')
  })

  it('should format terabytes', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB')
  })

  it('should respect decimal places parameter', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB')
    expect(formatFileSize(1536, 1)).toBe('1.5 KB')
    expect(formatFileSize(1536, 2)).toBe('1.5 KB') // parseFloat removes trailing zeros
    expect(formatFileSize(1638, 2)).toBe('1.6 KB')
  })
})

describe('getTextByteSize', () => {
  it('should calculate byte size for ASCII text', () => {
    const text = 'Hello World'
    expect(getTextByteSize(text)).toBe(11)
  })

  it('should calculate byte size for UTF-8 text', () => {
    const text = 'こんにちは' // 5 Japanese characters
    // Each character is 3 bytes in UTF-8
    expect(getTextByteSize(text)).toBe(15)
  })

  it('should calculate byte size for mixed text', () => {
    const text = 'Hello こんにちは World'
    expect(getTextByteSize(text)).toBeGreaterThan(20)
  })

  it('should handle empty string', () => {
    expect(getTextByteSize('')).toBe(0)
  })

  it('should handle emojis', () => {
    const text = '😀😃😄' // 3 emojis
    // Each emoji is 4 bytes in UTF-8
    expect(getTextByteSize(text)).toBe(12)
  })
})

describe('getTextFileSize', () => {
  it('should return formatted file size for text', () => {
    const text = 'a'.repeat(1024) // 1 KB
    expect(getTextFileSize(text)).toBe('1 KB')
  })

  it('should return formatted file size for large text', () => {
    const text = 'a'.repeat(1024 * 1024) // 1 MB
    expect(getTextFileSize(text)).toBe('1 MB')
  })

  it('should handle empty text', () => {
    expect(getTextFileSize('')).toBe('0 Bytes')
  })

  it('should respect decimal places parameter', () => {
    const text = 'a'.repeat(1536) // 1.5 KB
    expect(getTextFileSize(text, 0)).toBe('2 KB')
    expect(getTextFileSize(text, 1)).toBe('1.5 KB')
    expect(getTextFileSize(text, 2)).toBe('1.5 KB') // parseFloat removes trailing zeros
  })
})
