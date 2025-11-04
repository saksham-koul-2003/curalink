# How to Use Publications - Visual Guide

## 📍 Where Publications Appear

### 1. **Patient Dashboard**
```
┌─────────────────────────────────────────┐
│  Your Personalized Dashboard           │
├─────────────────────────────────────────┤
│  [Clinical Trials Section]              │
│  [Health Experts Section]              │
│                                         │
│  📚 Recommended Publications           │
│  ┌─────────────────────────────────┐  │
│  │ Title: Cancer Treatment Study    │  │
│  │ Journal: NEJM                   │  │
│  │ [AI Summary]                     │  │
│  │ [Read Paper] button             │  │
│  └─────────────────────────────────┘  │
│  View All →                            │
└─────────────────────────────────────────┘
```

### 2. **Publications Page** (Main Page)
```
┌─────────────────────────────────────────┐
│  Publications                           │
├─────────────────────────────────────────┤
│  [Search Bar: "cancer treatment"]     │
│  [Search] [Show Recommended]           │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Title: Latest Cancer Research   │  │
│  │ Journal: Nature Medicine       │  │
│  │ Authors: Dr. Smith, Dr. Jones   │  │
│  │ Published: 2024                 │  │
│  │ [AI Summary]                     │  │
│  │ [Read Full Paper] [★ Favorites] │  │
│  │ DOI: 10.1234/example            │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 3. **Navigation Menu** (For Patients)
```
┌─────────────────────────────────────┐
│  CuraLink                            │
│  Dashboard | Trials | Publications | │
│  Experts | Forums | Favorites        │
└─────────────────────────────────────┘
```

## 🎯 What Publications Do

### For Patients:

1. **Learn About Your Condition**
   - Search for your condition (e.g., "diabetes", "cancer")
   - See latest research papers
   - Read AI summaries (easy to understand)
   - Read full paper if interested

2. **Stay Updated**
   - Get personalized recommendations
   - Based on your medical conditions
   - From top medical journals (NEJM, JAMA, etc.)

3. **Save for Later**
   - Add publications to favorites
   - Access from Favorites page
   - Keep important research handy

### For Researchers:

1. **Import Your Work**
   - Add ORCID ID to profile
   - Publications auto-import
   - Appear in your profile

2. **Find Relevant Research**
   - Search by topic
   - Filter by journal
   - Discover related work

## 🔄 How It Works (Flow)

### Patient Flow:
```
1. Register/Login as Patient
   ↓
2. Complete Onboarding
   - Add conditions: "Diabetes", "Heart Disease"
   ↓
3. Go to Dashboard
   - See "Recommended Publications" section
   - Shows 3 publications related to your conditions
   ↓
4. Click "View All →"
   - Goes to Publications page
   - Shows all recommended publications
   ↓
5. Or Click "Publications" in Navigation
   - Direct access to Publications page
   ↓
6. Search for Specific Topic
   - Type: "cancer treatment"
   - Click Search
   - See results from PubMed, NEJM, etc.
   ↓
7. Read Publication
   - Click "Read Full Paper"
   - Opens original paper
   - Or read AI summary
   ↓
8. Save to Favorites
   - Click "★ Add to Favorites"
   - View later in Favorites page
```

### Researcher Flow:
```
1. Register/Login as Researcher
   ↓
2. Complete Onboarding
   - Add specialties: "Oncology", "Neurology"
   ↓
3. Update Profile
   - Add ORCID ID: "0000-0001-2345-6789"
   ↓
4. Publications Auto-Import
   - System fetches from ORCID
   - Imports 20 publications
   - Links to your profile
   ↓
5. View Your Publications
   - Go to Profile
   - See imported publications
   ↓
6. Search Publications
   - Use Publications page
   - Find research in your field
```

## 💻 Step-by-Step: See It Working

### Test as Patient:

#### Step 1: Start the Application
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm start
```

#### Step 2: Register as Patient
1. Go to http://localhost:3000
2. Click **"I am a Patient"**
3. Fill in registration form:
   - Name: "John Doe"
   - Email: "patient@example.com"
   - Password: "password123"
   - User Type: Patient
4. Click **"Sign Up"**

#### Step 3: Complete Onboarding
1. You'll be on the Patient Onboarding page
2. Add a condition: Type **"Cancer"** in the condition field
3. Click **"Continue"** or **"Skip"**

#### Step 4: View Dashboard
1. You'll be redirected to Dashboard
2. Scroll down to **"Recommended Publications"** section
3. You should see publications related to "Cancer"

#### Step 5: Go to Publications Page
1. Click **"Publications"** in the navigation menu
2. Or click **"View All →"** in the Publications section
3. You'll see all recommended publications

#### Step 6: Search Publications
1. In the search bar, type: **"cancer treatment"**
2. Click **"Search"** or press Enter
3. Wait a few seconds (API call to PubMed)
4. You'll see publications from PubMed and other sources
5. Each publication shows:
   - Title
   - Journal (NEJM, JAMA, etc.)
   - Authors
   - AI Summary (if available)
   - "Read Full Paper" button

#### Step 7: Read a Publication
1. Click **"Read Full Paper"** on any publication
2. Opens the original paper in a new tab
3. Or read the AI summary on the card

#### Step 8: Add to Favorites
1. Click **"★ Add to Favorites"** on any publication
2. Go to **"Favorites"** in navigation
3. See your saved publications

### Test as Researcher:

#### Step 1: Register as Researcher
1. Go to http://localhost:3000
2. Click **"I am a Researcher"**
3. Register with:
   - Name: "Dr. Jane Smith"
   - Email: "researcher@example.com"
   - Password: "password123"

#### Step 2: Complete Profile
1. Add specialties: **"Oncology"**, **"Cancer Research"**
2. Add ORCID ID: **"0000-0001-2345-6789"** (example)
3. Click **"Continue"**

#### Step 3: Check Publications
1. System automatically imports publications from ORCID
2. Check backend logs to see the import process
3. Publications are linked to your profile

## 🎨 UI Locations

### Navigation Menu (Patient):
```
┌────────────────────────────────────────┐
│ Dashboard | Trials | Publications |    │
│ Experts | Forums | Favorites           │
└────────────────────────────────────────┘
         ↑ Click here to see all
```

### Dashboard Section:
```
┌────────────────────────────────────────┐
│ Recommended Publications                │
│ ┌──────────────────────────────────┐   │
│ │ Publication Card 1               │   │
│ │ Publication Card 2               │   │
│ │ Publication Card 3               │   │
│ └──────────────────────────────────┘   │
│ View All →                              │
└────────────────────────────────────────┘
```

### Publications Page:
```
┌────────────────────────────────────────┐
│ Publications                           │
│ [Search Bar: Type keywords here]      │
│ [Search] [Show Recommended]          │
│                                        │
│ 💡 Tip: Search for topics like...     │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Publication 1                   │  │
│ │ [Read Paper] [★ Favorites]      │  │
│ └──────────────────────────────────┘  │
│ ┌──────────────────────────────────┐  │
│ │ Publication 2                   │  │
│ │ [Read Paper] [★ Favorites]      │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## 🚨 Troubleshooting

### "No publications found"
**Why**: Your profile doesn't have conditions/interests yet
**Fix**: 
1. Go to Profile settings
2. Add conditions: "Cancer", "Diabetes", etc.
3. Refresh dashboard

### "Search not working"
**Why**: Backend might not be running
**Fix**:
1. Check backend is running: `cd backend && npm run dev`
2. Check browser console for errors
3. Try searching again

### "ORCID not importing"
**Why**: ORCID ID might be invalid
**Fix**:
1. Check ORCID ID format: `0000-0000-0000-0000`
2. Verify ORCID ID exists at orcid.org
3. Check backend logs for errors

## 📊 Summary

**What Publications Are:**
- Medical research papers from top journals
- Real scientific papers about medical conditions
- From PubMed, NEJM, JAMA, Nature Medicine, etc.

**Why They're Useful:**
- Learn about medical conditions
- Stay updated with latest research
- Get easy-to-understand summaries
- Find relevant research papers

**Where to Find Them:**
- Dashboard → Recommended Publications section
- Navigation → Publications page
- Search → Find specific topics

**How to Use Them:**
- Search for topics you're interested in
- Read AI summaries for quick understanding
- Click "Read Full Paper" for full details
- Save to favorites for later

