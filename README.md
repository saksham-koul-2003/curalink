# CuraLink - AI-Powered Clinical Research Platform

CuraLink connects patients and researchers by simplifying the discovery of clinical trials, medical publications, and health experts.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Install backend dependencies:**
```bash
cd backend
npm install
```

2. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

3. **Set up MySQL database:**
```bash
# Create database (MySQL)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS curalink;"

# Run migrations
cd backend
npm run migrate
```

4. **Set up environment variables:**

Create `backend/.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=curalink
DB_USER=root
DB_PASSWORD=your_db_password
DATABASE_URL=mysql://root:your_db_password@localhost:3306/curalink
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

5. **Start the development servers:**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
CuraLink Application/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── migrations/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
└── README.md
```

## 🎯 Features

- **Patient Features:**
  - Natural language profile setup
  - Personalized dashboard
  - Clinical trials search
  - Health experts discovery
  - Publications recommendations
  - Forums (Q&A)
  - Favorites management

- **Researcher Features:**
  - Professional profile setup
  - Collaborator search
  - Clinical trials management
  - Forum moderation
  - Publications integration (ORCID/ResearchGate)
  - Favorites management

## 🚨 **Important Setup Steps**

1. **Create PostgreSQL Database:**
   ```bash
   createdb curalink
   ```

2. **Set Environment Variables:**
   - Copy environment variables example files and configure your database credentials
   - Add your OpenAI API key for AI features (optional but recommended)
   - Add JWT_SECRET for authentication

3. **Run Database Migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

## 📝 **Notes**

- The application uses JWT authentication
- AI features require OpenAI API key (with fallback if not provided)
- External APIs (ClinicalTrials.gov, PubMed) are integrated but may require API keys for production
- ORCID and ResearchGate integration are prepared but require additional API setup
- **Database**: Uses MySQL (converted from PostgreSQL). See `backend/MYSQL_MIGRATION.md` for conversion details
- Some controllers may still need manual updates for MySQL syntax. See the migration guide for patterns.

