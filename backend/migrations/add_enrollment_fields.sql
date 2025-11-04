-- Migration: Add enrollment fields to clinical_trials table
-- Run this if you already have a database and need to add these columns

ALTER TABLE clinical_trials 
ADD COLUMN IF NOT EXISTS current_enrollment INT DEFAULT 0 AFTER ai_summary,
ADD COLUMN IF NOT EXISTS target_enrollment INT DEFAULT 0 AFTER current_enrollment;

