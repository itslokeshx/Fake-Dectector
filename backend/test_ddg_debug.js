import axios from 'axios';

async function test() {
  const query = "claude fable is accessable to everyone";
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  };

  try {
    const response = await axios.get(url, { headers, timeout: 5000 });
    console.log("Status:", response.status);
    console.log("Data length:", response.data.length);
    console.log("Includes result__body?", response.data.includes('result__body'));
  } catch (err) {
    console.log("Error details:", err.message);
    if (err.response) {
      console.log("Response status:", err.response.status);
    }
  }
}

test();
