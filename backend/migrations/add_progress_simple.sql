-- Simple migration: Add progress_percentage and remove old enrollment columns
-- Run this using: mysql -u root -p curalink < migrations/add_progress_simple.sql

-- Step 1: Add progress_percentage column
ALTER TABLE clinical_trials 
ADD COLUMN progress_percentage INT DEFAULT 0 AFTER ai_summary;

-- Step 2: Remove old enrollment columns (may fail if columns don't exist - that's OK)
ALTER TABLE clinical_trials DROP COLUMN current_enrollment;
ALTER TABLE clinical_trials DROP COLUMN target_enrollment;

-- If the above fails, you can check manually:
-- SHOW COLUMNS FROM clinical_trials;

SELECT "Migration completed!" AS status;

