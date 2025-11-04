const axios = require('axios');
const { parseString } = require('xml2js');
const util = require('util');
const parseXML = util.promisify(parseString);

// Top Medical Journals
const TOP_JOURNALS = [
  'New England Journal of Medicine',
  'NEJM',
  'JAMA',
  'Journal of the American Medical Association',
  'Nature Medicine',
  'Science',
  'Cell',
  'The Lancet',
  'Journal of Clinical Oncology',
  'JCO',
  'BMJ',
  'British Medical Journal',
  'Annals of Internal Medicine'
];

// ClinicalTrials.gov API
async function searchClinicalTrials(query, filters = {}) {
  try {
    console.log('[ClinicalTrials.gov] Searching with query:', query, 'filters:', filters);
    
    // ClinicalTrials.gov API v2 uses filter-based query parameters
    // The API accepts: filter.overallStatus, query.cond, pageSize, format
    let apiUrl = 'https://clinicaltrials.gov/api/v2/studies';
    const urlParams = new URLSearchParams();
    
    // Add condition query if provided - use query.cond
    if (query && query.trim()) {
      const cleanQuery = query.trim().replace(/[^\w\s():-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanQuery && cleanQuery.length > 0) {
        urlParams.append('query.cond', cleanQuery);
      }
    }
    
    // Add status filter using filter.overallStatus format
    if (filters.status) {
      const statusMap = {
        'recruiting': 'RECRUITING',
        'completed': 'COMPLETED',
        'not yet recruiting': 'NOT_YET_RECRUITING',
        'active': 'ACTIVE_NOT_RECRUITING',
        'enrolling': 'ENROLLING_BY_INVITATION'
      };
      const ctgovStatus = statusMap[filters.status.toLowerCase()] || filters.status.toUpperCase();
      urlParams.append('filter.overallStatus', ctgovStatus);
    }
    
    // Add location filter if provided - combine with condition query
    if (filters.location && filters.location.trim()) {
      const locationFilter = filters.location.trim();
      // Add location to query.cond if condition query exists, otherwise use query.term
      if (query && query.trim()) {
        // Combine condition and location in query.cond
        const existingCond = urlParams.get('query.cond') || query.trim();
        urlParams.set('query.cond', `${existingCond} ${locationFilter}`);
      } else {
        urlParams.append('query.term', locationFilter);
      }
    }
    
    // If no query or filters, default to recruiting trials
    if (!query && !filters.status) {
      urlParams.append('filter.overallStatus', 'RECRUITING');
    }
    
    // Add page size and format
    urlParams.append('pageSize', '50');
    urlParams.append('format', 'json');
    
    const queryStringParam = urlParams.toString();
    if (queryStringParam) {
      apiUrl += '?' + queryStringParam;
    }

    console.log('[ClinicalTrials.gov] API URL:', apiUrl);

    const response = await axios.get(apiUrl, { 
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('[ClinicalTrials.gov] API response received, studies count:', response.data?.studies?.length || 0);
    
    if (response.data?.studies) {
      const trials = response.data.studies.map((study) => {
        const protocol = study.protocolSection || {};
        const idModule = protocol.identificationModule || {};
        const descModule = protocol.descriptionModule || {};
        const statusModule = protocol.statusModule || {};
        const conditionsModule = protocol.conditionsModule || {};
        const designModule = protocol.designModule || {};
        const contactsModule = protocol.contactsLocationsModule || {};
        const eligibilityModule = protocol.eligibilityModule || {};

        // Extract location information
        const locations = contactsModule.locations || [];
        const primaryLocation = locations[0] || {};
        const locationString = primaryLocation.city 
          ? `${primaryLocation.city}${primaryLocation.state ? ', ' + primaryLocation.state : ''}${primaryLocation.country ? ', ' + primaryLocation.country : ''}`
          : (primaryLocation.country || 'N/A');

        // Extract contact information
        const centralContacts = contactsModule.centralContacts || [];
        const primaryContact = centralContacts[0] || {};
        const overallOfficials = contactsModule.overallOfficials || [];
        const officialContact = overallOfficials[0] || {};

        // Get email from central contact or official
        const contactEmail = primaryContact.email || officialContact.email || null;

        // Get contact name
        const contactName = primaryContact.name || officialContact.name || 'Trial Administrator';

        return {
          nct_id: idModule.nctId,
          title: idModule.briefTitle || idModule.officialTitle || 'N/A',
          description: descModule.briefSummary || descModule.detailedDescription || '',
          conditions: (conditionsModule.conditions || []).map(c => c.name || c),
          phase: (designModule.phases || [])[0] || 'N/A',
          status: statusModule.overallStatus || 'Unknown',
          location: locationString,
          eligibility_criteria: eligibilityModule.eligibilityCriteria || '',
          contact_email: contactEmail,
          contact_name: contactName,
          // ClinicalTrials.gov URL - using search format
          ctgov_url: `https://clinicaltrials.gov/search?id=${idModule.nctId}`,
        };
      });
      
      console.log('[ClinicalTrials.gov] Mapped', trials.length, 'trials');
      return trials;
    }
    return [];
  } catch (error) {
    console.error('ClinicalTrials.gov API error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// PubMed API - Full implementation with XML parsing
async function searchPubMedPublications(query, maxResults = 20, journalFilter = null) {
  try {
    console.log(`[PubMed] Searching: "${query}", maxResults: ${maxResults}, journal: ${journalFilter || 'none'}`);
    // Build search query
    let searchTerm = query;
    if (journalFilter) {
      searchTerm = `${query} AND ("${journalFilter}"[Journal])`;
    }

    // Step 1: Search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
    const searchParams = {
      db: 'pubmed',
      term: searchTerm,
      retmax: maxResults,
      retmode: 'json',
    };
    
    // Only add API key if it's valid (not placeholder)
    const pubmedApiKey = process.env.PUBMED_API_KEY;
    if (pubmedApiKey && pubmedApiKey !== '' && pubmedApiKey !== 'your_pubmed_api_key') {
      searchParams.api_key = pubmedApiKey;
    }

    const searchResponse = await axios.get(searchUrl, { 
      params: searchParams,
      timeout: 10000 
    });
    
    const ids = searchResponse.data?.esearchresult?.idlist || [];
    console.log(`[PubMed] Found ${ids.length} article IDs`);
    if (ids.length === 0) {
      console.log('[PubMed] No results found');
      return [];
    }

    // Step 2: Fetch publication details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
    const fetchParams = {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    };

    const fetchResponse = await axios.get(fetchUrl, { 
      params: fetchParams,
      timeout: 15000 
    });

    // Parse XML response
    const xmlData = await parseXML(fetchResponse.data);
    const articles = xmlData?.PubmedArticleSet?.PubmedArticle || [];
    console.log(`[PubMed] Parsed ${articles.length} articles from XML`);

    const publications = articles.map((article) => {
      const medline = article.MedlineCitation?.[0] || {};
      const articleData = medline.Article?.[0] || {};
      const pubmedData = article.PubmedData?.[0] || {};
      
      // Extract title - handle both array and string formats
      let title = '';
      if (articleData.ArticleTitle) {
        if (Array.isArray(articleData.ArticleTitle)) {
          title = articleData.ArticleTitle[0] || '';
        } else if (typeof articleData.ArticleTitle === 'string') {
          title = articleData.ArticleTitle;
        } else if (articleData.ArticleTitle._) {
          title = articleData.ArticleTitle._;
        }
      }
      title = String(title || '').trim();
      
      // Extract abstract - handle nested AbstractText structure
      let abstract = '';
      if (articleData.Abstract?.AbstractText) {
        if (Array.isArray(articleData.Abstract.AbstractText)) {
          abstract = articleData.Abstract.AbstractText[0] || '';
        } else if (typeof articleData.Abstract.AbstractText === 'string') {
          abstract = articleData.Abstract.AbstractText;
        } else if (articleData.Abstract.AbstractText._) {
          abstract = articleData.Abstract.AbstractText._;
        }
      }
      abstract = String(abstract || '').trim();
      
      // Extract journal
      let journal = '';
      if (articleData.Journal?.Title) {
        if (Array.isArray(articleData.Journal.Title)) {
          journal = articleData.Journal.Title[0] || '';
        } else if (typeof articleData.Journal.Title === 'string') {
          journal = articleData.Journal.Title;
        } else if (articleData.Journal.Title._) {
          journal = articleData.Journal.Title._;
        }
      }
      journal = String(journal || '').trim();
      const pubDate = medline.DateCompleted || medline.DateRevised || {};
      const year = pubDate.Year?.[0] || new Date().getFullYear();
      const month = pubDate.Month?.[0] || '01';
      const day = pubDate.Day?.[0] || '01';
      
      const authors = (articleData.AuthorList?.[0]?.Author || []).map(author => {
        const lastName = author.LastName?.[0] || '';
        const firstName = author.ForeName?.[0] || '';
        const initials = author.Initials?.[0] || '';
        return `${lastName} ${firstName || initials}`.trim();
      });

      const pmid = medline.PMID?.[0]?._ || '';
      const doi = (pubmedData.ArticleIdList?.[0]?.ArticleId || [])
        .find(id => id.$.IdType === 'doi')?._ || '';

      const keywords = (medline.KeywordList?.[0]?.Keyword || [])
        .map(kw => kw._ || kw);

      // Only return publications with valid titles
      if (!title || title.length < 3) {
        return null;
      }

      return {
        title: String(title || ''),
        authors: authors.filter(a => a && String(a).trim().length > 0),
        journal: String(journal || ''),
        pub_date: `${year}-${month}-${day}`,
        doi: String(doi || ''),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}`,
        abstract: String(abstract || ''),
        keywords: keywords.filter(k => k && typeof k === 'string' && k.trim().length > 0),
        source: 'pubmed',
      };
    });

    // Filter out null/invalid publications
    const validPublications = publications.filter(pub => pub !== null && pub.title);
    console.log(`[PubMed] Returning ${validPublications.length} valid publications (out of ${articles.length} articles)`);
    return validPublications;
  } catch (error) {
    console.error('[PubMed] API error:', error.message);
    console.error('[PubMed] Error stack:', error.stack);
    if (error.response) {
      console.error('[PubMed] Response status:', error.response.status);
      console.error('[PubMed] Response data:', error.response.data);
    }
    return [];
  }
}

// Search from specific top journals
async function searchTopJournalPublications(query, maxResults = 20) {
  try {
    const allPublications = [];
    
    // Search each top journal
    for (const journal of TOP_JOURNALS.slice(0, 5)) { // Limit to avoid rate limits
      const results = await searchPubMedPublications(query, Math.ceil(maxResults / TOP_JOURNALS.length), journal);
      allPublications.push(...results);
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Deduplicate by title
    const seen = new Set();
    return allPublications.filter(pub => {
      const key = pub.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, maxResults);
  } catch (error) {
    console.error('Top journal search error:', error.message);
    return [];
  }
}

// ORCID API - Fetch researcher publications
async function fetchORCIDPublications(orcidId) {
  try {
    const orcidIdClean = orcidId.replace(/[^\dX-]/g, ''); // Clean ORCID ID
    
    const response = await axios.get(
      `https://pub.orcid.org/v3.0/${orcidIdClean}/works`,
      {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000
      }
    );

    const works = response.data?.group || [];
    const publications = [];

    for (const group of works) {
      const workSummary = group['work-summary']?.[0] || {};
      const title = workSummary.title?.title?.value || '';
      const journal = workSummary['journal-title']?.value || '';
      const pubDate = workSummary['publication-date'] || {};
      const year = pubDate.year?.value || new Date().getFullYear();
      
      const doi = (workSummary['external-ids']?.['external-id'] || [])
        .find(id => id['external-id-type'] === 'doi')?.['external-id-value'] || '';

      if (title) {
        publications.push({
          title,
          journal,
          pub_date: `${year}-01-01`,
          doi,
          url: workSummary.url?.value || `https://orcid.org/${orcidIdClean}`,
          source: 'orcid',
        });
      }
    }

    return publications;
  } catch (error) {
    console.error('ORCID API error:', error.message);
    return [];
  }
}

// ResearchGate - Limited API, using profile scraping or search
// Note: ResearchGate doesn't have a public API, so we'll use search
async function searchResearchGatePublications(query, maxResults = 10) {
  try {
    // Since ResearchGate doesn't have a public API, we'll use PubMed
    // with ResearchGate as a source indicator
    // In production, you might want to use web scraping with proper permissions
    return await searchPubMedPublications(`"ResearchGate" AND ${query}`, maxResults);
  } catch (error) {
    console.error('ResearchGate search error:', error.message);
    return [];
  }
}

// Semantic Scholar API (Alternative to Google Scholar)
async function searchSemanticScholar(query, maxResults = 20) {
  try {
    console.log(`[Semantic Scholar] Searching: "${query}", maxResults: ${maxResults}`);
    
    // Add API key if available (helps with rate limits)
    const headers = { 'User-Agent': 'CuraLink/1.0' };
    const semanticApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    if (semanticApiKey && semanticApiKey !== '' && semanticApiKey !== 'your_semantic_scholar_api_key') {
      headers['x-api-key'] = semanticApiKey;
    }
    
    const response = await axios.get(
      `https://api.semanticscholar.org/graph/v1/paper/search`,
      {
        params: {
          query: query,
          limit: maxResults,
          fields: 'title,authors,year,journal,abstract,url,doi',
        },
        headers: headers,
        timeout: 10000
      }
    );

    const papers = response.data?.data || [];
    console.log(`[Semantic Scholar] Found ${papers.length} papers`);
    
    return papers
      .filter(paper => paper.title && String(paper.title).trim().length > 0)
      .map(paper => ({
        title: String(paper.title || ''),
        authors: (paper.authors || []).map(a => a && a.name ? String(a.name) : '').filter(a => a.length > 0),
        journal: String(paper.journal?.name || ''),
        pub_date: paper.year ? `${paper.year}-01-01` : null,
        doi: String(paper.doi || ''),
        url: String(paper.url || ''),
        abstract: String(paper.abstract || ''),
        source: 'semantic_scholar',
      }));
  } catch (error) {
    console.error('[Semantic Scholar] API error:', error.message);
    if (error.response) {
      console.error('[Semantic Scholar] Response status:', error.response.status);
      if (error.response.status === 429) {
        console.warn('[Semantic Scholar] Rate limited. Consider adding SEMANTIC_SCHOLAR_API_KEY to .env');
      }
    }
    // Return empty array on error - PubMed will still work
    return [];
  }
}

// Combined publication search from multiple sources
async function searchAllPublications(query, maxResults = 20, sources = ['pubmed', 'semantic_scholar']) {
  try {
    const allResults = [];
    
    // Try PubMed first (more reliable, no API key required)
    if (sources.includes('pubmed')) {
      try {
        const pubmedResults = await searchPubMedPublications(query, maxResults);
        console.log(`[Combined Search] PubMed returned ${pubmedResults.length} results`);
        allResults.push(...pubmedResults);
      } catch (err) {
        console.warn('[Combined Search] PubMed failed:', err.message);
        // Don't give up, try Semantic Scholar
      }
    }

    // Try Semantic Scholar only if we need more results or PubMed failed
    if (sources.includes('semantic_scholar') && allResults.length < maxResults) {
      try {
        const remaining = maxResults - allResults.length;
        const semanticResults = await searchSemanticScholar(query, remaining);
        console.log(`[Combined Search] Semantic Scholar returned ${semanticResults.length} results`);
        allResults.push(...semanticResults);
      } catch (err) {
        console.warn('[Combined Search] Semantic Scholar failed (may be rate limited):', err.message);
        // Continue with PubMed results only
      }
    }

    // Deduplicate by title
    const seen = new Set();
    const uniqueResults = allResults
      .filter(pub => {
        if (!pub || !pub.title) return false;
        // Ensure title is a string
        const titleStr = typeof pub.title === 'string' ? pub.title : String(pub.title || '');
        const key = titleStr.toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, maxResults);
    
    console.log(`[Combined Search] Returning ${uniqueResults.length} unique publications`);
    return uniqueResults;
  } catch (error) {
    console.error('[Combined Search] Error:', error.message);
    return [];
  }
}

module.exports = {
  searchClinicalTrials,
  searchPubMedPublications,
  searchTopJournalPublications,
  fetchORCIDPublications,
  searchResearchGatePublications,
  searchSemanticScholar,
  searchAllPublications,
  TOP_JOURNALS,
};
