const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const register = async (req, res) => {
  try {
    const { email, password, user_type, name } = req.body;

    if (!email || !password || !user_type) {
      return res.status(400).json({ error: 'Email, password, and user_type are required' });
    }

    if (!['patient', 'researcher'].includes(user_type)) {
      return res.status(400).json({ error: 'user_type must be "patient" or "researcher"' });
    }

    // Check if user exists
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, user_type, name) VALUES (?, ?, ?, ?)',
      [email, password_hash, user_type, name]
    );

    const user = {
      id: result.insertId,
      email,
      user_type,
      name,
    };

    // Create profile based on user type
    if (user_type === 'patient') {
      await pool.query('INSERT INTO patient_profiles (user_id) VALUES (?)', [user.id]);
    } else {
      await pool.query('INSERT INTO researcher_profiles (user_id) VALUES (?)', [user.id]);
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Always return detailed error in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({ 
      error: 'Internal server error',
      message: isDevelopment ? error.message : 'Registration failed',
      details: isDevelopment ? {
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      } : undefined
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({ 
      error: 'Internal server error',
      message: isDevelopment ? error.message : undefined
    });
  }
};

module.exports = { register, login };

