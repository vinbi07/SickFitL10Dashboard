-- Add is_archived column to todos table
ALTER TABLE todos ADD COLUMN is_archived boolean DEFAULT false;

-- Add index for faster filtering
CREATE INDEX todos_is_archived_idx ON todos(is_archived);
