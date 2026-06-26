import axios from 'axios';

async function testWiki() {
  const term = "claude fable accessable";
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srlimit=5&format=json`;
  
  const headers = {
    'User-Agent': 'TruthGuardFactChecker/2.0 (lokeshvijayraina@gmail.com; Academic Project)'
  };

  try {
    const res = await axios.get(url, { headers });
    console.log("=== Wiki Search Results ===");
    console.log(res.data.query.search.map(s => s.title));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testWiki();
