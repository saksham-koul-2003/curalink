#!/bin/bash
# Migration script to add progress_percentage column

echo "Connecting to MySQL database..."
echo "Please enter your MySQL password when prompted:"
echo ""

# Read database credentials from .env or use defaults
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-curalink}

mysql -u "$DB_USER" -p "$DB_NAME" << EOF

-- Add progress_percentage column if it doesn't exist
ALTER TABLE clinical_trials 
ADD COLUMN progress_percentage INT DEFAULT 0 AFTER ai_summary;

-- Remove old columns if they exist (ignore errors if they don't exist)
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = '$DB_NAME' 
               AND TABLE_NAME = 'clinical_trials' 
               AND COLUMN_NAME = 'current_enrollment');
SET @sqlstmt := IF(@exist > 0, 
    'ALTER TABLE clinical_trials DROP COLUMN current_enrollment', 
    'SELECT "Column current_enrollment does not exist" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = '$DB_NAME' 
               AND TABLE_NAME = 'clinical_trials' 
               AND COLUMN_NAME = 'target_enrollment');
SET @sqlstmt2 := IF(@exist2 > 0, 
    'ALTER TABLE clinical_trials DROP COLUMN target_enrollment', 
    'SELECT "Column target_enrollment does not exist" AS message');
PREPARE stmt2 FROM @sqlstmt2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT "Migration completed successfully!" AS result;

EOF

