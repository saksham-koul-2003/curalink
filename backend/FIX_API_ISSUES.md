# Fix for Publication Search API Issues

## Problems Identified

1. **PubMed API 400 Error**: Invalid API key in `.env` file (`your_pubmed_api_key` placeholder)
2. **Semantic Scholar 429 Error**: Rate limit exceeded (too many requests)

## Fixes Applied

### 1. Fixed PubMed API Key Issue
- **Problem**: `.env` had placeholder `PUBMED_API_KEY=your_pubmed_api_key`
- **Fix**: 
  - Code now checks if API key is valid before sending
  - If it's a placeholder, doesn't send it (PubMed works without API key)
  - Removed placeholder from `.env` file

### 2. Improved Error Handling
- PubMed errors won't block Semantic Scholar
- Semantic Scholar rate limits are handled gracefully
- Better logging to see what's happening

### 3. Data Validation
- Filters out invalid publications (missing titles, etc.)
- Only returns publications with valid data

## How to Fix

### Step 1: Update .env File
The placeholder API key has been removed. If you want to add a real API key later:

```bash
# In backend/.env, either:
PUBMED_API_KEY=          # Empty (works fine, just slower rate limits)
# OR
PUBMED_API_KEY=your_real_api_key_here   # Get from https://www.ncbi.nlm.nih.gov/account/
```

### Step 2: Wait for Rate Limit Reset
Semantic Scholar is rate limited. Either:
- Wait 5-10 minutes before searching again
- Or search will work with PubMed only (which doesn't require an API key)

### Step 3: Test Search
1. Restart backend: `npm run dev`
2. Try searching for "cancer" again
3. Should now work with PubMed (even if Semantic Scholar is rate limited)

## Expected Behavior

- **PubMed**: Should work without API key (just slower)
- **Semantic Scholar**: May be rate limited, but won't block PubMed results
- **Results**: Will show publications from PubMed even if Semantic Scholar fails

## Next Steps

If you want higher rate limits:
1. **PubMed**: Get free API key from https://www.ncbi.nlm.nih.gov/account/
2. **Semantic Scholar**: Get API key from https://www.semanticscholar.org/product/api#api-key-form

Both are optional - the system works without them, just with lower rate limits.

