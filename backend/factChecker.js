// ─── factChecker.js ──────────────────────────────────────────────────────────
// Free web search pipeline: DuckDuckGo + Wikipedia + Fact-check site scraping
// Gathers live internet context to augment Gemini's analysis
// No API keys required — fully free for personal use

import { search, SafeSearchType } from 'duck-duck-scrape';
import axios from 'axios';
import { load } from 'cheerio';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── 1. DuckDuckGo Search ─────────────────────────────────────────────────────
export async function duckDuckGoSearch(statement) {
  // Query raw statement instead of appending fact check suffixes (which break positive news)
  const query = statement;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  };

  try {
    const response = await axios.get(url, { headers, timeout: 5000 });
    if (response.status === 200 && response.data.includes('result__body')) {
      const $ = load(response.data);
      const results = [];
      $('.result__body').each((i, el) => {
        const title = $(el).find('.result__title').text().trim();
        let link = $(el).find('.result__url').text().trim();
        if (link && !link.startsWith('http')) {
          link = `https://${link}`;
        }
        const snippet = $(el).find('.result__snippet').text().trim();
        if (title && link) {
          results.push({
            title: title.replace(/\s+/g, ' '),
            url: link,
            snippet: snippet.replace(/\s+/g, ' ').substring(0, 300)
          });
        }
      });
      console.log(`🔍 DDG HTML: Found ${results.length} results for: "${statement.substring(0, 60)}..."`);
      if (results.length > 0) return results;
    }
  } catch (e) {
    // Ignore and fallback to scraping library
  }

  try {
    const searchResults = await search(query, {
      safeSearch: SafeSearchType.MODERATE
    });

    const results = (searchResults.results || []).slice(0, 12).map(r => ({
      title: r.title || '',
      url: r.url || r.href || '',
      snippet: (r.description || r.body || '').substring(0, 300)
    }));

    console.log(`🔍 DDG Scrape (Fallback): Found ${results.length} results for: "${statement.substring(0, 60)}..."`);
    return results;
  } catch (e) {
    console.error('⚠️ DDG search error:', e.message);
    return [];
  }
}

// ─── 2. Wikipedia Knowledge Lookup ────────────────────────────────────────────
export async function wikipediaSearch(term) {
  const headers = {
    'User-Agent': 'TruthGuardFactChecker/2.0 (lokeshvijayraina@gmail.com; Academic Project)'
  };

  // First search for relevant articles
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=3&format=json`;
  try {
    const searchRes = await fetch(searchUrl, { headers });
    const searchData = await searchRes.json();
    const titles = (searchData.query?.search || []).map(s => s.title);

    if (titles.length === 0) return [];

    const summaries = [];
    for (const title of titles.slice(0, 2)) {
      try {
        const queryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json`;
        const res = await fetch(queryUrl, { headers });
        const data = await res.json();
        
        const pages = data.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];
          if (page && page.extract) {
            summaries.push({
              title: page.title,
              extract: page.extract.substring(0, 1000), // Get richer intro context
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
            });
          }
        }
      } catch (e) {
        // Skip individual article errors
      }
      await delay(200);
    }

    console.log(`📚 Wikipedia: Found ${summaries.length} articles for: "${term.substring(0, 50)}..."`);
    return summaries;
  } catch (e) {
    console.error('⚠️ Wikipedia search error:', e.message);
    return [];
  }
}

// ─── 3. Fact-Check Site Scraping ──────────────────────────────────────────────
export async function scrapeFactCheckSite(query, site = 'politifact.com') {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  const results = [];

  try {
    let searchUrl;
    if (site === 'politifact.com') {
      searchUrl = `https://www.politifact.com/search/?q=${encodeURIComponent(query)}`;
    } else if (site === 'snopes.com') {
      searchUrl = `https://www.snopes.com/?s=${encodeURIComponent(query)}`;
    } else if (site === 'factcheck.org') {
      searchUrl = `https://www.factcheck.org/?s=${encodeURIComponent(query)}`;
    } else {
      searchUrl = `https://www.${site}/search/?q=${encodeURIComponent(query)}`;
    }

    const { data } = await axios.get(searchUrl, {
      headers,
      timeout: 8000,
      maxRedirects: 3
    });

    const $ = load(data);

    if (site === 'politifact.com') {
      // PolitiFact result items
      $('article, .m-result, .o-listicle__item, .m-statement').slice(0, 5).each((i, el) => {
        const title = $(el).find('a').first().text().trim() || $(el).find('.m-statement__quote').text().trim();
        const link = $(el).find('a').first().attr('href') || '';
        const rating = $(el).find('.m-result__rating, .c-image__original, .m-statement__meter img').attr('alt') || '';
        if (title && title.length > 10) {
          results.push({
            title: title.substring(0, 200),
            url: link.startsWith('http') ? link : `https://www.politifact.com${link}`,
            rating: rating.substring(0, 50),
            source: 'PolitiFact'
          });
        }
      });
    } else if (site === 'snopes.com') {
      // Snopes result items
      $('article, .media-body, .article_wrapper, .search-result').slice(0, 5).each((i, el) => {
        const title = $(el).find('a').first().text().trim() || $(el).find('h3, h2').text().trim();
        const link = $(el).find('a').first().attr('href') || '';
        const rating = $(el).find('.rating_title_wrap, .result_rating').text().trim();
        if (title && title.length > 10) {
          results.push({
            title: title.substring(0, 200),
            url: link.startsWith('http') ? link : `https://www.snopes.com${link}`,
            rating: rating.substring(0, 50),
            source: 'Snopes'
          });
        }
      });
    } else if (site === 'factcheck.org') {
      $('article, .post, .entry').slice(0, 5).each((i, el) => {
        const title = $(el).find('a').first().text().trim() || $(el).find('h2, h3').text().trim();
        const link = $(el).find('a').first().attr('href') || '';
        if (title && title.length > 10) {
          results.push({
            title: title.substring(0, 200),
            url: link,
            rating: '',
            source: 'FactCheck.org'
          });
        }
      });
    }

    console.log(`🕵️ ${site}: Found ${results.length} fact-check results`);
  } catch (e) {
    console.error(`⚠️ Scrape failed for ${site}:`, e.message?.substring(0, 100));
  }

  await delay(1000); // Be respectful of rate limits
  return results;
}

// ─── 4. Google Fact Check API (free, no key needed for basic) ─────────────────
export async function googleFactCheckSearch(query) {
  try {
    const url = `https://toolbox.google.com/factcheck/api/search?query=${encodeURIComponent(query)}&hl=en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];

    const text = await res.text();
    // Google Fact Check API returns JSONP-like format
    const jsonStr = text.replace(/^\)\]\}'\n/, '');
    const data = JSON.parse(jsonStr);

    const results = [];
    if (Array.isArray(data) && data[0] && data[0][0] === 'claims_response') {
      const claimsList = data[0][1];
      if (Array.isArray(claimsList)) {
        for (const claimGroup of claimsList) {
          const claimInfo = claimGroup[0];
          if (Array.isArray(claimInfo)) {
            const claimText = claimInfo[0];
            const factCheckers = claimInfo[3] || [];
            for (const fc of factCheckers) {
              const publisher = fc[0]?.[0] || 'Unknown';
              const claimUrl = fc[1] || '';
              const rating = fc[3] || 'Unknown';
              results.push({
                title: claimText,
                url: claimUrl,
                rating: rating,
                source: `Google Fact Check (${publisher})`
              });
            }
          }
        }
      }
    }

    console.log(`✅ Google Fact Check: Found ${results.length} claims`);
    return results;
  } catch (e) {
    console.error('⚠️ Google Fact Check error:', e.message);
    return [];
  }
}

// ─── 5. Extract Key Claims from Text ──────────────────────────────────────────
export function extractClaims(text) {
  // Split text into sentences and pick the most claim-like ones
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 15);

  // Score sentences by how "claim-like" they are
  const claimIndicators = [
    /\d+/, // Contains numbers (stats, dates, quantities)
    /(?:said|claimed|reported|announced|stated|according)/i,
    /(?:percent|million|billion|trillion|thousand)/i,
    /(?:study|research|survey|poll|report|data)/i,
    /(?:first|largest|smallest|most|least|biggest|fastest)/i,
    /(?:always|never|every|all|none|no one)/i,
    /(?:cause|effect|result|lead|increase|decrease)/i,
    /(?:president|minister|government|official|ceo|company)/i,
  ];

  const scored = sentences.map(s => {
    let score = 0;
    for (const pattern of claimIndicators) {
      if (pattern.test(s)) score++;
    }
    // Longer sentences tend to have more verifiable content
    if (s.length > 50) score++;
    if (s.length > 100) score++;
    return { text: s, score };
  });

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  const topClaims = scored.slice(0, 3).map(c => c.text);

  // Always include the full text as the first search query (shortened)
  const fullQuery = text.substring(0, 150).replace(/\n/g, ' ');
  return [fullQuery, ...topClaims.filter(c => c !== fullQuery)].slice(0, 3);
}

// ─── 6. Master Pipeline: Gather All Web Context ──────────────────────────────
export async function gatherWebContext(text) {
  const startTime = Date.now();
  console.log('\n🌐 ═══ Starting Web Search Pipeline ═══');

  const claims = extractClaims(text);
  console.log(`📋 Extracted ${claims.length} key claims to verify`);

  // Run all searches in parallel for speed
  const allResults = {
    ddgResults: [],
    wikiResults: [],
    factCheckResults: [],
    googleFactChecks: []
  };

  // Search the primary claim (first/full text) across all sources
  const primaryClaim = claims[0];

  const searchPromises = [
    // DuckDuckGo search for each claim
    ...claims.map(claim => duckDuckGoSearch(claim).then(r => {
      allResults.ddgResults.push(...r);
    })),

    // Wikipedia for key terms
    wikipediaSearch(primaryClaim).then(r => {
      allResults.wikiResults.push(...r);
    }),

    // Fact-check sites (sequential to be polite, but parallel across sites)
    scrapeFactCheckSite(primaryClaim, 'snopes.com').then(r => {
      allResults.factCheckResults.push(...r);
    }),

    scrapeFactCheckSite(primaryClaim, 'politifact.com').then(r => {
      allResults.factCheckResults.push(...r);
    }),

    // Google Fact Check
    googleFactCheckSearch(primaryClaim).then(r => {
      allResults.googleFactChecks.push(...r);
    })
  ];

  // Wait for all searches with a timeout (don't let it hang forever)
  await Promise.allSettled(searchPromises);

  // Deduplicate DDG results by URL
  const seenUrls = new Set();
  allResults.ddgResults = allResults.ddgResults.filter(r => {
    if (seenUrls.has(r.url)) return false;
    seenUrls.add(r.url);
    return true;
  }).slice(0, 15);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🌐 ═══ Web Search Complete (${elapsed}s) ═══`);
  console.log(`   DDG: ${allResults.ddgResults.length} | Wiki: ${allResults.wikiResults.length} | Fact-Check Sites: ${allResults.factCheckResults.length} | Google FC: ${allResults.googleFactChecks.length}`);

  return allResults;
}

// ─── 7. Format Web Context as Text for Gemini ────────────────────────────────
export function formatWebContextForPrompt(webContext) {
  const sections = [];

  // DuckDuckGo Results
  if (webContext.ddgResults.length > 0) {
    sections.push('### Web Search Results (DuckDuckGo)');
    webContext.ddgResults.forEach((r, i) => {
      sections.push(`${i + 1}. **${r.title}**`);
      sections.push(`   URL: ${r.url}`);
      if (r.snippet) sections.push(`   Snippet: ${r.snippet}`);
    });
  }

  // Wikipedia
  if (webContext.wikiResults.length > 0) {
    sections.push('\n### Wikipedia Background Knowledge');
    webContext.wikiResults.forEach(r => {
      sections.push(`**${r.title}**: ${r.extract}`);
      sections.push(`Source: ${r.url}`);
    });
  }

  // Fact-Check Sites
  if (webContext.factCheckResults.length > 0) {
    sections.push('\n### Fact-Check Site Results');
    webContext.factCheckResults.forEach(r => {
      sections.push(`- [${r.source}] **${r.title}**${r.rating ? ` — Rating: ${r.rating}` : ''}`);
      sections.push(`  URL: ${r.url}`);
    });
  }

  // Google Fact Check
  if (webContext.googleFactChecks.length > 0) {
    sections.push('\n### Google Fact Check Claims');
    webContext.googleFactChecks.forEach(r => {
      sections.push(`- Claim: "${r.title}" — Rating: ${r.rating} (${r.source})`);
      sections.push(`  URL: ${r.url}`);
    });
  }

  const contextText = sections.join('\n');

  if (!contextText.trim()) {
    return '\n[No relevant web search results found. Rely on your training knowledge but note the limitation.]\n';
  }

  return contextText;
}
