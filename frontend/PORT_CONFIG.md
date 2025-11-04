# Port Configuration Fix

## Current Configuration

✅ **Backend**: Port 5001 (set in `backend/.env`)
✅ **Frontend**: Port 5001 (set in `frontend/.env` and `frontend/src/services/api.js`)

## Important Notes

1. **After creating/updating `.env` files, you need to restart the React dev server:**
   ```bash
   # Stop the frontend (Ctrl+C)
   # Then restart:
   cd frontend
   npm start
   ```

2. **React needs to be restarted to pick up `.env` changes** because environment variables are injected at build time.

3. **Check your backend is running:**
   ```bash
   curl http://localhost:5001/api/health
   ```
   Should return: `{"status":"ok","message":"CuraLink API is running"}`

## Quick Fix Summary

✅ Created `frontend/.env` with: `REACT_APP_API_URL=http://localhost:5001/api`
✅ Backend `.env` has: `PORT=5001`
✅ Frontend `api.js` default is: `http://localhost:5001/api`

**Next Step**: Restart your React frontend to pick up the new `.env` file!

