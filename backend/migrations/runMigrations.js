const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
  let connection;
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    };

    console.log('Connecting to MySQL...');
    console.log(`Host: ${dbConfig.host}`);
    console.log(`Port: ${dbConfig.port}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Password: ${dbConfig.password ? '***' + dbConfig.password.slice(-2) : '(empty)'}`);

    connection = await mysql.createConnection(dbConfig);

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'curalink';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database migrations...');
    
    // Remove comments and split by semicolons
    let cleanSchema = schema
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--') && line.length > 0)
      .join('\n');
    
    // Split by semicolon, but be smart about it (handle CHECK constraints with parentheses)
    const statements = [];
    let currentStatement = '';
    let parenDepth = 0;
    
    for (let i = 0; i < cleanSchema.length; i++) {
      const char = cleanSchema[i];
      currentStatement += char;
      
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      
      if (char === ';' && parenDepth === 0) {
        const stmt = currentStatement.trim();
        if (stmt.length > 0 && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Execute statements
    let errors = [];
    for (const statement of statements) {
      if (statement && statement.trim().length > 0) {
        try {
          await connection.query(statement);
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (err) {
          // Only ignore "already exists" errors
          if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME' || 
              err.message.includes('already exists') || err.message.includes('Duplicate key')) {
            // Table/index already exists - this is fine
            console.log(`⊘ Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
            console.error(`   Error: ${err.message}`);
            console.error(`   Code: ${err.code}`);
            errors.push({ statement: statement.substring(0, 100), error: err.message, code: err.code });
          }
        }
      }
    }
    
    if (errors.length > 0) {
      console.error(`\n❌ Migration completed with ${errors.length} errors!`);
      console.error('Please review the errors above and fix them.');
      process.exit(1);
    } else {
      console.log('\n✓ Database migrations completed successfully');
    }
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ Error running migrations:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔍 Troubleshooting Access Denied Error:');
      console.error('1. Check your MySQL password in the .env file');
      console.error('2. If MySQL root has no password, make sure DB_PASSWORD= is empty in .env');
      console.error('3. Test your MySQL connection manually:');
      console.error('   mysql -u root -p');
      console.error('4. If the password is wrong, update DB_PASSWORD in .env');
      console.error('5. If MySQL doesn\'t have a root password, set DB_PASSWORD= (empty)');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔍 MySQL Connection Refused:');
      console.error('1. Make sure MySQL is running:');
      console.error('   macOS: brew services start mysql');
      console.error('   Linux: sudo systemctl start mysql');
      console.error('2. Check if MySQL is listening on the correct port (default: 3306)');
    }
    
    console.error('\n📝 Your current .env settings:');
    console.error(`   DB_HOST=${process.env.DB_HOST || 'localhost'}`);
    console.error(`   DB_PORT=${process.env.DB_PORT || 3306}`);
    console.error(`   DB_USER=${process.env.DB_USER || 'root'}`);
    console.error(`   DB_PASSWORD=${process.env.DB_PASSWORD ? '***set***' : '(empty)'}`);
    
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigrations();

