/**
 * Core connection configuration types for the domain
 */

export interface ConnectionConfig {
  id: number
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  apiKey?: string | null
  defaultModel?: string | null
  metadata?: string | null // JSON string for additional settings
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface CreateConnectionRequest {
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  apiKey?: string
  defaultModel?: string
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface UpdateConnectionRequest {
  name?: string
  baseUrl?: string
  apiKey?: string
  defaultModel?: string
  metadata?: Record<string, unknown>
  isActive?: boolean
}

export interface ConnectionTestRequest {
  id?: number
  baseUrl?: string
  apiKey?: string
  type?: "ollama" | "openai-compatible"
}

export interface ConnectionTestResponse {
  success: boolean
  message: string
  models?: string[]
}

export interface ConnectionResponse {
  id: number
  name: string
  type: "ollama" | "openai-compatible"
  baseUrl: string
  defaultModel: string | null
  metadata: Record<string, unknown> | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
  // API key is never returned for security
}

export interface ConnectionsListResponse {
  connections: ConnectionResponse[]
  total: number
}
