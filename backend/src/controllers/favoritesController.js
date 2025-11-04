const pool = require('../config/database');
const { parseJsonFields } = require('../utils/dbHelpers');

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type } = req.query;

    let query = 'SELECT * FROM favorites WHERE user_id = ?';
    const params = [userId];

    if (item_type) {
      query += ` AND item_type = ?`;
      params.push(item_type);
    }

    query += ' ORDER BY created_at DESC';

    const [favoritesRows] = await pool.query(query, params);

    // Fetch actual items
    const items = {
      publications: [],
      clinical_trials: [],
      health_experts: [],
      collaborators: [],
    };

    for (const fav of favoritesRows) {
      if (fav.item_type === 'publication') {
        const [pubRows] = await pool.query('SELECT * FROM publications WHERE id = ?', [fav.item_id]);
        if (pubRows.length > 0) {
          items.publications.push(parseJsonFields(pubRows[0], ['authors', 'keywords']));
        }
      } else if (fav.item_type === 'clinical_trial') {
        const [trialRows] = await pool.query('SELECT * FROM clinical_trials WHERE id = ?', [fav.item_id]);
        if (trialRows.length > 0) {
          items.clinical_trials.push(parseJsonFields(trialRows[0], ['conditions']));
        }
      } else if (fav.item_type === 'health_expert') {
        const [expertRows] = await pool.query('SELECT * FROM health_experts WHERE id = ?', [fav.item_id]);
        if (expertRows.length > 0) {
          items.health_experts.push(parseJsonFields(expertRows[0], ['specialties', 'research_interests']));
        }
      } else if (fav.item_type === 'collaborator') {
        // Collaborators can be from researcher_profiles (on-platform) or health_experts (external)
        // First try researcher_profiles
        const [collabRows] = await pool.query(
          `SELECT rp.*, u.name, u.email, u.location
           FROM researcher_profiles rp
           JOIN users u ON rp.user_id = u.id
           WHERE rp.id = ?`,
          [fav.item_id]
        );
        
        if (collabRows.length > 0) {
          items.collaborators.push(parseJsonFields(collabRows[0], ['specialties', 'research_interests']));
        } else {
          // If not found in researcher_profiles, check health_experts table
          const [expertRows] = await pool.query('SELECT * FROM health_experts WHERE id = ?', [fav.item_id]);
          if (expertRows.length > 0) {
            const expert = parseJsonFields(expertRows[0], ['specialties', 'research_interests']);
            // Map health_expert fields to collaborator structure
            items.collaborators.push({
              id: expert.id,
              name: expert.name,
              institution: expert.institution,
              location: expert.location,
              specialties: expert.specialties || [],
              research_interests: expert.research_interests || [],
              email: expert.email,
            });
          }
        }
      }
    }

    res.json(items);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id } = req.body;

    if (!['publication', 'clinical_trial', 'health_expert', 'collaborator'].includes(item_type)) {
      return res.status(400).json({ error: 'Invalid item_type' });
    }

    await pool.query(
      'INSERT INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE user_id = user_id',
      [userId, item_type, item_id]
    );

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_type, item_id } = req.params;

    await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?',
      [userId, item_type, item_id]
    );

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
