// Migration script to add progress_percentage column
// Run with: node migrations/addProgressColumn.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addProgressColumn() {
  let connection;
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'curalink',
    };

    console.log('Connecting to MySQL...');
    console.log(`Host: ${dbConfig.host}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`User: ${dbConfig.user}`);

    connection = await mysql.createConnection(dbConfig);

    console.log('\n1. Adding progress_percentage column...');
    try {
      await connection.query(`
        ALTER TABLE clinical_trials 
        ADD COLUMN progress_percentage INT DEFAULT 0 AFTER ai_summary
      `);
      console.log('   ✓ Column added successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ Column already exists, skipping...');
      } else {
        throw error;
      }
    }

    console.log('\n2. Removing old enrollment columns...');
    
    // Check and remove current_enrollment
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'clinical_trials' 
        AND COLUMN_NAME = 'current_enrollment'
      `, [dbConfig.database]);
      
      if (columns.length > 0) {
        await connection.query(`ALTER TABLE clinical_trials DROP COLUMN current_enrollment`);
        console.log('   ✓ Removed current_enrollment column');
      } else {
        console.log('   ℹ current_enrollment column does not exist, skipping...');
      }
    } catch (error) {
      console.log('   ⚠ Could not remove current_enrollment:', error.message);
    }

    // Check and remove target_enrollment
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'clinical_trials' 
        AND COLUMN_NAME = 'target_enrollment'
      `, [dbConfig.database]);
      
      if (columns.length > 0) {
        await connection.query(`ALTER TABLE clinical_trials DROP COLUMN target_enrollment`);
        console.log('   ✓ Removed target_enrollment column');
      } else {
        console.log('   ℹ target_enrollment column does not exist, skipping...');
      }
    } catch (error) {
      console.log('   ⚠ Could not remove target_enrollment:', error.message);
    }

    console.log('\n3. Verifying migration...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'clinical_trials' 
      AND COLUMN_NAME = 'progress_percentage'
    `, [dbConfig.database]);

    if (columns.length > 0) {
      console.log('   ✓ Migration successful!');
      console.log(`   Column: ${columns[0].COLUMN_NAME}, Type: ${columns[0].DATA_TYPE}, Default: ${columns[0].COLUMN_DEFAULT}`);
    } else {
      console.log('   ✗ Migration failed - column not found');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addProgressColumn();

