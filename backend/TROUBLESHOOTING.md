# Troubleshooting 500 Error on Registration

## Most Common Causes

### 1. Database Tables Don't Exist (MOST LIKELY)

**Symptoms:** 500 error when trying to register

**Solution:** Run migrations
```bash
cd backend
npm run migrate
```

**Check:** Look at the terminal where your backend server is running. You should see error logs like:
- `ER_NO_SUCH_TABLE: Table 'curalink.users' doesn't exist`
- `ER_BAD_FIELD_ERROR: Unknown column`

### 2. Database Connection Issue

**Symptoms:** Connection errors in logs

**Solution:** 
- Check `.env` file has correct MySQL credentials
- Make sure MySQL is running: `brew services start mysql`
- Test connection: `mysql -u root` should work

### 3. Missing JWT_SECRET

**Symptoms:** JWT errors

**Solution:** Set JWT_SECRET in `.env`:
```
JWT_SECRET=your_long_random_string_at_least_32_characters
```

## How to See the Actual Error

1. **Check Backend Terminal**: The server terminal will show the detailed error
2. **Check Browser Console**: Open DevTools (F12) → Network tab → Click on the failed request → Response tab
3. **With improved error handling**: The response now includes error details in development mode

## Quick Fix Steps

```bash
# 1. Make sure MySQL is running
brew services start mysql

# 2. Run migrations (creates all tables)
cd backend
npm run migrate

# 3. Check if tables were created (optional test)
# Create test-db.js and run it

# 4. Restart backend server
npm run dev

# 5. Try registration again
```

## Expected Migration Output

When migrations run successfully, you should see:
```
Connecting to MySQL...
Host: localhost
Port: 3306
User: root
Password: (empty)
Running database migrations...
✓ Database migrations completed successfully
```

If you see errors, those are the issues to fix!

