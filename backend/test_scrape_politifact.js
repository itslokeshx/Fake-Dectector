import axios from 'axios';
import { load } from 'cheerio';

async function test() {
  const query = "donald trump";
  const url = `https://www.politifact.com/search/?q=${encodeURIComponent(query)}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  try {
    const { data } = await axios.get(url, { headers });
    const $ = load(data);
    
    console.log("=== All links inside search results ===");
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.includes('/factchecks/') || href.includes('/article/'))) {
        console.log(`Link: ${href} - Text: ${text}`);
      }
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
