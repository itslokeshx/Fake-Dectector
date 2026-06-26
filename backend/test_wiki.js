import axios from 'axios';

async function testWiki() {
  const term = "2026 Indian Premier League";
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(term)}&format=json`;
  
  const headers = {
    'User-Agent': 'TruthGuardFactChecker/2.0 (lokeshvijayraina@gmail.com; Academic Project)'
  };

  try {
    const res = await axios.get(url, { headers });
    const pages = res.data.query.pages;
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId].extract;
    console.log("=== Wiki Extract ===");
    console.log(extract);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testWiki();
