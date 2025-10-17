import { sql } from "drizzle-orm"
import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core"

export const embeddings = sqliteTable(
  "embeddings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uri: text("uri").notNull().unique(),
    text: text("text").notNull(),
    originalContent: text("original_content"), // Store original content before conversion (e.g., org-mode text)
    convertedFormat: text("converted_format"), // Format of converted content (e.g., "markdown" for org->md conversion)
    modelName: text("model_name").notNull().default("nomic-embed-text"),
    embedding: blob("embedding").notNull(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uriIdx: index("idx_embeddings_uri").on(table.uri),
    createdAtIdx: index("idx_embeddings_created_at").on(table.createdAt),
    modelNameIdx: index("idx_embeddings_model_name").on(table.modelName),
    // Vector index for efficient similarity search using cosine distance
    vectorIdx: index("idx_embeddings_vector").on(
      sql`libsql_vector_idx(embedding, 'metric=cosine')`
    ),
  })
)

export type Embedding = typeof embeddings.$inferSelect
export type NewEmbedding = typeof embeddings.$inferInsert

/**
 * Upload directories table
 * Stores registered directory paths for document management
 */
export const uploadDirectories = sqliteTable(
  "upload_directories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(), // User-friendly name for the directory
    path: text("path").notNull().unique(), // Absolute path to the directory
    modelName: text("model_name").notNull().default("nomic-embed-text"), // Default model for this directory
    description: text("description"), // Optional description
    lastSyncedAt: text("last_synced_at"), // Last time files were synced from this directory
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pathIdx: index("idx_upload_directories_path").on(table.path),
    createdAtIdx: index("idx_upload_directories_created_at").on(table.createdAt),
  })
)

export type UploadDirectory = typeof uploadDirectories.$inferSelect
export type NewUploadDirectory = typeof uploadDirectories.$inferInsert
