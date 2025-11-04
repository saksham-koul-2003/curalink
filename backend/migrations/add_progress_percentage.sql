-- Migration: Replace enrollment fields with progress_percentage
-- Run this if you already have a database and need to update the schema

-- Remove old columns if they exist
ALTER TABLE clinical_trials 
DROP COLUMN IF EXISTS current_enrollment,
DROP COLUMN IF EXISTS target_enrollment;

-- Add new progress_percentage column if it doesn't exist
ALTER TABLE clinical_trials 
ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0 AFTER ai_summary;

