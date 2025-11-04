# Fix for Publications 404 Error

## Problem
- `/api/publications/recommended` returns 404
- No publications showing when searching

## Root Cause
The route order in `backend/src/routes/publications.js` was wrong. The `/:id` route was defined before `/recommended`, causing Express to match `/recommended` as an ID parameter.

## Fix Applied

### 1. Fixed Route Order
**Before:**
```javascript
router.get('/search', ...);
router.get('/:id', ...);  // ❌ This catches /recommended first!
router.get('/recommended', ...);  // Never reached
```

**After:**
```javascript
router.get('/search', ...);
router.get('/recommended', ...);  // ✅ Specific routes first
router.get('/:id', ...);  // ✅ Parameterized routes last
```

### 2. Enhanced getRecommended Function
- Now fetches from external APIs if no publications in database
- Automatically stores fetched publications
- Returns publications even if user has no conditions/interests yet

## Testing

### Step 1: Restart Backend
```bash
cd backend
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Test Recommended Endpoint
1. Login as Patient
2. Go to Publications page
3. Should see publications (even if empty profile)

### Step 3: Test Search
1. Search for "cancer" or "diabetes"
2. Should fetch from PubMed and show results

### Step 4: Add Profile Data
1. Update profile with conditions
2. Go back to Publications
3. Click "Show Recommended"
4. Should see personalized recommendations

## Expected Behavior

### If User Has Conditions/Interests:
- Shows publications matching their profile
- If none in DB, fetches from external APIs
- Stores in database for future use

### If User Has No Conditions/Interests:
- Shows recent publications from database
- Or fetches general medical publications

### Search:
- Always searches external APIs (PubMed, Semantic Scholar)
- Stores results in database
- Returns results immediately

## Verification

Check these URLs work:
- ✅ `GET /api/publications/recommended` (requires auth)
- ✅ `GET /api/publications/search?query=cancer`
- ✅ `GET /api/publications/123` (get specific publication)

## Notes

- The route order fix is critical - Express matches routes in order
- Specific routes MUST come before parameterized routes
- External API calls may take a few seconds
- Check backend logs for API errors

