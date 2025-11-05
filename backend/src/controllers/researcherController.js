const pool = require('../config/database');
const { jsonContainsAny, parseJsonFields } = require('../utils/dbHelpers');
const { fetchORCIDPublications, searchAllPublications } = require('../utils/externalAPIs');
const { generateSummary } = require('../utils/aiService');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT rp.*, u.name, u.email, u.location as user_location
       FROM researcher_profiles rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = parseJsonFields(rows[0], ['specialties', 'research_interests']);

    // Get publications
    const [publicationsRows] = await pool.query(
      `SELECT p.* FROM publications p
       JOIN researcher_publications rp ON p.id = rp.publication_id
       WHERE rp.researcher_id = ?
       ORDER BY p.pub_date DESC`,
      [profile.id]
    );

    profile.publications = parseJsonFields(publicationsRows, ['authors', 'keywords']);

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { specialties, research_interests, orcid_id, researchgate_id, available_for_meetings, bio } = req.body;

    const specialtiesJson = specialties ? JSON.stringify(specialties) : null;
    const interestsJson = research_interests ? JSON.stringify(research_interests) : null;

    // Get old ORCID ID to check if it changed
    const [oldProfile] = await pool.query(
      'SELECT orcid_id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );
    const oldOrcidId = oldProfile[0]?.orcid_id;

    await pool.query(
      `UPDATE researcher_profiles 
       SET specialties = COALESCE(?, specialties),
           research_interests = COALESCE(?, research_interests),
           orcid_id = COALESCE(?, orcid_id),
           researchgate_id = COALESCE(?, researchgate_id),
           available_for_meetings = COALESCE(?, available_for_meetings),
           bio = COALESCE(?, bio),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [specialtiesJson, interestsJson, orcid_id, researchgate_id, available_for_meetings, bio, userId]
    );

    // If ORCID ID was added or changed, fetch publications from ORCID
    if (orcid_id && orcid_id !== oldOrcidId) {
      try {
        const orcidPubs = await fetchORCIDPublications(orcid_id);
        const [profileResult] = await pool.query('SELECT id FROM researcher_profiles WHERE user_id = ?', [userId]);
        const researcherId = profileResult[0]?.id;

        if (researcherId && orcidPubs.length > 0) {
          for (const pub of orcidPubs.slice(0, 20)) { // Limit to 20 to avoid overwhelming
            try {
              const summary = pub.abstract ? await generateSummary(pub.abstract) : null;
              const authorsJson = pub.authors ? JSON.stringify(pub.authors) : null;
              const keywordsJson = pub.keywords ? JSON.stringify(pub.keywords) : null;

              // Check if exists
              const [existing] = await pool.query(
                'SELECT id FROM publications WHERE title = ? OR (doi IS NOT NULL AND doi = ?)',
                [pub.title, pub.doi || '']
              );

              let publicationId;
              if (existing.length > 0) {
                publicationId = existing[0].id;
              } else {
                const [result] = await pool.query(
                  `INSERT INTO publications (title, authors, journal, pub_date, doi, url, abstract, keywords, ai_summary, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [pub.title, authorsJson, pub.journal, pub.pub_date, pub.doi, pub.url, pub.abstract, keywordsJson, summary, 'orcid']
                );
                publicationId = result.insertId;
              }

              // Link to researcher
              await pool.query(
                `INSERT INTO researcher_publications (researcher_id, publication_id)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE researcher_id = VALUES(researcher_id)`,
                [researcherId, publicationId]
              );
            } catch (err) {
              console.error('Error importing ORCID publication:', err.message);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching ORCID publications:', err.message);
        // Don't fail the profile update if ORCID fetch fails
      }
    }

    // Upsert into health_experts so patients can discover on-platform researchers
    const [profileRows] = await pool.query('SELECT id FROM researcher_profiles WHERE user_id = ?', [userId]);
    const profileId = profileRows[0]?.id;

    if (profileId) {
      // Get user info
      const [userRows] = await pool.query('SELECT name, email, location FROM users WHERE id = ?', [userId]);
      const userInfo = userRows[0] || {};

      // Check if health_experts row exists for this researcher
      const [existingExpertRows] = await pool.query(
        'SELECT id FROM health_experts WHERE researcher_profile_id = ?',
        [profileId]
      );

      if (existingExpertRows.length > 0) {
        // Update existing expert
        await pool.query(
          `UPDATE health_experts 
           SET name = COALESCE(?, name),
               specialties = COALESCE(?, specialties),
               research_interests = COALESCE(?, research_interests),
               location = COALESCE(?, location),
               is_on_platform = true
           WHERE researcher_profile_id = ?`,
          [userInfo.name || null, specialtiesJson, interestsJson, userInfo.location || null, profileId]
        );
      } else {
        // Insert new expert
        await pool.query(
          `INSERT INTO health_experts (name, specialties, institution, location, email, research_interests, is_on_platform, researcher_profile_id, source)
           VALUES (?, ?, ?, ?, ?, ?, true, ?, 'platform')`,
          [
            userInfo.name || 'Researcher',
            specialtiesJson,
            null,
            userInfo.location || null,
            userInfo.email || null,
            interestsJson,
            profileId,
          ]
        );
      }
    }

    const [rows] = await pool.query(
      `SELECT rp.*, u.name, u.email, u.location as user_location
       FROM researcher_profiles rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.user_id = ?`,
      [userId]
    );

    const profile = parseJsonFields(rows[0], ['specialties', 'research_interests']);
    res.json(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[Researcher Dashboard] Fetching dashboard for user ID:', userId);

    const [profileRows] = await pool.query(
      'SELECT id, specialties, research_interests FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    console.log('[Researcher Dashboard] Profile rows found:', profileRows.length);

    const profile = parseJsonFields(profileRows[0], ['specialties', 'research_interests']);
    if (!profile) {
      console.error('[Researcher Dashboard] Profile not found for user:', userId);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('[Researcher Dashboard] Profile ID:', profile.id);

    // Get my clinical trials
    let trials = [];
    if (profile && profile.id) {
      try {
        // First, let's check if there are ANY trials in the database for debugging
        const [allTrialsCheck] = await pool.query(
          'SELECT COUNT(*) as total FROM clinical_trials'
        );
        console.log('[Researcher Dashboard] Total trials in database:', allTrialsCheck[0]?.total || 0);
        
        // Check if there are trials with created_by = NULL (shouldn't happen but let's check)
        const [nullTrialsCheck] = await pool.query(
          'SELECT COUNT(*) as total FROM clinical_trials WHERE created_by IS NULL'
        );
        console.log('[Researcher Dashboard] Trials with NULL created_by:', nullTrialsCheck[0]?.total || 0);
        
        // Check trials for this specific profile
        const [trialsRows] = await pool.query(
          'SELECT * FROM clinical_trials WHERE created_by = ? ORDER BY created_at DESC',
          [profile.id]
        );
        console.log('[Researcher Dashboard] Found trials:', trialsRows.length);
        
        // Also check what created_by values exist in trials table
        const [createdByCheck] = await pool.query(
          'SELECT DISTINCT created_by, COUNT(*) as count FROM clinical_trials GROUP BY created_by'
        );
        console.log('[Researcher Dashboard] Trials by created_by:', JSON.stringify(createdByCheck));
        
        trials = parseJsonFields(trialsRows, ['conditions']);
        console.log('[Researcher Dashboard] Parsed trials:', trials.length);
      } catch (error) {
        console.error('[Researcher Dashboard] Error fetching trials:', error);
        trials = []; // Ensure trials is always an array
      }
    } else {
      console.warn('[Researcher Dashboard] Profile ID is missing, cannot fetch trials');
    }

    // Get potential collaborators - ONLY fetch from publications (external APIs)
    let collaborators = [];
    if (profile.specialties?.length > 0 || profile.research_interests?.length > 0) {
      const specialties = profile.specialties || [];
      const interests = profile.research_interests || [];
      
      try {
        // Fetch from publications based on researcher's interests
        const query = [...specialties, ...interests].slice(0, 3).join(' OR ');
        const publications = await searchAllPublications(query, 20);
        
        // Extract collaborators from publication authors
        const collaboratorsFromPubs = new Map();
        
        for (const pub of publications) {
          if (pub.authors && Array.isArray(pub.authors)) {
            for (const author of pub.authors.slice(0, 2)) { // Limit to first 2 authors
              const authorName = typeof author === 'string' ? author : (author.name || author);
              if (authorName && authorName.trim() && authorName.length > 2) {
                const key = authorName.toLowerCase().trim();
                
                if (!collaboratorsFromPubs.has(key)) {
                  // Extract specialties from publication content
                  const authorSpecialties = [];
                  const authorInterests = [];
                  const text = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
                  
                  // Map medical terms to specialties
                  const medicalTerms = {
                    'Oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation'],
                    'Cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                    'Neurology': ['neurological', 'brain', 'neurology', 'neural'],
                    'Immunology': ['immune', 'immunology', 'immunotherapy', 'antibody'],
                    'Diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin'],
                  };
                  
                  for (const [specialty, keywords] of Object.entries(medicalTerms)) {
                    if (keywords.some(k => text.includes(k))) {
                      authorSpecialties.push(specialty);
                    }
                  }
                  
                  if (pub.keywords && Array.isArray(pub.keywords)) {
                    authorInterests.push(...pub.keywords.slice(0, 3));
                  }
                  
                  collaboratorsFromPubs.set(key, {
                    name: authorName.trim(),
                    institution: pub.journal || null,
                    location: null,
                    email: null,
                    specialties: authorSpecialties.length > 0 ? authorSpecialties : specialties.slice(0, 1),
                    research_interests: authorInterests.length > 0 ? [...new Set(authorInterests)] : interests.slice(0, 2),
                    is_on_platform: false,
                    source: pub.source || 'publication',
                  });
                }
              }
            }
          }
        }
        
        // Store collaborators from publications in database
        for (const collaboratorData of collaboratorsFromPubs.values()) {
          const [existing] = await pool.query(
            'SELECT id FROM health_experts WHERE LOWER(name) = LOWER(?)',
            [collaboratorData.name]
          );
          
          if (existing.length === 0) {
            const specialtiesJson = collaboratorData.specialties ? JSON.stringify(collaboratorData.specialties) : null;
            const interestsJson = collaboratorData.research_interests ? JSON.stringify(collaboratorData.research_interests) : null;
            
            try {
              const [result] = await pool.query(
                `INSERT INTO health_experts (name, specialties, institution, location, email, research_interests, is_on_platform, source)
                 VALUES (?, ?, ?, ?, ?, ?, false, ?)`,
                [collaboratorData.name, specialtiesJson, collaboratorData.institution, collaboratorData.location, collaboratorData.email, interestsJson, collaboratorData.source]
              );
              collaboratorData.id = result.insertId;
            } catch (err) {
              console.error('[Researcher Dashboard] Error storing collaborator from publication:', err.message);
            }
          } else {
            collaboratorData.id = existing[0].id;
          }
        }
        
        // ONLY return publication collaborators (no on-platform researchers)
        collaborators = Array.from(collaboratorsFromPubs.values()).filter(c => c.id).slice(0, 10);
      } catch (err) {
        console.error('[Researcher Dashboard] Error fetching collaborators from publications:', err.message);
        collaborators = [];
      }
    }

    // Get forum questions waiting for answers
    const [forumQuestionsRows] = await pool.query(
      `SELECT fp.*, u.name as author_name, fc.name as category_name,
              (SELECT COUNT(*) FROM forum_replies fr WHERE fr.post_id = fp.id) as reply_count
       FROM forum_posts fp
       JOIN users u ON fp.author_id = u.id
       JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE fp.is_question = true
       ORDER BY fp.created_at DESC
       LIMIT 10`
    );

    res.json({
      profile,
      my_trials: trials,
      potential_collaborators: collaborators,
      forum_questions: forumQuestionsRows,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const searchCollaborators = async (req, res) => {
  try {
    const { search, specialty } = req.query;
    const userId = req.user.id;

    // Get researcher profile to use their interests for fetching from publications
    const [profileRows] = await pool.query(
      'SELECT specialties, research_interests FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );
    
    const profile = profileRows[0] || {};
    let specialties = [];
    let interests = [];
    
    if (profile.specialties) {
      specialties = typeof profile.specialties === 'string' ? JSON.parse(profile.specialties) : profile.specialties;
    }
    if (profile.research_interests) {
      interests = typeof profile.research_interests === 'string' ? JSON.parse(profile.research_interests) : profile.research_interests;
    }

    // ONLY fetch from publications (external APIs), NO on-platform researchers
    let collaborators = [];
    let collaboratorsFromPubs = new Map();
    
    // Build search query from search param, specialty filter, or researcher's interests
    let searchQuery = '';
    if (search) {
      searchQuery = search;
    } else if (specialty && specialty.trim() !== '') {
      searchQuery = specialty;
    } else if (interests.length > 0) {
      searchQuery = interests.join(' OR ');
    } else if (specialties.length > 0) {
      searchQuery = specialties.join(' OR ');
    }

    if (searchQuery) {
      try {
        console.log('[Search Collaborators] Fetching collaborators from publications for query:', searchQuery);
        const publications = await searchAllPublications(searchQuery, 30);
        
        // Extract collaborators from publication authors
        for (const pub of publications) {
          if (pub.authors && Array.isArray(pub.authors)) {
            for (const author of pub.authors.slice(0, 3)) { // Limit to first 3 authors
              const authorName = typeof author === 'string' ? author : (author.name || author);
              if (authorName && authorName.trim() && authorName.length > 2) {
                const key = authorName.toLowerCase().trim();
                
                if (!collaboratorsFromPubs.has(key)) {
                  // Extract specialties/interests from publication
                  const authorSpecialties = [];
                  const authorInterests = [];
                  const text = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
                  
                  // Map medical terms to specialties
                  const medicalTerms = {
                    'Oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'carcinoma'],
                    'Cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                    'Neurology': ['neurological', 'brain', 'neurology', 'neural', 'cognitive'],
                    'Immunology': ['immune', 'immunology', 'immunotherapy', 'antibody'],
                    'Diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin'],
                    'Endocrinology': ['endocrine', 'hormone', 'thyroid'],
                    'Gastroenterology': ['gastro', 'digestive', 'hepatology'],
                    'Pulmonology': ['pulmonary', 'lung', 'respiratory'],
                    'Rheumatology': ['rheumatology', 'arthritis', 'autoimmune'],
                    'Dermatology': ['dermatology', 'skin'],
                    'Psychiatry': ['psychiatry', 'mental', 'psychiatric'],
                    'Pediatrics': ['pediatric', 'children'],
                    'Geriatrics': ['geriatric', 'elderly', 'aging'],
                  };
                  
                  for (const [specialtyName, keywords] of Object.entries(medicalTerms)) {
                    if (keywords.some(k => text.includes(k))) {
                      authorSpecialties.push(specialtyName);
                    }
                  }
                  
                  if (pub.keywords && Array.isArray(pub.keywords)) {
                    authorInterests.push(...pub.keywords.slice(0, 3));
                  }
                  
                  // Apply specialty filter if provided - check BEFORE adding to map
                  if (specialty && specialty.trim() !== '') {
                    const specialtyLower = specialty.trim().toLowerCase();
                    let hasSpecialty = false;
                    
                    // Check if authorSpecialties already contains the specialty
                    if (authorSpecialties.length > 0) {
                      hasSpecialty = authorSpecialties.some(s => 
                        s && String(s).toLowerCase().trim() === specialtyLower
                      );
                    }
                    
                    // If not found in extracted specialties, check if it matches the publication content
                    if (!hasSpecialty) {
                      const specialtyKeywords = {
                        'oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'carcinoma'],
                        'cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                        'neurology': ['neurological', 'brain', 'neurology', 'neural', 'cognitive'],
                        'immunology': ['immune', 'immunology', 'immunotherapy', 'antibody'],
                        'diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin'],
                        'endocrinology': ['endocrine', 'hormone', 'thyroid'],
                        'gastroenterology': ['gastro', 'digestive', 'hepatology'],
                        'pulmonology': ['pulmonary', 'lung', 'respiratory'],
                        'rheumatology': ['rheumatology', 'arthritis', 'autoimmune'],
                        'dermatology': ['dermatology', 'skin'],
                        'psychiatry': ['psychiatry', 'mental', 'psychiatric'],
                        'pediatrics': ['pediatric', 'children'],
                        'geriatrics': ['geriatric', 'elderly', 'aging'],
                      };
                      
                      const keywords = specialtyKeywords[specialtyLower] || [];
                      hasSpecialty = keywords.some(k => text.includes(k));
                    }
                    
                    // Skip if doesn't match specialty filter
                    if (!hasSpecialty) continue;
                  }
                  
                  collaboratorsFromPubs.set(key, {
                    name: authorName.trim(),
                    institution: pub.journal || null,
                    location: null,
                    email: null,
                    specialties: authorSpecialties.length > 0 ? authorSpecialties : (specialties.length > 0 ? specialties.slice(0, 1) : null),
                    research_interests: authorInterests.length > 0 ? [...new Set(authorInterests)] : (interests.length > 0 ? interests.slice(0, 2) : null),
                    bio: null,
                    is_on_platform: false,
                    source: pub.source || 'publication',
                  });
                }
              }
            }
          }
        }
        
        console.log('[Search Collaborators] Extracted', collaboratorsFromPubs.size, 'unique collaborators from publications');
        
        // Store collaborators from publications in database (as health_experts)
        for (const collaboratorData of collaboratorsFromPubs.values()) {
          const [existing] = await pool.query(
            'SELECT id FROM health_experts WHERE LOWER(name) = LOWER(?)',
            [collaboratorData.name]
          );
          
          if (existing.length === 0) {
            const specialtiesJson = collaboratorData.specialties ? JSON.stringify(collaboratorData.specialties) : null;
            const interestsJson = collaboratorData.research_interests ? JSON.stringify(collaboratorData.research_interests) : null;
            
            try {
              const [result] = await pool.query(
                `INSERT INTO health_experts (name, specialties, institution, location, email, research_interests, is_on_platform, source)
                 VALUES (?, ?, ?, ?, ?, ?, false, ?)`,
                [collaboratorData.name, specialtiesJson, collaboratorData.institution, collaboratorData.location, collaboratorData.email, interestsJson, collaboratorData.source]
              );
              collaboratorData.id = result.insertId;
            } catch (err) {
              console.error('[Search Collaborators] Error storing collaborator from publication:', err.message);
            }
          } else {
            collaboratorData.id = existing[0].id;
          }
        }
        
        // Convert Map to array and filter out entries without IDs
        // ONLY return publication collaborators (NO on-platform researchers)
        collaborators = Array.from(collaboratorsFromPubs.values()).filter(c => c.id);
      } catch (err) {
        console.error('[Search Collaborators] Error fetching collaborators from publications:', err.message);
        collaborators = [];
      }
    }
    
    // Client-side validation: ensure specialty filter is exact match (only if specialty filter is applied)
    let finalCollaborators = collaborators;
    if (specialty && specialty.trim() !== '') {
      const specialtyLower = specialty.trim().toLowerCase();
      finalCollaborators = collaborators.filter(collab => {
        if (!collab.specialties || !Array.isArray(collab.specialties)) return false;
        // Check for exact match (case-insensitive)
        return collab.specialties.some(s => 
          s && String(s).toLowerCase().trim() === specialtyLower
        );
      });
    }
    
    console.log('[Search Collaborators] Returning', finalCollaborators.length, 'collaborators from publications (NO on-platform researchers)');
    res.json(finalCollaborators);
  } catch (error) {
    console.error('Search collaborators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCollaboratorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const collaboratorId = parseInt(id);

    // Get collaborator from health_experts table
    const [expertRows] = await pool.query(
      'SELECT * FROM health_experts WHERE id = ?',
      [collaboratorId]
    );

    if (expertRows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    const collaborator = parseJsonFields(expertRows[0], ['specialties', 'research_interests']);

    // Fetch publications by author name from external APIs
    let publications = [];
    if (collaborator.name) {
      try {
        console.log('[Get Collaborator Profile] Fetching publications for:', collaborator.name);
        const authorPublications = await searchAllPublications(collaborator.name, 20);
        
        // Filter publications to only include those with this author
        publications = authorPublications.filter(pub => {
          if (!pub.authors || !Array.isArray(pub.authors)) return false;
          const authorNames = pub.authors.map(a => 
            typeof a === 'string' ? a.toLowerCase() : (a.name || '').toLowerCase()
          );
          const collaboratorNameLower = collaborator.name.toLowerCase();
          return authorNames.some(a => a.includes(collaboratorNameLower) || collaboratorNameLower.includes(a.split(' ')[0]));
        }).slice(0, 10); // Limit to 10 recent publications
      } catch (err) {
        console.error('[Get Collaborator Profile] Error fetching publications:', err.message);
      }
    }

    res.json({
      ...collaborator,
      publications: publications,
    });
  } catch (error) {
    console.error('Get collaborator profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const requestConnection = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const targetId = parseInt(req.params.id);

    const [requesterRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [requesterId]
    );

    if (requesterRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const requesterProfileId = requesterRows[0].id;

    // Check if target is an external researcher (health_expert) or on-platform researcher
    const [targetExpertRows] = await pool.query(
      'SELECT id, is_on_platform, researcher_profile_id FROM health_experts WHERE id = ?',
      [targetId]
    );

    if (targetExpertRows.length > 0) {
      // Target is in health_experts table
      const targetExpert = targetExpertRows[0];
      
      if (targetExpert.is_on_platform && targetExpert.researcher_profile_id) {
        // If the expert is on-platform, use their researcher_profile_id
        const targetProfileId = targetExpert.researcher_profile_id;

        // Check if connection already exists
        const [existingRows] = await pool.query(
          'SELECT * FROM collaborator_connections WHERE requester_id = ? AND target_id = ?',
          [requesterProfileId, targetProfileId]
        );

        if (existingRows.length > 0) {
          return res.status(400).json({ error: 'Connection request already exists' });
        }

        await pool.query(
          'INSERT INTO collaborator_connections (requester_id, target_id, status) VALUES (?, ?, ?)',
          [requesterProfileId, targetProfileId, 'pending']
        );

        return res.json({ message: 'Connection request sent' });
      } else {
        // External researcher - cannot send connection request through normal flow
        // They need to join the platform first
        return res.json({ 
          message: 'This researcher is not yet on the platform. Your interest has been noted.',
          is_external: true 
        });
      }
    }

    // Check if it's a researcher_profile ID directly
    const [targetProfileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE id = ?',
      [targetId]
    );

    if (targetProfileRows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    // On-platform researcher - use existing logic
    const targetProfileId = targetProfileRows[0].id;

    // Check if connection already exists
    const [existingRows] = await pool.query(
      'SELECT * FROM collaborator_connections WHERE requester_id = ? AND target_id = ?',
      [requesterProfileId, targetProfileId]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: 'Connection request already exists' });
    }

    await pool.query(
      'INSERT INTO collaborator_connections (requester_id, target_id, status) VALUES (?, ?, ?)',
      [requesterProfileId, targetProfileId, 'pending']
    );

    return res.json({ message: 'Connection request sent' });
  } catch (error) {
    console.error('Request connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get researcher profile ID
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Get incoming requests (where target_id is current researcher)
    const [incomingRows] = await pool.query(
      `SELECT cc.*, 
              rp.specialties, rp.research_interests, rp.orcid_id,
              u.name, u.email, u.location
       FROM collaborator_connections cc
       JOIN researcher_profiles rp ON cc.requester_id = rp.id
       JOIN users u ON rp.user_id = u.id
       WHERE cc.target_id = ? AND cc.status = 'pending'
       ORDER BY cc.created_at DESC`,
      [researcherProfileId]
    );

    // Get outgoing requests (where requester_id is current researcher)
    const [outgoingRows] = await pool.query(
      `SELECT cc.*, 
              rp.specialties, rp.research_interests, rp.orcid_id,
              u.name, u.email, u.location
       FROM collaborator_connections cc
       JOIN researcher_profiles rp ON cc.target_id = rp.id
       JOIN users u ON rp.user_id = u.id
       WHERE cc.requester_id = ? AND cc.status = 'pending'
       ORDER BY cc.created_at DESC`,
      [researcherProfileId]
    );

    // Get accepted connections
    const [acceptedRows] = await pool.query(
      `SELECT cc.*, 
              CASE 
                WHEN cc.requester_id = ? THEN rp2.specialties
                ELSE rp1.specialties
              END as specialties,
              CASE 
                WHEN cc.requester_id = ? THEN rp2.research_interests
                ELSE rp1.research_interests
              END as research_interests,
              CASE 
                WHEN cc.requester_id = ? THEN u2.name
                ELSE u1.name
              END as name,
              CASE 
                WHEN cc.requester_id = ? THEN u2.email
                ELSE u1.email
              END as email,
              CASE 
                WHEN cc.requester_id = ? THEN u2.location
                ELSE u1.location
              END as location
       FROM collaborator_connections cc
       JOIN researcher_profiles rp1 ON cc.requester_id = rp1.id
       JOIN researcher_profiles rp2 ON cc.target_id = rp2.id
       JOIN users u1 ON rp1.user_id = u1.id
       JOIN users u2 ON rp2.user_id = u2.id
       WHERE (cc.requester_id = ? OR cc.target_id = ?) AND cc.status = 'accepted'
       ORDER BY cc.updated_at DESC`,
      [researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId]
    );

    const incoming = parseJsonFields(incomingRows, ['specialties', 'research_interests']);
    const outgoing = parseJsonFields(outgoingRows, ['specialties', 'research_interests']);
    const accepted = parseJsonFields(acceptedRows, ['specialties', 'research_interests']);

    res.json({
      incoming,
      outgoing,
      accepted,
    });
  } catch (error) {
    console.error('Get connection requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const respondToConnectionRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // connection ID
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "reject"' });
    }

    // Get researcher profile ID
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Get connection request
    const [connectionRows] = await pool.query(
      'SELECT * FROM collaborator_connections WHERE id = ? AND target_id = ? AND status = ?',
      [id, researcherProfileId, 'pending']
    );

    if (connectionRows.length === 0) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    await pool.query(
      'UPDATE collaborator_connections SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    res.json({ message: `Connection request ${newStatus}` });
  } catch (error) {
    console.error('Respond to connection request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get researcher profile ID
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const senderProfileId = profileRows[0].id;

    // Verify connection exists and is accepted
    const [connectionRows] = await pool.query(
      'SELECT requester_id, target_id FROM collaborator_connections WHERE id = ? AND status = ?',
      [connectionId, 'accepted']
    );

    if (connectionRows.length === 0) {
      return res.status(404).json({ error: 'Connection not found or not accepted' });
    }

    const connection = connectionRows[0];
    const receiverProfileId = connection.requester_id === senderProfileId 
      ? connection.target_id 
      : connection.requester_id;

    // Insert message
    await pool.query(
      `INSERT INTO chat_messages (connection_id, sender_id, receiver_id, message)
       VALUES (?, ?, ?, ?)`,
      [connectionId, senderProfileId, receiverProfileId, message.trim()]
    );

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;

    // Get researcher profile ID
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Verify connection exists and user is part of it
    const [connectionRows] = await pool.query(
      'SELECT requester_id, target_id FROM collaborator_connections WHERE id = ? AND status = ?',
      [connectionId, 'accepted']
    );

    if (connectionRows.length === 0) {
      return res.status(404).json({ error: 'Connection not found or not accepted' });
    }

    const connection = connectionRows[0];
    if (connection.requester_id !== researcherProfileId && connection.target_id !== researcherProfileId) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    // Get messages with sender info
    const [messageRows] = await pool.query(
      `SELECT cm.*, 
              u.name as sender_name,
              rp.id as sender_profile_id
       FROM chat_messages cm
       JOIN researcher_profiles rp ON cm.sender_id = rp.id
       JOIN users u ON rp.user_id = u.id
       WHERE cm.connection_id = ?
       ORDER BY cm.created_at ASC`,
      [connectionId]
    );

    // Mark messages as read
    await pool.query(
      'UPDATE chat_messages SET is_read = true WHERE connection_id = ? AND receiver_id = ? AND is_read = false',
      [connectionId, researcherProfileId]
    );

    res.json({ 
      messages: messageRows,
      currentUserProfileId: researcherProfileId 
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get researcher profile ID
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Get all accepted connections with last message info
    const [conversationRows] = await pool.query(
      `SELECT 
        cc.id as connection_id,
        cc.updated_at,
        CASE 
          WHEN cc.requester_id = ? THEN rp2.id
          ELSE rp1.id
        END as other_profile_id,
        CASE 
          WHEN cc.requester_id = ? THEN u2.name
          ELSE u1.name
        END as other_name,
        CASE 
          WHEN cc.requester_id = ? THEN u2.email
          ELSE u1.email
        END as other_email,
        (SELECT message FROM chat_messages 
         WHERE connection_id = cc.id 
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages 
         WHERE connection_id = cc.id 
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM chat_messages 
         WHERE connection_id = cc.id 
         AND receiver_id = ? 
         AND is_read = false) as unread_count
       FROM collaborator_connections cc
       JOIN researcher_profiles rp1 ON cc.requester_id = rp1.id
       JOIN researcher_profiles rp2 ON cc.target_id = rp2.id
       JOIN users u1 ON rp1.user_id = u1.id
       JOIN users u2 ON rp2.user_id = u2.id
       WHERE (cc.requester_id = ? OR cc.target_id = ?) 
       AND cc.status = 'accepted'
       ORDER BY COALESCE(
         (SELECT created_at FROM chat_messages 
          WHERE connection_id = cc.id 
          ORDER BY created_at DESC LIMIT 1),
         cc.updated_at
       ) DESC`,
      [researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId, researcherProfileId]
    );

    res.json({ conversations: conversationRows });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard,
  searchCollaborators,
  getCollaboratorProfile,
  requestConnection,
  getConnectionRequests,
  respondToConnectionRequest,
  sendMessage,
  getMessages,
  getConversations,
};
