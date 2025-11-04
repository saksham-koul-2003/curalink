# Fix MySQL Password Error

## The Problem
Your `.env` file has a placeholder password: `DB_PASSWORD=your_mysql_password`

This needs to be either:
1. Your actual MySQL root password, OR
2. Empty if MySQL root has no password

## Solution Options

### Option 1: If MySQL Root Has a Password

1. Edit the `.env` file:
```bash
cd "/Users/sakshamkoul/Documents/CuraLink Application/backend"
nano .env
# or use your preferred editor (VS Code, TextEdit, etc.)
```

2. Find this line:
```
DB_PASSWORD=your_mysql_password
```

3. Replace it with your actual MySQL password:
```
DB_PASSWORD=actual_password_here
```

4. Save and close the file

5. Run migrations again:
```bash
npm run migrate
```

### Option 2: If MySQL Root Has NO Password

1. Edit the `.env` file and change:
```
DB_PASSWORD=your_mysql_password
```
to:
```
DB_PASSWORD=
```

2. Make sure there's nothing after the `=` sign

3. Save and run migrations:
```bash
npm run migrate
```

## How to Check Your MySQL Password

**Test your MySQL connection:**

```bash
# Try connecting with password
mysql -u root -p
# Enter your password when prompted

# If that works, use that password in .env

# OR try connecting without password
mysql -u root
# If this works, set DB_PASSWORD= (empty) in .env
```

## Quick Fix Commands

**If you know your MySQL password:**
```bash
cd "/Users/sakshamkoul/Documents/CuraLink Application/backend"
sed -i '' 's/DB_PASSWORD=your_mysql_password/DB_PASSWORD=YOUR_ACTUAL_PASSWORD/' .env
```

**If MySQL has no password:**
```bash
cd "/Users/sakshamkoul/Documents/CuraLink Application/backend"
sed -i '' 's/DB_PASSWORD=your_mysql_password/DB_PASSWORD=/' .env
```

Then run:
```bash
npm run migrate
```

