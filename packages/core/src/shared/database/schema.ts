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
    modelName: text("model_name").notNull().default("embeddinggemma:300m"),
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
