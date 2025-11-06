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

const make = Effect.gen(function* () {
  const isTest = isTestEnv()

  // Use EES_DATA_DIR environment variable if set, otherwise fall back to cwd/data
  const dataDir = getEnvWithDefault(
    "EES_DATA_DIR",
    resolve(process.cwd(), "data")
  )
  const DB_PATH = isTest ? ":memory:" : resolve(dataDir, "embeddings.db")

  // Ensure data directory exists for non-test environments
  if (!isTest) {
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
  }

  const client = yield* Effect.try({
    try: () =>
      createClient({
        url: isTest ? ":memory:" : `file:${DB_PATH}`,
      }),
    catch: (error) =>
      new DatabaseConnectionError({
        message: "Failed to create database client",
        cause: error,
      }),
  })

  const db = drizzle(client, { schema })

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

      // Create connection_configs table for provider connection management
      await client.execute(`
        CREATE TABLE IF NOT EXISTS connection_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          base_url TEXT NOT NULL,
          api_key TEXT,
          default_model TEXT,
          metadata TEXT,
          is_active INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Index on name: Enables fast lookups by connection name
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_connection_configs_name ON connection_configs(name)
      `)

      // Index on type: Enables filtering by connection type
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_connection_configs_type ON connection_configs(type)
      `)

      // Index on is_active: Enables fast lookup of active connection
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_connection_configs_is_active ON connection_configs(is_active)
      `)

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
