-- Check if progress_percentage column exists
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'curalink' 
AND TABLE_NAME = 'clinical_trials' 
AND COLUMN_NAME IN ('progress_percentage', 'current_enrollment', 'target_enrollment');
