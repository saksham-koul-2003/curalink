const mysql = require('mysql2/promise');
require('dotenv').config();

const sslEnabled = (process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'curalink',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslEnabled ? { rejectUnauthorized: true } : undefined,
});

module.exports = pool;

