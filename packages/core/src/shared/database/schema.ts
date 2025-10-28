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
    uri: text("uri").notNull(),
    text: text("text").notNull(),
    originalContent: text("original_content"), // Store original content before conversion (e.g., org-mode text)
    convertedFormat: text("converted_format"), // Format of converted content (e.g., "markdown" for org->md conversion)
    modelName: text("model_name").notNull().default("nomic-embed-text"),
    taskType: text("task_type"), // Task type for embedding (e.g., "retrieval_document", "clustering")
    embedding: blob("embedding").notNull(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Unique constraint on (uri, model_name, task_type) to allow multiple task types per document
    uniqueUriModelTask: index("idx_embeddings_uri_model_task").on(
      table.uri,
      table.modelName,
      table.taskType
    ),
    createdAtIdx: index("idx_embeddings_created_at").on(table.createdAt),
    modelNameIdx: index("idx_embeddings_model_name").on(table.modelName),
    taskTypeIdx: index("idx_embeddings_task_type").on(table.taskType),
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
    taskTypes: text("task_types"), // JSON array of task types to generate for each file
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

/**
 * Sync jobs table
 * Tracks background directory synchronization jobs
 */
export const syncJobs = sqliteTable(
  "sync_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    directoryId: integer("directory_id").notNull().references(() => uploadDirectories.id, { onDelete: "cascade" }),
    status: text("status").default("pending"), // pending, running, completed, failed
    totalFiles: integer("total_files").default(0),
    processedFiles: integer("processed_files").default(0),
    createdFiles: integer("created_files").default(0),
    updatedFiles: integer("updated_files").default(0),
    failedFiles: integer("failed_files").default(0),
    failedFilePaths: text("failed_file_paths"), // JSON array of failed file paths with error messages
    currentFile: text("current_file"), // Currently processing file
    errorMessage: text("error_message"), // Error message if failed
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    directoryIdIdx: index("idx_sync_jobs_directory_id").on(table.directoryId),
    statusIdx: index("idx_sync_jobs_status").on(table.status),
    createdAtIdx: index("idx_sync_jobs_created_at").on(table.createdAt),
  })
)

export type SyncJob = typeof syncJobs.$inferSelect
export type NewSyncJob = typeof syncJobs.$inferInsert
