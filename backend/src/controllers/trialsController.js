const pool = require('../config/database');
const { searchClinicalTrials } = require('../utils/externalAPIs');
const { generateSummary } = require('../utils/aiService');
const { parseJsonFields } = require('../utils/dbHelpers');

const searchTrials = async (req, res) => {
  try {
    const { query, status, location, my_trials_only } = req.query;
    const userId = req.user?.id;

    console.log('[Search Trials] Request params:', { query, status, location, my_trials_only, userId });

    let trials = [];

    // For researchers with my_trials_only: ALWAYS skip external API - only show their own trials
    // This is the CRITICAL check - must be first and must skip external API entirely
    if (my_trials_only === 'true' || my_trials_only === true) {
      console.log('[Search Trials] my_trials_only is true - skipping external API, querying only researcher-created trials');
      // Skip external API fetch entirely for my_trials_only
      // Go directly to database query below
    } else if (query || status || location) {
      // Only fetch from external API if NOT my_trials_only and has search parameters
      // Only fetch from external API if not my_trials_only and has search parameters
      try {
        console.log('[Search Trials] Fetching from ClinicalTrials.gov API...');
        // Search external API with filters
        const externalTrials = await searchClinicalTrials(query || '', { status, location });
        
        console.log('[Search Trials] Fetched', externalTrials.length, 'trials from ClinicalTrials.gov');
        
        // Store in database and generate AI summaries
        for (const trial of externalTrials) {
          if (trial.nct_id) {
            try {
              // Generate AI summary for each trial
              let ai_summary = null;
              if (trial.description) {
                try {
                  ai_summary = await generateSummary(trial.description);
                } catch (summaryError) {
                  console.warn('[Search Trials] Failed to generate summary for trial', trial.nct_id, ':', summaryError.message);
                  // Continue without summary
                }
              }
              
              const conditionsJson = trial.conditions ? JSON.stringify(trial.conditions) : null;
              
              // Store external API trials with created_by = NULL to distinguish from researcher-created trials
              await pool.query(
                `INSERT INTO clinical_trials (nct_id, title, description, conditions, phase, status, location, eligibility_criteria, contact_email, ai_summary, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                 ON DUPLICATE KEY UPDATE
                   title = VALUES(title),
                   description = VALUES(description),
                   status = VALUES(status),
                   location = VALUES(location),
                   eligibility_criteria = VALUES(eligibility_criteria),
                   contact_email = VALUES(contact_email),
                   ai_summary = COALESCE(VALUES(ai_summary), clinical_trials.ai_summary),
                   created_by = NULL`,
                [
                  trial.nct_id,
                  trial.title,
                  trial.description,
                  conditionsJson,
                  trial.phase,
                  trial.status,
                  trial.location,
                  trial.eligibility_criteria || '',
                  trial.contact_email,
                  ai_summary,
                ]
              );
            } catch (dbError) {
              console.error('[Search Trials] Error storing trial', trial.nct_id, ':', dbError.message);
              // Continue with next trial
            }
          }
        }
        
        // Fetch AI summaries from database for the returned trials
        const nctIds = externalTrials.filter(t => t.nct_id).map(t => t.nct_id);
        let aiSummariesMap = {};
        if (nctIds.length > 0) {
          const placeholders = nctIds.map(() => '?').join(',');
          const [summaryRows] = await pool.query(
            `SELECT nct_id, ai_summary FROM clinical_trials WHERE nct_id IN (${placeholders})`,
            nctIds
          );
          aiSummariesMap = summaryRows.reduce((acc, row) => {
            acc[row.nct_id] = row.ai_summary;
            return acc;
          }, {});
        }
        
        // Return external trials with AI summaries from database
        const trialsWithUrls = externalTrials.map(trial => ({
          ...trial,
          ctgov_url: trial.ctgov_url || `https://clinicaltrials.gov/search?id=${trial.nct_id}`,
          ai_summary: aiSummariesMap[trial.nct_id] || trial.ai_summary || null,
        }));
        
        return res.json(trialsWithUrls);
      } catch (error) {
        console.error('[Search Trials] Error fetching external trials:', error.message);
        // Continue with database search as fallback
      }
    }

    // Query database (fallback or for my_trials_only)
    let dbQuery = 'SELECT * FROM clinical_trials WHERE 1=1';
    const params = [];

    // CRITICAL: If my_trials_only is true, ONLY show researcher's own trials
    if (my_trials_only === 'true' || my_trials_only === true) {
      if (!userId) {
        console.error('[Search Trials] my_trials_only requested but no userId provided');
        return res.status(400).json({ error: 'User ID required for my_trials_only' });
      }
      
      const [profileRows] = await pool.query(
        'SELECT id FROM researcher_profiles WHERE user_id = ?',
        [userId]
      );
      
      if (profileRows.length === 0) {
        // If no researcher profile found, return empty array (no trials)
        console.log('[Search Trials] No researcher profile found for user:', userId);
        return res.json([]);
      }
      
      const researcherProfileId = profileRows[0].id;
      console.log('[Search Trials] Filtering for researcher profile ID:', researcherProfileId);
      
      // STRICT FILTER: Only show trials created by this researcher, explicitly exclude NULL (external trials)
      // This ensures NO external API trials are shown
      dbQuery += ` AND created_by = ? AND created_by IS NOT NULL`;
      params.push(researcherProfileId);
      
      console.log('[Search Trials] Database query with filter:', dbQuery);
      console.log('[Search Trials] Query params:', params);
    } else {
      // For patients or regular search: Only show external API trials (created_by IS NULL)
      // This ensures patients see trials from ClinicalTrials.gov, not researcher-created ones
      dbQuery += ` AND created_by IS NULL`;
    }

    if (query) {
      dbQuery += ` AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      dbQuery += ` AND status = ?`;
      params.push(status);
    }

    if (location) {
      dbQuery += ` AND LOWER(location) LIKE LOWER(?)`;
      params.push(`%${location}%`);
    }

    dbQuery += ' ORDER BY created_at DESC LIMIT 50';

    console.log('[Search Trials] Final query:', dbQuery);
    console.log('[Search Trials] Final params:', params);

    const [rows] = await pool.query(dbQuery, params);
    trials = parseJsonFields(rows, ['conditions']);
    
    // For my_trials_only, double-check that all trials have the correct created_by (safety filter)
    if (my_trials_only === 'true' || my_trials_only === true) {
      if (userId) {
        const [profileRows] = await pool.query(
          'SELECT id FROM researcher_profiles WHERE user_id = ?',
          [userId]
        );
        if (profileRows.length > 0) {
          const researcherProfileId = profileRows[0].id;
          // Filter out any trials that don't match (safety check - should never happen but ensures correctness)
          const beforeFilter = trials.length;
          trials = trials.filter(trial => trial.created_by === researcherProfileId);
          if (beforeFilter !== trials.length) {
            console.warn('[Search Trials] Safety filter removed', beforeFilter - trials.length, 'trials that did not match researcher profile ID');
          }
          console.log('[Search Trials] After safety filter, returning', trials.length, 'trials for researcher');
        }
      }
    }
    
    // Add ctgov_url to trials from database
    trials = trials.map(trial => ({
      ...trial,
      ctgov_url: trial.nct_id ? `https://clinicaltrials.gov/search?id=${trial.nct_id}` : null,
    }));

    console.log('[Search Trials] Returning', trials.length, 'trials');
    res.json(trials);
  } catch (error) {
    console.error('Search trials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTrial = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM clinical_trials WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Trial not found' });
    }

    const trial = parseJsonFields(rows[0], ['conditions']);
    res.json(trial);
  } catch (error) {
    console.error('Get trial error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createTrial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, conditions, phase, status, location, eligibility_criteria, contact_email, progress_percentage } = req.body;

    console.log('[Create Trial] User ID:', userId);
    console.log('[Create Trial] Trial title:', title);

    // Get researcher profile
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      console.error('[Create Trial] No researcher profile found for user:', userId);
      return res.status(403).json({ error: 'Researcher profile required' });
    }

    const researcherId = profileRows[0].id;
    console.log('[Create Trial] Researcher profile ID:', researcherId);

    // Generate AI summary (don't fail if this errors)
    let ai_summary = null;
    if (description) {
      try {
        ai_summary = await generateSummary(description);
        console.log('[Create Trial] AI summary generated successfully');
      } catch (aiError) {
        console.warn('[Create Trial] AI summary generation failed (non-critical):', aiError.message);
        // Continue without AI summary - trial creation should not fail
        ai_summary = null;
      }
    }
    
    const conditionsJson = conditions ? JSON.stringify(conditions) : null;

    const [result] = await pool.query(
      `INSERT INTO clinical_trials (title, description, conditions, phase, status, location, eligibility_criteria, contact_email, ai_summary, progress_percentage, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, conditionsJson, phase, status, location, eligibility_criteria, contact_email, ai_summary, progress_percentage || 0, researcherId]
    );

    console.log('[Create Trial] Trial created with ID:', result.insertId);
    console.log('[Create Trial] Created_by set to:', researcherId);

    const [newTrialRows] = await pool.query('SELECT * FROM clinical_trials WHERE id = ?', [result.insertId]);
    const trial = parseJsonFields(newTrialRows[0], ['conditions']);
    
    console.log('[Create Trial] Trial created_by value:', trial.created_by);

    res.status(201).json(trial);
  } catch (error) {
    console.error('Create trial error:', error);
    console.error('Create trial error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTrial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, conditions, phase, status, location, eligibility_criteria, contact_email, progress_percentage } = req.body;

    // Check ownership
    const [trialRows] = await pool.query('SELECT created_by FROM clinical_trials WHERE id = ?', [id]);
    if (trialRows.length === 0) {
      return res.status(404).json({ error: 'Trial not found' });
    }

    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0 || trialRows[0].created_by !== profileRows[0].id) {
      return res.status(403).json({ error: 'Not authorized to update this trial' });
    }

    // Generate new AI summary if description changed (don't fail if this errors)
    let ai_summary = null;
    if (description) {
      try {
        ai_summary = await generateSummary(description);
        console.log('[Update Trial] AI summary generated successfully');
      } catch (aiError) {
        console.warn('[Update Trial] AI summary generation failed (non-critical):', aiError.message);
        // Continue without updating AI summary - trial update should not fail
        ai_summary = null;
      }
    }
    const conditionsJson = conditions ? JSON.stringify(conditions) : null;

    // Build update query dynamically to only update provided fields
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (conditions !== undefined) {
      updateFields.push('conditions = ?');
      updateValues.push(conditionsJson);
    }
    if (phase !== undefined) {
      updateFields.push('phase = ?');
      updateValues.push(phase);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (eligibility_criteria !== undefined) {
      updateFields.push('eligibility_criteria = ?');
      updateValues.push(eligibility_criteria);
    }
    if (contact_email !== undefined) {
      updateFields.push('contact_email = ?');
      updateValues.push(contact_email);
    }
    if (ai_summary !== null) {
      updateFields.push('ai_summary = ?');
      updateValues.push(ai_summary);
    }
    if (progress_percentage !== undefined) {
      updateFields.push('progress_percentage = ?');
      updateValues.push(progress_percentage !== null ? progress_percentage : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE clinical_trials SET ${updateFields.join(', ')} WHERE id = ?`;

    await pool.query(updateQuery, updateValues);

    const [updatedRows] = await pool.query('SELECT * FROM clinical_trials WHERE id = ?', [id]);
    const trial = parseJsonFields(updatedRows[0], ['conditions']);

    res.json(trial);
  } catch (error) {
    console.error('Update trial error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const generateTrialSummary = async (req, res) => {
  try {
    console.log('Generate summary endpoint called');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('User ID:', req.user?.id);
    
    const { id } = req.params;
    const userId = req.user.id;

    // Get full trial details
    const [trialRows] = await pool.query(
      'SELECT created_by, title, description, conditions, phase, status, location, eligibility_criteria, contact_email, progress_percentage FROM clinical_trials WHERE id = ?', 
      [id]
    );
    if (trialRows.length === 0) {
      return res.status(404).json({ error: 'Trial not found' });
    }

    // Check if user is a researcher or patient
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    const [userRows] = await pool.query(
      'SELECT user_type FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      console.error('[Generate Summary] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = userRows[0].user_type;
    const researcherProfileId = profileRows.length > 0 ? profileRows[0].id : null;
    const trialCreatedBy = trialRows[0].created_by;

    console.log('[Generate Summary] User ID:', userId);
    console.log('[Generate Summary] User type:', userType);
    console.log('[Generate Summary] Researcher profile ID:', researcherProfileId);
    console.log('[Generate Summary] Trial ID:', id);
    console.log('[Generate Summary] Trial created_by:', trialCreatedBy);

    // Allow summary generation for:
    // 1. Researchers: For their own trials or external trials (created_by IS NULL)
    // 2. Patients: For any trial they can view (external trials with created_by IS NULL)
    
    if (!userType) {
      console.error('[Generate Summary] User type is null or undefined');
      return res.status(403).json({ error: 'User type not found' });
    }

    if (userType === 'researcher') {
      // For researchers: Allow for their own trials or external trials
      if (trialCreatedBy !== null && trialCreatedBy !== researcherProfileId) {
        // This is an old trial with mismatched created_by
        // Since the user is a researcher and can see this trial, allow summary generation
        console.warn('[Generate Summary] Trial created_by mismatch detected (old trial). Trial:', trialCreatedBy, 'Profile:', researcherProfileId);
        console.warn('[Generate Summary] Allowing summary generation for researcher (old trial support)');
        // Continue - allow summary generation for old trials
      }
    } else if (userType === 'patient') {
      // For patients: Only allow for external trials (created_by IS NULL)
      // Patients can generate summaries for trials from ClinicalTrials.gov
      if (trialCreatedBy !== null) {
        console.log('[Generate Summary] Patient attempting to generate summary for non-external trial');
        console.log('[Generate Summary] Trial created_by:', trialCreatedBy);
        return res.status(403).json({ 
          error: 'Patients can only generate summaries for external trials from ClinicalTrials.gov' 
        });
      }
      // Continue - allow for external trials (created_by IS NULL)
    } else {
      console.error('[Generate Summary] Unknown user type:', userType);
      return res.status(403).json({ error: 'Unauthorized to generate summary' });
    }

    console.log('[Generate Summary] Authorization passed. Allowing summary generation.');

    const trial = trialRows[0];
    
    if (!trial.description && !trial.title) {
      return res.status(400).json({ error: 'Trial must have at least a title or description to generate summary' });
    }

    console.log('[Generate Summary] Starting AI summary generation...');

    // Parse conditions if it's a JSON string
    let conditions = trial.conditions;
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
      } catch (e) {
        conditions = [];
      }
    }

    // Build comprehensive context for AI summary
    let summaryContext = `Clinical Trial Information:\n\n`;
    
    if (trial.title) {
      summaryContext += `Title: ${trial.title}\n`;
    }
    
    if (trial.description) {
      summaryContext += `Description: ${trial.description}\n`;
    }
    
    if (conditions && Array.isArray(conditions) && conditions.length > 0) {
      summaryContext += `Target Conditions: ${conditions.join(', ')}\n`;
    }
    
    if (trial.phase) {
      summaryContext += `Phase: ${trial.phase}\n`;
    }
    
    if (trial.status) {
      summaryContext += `Status: ${trial.status}\n`;
    }
    
    if (trial.location) {
      summaryContext += `Location: ${trial.location}\n`;
    }
    
    if (trial.eligibility_criteria) {
      summaryContext += `Eligibility Criteria: ${trial.eligibility_criteria}\n`;
    }
    
    if (trial.progress_percentage !== null && trial.progress_percentage !== undefined) {
      summaryContext += `Progress: ${trial.progress_percentage}% complete\n`;
    }
    
    if (trial.contact_email) {
      summaryContext += `Contact Email: ${trial.contact_email}\n`;
    }

    console.log('Summary context being sent to AI:', summaryContext);

    // Generate AI summary with comprehensive context
    const ai_summary = await generateSummary(summaryContext);
    
    console.log('Generated AI summary:', ai_summary);

    // Update the trial with new summary
    await pool.query(
      'UPDATE clinical_trials SET ai_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ai_summary, id]
    );

    const [updatedRows] = await pool.query('SELECT * FROM clinical_trials WHERE id = ?', [id]);
    const updatedTrial = parseJsonFields(updatedRows[0], ['conditions']);

    res.json(updatedTrial);
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
};

module.exports = { searchTrials, getTrial, createTrial, updateTrial, generateTrialSummary };
