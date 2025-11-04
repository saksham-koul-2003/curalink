# CuraLink GitHub Pages Deployment Guide

This guide will help you deploy the CuraLink frontend to GitHub Pages.

## Prerequisites

1. A GitHub account
2. A GitHub repository (create one if you haven't already)
3. Node.js and npm installed locally

## Step 1: Prepare Your Repository

1. **Create a GitHub repository** (if you haven't already):
   - Go to GitHub and create a new repository
   - Name it something like `curalink` or `curalink-app`

2. **Initialize git** (if not already done):
   ```bash
   cd "/Users/sakshamkoul/Documents/CuraLink Application"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Update Configuration

1. **Update `frontend/package.json`**:
   - Replace `YOUR_USERNAME` in the `homepage` field with your GitHub username
   - Replace `curalink` with your repository name if different
   
   Example:
   ```json
   "homepage": "https://sakshamkoul.github.io/curalink"
   ```

2. **Update API URL**:
   - Edit `frontend/.env.production` and set your backend API URL
   - If you're using a service like Heroku, Railway, or Render, use that URL
   - Example: `REACT_APP_API_URL=https://curalink-api.herokuapp.com/api`

## Step 3: Install Dependencies

```bash
cd frontend
npm install
```

This will install `gh-pages` package needed for deployment.

## Step 4: Deploy Using GitHub Actions (Recommended)

1. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click on **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**

2. **Set up GitHub Secrets** (Optional, for API URL):
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `REACT_APP_API_URL`
   - Value: Your backend API URL (e.g., `https://your-api.herokuapp.com/api`)

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

4. **Monitor Deployment**:
   - Go to **Actions** tab in your GitHub repository
   - Watch the deployment workflow run
   - Once complete, your site will be available at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## Step 5: Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
cd frontend
npm run deploy
```

This will:
1. Build your React app
2. Deploy it to the `gh-pages` branch
3. Make it available on GitHub Pages

## Step 6: Configure GitHub Pages

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select the `gh-pages` branch
3. Select the `/ (root)` folder
4. Click **Save**

Your site should now be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## Troubleshooting

### Issue: Routes not working (404 errors)
**Solution**: The app uses `HashRouter` which adds `#` to URLs. This is necessary for GitHub Pages. All routes will work with `#` in the URL.

### Issue: API calls failing
**Solution**: 
1. Make sure your backend API is deployed and accessible
2. Check CORS settings on your backend to allow requests from your GitHub Pages domain
3. Update `REACT_APP_API_URL` in `.env.production`

### Issue: Build fails
**Solution**:
1. Check for any TypeScript/ESLint errors
2. Make sure all dependencies are installed
3. Check the GitHub Actions logs for specific errors

### Issue: Styling not loading
**Solution**: 
1. Check that all CSS files are imported correctly
2. Verify that the build process includes all assets
3. Check browser console for 404 errors on assets

## Updating Your Deployment

To update your deployment:

1. Make your changes
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Update features"
   git push origin main
   ```
3. GitHub Actions will automatically rebuild and redeploy

Or manually:
```bash
cd frontend
npm run deploy
```

## Backend Deployment

**Note**: This deployment is for the frontend only. You'll need to deploy your backend separately to a service like:
- Heroku
- Railway
- Render
- AWS
- DigitalOcean

Once your backend is deployed, update the `REACT_APP_API_URL` in `.env.production` with your backend URL.

## Environment Variables

- `REACT_APP_API_URL`: Your backend API URL (required)
- `REACT_APP_ENV`: Environment (development/production)

Make sure to update these before deploying!

