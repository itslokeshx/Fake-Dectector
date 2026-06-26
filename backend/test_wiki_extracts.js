import axios from 'axios';

async function testWiki() {
  const titles = ['Claude Mythos', 'Claude (AI)'];
  const headers = {
    'User-Agent': 'TruthGuardFactChecker/2.0 (lokeshvijayraina@gmail.com; Academic Project)'
  };

  for (const title of titles) {
    // Note: exchars must be between 1 and 1200 according to Wikipedia API docs if we want to limit characters,
    // or we can just ask for prop=extracts&explaintext without exintro and slice it ourselves!
    const queryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(title)}&format=json`;
    
    try {
      const res = await axios.get(queryUrl, { headers });
      const pages = res.data.query?.pages;
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId].extract;
      console.log(`=== ${title} (length: ${extract.length}) ===`);
      console.log(extract.substring(0, 1500));
      console.log("-----------------------------------------");
    } catch (e) {
      console.error(e.message);
    }
  }
}

testWiki();
