# Quick Deployment Guide for GitHub Pages

## Prerequisites
- GitHub account and repository
- Node.js and npm installed

## Step 1: Update Configuration

1. **Edit `frontend/package.json`**:
   - Replace `YOUR_USERNAME` with your GitHub username
   - Replace `curalink` with your repository name
   
   Example:
   ```json
   "homepage": "https://sakshamkoul.github.io/curalink"
   ```

## Step 2: Install gh-pages

```bash
cd frontend
npm install gh-pages --save-dev
```

## Step 3: Create Environment Files

Create `frontend/.env.production`:
```
REACT_APP_API_URL=https://your-backend-api-url.com/api
REACT_APP_ENV=production
```

Create `frontend/.env.development`:
```
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_ENV=development
```

## Step 4: Initialize Git (if not done)

```bash
cd "/Users/sakshamkoul/Documents/CuraLink Application"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 5: Deploy

### Option A: Manual Deployment
```bash
cd frontend
npm run deploy
```

### Option B: GitHub Actions (Automatic)
1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select "GitHub Actions" as source
4. The workflow will automatically deploy on push to main

## Step 6: Enable GitHub Pages

1. Go to repository Settings → Pages
2. Select `gh-pages` branch (if manual) or GitHub Actions (if automatic)
3. Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## Important Notes

1. **HashRouter**: The app uses HashRouter for GitHub Pages compatibility. URLs will have `#` in them (e.g., `https://yoursite.github.io/#/patient/dashboard`)

2. **Backend API**: Make sure your backend is deployed separately and update `REACT_APP_API_URL` in `.env.production`

3. **CORS**: Configure your backend to allow requests from your GitHub Pages domain

4. **Updates**: After making changes, run `npm run deploy` again or push to main (if using GitHub Actions)

