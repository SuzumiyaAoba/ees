import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { Context, Effect, Layer } from "effect"
import { resolve } from "path"
import * as schema from "../database/schema"
import { DatabaseConnectionError } from "../errors/database"

export interface DatabaseService {
  readonly db: ReturnType<typeof drizzle>
}

export const DatabaseService =
  Context.GenericTag<DatabaseService>("DatabaseService")

const make = Effect.gen(function* () {
  const isTest = process.env.NODE_ENV === "test"
  const DB_PATH = isTest
    ? ":memory:"
    : resolve(process.cwd(), "data", "embeddings.db")

  const client = yield* Effect.tryPromise({
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

  // Initialize database schema
  yield* Effect.tryPromise({
    try: async () => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL UNIQUE,
          model_name TEXT NOT NULL DEFAULT 'embeddinggemma:300m',
          embedding BLOB NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_file_path ON embeddings(file_path)
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at)
      `)

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_model_name ON embeddings(model_name)
      `)

      console.log("Database initialized successfully")
    },
    catch: (error) =>
      new DatabaseConnectionError({
        message: "Failed to initialize database schema",
        cause: error,
      }),
  })

  return { db }
})

export const DatabaseServiceLive = Layer.effect(DatabaseService, make)
