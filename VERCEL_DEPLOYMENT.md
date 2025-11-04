# Vercel Deployment Guide for CuraLink

## Quick Setup

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Import your GitHub repository**: `saksham-koul-2003/curalink`
3. **Configure Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Create React App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

4. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add:
     - `REACT_APP_API_URL` = `https://your-backend-api-url.com/api`
     - `REACT_APP_ENV` = `production`

5. **Deploy**: Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Navigate to frontend**:
   ```bash
   cd frontend
   ```

4. **Deploy**:
   ```bash
   vercel
   ```

5. **Follow prompts**:
   - Set root directory to current directory
   - Framework: Create React App
   - Build command: `npm run build`
   - Output directory: `build`

## Important Configuration

### Root Directory
Since your frontend is in a subdirectory, you need to tell Vercel:
- **Root Directory**: `frontend`

### Build Settings
- **Framework**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### Environment Variables
Add these in Vercel Dashboard → Project Settings → Environment Variables:
```
REACT_APP_API_URL=https://your-backend-api-url.com/api
REACT_APP_ENV=production
```

## Troubleshooting

### Error: "react-scripts: command not found"
**Solution**: Make sure:
1. Root Directory is set to `frontend`
2. Install Command runs: `npm install`
3. Build Command runs: `npm run build`

### Error: "Cannot find module"
**Solution**: 
1. Make sure all dependencies are in `frontend/package.json`
2. Check that `npm install` runs in the `frontend` directory

### Routing Issues (404 on refresh)
**Solution**: The `vercel.json` file includes rewrite rules for client-side routing

## Vercel Configuration File

The `vercel.json` file in the root tells Vercel:
- Build command runs in `frontend` directory
- Output directory is `frontend/build`
- Rewrites all routes to `index.html` for React Router

## Custom Domain

After deployment:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Environment Variables per Environment

You can set different values for:
- **Production**: Production deployments
- **Preview**: Pull request previews
- **Development**: Local development

## Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Update Deployment

Just push to GitHub:
```bash
git add .
git commit -m "Update"
git push origin main
```

Vercel will automatically redeploy!

