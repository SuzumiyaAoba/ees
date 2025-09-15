import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { Context, Effect, Layer } from "effect"
import { existsSync, mkdirSync } from "fs"
import { dirname, resolve } from "path"
import { DatabaseConnectionError } from "../errors/database"
import * as schema from "./schema"

export interface DatabaseService {
  readonly db: ReturnType<typeof drizzle>
}

export const DatabaseService =
  Context.GenericTag<DatabaseService>("DatabaseService")

const make = Effect.gen(function* () {
  const isTest = process.env["NODE_ENV"] === "test"

  // Use EES_DATA_DIR environment variable if set, otherwise fall back to cwd/data
  const dataDir = process.env["EES_DATA_DIR"] || resolve(process.cwd(), "data")
  const DB_PATH = isTest ? ":memory:" : resolve(dataDir, "embeddings.db")

  // Ensure data directory exists for non-test environments
  if (!isTest) {
    yield* Effect.try({
      try: () => {
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true })
          console.log(`📁 Created data directory: ${dataDir}`)
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

  // Initialize database schema
  yield* Effect.tryPromise({
    try: async () => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uri TEXT NOT NULL UNIQUE,
          text TEXT NOT NULL,
          model_name TEXT NOT NULL DEFAULT 'embeddinggemma:300m',
          embedding BLOB NOT NULL,
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
