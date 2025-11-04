const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'curalink',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function clearOldTrials() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✓ Connected to the database.');

    // Get count of trials before deletion
    const [countBefore] = await connection.execute(
      'SELECT COUNT(*) as total FROM clinical_trials'
    );
    console.log(`\n📊 Total trials before deletion: ${countBefore[0].total}`);

    // Get count of researcher-created trials (will be deleted)
    const [researcherTrials] = await connection.execute(
      'SELECT COUNT(*) as total FROM clinical_trials WHERE created_by IS NOT NULL'
    );
    console.log(`👨‍🔬 Researcher-created trials (will be deleted): ${researcherTrials[0].total}`);

    // Get count of external API trials (from ClinicalTrials.gov - will be preserved)
    const [externalTrials] = await connection.execute(
      'SELECT COUNT(*) as total FROM clinical_trials WHERE created_by IS NULL'
    );
    console.log(`🌐 External API trials (will be preserved): ${externalTrials[0].total}`);

    if (researcherTrials[0].total === 0) {
      console.log('\n✨ No researcher-created trials to delete. Database is clean!');
      return;
    }

    // Delete only researcher-created trials (trials with created_by IS NOT NULL)
    console.log('\n🗑️  Deleting researcher-created trials...');
    const [deleteResult] = await connection.execute(
      'DELETE FROM clinical_trials WHERE created_by IS NOT NULL'
    );
    console.log(`✓ Deleted ${deleteResult.affectedRows} researcher-created trials.`);

    // Get count after deletion
    const [countAfter] = await connection.execute(
      'SELECT COUNT(*) as total FROM clinical_trials'
    );
    console.log(`\n📊 Total trials after deletion: ${countAfter[0].total}`);
    console.log(`🌐 External API trials preserved: ${externalTrials[0].total}`);

    console.log('\n✅ Researcher-created trials cleared successfully!');
    console.log('💡 Note: Only researcher-created trials were deleted.');
    console.log('💡 External API trials (from ClinicalTrials.gov) were preserved.');
  } catch (error) {
    console.error('❌ Failed to clear trials:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

clearOldTrials();


