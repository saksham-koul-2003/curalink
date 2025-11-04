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

async function clearManualExperts() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✓ Connected to the database.');

    // Get count of experts before deletion
    const [countBefore] = await connection.execute(
      'SELECT COUNT(*) as total FROM health_experts'
    );
    console.log(`\n📊 Total experts before deletion: ${countBefore[0].total}`);

    // Get count of on-platform experts (will be preserved)
    const [platformExperts] = await connection.execute(
      'SELECT COUNT(*) as total FROM health_experts WHERE is_on_platform = true'
    );
    console.log(`👨‍🔬 On-platform experts (will be preserved): ${platformExperts[0].total}`);

    // Get count of manual experts (will be deleted)
    const [manualExperts] = await connection.execute(
      "SELECT COUNT(*) as total FROM health_experts WHERE is_on_platform = false AND (source = 'manual' OR source IS NULL)"
    );
    console.log(`📝 Manual experts (will be deleted): ${manualExperts[0].total}`);

    // Get count of experts from publications (will be preserved)
    const [publicationExperts] = await connection.execute(
      "SELECT COUNT(*) as total FROM health_experts WHERE is_on_platform = false AND source = 'publication'"
    );
    console.log(`📄 Experts from publications (will be preserved): ${publicationExperts[0].total}`);

    if (manualExperts[0].total === 0) {
      console.log('\n✨ No manual experts to delete. Database is clean!');
      return;
    }

    // Delete only manual experts (not from publications)
    console.log('\n🗑️  Deleting manual experts...');
    const [deleteResult] = await connection.execute(
      "DELETE FROM health_experts WHERE is_on_platform = false AND (source = 'manual' OR source IS NULL)"
    );
    console.log(`✓ Deleted ${deleteResult.affectedRows} manual experts.`);

    // Get count after deletion
    const [countAfter] = await connection.execute(
      'SELECT COUNT(*) as total FROM health_experts'
    );
    console.log(`\n📊 Total experts after deletion: ${countAfter[0].total}`);
    console.log(`👨‍🔬 On-platform experts preserved: ${platformExperts[0].total}`);
    console.log(`📄 Publication experts preserved: ${publicationExperts[0].total}`);

    console.log('\n✅ Manual experts cleared successfully!');
    console.log('💡 Note: Only manually created experts were deleted.');
    console.log('💡 On-platform experts and experts from publications were preserved.');
  } catch (error) {
    console.error('❌ Failed to clear experts:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    pool.end();
  }
}

clearManualExperts();

