# Quick Start Guide

## Prerequisites
- Node.js (v18+) installed
- MySQL (v8.0+) installed and running

## Setup Steps (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` File
Create a file named `.env` in the `backend/` directory with:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=curalink
DB_USER=root
DB_PASSWORD=
JWT_SECRET=change_this_to_a_long_random_string_at_least_32_characters
OPENAI_API_KEY=
```

**Important**: 
- Replace `DB_PASSWORD=` with your MySQL root password (leave empty if no password)
- Replace `JWT_SECRET=` with a long random string (run `openssl rand -base64 32` to generate one)

### 3. Run Migrations
```bash
npm run migrate
```

This will:
- Create the database automatically
- Create all required tables
- Set up indexes

### 4. Start Server
```bash
npm run dev
```

Server will run on `http://localhost:5000`

## Troubleshooting

**"Cannot connect to MySQL"**
- Make sure MySQL is running: `brew services start mysql` (macOS) or `sudo systemctl start mysql` (Linux)

**"Access denied"**
- Check your MySQL password in `.env`
- Try: `mysql -u root -p` to test your password

**"Table already exists" warnings**
- These are harmless - the script skips existing tables

## Next Steps

Once the backend is running, start the frontend:

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000`

