-- Embeddings table for storing file paths and their vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    embedding BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index on file_path for fast lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_file_path ON embeddings(file_path);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_embeddings_created_at ON embeddings(created_at);