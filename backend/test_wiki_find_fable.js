import axios from 'axios';

async function test() {
  const titles = ['Claude Mythos', 'Claude (AI)'];
  const headers = {
    'User-Agent': 'TruthGuardFactChecker/2.0 (lokeshvijayraina@gmail.com; Academic Project)'
  };

  for (const title of titles) {
    const queryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&titles=${encodeURIComponent(title)}&format=json`;
    try {
      const res = await axios.get(queryUrl, { headers });
      const pages = res.data.query?.pages;
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId].extract;
      console.log(`=== ${title} ===`);
      const lines = extract.split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('fable')) {
          console.log("LINE:", line);
        }
      }
    } catch (e) {
      console.error(e.message);
    }
  }
}

test();
