const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addChatMessagesTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'curalink',
  });

  try {
    // Check if table exists
    const [tables] = await pool.query(
      "SHOW TABLES LIKE 'chat_messages'"
    );

    if (tables.length > 0) {
      console.log('✅ chat_messages table already exists');
      await pool.end();
      return;
    }

    // Read SQL file
    const sqlPath = path.join(__dirname, 'add_chat_messages.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await pool.query(sql);
    console.log('✅ chat_messages table created successfully');
  } catch (error) {
    console.error('❌ Error creating chat_messages table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addChatMessagesTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addChatMessagesTable;

