// Quick script to test database connection and check if tables exist
const pool = require('./src/config/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const [result] = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const [tables] = await pool.query('SHOW TABLES LIKE "users"');
    if (tables.length > 0) {
      console.log('✅ Users table exists');
      
      // Count users
      const [count] = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`   Current users in database: ${count[0].count}`);
    } else {
      console.log('❌ Users table does NOT exist!');
      console.log('   Run: npm run migrate');
    }
    
    // List all tables
    const [allTables] = await pool.query('SHOW TABLES');
    console.log('\n📋 All tables in database:');
    allTables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    process.exit(1);
  }
}

testDatabase();

