# CuraLink - Clinical Research Platform

CuraLink is an AI-powered platform connecting patients and researchers to clinical trials, publications, and health experts.

## Features

### For Patients
- **Personalized Dashboard**: Get recommended clinical trials, publications, and health experts based on your conditions
- **Clinical Trials Search**: Search and filter clinical trials by condition, status, and location
- **Research Publications**: Discover relevant research papers from top medical journals
- **Health Experts**: Find and connect with specialists in your field of interest
- **Forums**: Ask questions and engage with researchers
- **Favorites**: Save your favorite trials, publications, and experts

### For Researchers
- **Clinical Trial Management**: Create and manage your own clinical trials
- **Collaborator Network**: Find potential collaborators based on specialties and research interests
- **Publication Management**: Import and manage your publications
- **Forum Engagement**: Answer patient questions and create communities
- **Connection Management**: Send and manage connection requests with other researchers

## Tech Stack

### Frontend
- React 18
- React Router (HashRouter for GitHub Pages)
- Axios for API calls
- CSS3 with custom styling

### Backend
- Node.js with Express
- MySQL database
- JWT authentication
- External API integrations (PubMed, Semantic Scholar, ClinicalTrials.gov)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MySQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saksham-koul-2003/curalink.git
   cd curalink
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file with your database credentials
   # Update database.js with your MySQL connection details
   
   # Run migrations
   npm run migrate
   
   # Start backend server
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env.development file
   cp env.example .env.development
   # Update REACT_APP_API_URL with your backend URL
   
   # Start development server
   npm start
   ```

## Deployment

### GitHub Pages Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

Quick steps:
1. Update `frontend/package.json` homepage field
2. Install gh-pages: `npm install gh-pages --save-dev`
3. Deploy: `npm run deploy`
4. Enable GitHub Pages in repository settings

## Project Structure

```
curalink/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Auth middleware
│   │   ├── utils/       # Utility functions
│   │   └── config/      # Database config
│   └── migrations/      # Database migrations
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── services/    # API services
│   └── public/          # Static files
└── .github/             # GitHub Actions workflows
```

## API Integrations

- **PubMed**: Research publications
- **Semantic Scholar**: Academic papers
- **ClinicalTrials.gov**: Clinical trial data
- **OpenAI**: AI-generated summaries

## Environment Variables

### Backend
- `DB_HOST`: Database host
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET`: JWT secret key
- `OPENAI_API_KEY`: OpenAI API key

### Frontend
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_ENV`: Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is part of a hackathon submission.

## Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This application requires a deployed backend API. Make sure to configure your backend URL in the environment variables before deploying.
