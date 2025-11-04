const pool = require('../config/database');
const { jsonContainsAny, parseJsonFields } = require('../utils/dbHelpers');
const { searchAllPublications } = require('../utils/externalAPIs');

const searchExperts = async (req, res) => {
  try {
    const { query, specialty, location } = req.query;

    // If query provided, always fetch from publications first (like clinical trials)
    if (query) {
      try {
        console.log('[Search Experts] Fetching experts from publications for query:', query);
        const publications = await searchAllPublications(query, 30);
        
        // Extract experts from publication authors
        const expertsFromPubs = new Map();
        
        for (const pub of publications) {
          if (pub.authors && Array.isArray(pub.authors)) {
            for (const author of pub.authors.slice(0, 3)) { // Limit to first 3 authors
              const authorName = typeof author === 'string' ? author : (author.name || author);
              if (authorName && authorName.trim() && authorName.length > 2) {
                const key = authorName.toLowerCase().trim();
                
                if (!expertsFromPubs.has(key)) {
                  // Extract keywords/interests from publication
                  const keywords = [];
                  const specialties = [];
                  const text = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
                  
                  // Map medical terms to specialties
                  const medicalTerms = {
                    'Oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'carcinoma'],
                    'Cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology'],
                    'Neurology': ['neurological', 'brain', 'neurology', 'neural', 'cognitive'],
                    'Immunology': ['immune', 'immunology', 'immunotherapy', 'antibody'],
                    'Diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin'],
                  };
                  
                  for (const [specialty, terms] of Object.entries(medicalTerms)) {
                    if (terms.some(k => text.includes(k))) {
                      specialties.push(specialty);
                    }
                  }
                  
                  if (pub.keywords && Array.isArray(pub.keywords)) {
                    keywords.push(...pub.keywords.slice(0, 3));
                  }
                  
                  expertsFromPubs.set(key, {
                    name: authorName.trim(),
                    institution: pub.journal || null,
                    location: null,
                    email: null,
                    specialties: specialties.length > 0 ? specialties : keywords.slice(0, 2),
                    research_interests: keywords.length > 0 ? [...new Set(keywords)] : null,
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
              console.error('[Search Experts] Error storing expert from publication:', err.message);
            }
          } else {
            // Expert already exists, use existing ID
            expertData.id = existing[0].id;
          }
        }
        
        // Get on-platform experts matching the query
        let dbQuery = `
          SELECT * FROM health_experts WHERE is_on_platform = true
        `;
        const params = [];
        
        dbQuery += ` AND (
          LOWER(name) LIKE LOWER(?) OR
          LOWER(CAST(specialties AS CHAR)) LIKE LOWER(?) OR
          LOWER(CAST(research_interests AS CHAR)) LIKE LOWER(?)
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        
        if (specialty) {
          dbQuery += ` AND ${jsonContainsAny('specialties', [specialty])}`;
          params.push(specialty);
        }
        
        if (location) {
          dbQuery += ` AND LOWER(location) LIKE LOWER(?)`;
          params.push(`%${location}%`);
        }
        
        dbQuery += ' ORDER BY name LIMIT 10';
        
        const [platformRows] = await pool.query(dbQuery, params);
        const platformExperts = parseJsonFields(platformRows, ['specialties', 'research_interests']);
        
        // Return: on-platform experts first, then publication experts
        const experts = [
          ...platformExperts,
          ...Array.from(expertsFromPubs.values()).slice(0, 40)
        ];
        
        console.log('[Search Experts] Returning', experts.length, 'experts (', platformExperts.length, 'on-platform,', expertsFromPubs.size, 'from publications)');
        return res.json(experts);
      } catch (err) {
        console.error('[Search Experts] Error fetching experts from publications:', err.message);
        // Continue with database search as fallback
      }
    }

    // Fallback: Database search (for specialty/location filters without query)
    let dbQuery = `
      SELECT * FROM health_experts WHERE 1=1
    `;
    const params = [];

    if (specialty) {
      dbQuery += ` AND ${jsonContainsAny('specialties', [specialty])}`;
      params.push(specialty);
    }

    if (location) {
      dbQuery += ` AND LOWER(location) LIKE LOWER(?)`;
      params.push(`%${location}%`);
    }

    dbQuery += ' ORDER BY CASE WHEN is_on_platform THEN 0 ELSE 1 END, name LIMIT 50';

    const [rows] = await pool.query(dbQuery, params);
    const experts = parseJsonFields(rows, ['specialties', 'research_interests']);
    res.json(experts);
  } catch (error) {
    console.error('Search experts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRecommended = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get patient conditions
    const [profileRows] = await pool.query(
      'SELECT conditions FROM patient_profiles WHERE user_id = ?',
      [userId]
    );

    let conditions = [];
    if (profileRows.length > 0 && profileRows[0].conditions) {
      conditions = typeof profileRows[0].conditions === 'string' 
        ? JSON.parse(profileRows[0].conditions) 
        : profileRows[0].conditions;
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    // Always fetch from publications first (like clinical trials)
    let experts = [];
    try {
      console.log('[Get Recommended Experts] Fetching experts from publications for conditions:', conditions);
      const query = conditions.join(' OR ');
      const publications = await searchAllPublications(query, 30);
      
      console.log('[Get Recommended Experts] Found', publications.length, 'publications');
      
      // Extract experts from publication authors
      const expertsFromPubs = new Map();
      
      for (const pub of publications) {
        if (pub.authors && Array.isArray(pub.authors)) {
          // Limit to first 3 authors per publication to avoid too many results
          for (const author of pub.authors.slice(0, 3)) {
            const authorName = typeof author === 'string' ? author : (author.name || author);
            if (authorName && authorName.trim() && authorName.length > 2) {
              const key = authorName.toLowerCase().trim();
              
              // Skip if already processed
              if (!expertsFromPubs.has(key)) {
                // Extract specialties/interests from publication
                const specialties = [];
                const interests = [];
                
                // Simple keyword extraction from title and abstract
                const text = `${pub.title || ''} ${pub.abstract || ''}`.toLowerCase();
                
                // Map medical terms to specialties
                const medicalTerms = {
                  'Oncology': ['cancer', 'tumor', 'oncology', 'chemotherapy', 'radiation', 'carcinoma', 'malignant'],
                  'Cardiology': ['cardiac', 'heart', 'cardiovascular', 'cardiology', 'myocardial', 'coronary'],
                  'Neurology': ['neurological', 'brain', 'neurology', 'neural', 'cognitive', 'alzheimer', 'parkinson'],
                  'Immunology': ['immune', 'immunology', 'immunotherapy', 'antibody', 'vaccine'],
                  'Diabetes': ['diabetes', 'diabetic', 'glucose', 'insulin', 'metabolic'],
                };
                
                for (const [specialty, keywords] of Object.entries(medicalTerms)) {
                  if (keywords.some(k => text.includes(k))) {
                    if (!specialties.includes(specialty)) {
                      specialties.push(specialty);
                    }
                  }
                }
                
                // Also check if publication keywords match patient conditions
                if (pub.keywords && Array.isArray(pub.keywords)) {
                  interests.push(...pub.keywords.slice(0, 3));
                }
                
                // Use patient conditions as research interests if no keywords found
                if (interests.length === 0 && conditions.length > 0) {
                  interests.push(...conditions.slice(0, 2));
                }
                
                expertsFromPubs.set(key, {
                  name: authorName.trim(),
                  institution: pub.journal || null,
                  location: null,
                  email: null,
                  specialties: specialties.length > 0 ? specialties : (conditions.length > 0 ? conditions.slice(0, 1) : null),
                  research_interests: interests.length > 0 ? [...new Set(interests)] : (conditions.length > 0 ? conditions.slice(0, 2) : null),
                  is_on_platform: false,
                  source: pub.source || 'publication',
                });
              }
            }
          }
        }
      }
      
      console.log('[Get Recommended Experts] Extracted', expertsFromPubs.size, 'unique experts from publications');
      
      // Store experts from publications in database
      let storedCount = 0;
      for (const expertData of expertsFromPubs.values()) {
        // Check if expert already exists (case-insensitive name match)
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
            storedCount++;
          } catch (err) {
            console.error('[Get Recommended Experts] Error storing expert from publication:', err.message);
          }
        } else {
          // Expert already exists, use existing ID
          expertData.id = existing[0].id;
        }
      }
      
      console.log('[Get Recommended Experts] Stored', storedCount, 'new experts in database');
      
      // Return experts directly from publications (prioritize fresh data)
      // Also check database for on-platform experts
      const [platformRows] = await pool.query(
        `SELECT * FROM health_experts
         WHERE is_on_platform = true AND (
           ${jsonContainsAny('specialties', conditions)} OR ${jsonContainsAny('research_interests', conditions)}
         )
         LIMIT 5`
      );
      
      const platformExperts = parseJsonFields(platformRows, ['specialties', 'research_interests']);
      
      // Combine: on-platform experts first, then publication experts
      experts = [
        ...platformExperts,
        ...Array.from(expertsFromPubs.values()).slice(0, 15)
      ];
      
      console.log('[Get Recommended Experts] Returning', experts.length, 'experts (', platformExperts.length, 'on-platform,', expertsFromPubs.size, 'from publications)');
    } catch (err) {
      console.error('[Get Recommended Experts] Error fetching experts from publications:', err.message);
      // Fallback to database search
      const [rows] = await pool.query(
        `SELECT * FROM health_experts
         WHERE ${jsonContainsAny('specialties', conditions)} OR ${jsonContainsAny('research_interests', conditions)}
         ORDER BY CASE WHEN is_on_platform THEN 0 ELSE 1 END
         LIMIT 20`
      );
      experts = parseJsonFields(rows, ['specialties', 'research_interests']);
    }

    res.json(experts);
  } catch (error) {
    console.error('Get recommended experts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExpert = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM health_experts WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    // If expert is on platform, get additional info from researcher profile
    let expert = parseJsonFields(rows[0], ['specialties', 'research_interests']);
    if (expert.is_on_platform && expert.researcher_profile_id) {
      const [researcherRows] = await pool.query(
        `SELECT rp.*, u.name, u.email
         FROM researcher_profiles rp
         JOIN users u ON rp.user_id = u.id
         WHERE rp.id = ?`,
        [expert.researcher_profile_id]
      );

      if (researcherRows.length > 0) {
        expert.researcher_profile = parseJsonFields(researcherRows[0], ['specialties', 'research_interests']);
      }
    }

    res.json(expert);
  } catch (error) {
    console.error('Get expert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const followExpert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Validate expert ID
    if (!id || id === 'undefined' || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid expert ID' });
    }

    const expertId = parseInt(id);

    // Verify expert exists
    const [expertRows] = await pool.query('SELECT id FROM health_experts WHERE id = ?', [expertId]);
    if (expertRows.length === 0) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    await pool.query(
      'INSERT INTO expert_follows (patient_id, expert_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE patient_id = patient_id',
      [userId, expertId]
    );

    res.json({ message: 'Expert followed successfully' });
  } catch (error) {
    console.error('Follow expert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const requestMeeting = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { patient_name, patient_contact, message } = req.body;

    // Get expert info
    const [expertRows] = await pool.query('SELECT * FROM health_experts WHERE id = ?', [id]);
    if (expertRows.length === 0) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    const expert = expertRows[0];

    // Create meeting request
    await pool.query(
      `INSERT INTO meeting_requests (patient_id, expert_id, patient_name, patient_contact, message, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, id, patient_name, patient_contact, message, expert.is_on_platform ? 'pending' : 'pending']
    );

    res.json({ message: 'Meeting request submitted' });
  } catch (error) {
    console.error('Request meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMeetingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get researcher profile to find associated expert profile
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Get health expert record for this researcher
    const [expertRows] = await pool.query(
      'SELECT id FROM health_experts WHERE researcher_profile_id = ?',
      [researcherProfileId]
    );

    if (expertRows.length === 0) {
      // Researcher is not registered as an expert yet
      return res.json({
        pending: [],
        accepted: [],
        rejected: [],
      });
    }

    const expertId = expertRows[0].id;

    // Get meeting requests for this expert
    const [requestsRows] = await pool.query(
      `SELECT mr.*, u.email as patient_email, he.name as expert_name
       FROM meeting_requests mr
       JOIN users u ON mr.patient_id = u.id
       JOIN health_experts he ON mr.expert_id = he.id
       WHERE mr.expert_id = ?
       ORDER BY mr.created_at DESC`,
      [expertId]
    );

    // Separate by status
    const pending = requestsRows.filter(r => r.status === 'pending');
    const accepted = requestsRows.filter(r => r.status === 'accepted');
    const rejected = requestsRows.filter(r => r.status === 'rejected');

    res.json({
      pending,
      accepted,
      rejected,
    });
  } catch (error) {
    console.error('Get meeting requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const respondToMeetingRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // meeting request ID
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "reject"' });
    }

    // Get researcher profile
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Researcher profile not found' });
    }

    const researcherProfileId = profileRows[0].id;

    // Get expert ID
    const [expertRows] = await pool.query(
      'SELECT id FROM health_experts WHERE researcher_profile_id = ?',
      [researcherProfileId]
    );

    if (expertRows.length === 0) {
      return res.status(404).json({ error: 'Expert profile not found' });
    }

    const expertId = expertRows[0].id;

    // Get meeting request
    const [requestRows] = await pool.query(
      'SELECT * FROM meeting_requests WHERE id = ? AND expert_id = ? AND status = ?',
      [id, expertId, 'pending']
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    await pool.query(
      'UPDATE meeting_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    res.json({ message: `Meeting request ${newStatus}` });
  } catch (error) {
    console.error('Respond to meeting request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  searchExperts,
  getRecommended,
  getExpert,
  followExpert,
  requestMeeting,
  getMeetingRequests,
  respondToMeetingRequest,
};
