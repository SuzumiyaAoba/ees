import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { resolve } from "path"

const isTest = process.env.NODE_ENV === "test"
const DB_PATH = isTest
  ? ":memory:"
  : resolve(process.cwd(), "data", "embeddings.db")

export const db = createClient({
  url: isTest ? ":memory:" : `file:${DB_PATH}`,
})

export async function initializeDatabase() {
  const schemaPath = resolve(__dirname, "schema.sql")
  const schema = readFileSync(schemaPath, "utf-8")

  await db.executeMultiple(schema)
  console.log("Database initialized successfully")
}

export async function closeDatabase() {
  await db.close()
}
