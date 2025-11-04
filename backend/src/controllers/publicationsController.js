const pool = require('../config/database');
const { generateSummary } = require('../utils/aiService');
const { jsonContainsAny, parseJsonFields } = require('../utils/dbHelpers');
const { 
  searchAllPublications, 
  searchPubMedPublications, 
  searchTopJournalPublications,
  fetchORCIDPublications 
} = require('../utils/externalAPIs');

const searchPublications = async (req, res) => {
  try {
    const { query, source, journal, top_journals } = req.query;

    let publications = [];

    // If query provided, search external APIs
    if (query) {
      console.log(`Searching publications for: ${query}`);
      let externalResults = [];

      try {
        // Search top journals if requested
        if (top_journals === 'true' || journal) {
          if (journal) {
            console.log(`Searching PubMed with journal filter: ${journal}`);
            externalResults = await searchPubMedPublications(query, 50, journal);
          } else {
            console.log('Searching top journals');
            externalResults = await searchTopJournalPublications(query, 50);
          }
        } else {
          // Search all sources
          const sources = source ? source.split(',') : ['pubmed', 'semantic_scholar'];
          console.log(`Searching sources: ${sources.join(', ')}`);
          externalResults = await searchAllPublications(query, 50, sources);
        }

        console.log(`Found ${externalResults.length} publications from external APIs`);

        // Store in database and generate AI summaries (but don't wait for all of them)
        const storePromises = [];
        for (const pub of externalResults) {
          if (pub.title) {
            storePromises.push(
              (async () => {
                try {
                  const summary = pub.abstract ? await generateSummary(pub.abstract).catch(() => null) : null;
                  const authorsJson = pub.authors ? JSON.stringify(pub.authors) : null;
                  const keywordsJson = pub.keywords ? JSON.stringify(pub.keywords) : null;

                  // Check if publication exists by title or DOI
                  const [existing] = await pool.query(
                    'SELECT id FROM publications WHERE title = ? OR (doi IS NOT NULL AND doi = ?)',
                    [pub.title, pub.doi || '']
                  );

                  if (existing.length > 0) {
                    // Update existing
                    await pool.query(
                      `UPDATE publications SET
                       abstract = COALESCE(?, abstract),
                       ai_summary = COALESCE(?, ai_summary),
                       url = COALESCE(?, url)
                       WHERE id = ?`,
                      [pub.abstract, summary, pub.url, existing[0].id]
                    );
                  } else {
                    // Insert new
                    await pool.query(
                      `INSERT INTO publications (title, authors, journal, pub_date, doi, url, abstract, keywords, ai_summary, source)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        pub.title,
                        authorsJson,
                        pub.journal,
                        pub.pub_date,
                        pub.doi,
                        pub.url,
                        pub.abstract,
                        keywordsJson,
                        summary,
                        pub.source || 'manual',
                      ]
                    );
                  }
                } catch (err) {
                  console.error('Error storing publication:', err.message);
                }
              })()
            );
          }
        }

        // Store publications in background, don't wait
        Promise.all(storePromises).catch(err => console.error('Error storing publications:', err));

        // Return external results immediately (with proper parsing)
        publications = externalResults.map(pub => ({
          ...pub,
          authors: pub.authors || [],
          keywords: pub.keywords || [],
          id: pub.id || Math.random().toString(36).substring(7), // Temporary ID if not in DB yet
        }));
      } catch (err) {
        console.error('Error fetching from external APIs:', err.message);
        console.error(err.stack);
        // Fall back to database search
      }
    }

    // If we have publications from external APIs, return them
    // Otherwise, query database
    if (publications.length === 0) {
      let dbQuery = 'SELECT * FROM publications WHERE 1=1';
      const params = [];

      if (query) {
        dbQuery += ` AND (
          LOWER(title) LIKE LOWER(?) OR
          LOWER(abstract) LIKE LOWER(?) OR
          ${jsonContainsAny('keywords', [query])}
        )`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm);
      }

      if (journal) {
        dbQuery += ` AND LOWER(journal) LIKE LOWER(?)`;
        params.push(`%${journal}%`);
      }

      if (source) {
        dbQuery += ` AND source = ?`;
        params.push(source);
      }

      dbQuery += ' ORDER BY pub_date DESC LIMIT 50';

      const [rows] = await pool.query(dbQuery, params);
      publications = parseJsonFields(rows, ['authors', 'keywords']);
    }

    console.log(`Returning ${publications.length} publications`);
    res.json(publications);
  } catch (error) {
    console.error('Search publications error:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

const getRecommended = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let conditions = [];
    let interests = [];

    if (userType === 'patient') {
      const [profileRows] = await pool.query(
        'SELECT conditions FROM patient_profiles WHERE user_id = ?',
        [userId]
      );
      if (profileRows.length > 0 && profileRows[0].conditions) {
        conditions = typeof profileRows[0].conditions === 'string' 
          ? JSON.parse(profileRows[0].conditions) 
          : profileRows[0].conditions;
      }
    } else {
      const [profileRows] = await pool.query(
        'SELECT research_interests FROM researcher_profiles WHERE user_id = ?',
        [userId]
      );
      if (profileRows.length > 0 && profileRows[0].research_interests) {
        interests = typeof profileRows[0].research_interests === 'string' 
          ? JSON.parse(profileRows[0].research_interests) 
          : profileRows[0].research_interests;
      }
    }

    let query = 'SELECT * FROM publications WHERE 1=1';
    const params = [];

    if (conditions.length > 0 || interests.length > 0) {
      const searchTerms = [...conditions, ...interests];
      query += ` AND (
        ${jsonContainsAny('keywords', searchTerms)} OR
        LOWER(title) LIKE LOWER(?)
      )`;
      params.push(`%${searchTerms[0]}%`);
    } else {
      // If no conditions/interests, fetch recent publications from top journals
      query += ` AND source IN ('pubmed', 'semantic_scholar', 'orcid')`;
    }

    query += ' ORDER BY pub_date DESC LIMIT 20';

    const [rows] = await pool.query(query, params);
    let publications = parseJsonFields(rows, ['authors', 'keywords']);

    // If no publications found in DB and user has conditions/interests, fetch from external APIs
    if (publications.length === 0 && (conditions.length > 0 || interests.length > 0)) {
      const searchTerms = [...conditions, ...interests];
      const searchQuery = searchTerms.join(' OR ');
      try {
        const externalResults = await searchAllPublications(searchQuery, 20);
        
        // Store in database
        for (const pub of externalResults) {
          if (pub.title) {
            try {
              const summary = pub.abstract ? await generateSummary(pub.abstract) : null;
              const authorsJson = pub.authors ? JSON.stringify(pub.authors) : null;
              const keywordsJson = pub.keywords ? JSON.stringify(pub.keywords) : null;

              const [existing] = await pool.query(
                'SELECT id FROM publications WHERE title = ? OR (doi IS NOT NULL AND doi = ?)',
                [pub.title, pub.doi || '']
              );

              if (existing.length === 0) {
                await pool.query(
                  `INSERT INTO publications (title, authors, journal, pub_date, doi, url, abstract, keywords, ai_summary, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [pub.title, authorsJson, pub.journal, pub.pub_date, pub.doi, pub.url, pub.abstract, keywordsJson, summary, pub.source || 'manual']
                );
              }
            } catch (err) {
              console.error('Error storing publication:', err.message);
            }
          }
        }
        
        // Fetch from DB again to get stored publications
        const [dbRows] = await pool.query(query, params);
        publications = parseJsonFields(dbRows, ['authors', 'keywords']);
      } catch (err) {
        console.error('Error fetching external publications:', err.message);
      }
    }

    res.json(publications);
  } catch (error) {
    console.error('Get recommended publications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPublication = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM publications WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Publication not found' });
    }

    // Generate summary if not exists
    let publication = parseJsonFields(rows[0], ['authors', 'keywords']);
    if (!publication.ai_summary && publication.abstract) {
      const summary = await generateSummary(publication.abstract);
      await pool.query(
        'UPDATE publications SET ai_summary = ? WHERE id = ?',
        [summary, id]
      );
      publication.ai_summary = summary;
    }

    res.json(publication);
  } catch (error) {
    console.error('Get publication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const fetchORCIDWorks = async (req, res) => {
  try {
    const { orcid_id } = req.body;
    const userId = req.user.id;

    if (!orcid_id) {
      return res.status(400).json({ error: 'ORCID ID is required' });
    }

    // Fetch publications from ORCID
    const orcidPublications = await fetchORCIDPublications(orcid_id);

    if (orcidPublications.length === 0) {
      return res.json({ message: 'No publications found for this ORCID ID', publications: [] });
    }

    // Get researcher profile
    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(403).json({ error: 'Researcher profile not found' });
    }

    const researcherId = profileRows[0].id;
    const savedPublications = [];

    // Store publications in database and link to researcher
    for (const pub of orcidPublications) {
      try {
        const summary = pub.abstract ? await generateSummary(pub.abstract) : null;
        const authorsJson = pub.authors ? JSON.stringify(pub.authors) : null;
        const keywordsJson = pub.keywords ? JSON.stringify(pub.keywords) : null;

        const [result] = await pool.query(
          `INSERT INTO publications (title, authors, journal, pub_date, doi, url, abstract, keywords, ai_summary, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             abstract = COALESCE(VALUES(abstract), publications.abstract),
             ai_summary = COALESCE(VALUES(ai_summary), publications.ai_summary)`,
          [
            pub.title,
            authorsJson,
            pub.journal,
            pub.pub_date,
            pub.doi,
            pub.url,
            pub.abstract,
            keywordsJson,
            summary,
            'orcid',
          ]
        );

        // Link to researcher profile
        const publicationId = result.insertId;
        await pool.query(
          `INSERT INTO researcher_publications (researcher_id, publication_id)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE researcher_id = VALUES(researcher_id)`,
          [researcherId, publicationId]
        );

        savedPublications.push(pub);
      } catch (err) {
        console.error('Error storing ORCID publication:', err.message);
      }
    }

    res.json({
      message: `Imported ${savedPublications.length} publications from ORCID`,
      publications: parseJsonFields(savedPublications, ['authors', 'keywords']),
    });
  } catch (error) {
    console.error('Fetch ORCID works error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { searchPublications, getRecommended, getPublication, fetchORCIDWorks };
