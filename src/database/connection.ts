import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { resolve } from "path"
import * as schema from "./schema"

const isTest = process.env.NODE_ENV === "test"
const DB_PATH = isTest
  ? ":memory:"
  : resolve(process.cwd(), "data", "embeddings.db")

const client = createClient({
  url: isTest ? ":memory:" : `file:${DB_PATH}`,
})

export const db = drizzle(client, { schema })

export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
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
  } catch (error) {
    console.error("Failed to initialize database:", error)
    throw error
  }
}

export async function closeDatabase() {
  await client.close()
}
