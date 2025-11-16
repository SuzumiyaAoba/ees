-- Migration: Add model_type column to models table
-- This migration adds support for different model types (embedding, reranking)

-- Add model_type column with default value 'embedding'
ALTER TABLE models ADD COLUMN model_type TEXT NOT NULL DEFAULT 'embedding';

-- Create index on model_type for faster queries
CREATE INDEX IF NOT EXISTS idx_models_model_type ON models(model_type);

-- Update existing rows to have 'embedding' as model_type (already set by DEFAULT)
-- No need for UPDATE as DEFAULT handles this

-- Verify the migration
SELECT COUNT(*) as total_models, model_type FROM models GROUP BY model_type;
