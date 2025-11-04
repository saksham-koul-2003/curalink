# How to Get Your Production Backend API URL

## Quick Answer

Your production backend API URL is the URL where you deploy your backend server. It will look like:
```
https://your-app-name.herokuapp.com/api
```
or
```
https://your-app-name.onrender.com/api
```

## Step-by-Step: Deploy to Heroku (Easiest Option)

### 1. Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login to Heroku
```bash
heroku login
```

### 3. Navigate to Backend Folder
```bash
cd "/Users/sakshamkoul/Documents/CuraLink Application/backend"
```

### 4. Create Heroku App
```bash
heroku create curalink-api
```
**This gives you a URL like: `https://curalink-api.herokuapp.com`**

### 5. Add Database
```bash
heroku addons:create heroku-postgresql:mini
```

### 6. Set Environment Variables
```bash
heroku config:set JWT_SECRET=your_secret_key_here
heroku config:set OPENAI_API_KEY=your_openai_key_here
```

### 7. Deploy
```bash
git init
git add .
git commit -m "Deploy backend"
git push heroku main
```

### 8. Run Migrations
```bash
heroku run npm run migrate
```

### 9. Get Your API URL
```bash
heroku info
```

**Your API URL will be: `https://curalink-api.herokuapp.com/api`**

---

## Alternative: Railway (Also Easy)

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project → Deploy from GitHub
4. Select your repo and `backend` folder
5. Add environment variables
6. Railway gives you a URL automatically

**Your API URL will be: `https://your-project-name.up.railway.app/api`**

---

## Alternative: Render (Free Tier Available)

1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect your repo
5. Set root directory to `backend`
6. Render provides a URL

**Your API URL will be: `https://your-service-name.onrender.com/api`**

---

## What URL Format to Use?

Your production API URL should:
- Start with `https://` (not `http://`)
- End with `/api` 
- Look like: `https://your-app-name.herokuapp.com/api`

## Example URLs:

✅ **Correct:**
- `https://curalink-api.herokuapp.com/api`
- `https://curalink-backend.onrender.com/api`
- `https://curalink-api.up.railway.app/api`

❌ **Wrong:**
- `http://localhost:5001/api` (this is for local development)
- `https://curalink-api.herokuapp.com` (missing `/api`)
- `curalink-api.herokuapp.com/api` (missing `https://`)

---

## Once You Have Your URL:

1. **Create `frontend/.env.production`:**
   ```
   REACT_APP_API_URL=https://your-backend-url.com/api
   REACT_APP_ENV=production
   ```

2. **Test it:**
   ```bash
   curl https://your-backend-url.com/api/health
   ```
   Should return: `{"status":"ok","message":"CuraLink API is running"}`

---

## Need Help?

- **Heroku**: https://devcenter.heroku.com
- **Railway**: https://docs.railway.app
- **Render**: https://render.com/docs

---

## Quick Checklist

- [ ] Deploy backend to a hosting service
- [ ] Get the URL (e.g., `https://your-app.herokuapp.com`)
- [ ] Add `/api` to the end
- [ ] Test the URL: `https://your-app.herokuapp.com/api/health`
- [ ] Update `frontend/.env.production` with the URL
- [ ] Deploy frontend to GitHub Pages

**Your final production API URL format:**
```
https://[your-app-name].[platform].com/api
```

