# MySQL Migration Guide

The codebase has been converted from PostgreSQL to MySQL. Here's what changed and what you need to know:

## Key Changes

### 1. Database Driver
- **Before**: `pg` (PostgreSQL)
- **After**: `mysql2` (MySQL)

### 2. Query Placeholders
- **Before**: `$1, $2, $3...`
- **After**: `?` (positional)

### 3. Result Format
- **Before**: `result.rows[0]`
- **After**: `[rows] = await pool.query(...)` then `rows[0]`

### 4. Arrays → JSON
- **Before**: PostgreSQL `TEXT[]` with array operators (`&&`, `= ANY()`)
- **After**: MySQL `JSON` columns with `JSON_CONTAINS()` functions

### 5. INSERT/UPDATE Syntax
- **Before**: `RETURNING *`, `ON CONFLICT`
- **After**: `SELECT LAST_INSERT_ID()`, `ON DUPLICATE KEY UPDATE`

### 6. Case-Insensitive Search
- **Before**: `ILIKE`
- **After**: `LIKE` (MySQL's LIKE is case-insensitive by default with certain collations, or use `LOWER()`)

## Updated Files

✅ **Completed:**
- `package.json` - Changed dependency
- `src/config/database.js` - MySQL connection
- `migrations/schema.sql` - MySQL schema
- `migrations/runMigrations.js` - MySQL migration runner
- `src/controllers/authController.js` - MySQL queries
- `src/controllers/patientController.js` - MySQL queries with JSON handling
- `src/utils/dbHelpers.js` - JSON helper functions

⏳ **Remaining (need manual update):**
- `src/controllers/researcherController.js`
- `src/controllers/trialsController.js`
- `src/controllers/publicationsController.js`
- `src/controllers/expertsController.js`
- `src/controllers/forumsController.js`
- `src/controllers/favoritesController.js`

## Quick Conversion Pattern

### Pattern 1: Simple SELECT
```javascript
// PostgreSQL
const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
const user = result.rows[0];

// MySQL
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
const user = rows[0];
```

### Pattern 2: INSERT with RETURNING
```javascript
// PostgreSQL
const result = await pool.query(
  'INSERT INTO users (name) VALUES ($1) RETURNING *',
  [name]
);
const user = result.rows[0];

// MySQL
const [result] = await pool.query(
  'INSERT INTO users (name) VALUES (?)',
  [name]
);
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
const user = rows[0];
```

### Pattern 3: JSON Array Operations
```javascript
// PostgreSQL
const result = await pool.query(
  'SELECT * FROM users WHERE conditions && $1::text[]',
  [['condition1', 'condition2']]
);

// MySQL
const { jsonContainsAny } = require('../utils/dbHelpers');
const [rows] = await pool.query(
  `SELECT * FROM users WHERE ${jsonContainsAny('conditions', ['condition1', 'condition2'])}`
);
```

### Pattern 4: ON CONFLICT
```javascript
// PostgreSQL
await pool.query(
  'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
  [email]
);

// MySQL
await pool.query(
  'INSERT INTO users (email) VALUES (?) ON DUPLICATE KEY UPDATE email = email',
  [email]
);
```

## Environment Variables

Update your `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=curalink
DB_USER=root
DB_PASSWORD=your_password
```

## Testing

After conversion, test all endpoints to ensure:
1. JSON fields are properly parsed/stringified
2. Array operations work correctly
3. Case-insensitive searches work
4. Unique constraints handle conflicts properly

