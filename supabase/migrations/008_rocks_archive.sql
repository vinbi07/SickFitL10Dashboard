-- Add is_archived column to rocks table
ALTER TABLE rocks ADD COLUMN is_archived boolean DEFAULT false;

-- Add index for faster filtering
CREATE INDEX rocks_is_archived_idx ON rocks(is_archived);
