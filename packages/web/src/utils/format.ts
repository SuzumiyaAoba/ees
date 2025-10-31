/**
 * Format bytes to human-readable file size
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size string (e.g., "1.2 KB", "3.4 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Calculate byte size of a string (UTF-8 encoding)
 * @param text - Text string
 * @returns Number of bytes
 */
export function getTextByteSize(text: string): number {
  return new Blob([text]).size
}

/**
 * Get human-readable file size from text
 * @param text - Text string
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size string
 */
export function getTextFileSize(text: string, decimals: number = 1): string {
  const bytes = getTextByteSize(text)
  return formatFileSize(bytes, decimals)
}
