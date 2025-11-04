# Setup Guide - CuraLink Backend

## Step 1: Install Dependencies

First, make sure you have all the required packages installed:

```bash
cd backend
npm install
```

## Step 2: Set Up Environment Variables

### Create `.env` File

In the `backend` directory, create a file named `.env` (it should be in the same directory as `package.json`).

**Option 1: Manual Creation**
```bash
cd backend
touch .env
```

Then open `.env` in your text editor.

**Option 2: Using Terminal (macOS/Linux)**
```bash
cd backend
cat > .env << 'EOF'
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=curalink
DB_USER=root
DB_PASSWORD=your_mysql_password
DATABASE_URL=mysql://root:your_mysql_password@localhost:3306/curalink
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
OPENAI_API_KEY=your_openai_api_key_optional
EOF
```

### `.env` File Content

Copy and paste this into your `.env` file, then update the values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=curalink
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DATABASE_URL=mysql://root:your_mysql_password_here@localhost:3306/curalink
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
OPENAI_API_KEY=your_openai_api_key_optional_but_recommended
```

### Important Notes:

1. **DB_PASSWORD**: Replace `your_mysql_password_here` with your actual MySQL root password
   - If you haven't set a password for MySQL root user, leave it empty: `DB_PASSWORD=`
   - If you're using a different MySQL user, update `DB_USER` as well

2. **JWT_SECRET**: This is used for authentication tokens. Use a long, random string (at least 32 characters)
   - You can generate one using: `openssl rand -base64 32` (on macOS/Linux)
   - Or use any long random string

3. **OPENAI_API_KEY**: Optional but recommended for AI features
   - Get one from: https://platform.openai.com/api-keys
   - If you don't provide it, the app will still work but AI summaries won't be generated

4. **Database**: The migration script will automatically create the `curalink` database if it doesn't exist

## Step 3: Verify MySQL is Running

Make sure MySQL is installed and running on your system.

**Check MySQL status:**
```bash
# macOS (if installed via Homebrew)
brew services list

# Linux (systemd)
sudo systemctl status mysql

# Or try to connect
mysql -u root -p
```

**If MySQL is not installed:**

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**Windows:**
- Download MySQL Installer from https://dev.mysql.com/downloads/installer/
- Follow the installation wizard

## Step 4: Run Database Migrations

Once your `.env` file is set up correctly, run the migration:

```bash
cd backend
npm run migrate
```

### What This Does:

1. Connects to MySQL using the credentials from `.env`
2. Creates the `curalink` database if it doesn't exist
3. Creates all tables (users, patient_profiles, clinical_trials, etc.)
4. Sets up indexes for performance

### Expected Output:

```
Running database migrations...
✓ Database migrations completed successfully
```

### Troubleshooting Migration Errors:

**Error: "Access denied for user 'root'@'localhost'"**
- Check your MySQL password in `.env`
- Try connecting manually: `mysql -u root -p`
- If you don't have a password, make sure `DB_PASSWORD=` is empty

**Error: "Can't connect to MySQL server"**
- Make sure MySQL is running: `brew services start mysql` (macOS) or `sudo systemctl start mysql` (Linux)
- Check if the port is correct (default is 3306)

**Error: "Table already exists"**
- This is normal if you've run migrations before
- The script will continue and skip existing tables

## Step 5: Verify Setup

Test your database connection:

```bash
mysql -u root -p -e "USE curalink; SHOW TABLES;"
```

You should see a list of tables like:
- users
- patient_profiles
- researcher_profiles
- clinical_trials
- etc.

## Step 6: Start the Backend Server

Once migrations are successful, start the server:

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
```

The API will be available at: `http://localhost:5000/api`

## Quick Setup Checklist

- [ ] MySQL installed and running
- [ ] `.env` file created in `backend/` directory
- [ ] Database credentials updated in `.env`
- [ ] JWT_SECRET set (long random string)
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run successfully (`npm run migrate`)
- [ ] Server starts without errors (`npm run dev`)

## Need Help?

- **MySQL Connection Issues**: Check your MySQL service is running
- **Migration Errors**: Make sure your MySQL user has CREATE DATABASE and CREATE TABLE permissions
- **Environment Variables Not Loading**: Make sure `.env` is in the `backend/` directory (same level as `package.json`)

