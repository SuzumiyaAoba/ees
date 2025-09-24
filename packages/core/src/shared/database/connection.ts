import { existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { Context, Effect, Layer } from "effect"
import { DatabaseConnectionError } from "../errors/database"
import { getEnvWithDefault, isTestEnv } from "../lib/env"
import * as schema from "./schema"

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

  // Initialize database schema with migration support
  yield* Effect.tryPromise({
    try: async () => {
      // Check if table exists and get schema info
      const tableInfo = await client.execute(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='embeddings'
      `)

      const needsMigration = tableInfo.rows.length > 0 &&
        tableInfo.rows[0]?.["sql"]?.toString().includes("BLOB") &&
        !tableInfo.rows[0]?.["sql"]?.toString().includes("F32_BLOB")

      if (needsMigration) {
        console.log("🔄 Migrating database schema from BLOB to F32_BLOB format...")

        // Back up existing data if any
        const existingData = await client.execute(`
          SELECT uri, text, model_name, created_at, updated_at FROM embeddings
        `)

        // Drop old table and indices
        await client.execute(`DROP TABLE IF EXISTS embeddings`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_uri`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_created_at`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_model_name`)
        await client.execute(`DROP INDEX IF EXISTS idx_embeddings_vector`)

        console.log(`⚠️  Migration removed ${existingData.rows.length} existing embeddings (BLOB format not compatible with F32_BLOB)`)
        console.log("💡 Embeddings will need to be recreated with the new vector format")
      }

      // Create new table with F32_BLOB format
      await client.execute(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uri TEXT NOT NULL UNIQUE,
          text TEXT NOT NULL,
          model_name TEXT NOT NULL DEFAULT 'nomic-embed-text',
          embedding F32_BLOB(768) NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_uri ON embeddings(uri)
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)
      `)

      // Create vector index for efficient similarity search
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(libsql_vector_idx(embedding, 'metric=cosine'))
      `)

      if (needsMigration) {
        console.log("✅ Database migration completed successfully")
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

export const DatabaseServiceLive = Layer.effect(DatabaseService, make)
