import axios from 'axios';

async function testDDGLiteGet() {
  const query = 'rcb won ipl 2026';
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  try {
    console.log("Fetching GET: " + url);
    const response = await axios.get(url, { headers, timeout: 5000 });
    console.log("Status code: " + response.status);
    console.log("Length of response:", response.data.length);
    console.log("Contains lite?", response.data.includes('lite'));
    console.log("Contains results?", response.data.includes('result-link') || response.data.includes('result__link'));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testDDGLiteGet();
