# External API Integrations

CuraLink integrates with multiple external APIs to fetch clinical trials, publications, and researcher data.

## Implemented APIs

### 1. **ClinicalTrials.gov API**
- **Endpoint**: `https://clinicaltrials.gov/api/v2/studies`
- **Function**: `searchClinicalTrials(query, filters)`
- **Usage**: Automatically fetches trials when users search
- **Data Retrieved**: Trial title, description, conditions, phase, status, location, eligibility criteria

### 2. **PubMed API (NCBI E-utilities)**
- **Endpoint**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- **Function**: `searchPubMedPublications(query, maxResults, journalFilter)`
- **Usage**: Searches medical publications from PubMed database
- **Features**:
  - Full XML parsing
  - Journal filtering
  - Top journal search
- **Data Retrieved**: Title, authors, journal, publication date, DOI, abstract, keywords

### 3. **Semantic Scholar API** (Alternative to Google Scholar)
- **Endpoint**: `https://api.semanticscholar.org/graph/v1/paper/search`
- **Function**: `searchSemanticScholar(query, maxResults)`
- **Usage**: Academic paper search with structured data
- **Data Retrieved**: Title, authors, journal, year, abstract, DOI, URL

### 4. **ORCID API**
- **Endpoint**: `https://pub.orcid.org/v3.0/{orcidId}/works`
- **Function**: `fetchORCIDPublications(orcidId)`
- **Usage**: Fetches researcher's publications when ORCID ID is added to profile
- **Auto-import**: Publications are automatically imported when ORCID ID is saved in researcher profile

### 5. **ResearchGate**
- **Note**: ResearchGate doesn't have a public API
- **Current Implementation**: Uses PubMed search with ResearchGate filter
- **Future**: May require web scraping with proper permissions

## Top Medical Journals Supported

The system can filter publications from top medical journals:
- New England Journal of Medicine (NEJM)
- JAMA (Journal of the American Medical Association)
- Nature Medicine
- Science
- Cell
- The Lancet
- Journal of Clinical Oncology (JCO)
- BMJ (British Medical Journal)
- Annals of Internal Medicine

## API Endpoints

### Search Publications
```
GET /api/publications/search?query=cancer&journal=NEJM&top_journals=true&source=pubmed
```

**Query Parameters:**
- `query`: Search term (required for external search)
- `source`: Comma-separated sources (`pubmed`, `semantic_scholar`) - default: both
- `journal`: Filter by specific journal name
- `top_journals`: Set to `true` to search only top journals

### Fetch ORCID Publications
```
POST /api/publications/orcid/fetch
Headers: Authorization: Bearer <token>
Body: { "orcid_id": "0000-0000-0000-0000" }
```

**Note**: This endpoint is also called automatically when a researcher updates their profile with an ORCID ID.

## Automatic Features

1. **ORCID Auto-Import**: When a researcher adds/updates their ORCID ID in their profile, publications are automatically fetched and linked to their profile.

2. **AI Summaries**: All fetched publications automatically get AI-generated summaries using OpenAI (if API key is configured).

3. **Database Storage**: All fetched publications are stored in the database to avoid duplicate API calls and enable offline access.

## Rate Limiting

- PubMed: 3 requests per second (recommended)
- Semantic Scholar: 100 requests per 5 minutes
- ClinicalTrials.gov: No official limit, but be respectful
- ORCID: 100 requests per hour (recommended)

The implementation includes automatic rate limiting and error handling.

## Environment Variables

Optional environment variables:
- `PUBMED_API_KEY`: Optional API key for higher rate limits on PubMed
- `OPENAI_API_KEY`: Required for AI-generated summaries

## Error Handling

All API functions include comprehensive error handling:
- Timeout protection (10-15 seconds)
- Graceful fallbacks
- Error logging
- Empty result handling (returns empty array instead of failing)

## Usage Examples

### Search publications from top journals:
```javascript
const { searchTopJournalPublications } = require('./utils/externalAPIs');
const results = await searchTopJournalPublications('cancer immunotherapy', 20);
```

### Fetch researcher's ORCID publications:
```javascript
const { fetchORCIDPublications } = require('./utils/externalAPIs');
const publications = await fetchORCIDPublications('0000-0000-0000-0000');
```

### Search ClinicalTrials.gov:
```javascript
const { searchClinicalTrials } = require('./utils/externalAPIs');
const trials = await searchClinicalTrials('lung cancer', { status: 'recruiting' });
```

