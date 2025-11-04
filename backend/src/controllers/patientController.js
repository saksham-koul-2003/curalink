const pool = require('../config/database');
const { extractConditionsFromText } = require('../utils/aiService');
const { searchClinicalTrials, searchAllPublications } = require('../utils/externalAPIs');
const { jsonContainsAny } = require('../utils/dbHelpers');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT pp.*, u.name, u.email, u.location as user_location
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = rows[0];
    // Parse JSON fields
    if (profile.conditions) {
      profile.conditions = typeof profile.conditions === 'string' 
        ? JSON.parse(profile.conditions) 
        : profile.conditions;
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { natural_language_input, location, conditions } = req.body;

    let extractedConditions = conditions || [];

    // Extract conditions from natural language if provided
    if (natural_language_input) {
      const aiConditions = await extractConditionsFromText(natural_language_input);
      extractedConditions = [...new Set([...extractedConditions, ...aiConditions])];
    }

    // Update profile
    const conditionsJson = extractedConditions.length > 0 ? JSON.stringify(extractedConditions) : null;
    
    await pool.query(
      `UPDATE patient_profiles 
       SET natural_language_input = COALESCE(?, natural_language_input),
           location = COALESCE(?, location),
           conditions = COALESCE(?, conditions),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [natural_language_input || null, location || null, conditionsJson, userId]
    );

    // Update user location if provided
    if (location) {
      await pool.query('UPDATE users SET location = ? WHERE id = ?', [location, userId]);
    }

    const [rows] = await pool.query(
      `SELECT pp.*, u.name, u.email, u.location as user_location
       FROM patient_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.user_id = ?`,
      [userId]
    );

    const profile = rows[0];
    // Parse JSON fields
    if (profile.conditions) {
      profile.conditions = typeof profile.conditions === 'string' 
        ? JSON.parse(profile.conditions) 
        : profile.conditions;
    }

    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get patient profile
    const [profileRows] = await pool.query(
      'SELECT * FROM patient_profiles WHERE user_id = ?',
      [userId]
    );

    const profile = profileRows[0] || {};
    let conditions = [];
    if (profile?.conditions) {
      conditions = typeof profile.conditions === 'string' 
        ? JSON.parse(profile.conditions) 
        : profile.conditions;
    }

    // Get recommended clinical trials
    let trials = [];
    if (conditions.length > 0) {
      // Build a proper query string for ClinicalTrials.gov API
      // Use first condition or combine conditions with proper format
      const query = conditions[0] || conditions.join(' ');
      
      try {
        trials = await searchClinicalTrials(query, { status: 'recruiting' });
      } catch (error) {
        console.error('[Patient Dashboard] Error fetching external trials:', error.message);
        // Continue with database search even if external API fails
        trials = [];
      }
      
      // Store in database if not exists
      for (const trial of trials.slice(0, 10)) {
        if (trial.nct_id) {
          try {
            const conditionsJson = trial.conditions ? JSON.stringify(trial.conditions) : null;
            // Store external API trials with created_by = NULL
            await pool.query(
              `INSERT INTO clinical_trials (nct_id, title, description, conditions, phase, status, location, eligibility_criteria, contact_email, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
               ON DUPLICATE KEY UPDATE 
                 title = VALUES(title), 
                 status = VALUES(status),
                 created_by = NULL`,
              [trial.nct_id, trial.title, trial.description, conditionsJson, trial.phase, trial.status, trial.location, trial.eligibility_criteria || trial.eligibility, trial.contact_email]
            );
          } catch (dbError) {
            console.error('[Patient Dashboard] Error storing trial:', dbError.message);
            // Continue with next trial
          }
        }
      }

      // Get from database - only external API trials (created_by IS NULL)
      // Using JSON functions
      const conditionsJson = JSON.stringify(conditions);
      try {
        const [dbTrialsRows] = await pool.query(
          `SELECT * FROM clinical_trials 
           WHERE created_by IS NULL AND (${jsonContainsAny('conditions', conditions)} OR title LIKE ?)
           ORDER BY created_at DESC
           LIMIT 10`,
          [`%${conditions[0]}%`]
        );
        const dbTrials = dbTrialsRows.map(row => {
          if (row.conditions) {
            row.conditions = typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions;
          }
          return row;
        });
        // Use database trials if we have them, otherwise use external trials
        if (dbTrials.length > 0) {
          trials = dbTrials;
        }
      } catch (dbError) {
        console.error('[Patient Dashboard] Error fetching database trials:', dbError.message);
        // Keep existing trials array
      }
    }

    // Fallback: if no explicit conditions or still no trials but have natural language input, do LIKE search
    if ((conditions.length === 0 || trials.length === 0) && profile?.natural_language_input) {
      const nl = String(profile.natural_language_input).trim();
      if (nl.length > 0) {
        const likeTerm = `%${nl}%`;
        const [likeRows] = await pool.query(
          `SELECT * FROM clinical_trials
           WHERE created_by IS NULL AND (LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))
           ORDER BY created_at DESC
           LIMIT 10`,
          [likeTerm, likeTerm]
        );
        if (likeRows.length > 0) {
          trials = likeRows.map(row => {
            if (row.conditions) {
              row.conditions = typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions;
            }
            return row;
          });
        }
      }
    }

    // Final fallback: try an external recruiting search with a term derived from patient input only
    // Avoid generic defaults so different patients don't see identical trials
    if (
      trials.length === 0 &&
      (
        (Array.isArray(conditions) && conditions.length > 0) ||
        (profile?.natural_language_input && String(profile.natural_language_input).trim().length > 0)
      )
    ) {
      let fallbackTerm = '';
      if (Array.isArray(conditions) && conditions.length > 0) {
        // Use first condition or clean up the term
        fallbackTerm = conditions[0].trim();
        if (fallbackTerm.length === 0 && conditions.length > 1) {
          fallbackTerm = conditions.slice(1).join(' ').trim();
        }
      } else if (profile?.natural_language_input) {
        const nl = String(profile.natural_language_input).trim();
        if (nl.length >= 3) {
          // Extract first few meaningful words
          fallbackTerm = nl.split(/\s+/).slice(0, 3).join(' ').trim();
        }
      }
      if (fallbackTerm && fallbackTerm.length > 0) {
        try {
          const externalFallback = await searchClinicalTrials(fallbackTerm, { status: 'recruiting' });
          // Prefer returning fresh external results to avoid showing unrelated/global data
          trials = externalFallback.slice(0, 10).map(trial => ({
            id: null,
            nct_id: trial.nct_id,
            title: trial.title,
            description: trial.description,
            conditions: trial.conditions || [],
            phase: trial.phase,
            status: trial.status,
            location: trial.location,
            eligibility_criteria: trial.eligibility,
            contact_email: trial.contact_email,
            ai_summary: null,
          }));
        } catch (e) {
          console.error('[Patient Dashboard] Error in fallback external search:', e.message);
          // keep trials empty if external fails
        }
      }
    }

    // Get recommended publications (scoped to current patient's interests only)
    let publications = [];
    if (conditions.length > 0) {
      const searchTerm = `%${conditions[0]}%`;
      const [publicationsRows] = await pool.query(
        `SELECT * FROM publications
         WHERE ${jsonContainsAny('keywords', conditions)} OR LOWER(title) LIKE LOWER(?) OR LOWER(abstract) LIKE LOWER(?)
         ORDER BY pub_date DESC, created_at DESC
         LIMIT 10`,
        [searchTerm, searchTerm]
      );
      publications = publicationsRows.map(row => {
        if (row.keywords) {
          row.keywords = typeof row.keywords === 'string' ? JSON.parse(row.keywords) : row.keywords;
        }
        if (row.authors) {
          row.authors = typeof row.authors === 'string' ? JSON.parse(row.authors) : row.authors;
        }
        return row;
      });
    } else if (profile?.natural_language_input) {
      const nl = String(profile.natural_language_input).trim();
      if (nl.length > 0) {
        const likeTerm = `%${nl}%`;
        const [publicationsRows] = await pool.query(
          `SELECT * FROM publications
           WHERE LOWER(title) LIKE LOWER(?) OR LOWER(abstract) LIKE LOWER(?) OR LOWER(CAST(keywords AS CHAR)) LIKE LOWER(?)
           ORDER BY pub_date DESC, created_at DESC
           LIMIT 10`,
          [likeTerm, likeTerm, likeTerm]
        );
        publications = publicationsRows.map(row => {
          if (row.keywords) {
            row.keywords = typeof row.keywords === 'string' ? JSON.parse(row.keywords) : row.keywords;
          }
          if (row.authors) {
            row.authors = typeof row.authors === 'string' ? JSON.parse(row.authors) : row.authors;
          }
          return row;
        });
      }
    }

    // External fallback: if no publications in DB yet (fresh profile), fetch from external APIs
    if (publications.length === 0) {
      const terms = conditions.length > 0
        ? conditions
        : (profile?.natural_language_input ? [String(profile.natural_language_input).trim()] : []);
      const queryStr = terms.filter(Boolean).join(' OR ').trim();
      if (queryStr.length > 0) {
        try {
          const external = await searchAllPublications(queryStr, 10);
          publications = external.map(pub => ({
            id: null,
            title: pub.title,
            authors: pub.authors || [],
            journal: pub.journal || '',
            pub_date: pub.pub_date || null,
            doi: pub.doi || '',
            url: pub.url || '',
            abstract: pub.abstract || '',
            ai_summary: null,
            keywords: pub.keywords || [],
            source: pub.source || 'external'
          }));
        } catch (e) {
          // ignore external errors and keep publications empty
        }
      }
    }

    // Get recommended health experts - Always fetch from publications first (like clinical trials)
    let experts = [];
    if (conditions.length > 0) {
      try {
        console.log('[Patient Dashboard] Fetching experts from publications for conditions:', conditions);
        const query = conditions.join(' OR ');
        const publications = await searchAllPublications(query, 30);
        
        // Extract experts from publication authors
        const expertsFromPubs = new Map();
        
        for (const pub of publications) {
          if (pub.authors && Array.isArray(pub.authors)) {
            for (const author of pub.authors.slice(0, 2)) { // Limit to first 2 authors per publication
              const authorName = typeof author === 'string' ? author : (author.name || author);
              if (authorName && authorName.trim() && authorName.length > 2) {
                const key = authorName.toLowerCase().trim();
                
                if (!expertsFromPubs.has(key)) {
                  // Extract specialties from publication content
                  const specialties = [];
                  const interests = [];
                  const text = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
                  
                  // Map medical terms to specialties
                  const medicalTerms = {
                    'Oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'carcinoma'],
                    'Cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                    'Neurology': ['neurological', 'brain', 'neurology', 'neural', 'cognitive'],
                    'Immunology': ['immune', 'immunology', 'immunotherapy', 'antibody'],
                    'Diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin'],
                  };
                  
                  for (const [specialty, keywords] of Object.entries(medicalTerms)) {
                    if (keywords.some(k => text.includes(k))) {
                      specialties.push(specialty);
                    }
                  }
                  
                  if (pub.keywords && Array.isArray(pub.keywords)) {
                    interests.push(...pub.keywords.slice(0, 3));
                  }
                  
                  expertsFromPubs.set(key, {
                    name: authorName.trim(),
                    institution: pub.journal || null,
                    location: null,
                    email: null,
                    specialties: specialties.length > 0 ? specialties : conditions.slice(0, 1),
                    research_interests: interests.length > 0 ? [...new Set(interests)] : conditions.slice(0, 2),
                    is_on_platform: false,
                    source: pub.source || 'publication',
                  });
                }
              }
            }
          }
        }
        
        // Store experts from publications in database
        for (const expertData of expertsFromPubs.values()) {
          const [existing] = await pool.query(
            'SELECT id FROM health_experts WHERE LOWER(name) = LOWER(?)',
            [expertData.name]
          );
          
          if (existing.length === 0) {
            const specialtiesJson = expertData.specialties ? JSON.stringify(expertData.specialties) : null;
            const interestsJson = expertData.research_interests ? JSON.stringify(expertData.research_interests) : null;
            
            try {
              const [result] = await pool.query(
                `INSERT INTO health_experts (name, specialties, institution, location, email, research_interests, is_on_platform, source)
                 VALUES (?, ?, ?, ?, ?, ?, false, ?)`,
                [expertData.name, specialtiesJson, expertData.institution, expertData.location, expertData.email, interestsJson, expertData.source]
              );
              // Add the database ID to the expert data
              expertData.id = result.insertId;
            } catch (err) {
              console.error('[Patient Dashboard] Error storing expert from publication:', err.message);
            }
          } else {
            // Expert already exists, use existing ID
            expertData.id = existing[0].id;
          }
        }
        
        // Get on-platform experts
        const [platformRows] = await pool.query(
          `SELECT * FROM health_experts
           WHERE is_on_platform = true AND (
             ${jsonContainsAny('specialties', conditions)} OR ${jsonContainsAny('research_interests', conditions)}
           )
           LIMIT 3`
        );
        
        const platformExperts = platformRows.map(row => {
          if (row.specialties) {
            row.specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties;
          }
          if (row.research_interests) {
            row.research_interests = typeof row.research_interests === 'string' ? JSON.parse(row.research_interests) : row.research_interests;
          }
          return row;
        });
        
        // Combine: on-platform experts first, then publication experts
        experts = [
          ...platformExperts,
          ...Array.from(expertsFromPubs.values()).slice(0, 7)
        ];
      } catch (err) {
        console.error('[Patient Dashboard] Error fetching experts from publications:', err.message);
        // Fallback to database search
        const [expertsRows] = await pool.query(
          `SELECT * FROM health_experts
           WHERE ${jsonContainsAny('specialties', conditions)} OR ${jsonContainsAny('research_interests', conditions)}
           ORDER BY CASE WHEN is_on_platform THEN 0 ELSE 1 END, name
           LIMIT 10`
        );
        experts = expertsRows.map(row => {
          if (row.specialties) {
            row.specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties;
          }
          if (row.research_interests) {
            row.research_interests = typeof row.research_interests === 'string' ? JSON.parse(row.research_interests) : row.research_interests;
          }
          return row;
        });
      }
    }

    // Fallback: if no explicit conditions but natural language input exists, or no experts found
    if ((conditions.length === 0 || experts.length === 0) && profile?.natural_language_input) {
      const nl = String(profile.natural_language_input).trim();
      if (nl.length > 0) {
        const likeTerm = `%${nl}%`;
        const [fallbackRows] = await pool.query(
          `SELECT * FROM health_experts
           WHERE LOWER(name) LIKE LOWER(?)
           OR LOWER(CAST(specialties AS CHAR)) LIKE LOWER(?)
           OR LOWER(CAST(research_interests AS CHAR)) LIKE LOWER(?)
           ORDER BY CASE WHEN is_on_platform THEN 0 ELSE 1 END, name
           LIMIT 10`,
          [likeTerm, likeTerm, likeTerm]
        );
        if (fallbackRows.length > 0) {
          experts = fallbackRows.map(row => {
            if (row.specialties) {
              row.specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties;
            }
            if (row.research_interests) {
              row.research_interests = typeof row.research_interests === 'string' ? JSON.parse(row.research_interests) : row.research_interests;
            }
            return row;
          });
        }
      }
    }

    // Final fallback: show top on-platform experts if still empty
    if (experts.length === 0) {
      const [topRows] = await pool.query(
        `SELECT * FROM health_experts
         ORDER BY CASE WHEN is_on_platform THEN 0 ELSE 1 END, name
         LIMIT 5`
      );
      experts = topRows.map(row => {
        if (row.specialties) {
          row.specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties;
        }
        if (row.research_interests) {
          row.research_interests = typeof row.research_interests === 'string' ? JSON.parse(row.research_interests) : row.research_interests;
        }
        return row;
      });
    }

    res.json({
      profile,
      recommendations: {
        clinical_trials: trials,
        publications: publications,
        health_experts: experts,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProfile, updateProfile, getDashboard };

