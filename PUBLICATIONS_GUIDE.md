# Publications Feature - Complete Guide

## 📚 What Are Publications?

Publications are **medical research papers and scientific articles** from journals like:
- New England Journal of Medicine (NEJM)
- JAMA
- Nature Medicine
- The Lancet
- And other top medical journals

These are real research papers that researchers publish about medical conditions, treatments, clinical trials, and discoveries.

## 🎯 Why Are Publications Useful?

### For Patients:
1. **Learn about your condition** - Read the latest research about your medical condition
2. **Understand treatments** - See what research says about different treatment options
3. **Stay informed** - Get personalized recommendations based on your medical conditions
4. **AI summaries** - Each publication has an easy-to-understand summary, so you don't have to read complex scientific papers

### For Researchers:
1. **Stay updated** - Discover relevant research in your field
2. **Find collaborators** - See what other researchers are working on
3. **Auto-import** - Import your own publications from ORCID
4. **Track research** - Keep track of publications related to your interests

## 🖥️ Where to See Publications in Your Project

### 1. **Patient Dashboard** (Main Page)
- **Location**: After logging in as a patient, go to your dashboard
- **What you see**: 
  - Section called "Recommended Publications"
  - Shows 3 publications based on your medical conditions
  - Each shows: Title, Journal name, AI summary, and a "Read Paper" button

**Steps to see it:**
```
1. Login as Patient
2. Go to Dashboard (automatically after login)
3. Scroll down to "Recommended Publications" section
```

### 2. **Publications Page** (Dedicated Page)
- **Location**: Click on "Publications" in the navigation menu (for patients)
- **URL**: `/patient/publications`
- **Features**:
  - Search bar to search for specific publications
  - Shows all recommended publications
  - Each publication card shows:
    - Title
    - Journal name
    - Authors
    - Publication year
    - AI summary (easy-to-understand explanation)
    - "Read Full Paper" button (opens the actual paper)
    - "Add to Favorites" button (save for later)

**Steps to see it:**
```
1. Login as Patient
2. Click "Publications" in the navigation menu
3. See all publications or search for specific topics
```

### 3. **How Publications Are Fetched**

The system automatically:
1. **Searches external APIs** when you search for publications:
   - PubMed (medical database)
   - Semantic Scholar (academic papers)
   
2. **Filters by your interests**:
   - Patients: Based on your medical conditions
   - Researchers: Based on your research interests

3. **Generates AI summaries**:
   - Creates easy-to-understand summaries of complex research papers
   - Uses OpenAI to explain the paper in simple language

## 🔍 How to Use Publications

### For Patients:

#### Step 1: Complete Your Profile
```
1. Login/Register as Patient
2. Complete onboarding
3. Add your medical conditions (e.g., "Diabetes", "Heart Disease")
```

#### Step 2: View Recommended Publications
```
1. Go to Dashboard
2. See "Recommended Publications" section
3. Click "Read Paper" to open the full publication
```

#### Step 3: Search Publications
```
1. Go to Publications page
2. Type in search bar (e.g., "cancer treatment", "diabetes research")
3. Press Enter or click Search
4. See results from PubMed and other sources
```

#### Step 4: Save to Favorites
```
1. On any publication card
2. Click "★ Add to Favorites"
3. View later in Favorites page
```

### For Researchers:

#### Step 1: Add ORCID ID
```
1. Login/Register as Researcher
2. Go to Profile settings
3. Add your ORCID ID (e.g., "0000-0000-0000-0000")
4. Your publications are automatically imported!
```

#### Step 2: View Your Publications
```
1. Go to Researcher Profile
2. See your imported publications from ORCID
```

#### Step 3: Search Publications
```
Same as patients - use Publications page to search
```

## 💡 Example Use Cases

### Example 1: Patient with Cancer
```
1. Patient adds condition: "Lung Cancer"
2. Dashboard shows publications about lung cancer treatments
3. Patient reads AI summary to understand latest research
4. Patient clicks "Read Full Paper" to see the full scientific paper
5. Patient saves interesting papers to favorites
```

### Example 2: Researcher
```
1. Researcher adds ORCID ID: "0000-0001-2345-6789"
2. System automatically imports 20 publications
3. Publications appear in researcher's profile
4. Other researchers can see this work
5. Researcher searches for papers in their field
```

## 🔧 Technical Details

### API Integration:
- **PubMed**: Searches medical publications
- **Semantic Scholar**: Alternative to Google Scholar
- **ORCID**: Auto-imports researcher publications
- **Top Journals**: Filters from prestigious medical journals

### AI Features:
- **Auto-summaries**: Each publication gets an AI-generated summary
- **Smart recommendations**: Based on user profile (conditions/interests)

## 🎨 UI Locations

1. **Navigation Menu** (Patient):
   - Link: "Publications"
   - Route: `/patient/publications`

2. **Dashboard** (Patient):
   - Section: "Recommended Publications"
   - Shows top 3 recommendations

3. **Favorites Page**:
   - Section: "Publications"
   - Shows saved publications

## 🚀 Quick Start: See It in Action

### Step-by-Step:

1. **Start the servers:**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (in new terminal)
   cd frontend
   npm start
   ```

2. **Register as Patient:**
   - Go to http://localhost:3000
   - Click "I am a Patient"
   - Create account
   - In onboarding, add a condition like "Cancer" or "Diabetes"

3. **See Publications:**
   - Dashboard shows "Recommended Publications"
   - Click "View All →" to see all
   - Or click "Publications" in navigation

4. **Search Publications:**
   - Go to Publications page
   - Search for: "cancer treatment"
   - See results from PubMed

5. **Test as Researcher:**
   - Register as Researcher
   - Add ORCID ID in profile
   - See publications auto-import

## ❓ Troubleshooting

### "No publications found"
**Solution**: 
- Make sure you've added conditions/interests in your profile
- Try searching with a query like "cancer" or "diabetes"

### "Publications not loading"
**Solution**:
- Check backend is running
- Check browser console for errors
- Make sure API keys are set (optional)

### "ORCID not working"
**Solution**:
- Verify ORCID ID format: `0000-0000-0000-0000`
- Check backend logs for errors
- ORCID API might be rate-limited

## 📝 Summary

**Publications help users:**
- ✅ Learn about medical conditions
- ✅ Stay updated with latest research
- ✅ Find relevant scientific papers
- ✅ Get easy-to-understand summaries
- ✅ Save papers for later reading

**Where to find them:**
- Dashboard → Recommended Publications
- Navigation → Publications page
- Search → Find specific topics
- Favorites → Saved publications

