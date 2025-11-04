const pool = require('../config/database');

const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM forum_categories ORDER BY name'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    const [profileRows] = await pool.query(
      'SELECT id FROM researcher_profiles WHERE user_id = ?',
      [userId]
    );

    if (profileRows.length === 0) {
      return res.status(403).json({ error: 'Researcher profile required' });
    }

    const [result] = await pool.query(
      `INSERT INTO forum_categories (name, description, created_by)
       VALUES (?, ?, ?)`,
      [name, description, profileRows[0].id]
    );

    const [newCategoryRows] = await pool.query('SELECT * FROM forum_categories WHERE id = ?', [result.insertId]);
    res.status(201).json(newCategoryRows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPosts = async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT fp.*, u.name as author_name, u.user_type, fc.name as category_name,
             (SELECT COUNT(*) FROM forum_replies fr WHERE fr.post_id = fp.id) as reply_count
      FROM forum_posts fp
      JOIN users u ON fp.author_id = u.id
      JOIN forum_categories fc ON fp.category_id = fc.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ` AND fp.category_id = ?`;
      params.push(category_id);
    }

    query += ' ORDER BY fp.created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { category_id, title, content } = req.body;

    // Patients can only post questions
    const is_question = userType === 'patient';

    const [result] = await pool.query(
      `INSERT INTO forum_posts (category_id, author_id, title, content, is_question)
       VALUES (?, ?, ?, ?, ?)`,
      [category_id, userId, title, content, is_question]
    );

    // Get post with author info
    const [postRows] = await pool.query(
      `SELECT fp.*, u.name as author_name, u.user_type, fc.name as category_name
       FROM forum_posts fp
       JOIN users u ON fp.author_id = u.id
       JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE fp.id = ?`,
      [result.insertId]
    );

    res.status(201).json(postRows[0]);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const [postRows] = await pool.query(
      `SELECT fp.*, u.name as author_name, u.user_type, fc.name as category_name
       FROM forum_posts fp
       JOIN users u ON fp.author_id = u.id
       JOIN forum_categories fc ON fp.category_id = fc.id
       WHERE fp.id = ?`,
      [id]
    );

    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get replies
    const [repliesRows] = await pool.query(
      `SELECT fr.*, u.name as author_name, u.user_type
       FROM forum_replies fr
       JOIN users u ON fr.author_id = u.id
       WHERE fr.post_id = ?
       ORDER BY fr.created_at ASC`,
      [id]
    );

    res.json({
      ...postRows[0],
      replies: repliesRows,
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createReply = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { id } = req.params;
    const { content } = req.body;

    // Only researchers can reply
    if (userType !== 'researcher') {
      return res.status(403).json({ error: 'Only researchers can reply to posts' });
    }

    // Check if post exists
    const [postRows] = await pool.query(
      `SELECT fp.*, u.user_type as author_type
       FROM forum_posts fp
       JOIN users u ON fp.author_id = u.id
       WHERE fp.id = ?`,
      [id]
    );
    
    if (postRows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postRows[0];
    
    // Prevent patients from replying to each other (already enforced by middleware, but double-check)
    if (post.author_type === 'patient' && userType === 'patient') {
      return res.status(403).json({ error: 'Patients cannot reply to other patients\' posts' });
    }

    const [result] = await pool.query(
      `INSERT INTO forum_replies (post_id, author_id, content)
       VALUES (?, ?, ?)`,
      [id, userId, content]
    );

    // Get reply with author info
    const [replyRows] = await pool.query(
      `SELECT fr.*, u.name as author_name, u.user_type
       FROM forum_replies fr
       JOIN users u ON fr.author_id = u.id
       WHERE fr.id = ?`,
      [result.insertId]
    );

    res.status(201).json(replyRows[0]);
  } catch (error) {
    console.error('Create reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  getPosts,
  createPost,
  getPost,
  createReply,
};
