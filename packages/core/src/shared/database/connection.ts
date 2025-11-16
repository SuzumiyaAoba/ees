import { existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { Context, Effect, Layer } from "effect"
import { DatabaseConnectionError } from "@/shared/errors/database"
import { getEnvWithDefault, isTestEnv } from "@/shared/lib/env"
import { createPinoLogger, createLoggerConfig } from "@/shared/observability/logger"
import * as schema from "./schema"

/**
 * Logger instance for database operations
 */
const logger = createPinoLogger(createLoggerConfig())

export interface DatabaseService {
  readonly db: ReturnType<typeof drizzle>
  readonly client: ReturnType<typeof createClient>
}

export const DatabaseService =
  Context.GenericTag<DatabaseService>("DatabaseService")

/**
 * Global cached database client and instance for test environment
 * This ensures all requests in E2E tests share the same in-memory database
 */
let globalTestClient: ReturnType<typeof createClient> | null = null
let globalTestDb: ReturnType<typeof drizzle> | null = null

const make = Effect.gen(function* () {
  const isTest = isTestEnv()

  let client: ReturnType<typeof createClient>
  let db: ReturnType<typeof drizzle>

  // In test environment, reuse the same client and db instance
  if (isTest) {
    if (!globalTestClient) {
      logger.debug("Creating global test database client (first time)")
      globalTestClient = createClient({ url: ":memory:" })
      globalTestDb = drizzle(globalTestClient, { schema })
    } else {
      logger.debug("Reusing existing global test database client")
    }

    client = globalTestClient
    db = globalTestDb!
  } else {
    // Production/development environment: create new client each time
    // Use EES_DATA_DIR environment variable if set, otherwise fall back to cwd/data
    const dataDir = getEnvWithDefault(
      "EES_DATA_DIR",
      resolve(process.cwd(), "data")
    )
    const DB_PATH = resolve(dataDir, "embeddings.db")

    // Ensure data directory exists for non-test environments
    yield* Effect.try({
      try: () => {
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true })
        }
      },
      catch: (error) =>
        new DatabaseConnectionError({
          message: `Failed to create data directory: ${dataDir}`,
          cause: error,
        }),
    })

    client = yield* Effect.try({
      try: () =>
        createClient({
          url: `file:${DB_PATH}`,
        }),
      catch: (error) =>
        new DatabaseConnectionError({
          message: "Failed to create database client",
          cause: error,
        }),
    })

    db = drizzle(client, { schema })
  }

  /**
   * Initialize database schema with automatic migration support
   *
   * Algorithm Flow:
   * 1. Query sqlite_master to check if embeddings table exists
   * 2. Detect format by checking CREATE TABLE statement:
   *    - Old format: Uses generic BLOB type for embeddings
   *    - New format: Uses F32_BLOB(768) for optimized vector storage
   * 3. If migration needed: Drop old table and indices (destructive migration)
   * 4. Create new table with F32_BLOB format and all indices
   *
   * Business Rules:
   * - Migration is destructive: existing embeddings cannot be preserved
   * - F32_BLOB format is incompatible with legacy BLOB format (different binary encoding)
   * - Users must recreate embeddings after migration
   * - Migration only runs once (on first startup with old schema)
   *
   * Format Detection Logic:
   * - Checks CREATE TABLE SQL for "BLOB" keyword (legacy format)
   * - Excludes "F32_BLOB" to avoid false positives (new format)
   * - Table existence check prevents errors on fresh installations
   *
   * Performance Considerations:
   * - F32_BLOB provides native vector operations (similarity search)
   * - Vector index uses libsql_vector_idx for fast similarity queries
   * - Cosine similarity metric is optimal for text embeddings
   * - Indices created on uri, model_name, created_at for query performance
   *
   * Edge Cases Handled:
   * - Fresh install: Table doesn't exist, create new schema
   * - Already migrated: F32_BLOB detected, skip migration
   * - Multiple indices: All old indices dropped to avoid conflicts
   *
   * Migration is Destructive Because:
   * - BLOB stores JSON array: "[0.1, 0.2, ...]" as UTF-8 text
   * - F32_BLOB stores binary: 4 bytes per float32 value
   * - No conversion path: would need to re-generate embeddings anyway
   * - Clean break ensures consistency (no mixed formats)
   */
  yield* Effect.tryPromise({
    try: async () => {
      // Step 1: Query sqlite_master for existing table schema
      // sqlite_master contains CREATE TABLE statements for all tables
      const tableInfo = await client.execute(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='embeddings'
      `)

      // Step 2: Detect if migration is needed using format heuristic
      // Migration needed when:
      // - Table exists (rows.length > 0)
      // - Schema contains "BLOB" (old format marker)
      // - Schema does NOT contain "F32_BLOB" (avoid false positive on new format)
      const needsMigration = tableInfo.rows.length > 0 &&
        tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
        !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

      if (needsMigration) {
        logger.info("🔄 Migrating database schema from BLOB to F32_BLOB format...")

        // Step 3a: Count existing embeddings for user feedback
        // Note: We don't migrate data because BLOB→F32_BLOB conversion is not possible
        // Users need to re-generate embeddings with the new format
        const existingData = await client.execute(`
          SELECT uri, text, model_name FROM embeddings
        `)

        // Step 3b: Drop old table and all associated indices
        // Dropping indices first is cleaner but SQLite allows dropping table with indices
        await client.execute(`DROP TABLE IF EXISTS embeddings`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_uri_model_task`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_task_type`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

        // Inform user about data loss and next steps
        logger.warn(`Migration removed ${existingData.rows.length} existing embeddings (BLOB format not compatible with F32_BLOB)`)
        logger.info("💡 Embeddings will need to be recreated with the new vector format")
      }

      // Step 4: Create new table with F32_BLOB format
      // F32_BLOB(768): Binary format for 768-dimensional float32 vectors
      // 768 dimensions is standard for nomic-embed-text model
      await client.execute(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uri TEXT NOT NULL,
          text TEXT NOT NULL,
          original_content TEXT,
          converted_format TEXT,
          model_name TEXT NOT NULL DEFAULT 'nomic-embed-text',
          task_type TEXT,
          embedding F32_BLOB(768) NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indices for common query patterns

      // Composite unique index on (uri, model_name, task_type): Allows multiple task types per document
      await client.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_uri_model_task ON embeddings(uri, model_name, task_type)
      `)

      // Index on created_at: Supports time-based queries and sorting
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)
      `)

      // Index on model_name: Enables filtering by embedding model
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)
      `)

      // Index on task_type: Enables filtering by task type
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_task_type ON embeddings(task_type)
      `)

      // Vector index: Enables fast similarity search using cosine metric
      // libsql_vector_idx creates specialized index for vector operations
      // metric=cosine: Most appropriate for text embedding similarity
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))
      `)

      // Create upload_directories table for directory management
      await client.execute(`
        CREATE TABLE IF NOT EXISTS upload_directories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          model_name TEXT NOT NULL DEFAULT 'nomic-embed-text',
          task_types TEXT,
          description TEXT,
          last_synced_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Index on path: Enables fast lookups and prevents duplicates
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_upload_directories_path ON upload_directories(path)
      `)

      // Index on created_at: Supports time-based queries and sorting
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_upload_directories_created_at ON upload_directories(created_at)
      `)

      // Create sync_jobs table for background directory synchronization
      await client.execute(`
        CREATE TABLE IF NOT EXISTS sync_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          directory_id INTEGER NOT NULL REFERENCES upload_directories(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending',
          total_files INTEGER NOT NULL DEFAULT 0,
          processed_files INTEGER NOT NULL DEFAULT 0,
          created_files INTEGER NOT NULL DEFAULT 0,
          updated_files INTEGER NOT NULL DEFAULT 0,
          failed_files INTEGER NOT NULL DEFAULT 0,
          current_file TEXT,
          error_message TEXT,
          started_at TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Index on directory_id: Enables fast lookups by directory
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_directory_id ON sync_jobs(directory_id)
      `)

      // Index on status: Enables filtering by job status
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status)
      `)

      // Index on created_at: Supports time-based queries and sorting
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at)
      `)

      // Check if connection_configs exists (old schema)
      const connectionConfigsExists = await client.execute(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='connection_configs'
      `)

      // Migrate from connection_configs to providers + models if old schema exists
      if (connectionConfigsExists.rows.length > 0) {
        logger.info("🔄 Migrating connection_configs to providers and models...")

        // Get all existing connections
        const existingConnections = await client.execute(`
          SELECT * FROM connection_configs
        `)

        // Create providers table first
        await client.execute(`
          CREATE TABLE IF NOT EXISTS providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            base_url TEXT NOT NULL,
            api_key TEXT,
            metadata TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type)
        `)

        // Create models table
        await client.execute(`
          CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            display_name TEXT,
            model_type TEXT NOT NULL DEFAULT 'embedding',
            is_active INTEGER NOT NULL DEFAULT 0,
            metadata TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_name ON models(name)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_model_type ON models(model_type)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active)
        `)

        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_models_provider_name ON models(provider_id, name)
        `)

        // Migrate data
        for (const row of existingConnections.rows) {
          // Extract values with proper type handling
          const name = row["name"] as string
          const type = row["type"] as string
          const baseUrl = row["base_url"] as string
          const apiKey = row["api_key"] as string | null
          const metadata = row["metadata"] as string | null
          const defaultModel = row["default_model"] as string
          const createdAt = row["created_at"] as string | null
          const updatedAt = row["updated_at"] as string | null
          const isActiveValue = row["is_active"] as number | boolean | null

          // Insert provider
          const providerResult = await client.execute({
            sql: `INSERT INTO providers (name, type, base_url, api_key, metadata, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [name, type, baseUrl, apiKey, metadata, createdAt, updatedAt],
          })

          // Get the provider ID
          const providerId = providerResult.lastInsertRowid
          if (providerId === undefined) {
            throw new Error("Failed to get provider ID after insert")
          }

          // Insert model for this provider
          const isActive = isActiveValue === 1 || isActiveValue === true
          await client.execute({
            sql: `INSERT INTO models (provider_id, name, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              Number(providerId),
              defaultModel,
              isActive ? 1 : 0,
              createdAt,
              updatedAt,
            ],
          })
        }

        // Drop old table
        await client.execute(`DROP TABLE connection_configs`)
        await client.execute(`DROP INDEX IF EXISTS idx_connection_configs_name`)
        await client.execute(`DROP INDEX IF EXISTS idx_connection_configs_type`)
        await client.execute(`DROP INDEX IF EXISTS idx_connection_configs_is_active`)

        logger.info(`✅ Migrated ${existingConnections.rows.length} connections to providers and models`)
      } else {
        // Fresh install - create new tables directly
        await client.execute(`
          CREATE TABLE IF NOT EXISTS providers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            base_url TEXT NOT NULL,
            api_key TEXT,
            metadata TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type)
        `)

        await client.execute(`
          CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            display_name TEXT,
            model_type TEXT NOT NULL DEFAULT 'embedding',
            is_active INTEGER NOT NULL DEFAULT 0,
            metadata TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_name ON models(name)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_model_type ON models(model_type)
        `)

        await client.execute(`
          CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active)
        `)

        await client.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_models_provider_name ON models(provider_id, name)
        `)
      }

      if (needsMigration) {
        logger.info("✅ Database migration completed successfully")
      }
    },
    catch: (error) =>
      new DatabaseConnectionError({
        message: "Failed to initialize database schema",
        cause: error,
      }),
  })

  return { db, client }
})

/**
 * Database service layer
 * Creates database connection with automatic schema initialization
 */
export const DatabaseServiceLive = Layer.effect(DatabaseService, make)
