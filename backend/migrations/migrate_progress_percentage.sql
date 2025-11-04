-- Migration: Add progress_percentage column to clinical_trials
-- This script safely adds the column if it doesn't exist

-- First, check if the column exists and add it if needed
SET @dbname = DATABASE();
SET @tablename = 'clinical_trials';
SET @columnname = 'progress_percentage';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column already exists" AS result;',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT DEFAULT 0 AFTER ai_summary;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Remove old columns if they exist
SET @columnname1 = 'current_enrollment';
SET @preparedStatement1 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname1)
  ) > 0,
  CONCAT('ALTER TABLE ', @tablename, ' DROP COLUMN ', @columnname1, ';'),
  'SELECT "Column does not exist" AS result;'
));
PREPARE alterIfExists1 FROM @preparedStatement1;
EXECUTE alterIfExists1;
DEALLOCATE PREPARE alterIfExists1;

SET @columnname2 = 'target_enrollment';
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname2)
  ) > 0,
  CONCAT('ALTER TABLE ', @tablename, ' DROP COLUMN ', @columnname2, ';'),
  'SELECT "Column does not exist" AS result;'
));
PREPARE alterIfExists2 FROM @preparedStatement2;
EXECUTE alterIfExists2;
DEALLOCATE PREPARE alterIfExists2;

SELECT "Migration completed successfully" AS result;

