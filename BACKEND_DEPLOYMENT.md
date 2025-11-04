# Backend Deployment Guide

This guide explains how to deploy your CuraLink backend and get your production API URL.

## Option 1: Deploy to Heroku (Recommended for Quick Start)

### Step 1: Install Heroku CLI
```bash
# Install Heroku CLI
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Prepare Backend for Heroku

1. **Create `Procfile` in backend folder:**
   ```
   web: node src/server.js
   ```

2. **Update `package.json` in backend:**
   ```json
   {
     "scripts": {
       "start": "node src/server.js"
     }
   }
   ```

3. **Create `backend/.env` file** (for local development):
   ```
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=curalink
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_key
   PORT=5001
   ```

### Step 3: Deploy to Heroku

```bash
cd backend

# Login to Heroku
heroku login

# Create Heroku app
heroku create curalink-api

# Add Heroku Postgres addon (free tier)
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set JWT_SECRET=your_jwt_secret_key
heroku config:set OPENAI_API_KEY=your_openai_key

# Deploy
git init
git add .
git commit -m "Initial backend commit"
git push heroku main

# Run migrations
heroku run npm run migrate
```

### Step 4: Get Your API URL

After deployment, your API URL will be:
```
https://curalink-api.herokuapp.com/api
```

Check it:
```bash
heroku info
# Or visit: https://curalink-api.herokuapp.com
```

---

## Option 2: Deploy to Railway

### Step 1: Sign Up
- Go to https://railway.app
- Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository
4. Select the `backend` folder as root

### Step 3: Configure Environment Variables
In Railway dashboard, add these variables:
- `DB_HOST` (Railway provides MySQL)
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `PORT` (usually 5000)

### Step 4: Get Your API URL
Railway provides a URL like:
```
https://curalink-api-production.up.railway.app/api
```

---

## Option 3: Deploy to Render

### Step 1: Sign Up
- Go to https://render.com
- Sign up with GitHub

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `curalink-api`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### Step 3: Add Environment Variables
In Render dashboard:
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `OPENAI_API_KEY`

### Step 4: Get Your API URL
Render provides:
```
https://curalink-api.onrender.com/api
```

---

## Option 4: Deploy to DigitalOcean App Platform

### Step 1: Sign Up
- Go to https://www.digitalocean.com/products/app-platform

### Step 2: Create App
1. Connect GitHub repository
2. Select backend folder
3. Configure build and run commands

### Step 3: Get Your API URL
DigitalOcean provides:
```
https://curalink-api-xxxxx.ondigitalocean.app/api
```

---

## Option 5: Deploy to AWS/Google Cloud/Azure

These require more setup but offer more control. See their respective documentation.

---

## Testing Your Backend URL

Once deployed, test your API:

```bash
# Test health endpoint (if you have one)
curl https://your-api-url.com/api/health

# Or test in browser
https://your-api-url.com/api/health
```

## Update Frontend with Backend URL

Once you have your backend URL:

1. **Create `frontend/.env.production`:**
   ```
   REACT_APP_API_URL=https://your-backend-api-url.com/api
   REACT_APP_ENV=production
   ```

2. **Update GitHub Secrets (for GitHub Actions):**
   - Go to repository Settings → Secrets → Actions
   - Add secret: `REACT_APP_API_URL` = `https://your-backend-api-url.com/api`

## Quick Reference: Finding Your URL

| Platform | Where to Find URL |
|----------|-------------------|
| **Heroku** | `heroku info` command or Heroku dashboard |
| **Railway** | Project settings → Domains section |
| **Render** | Dashboard → Service → URL |
| **DigitalOcean** | App Platform → Settings → Domains |
| **AWS** | API Gateway or Elastic Beanstalk console |
| **Google Cloud** | Cloud Run or App Engine console |
| **Azure** | Azure Portal → App Service → Overview |

## Important Notes

1. **Database**: You'll need to set up a database (MySQL) on your hosting platform
2. **CORS**: Make sure your backend allows requests from your GitHub Pages domain
3. **Environment Variables**: Always use environment variables for sensitive data
4. **SSL**: Most platforms provide HTTPS by default (required for production)

## Local Development URL

For local development, use:
```
http://localhost:5001/api
```

This should be in your `frontend/.env.development` file.

