async function testGFC() {
  const query = 'rcb won the ipl 2026 final';
  const url = `https://toolbox.google.com/factcheck/api/search?query=${encodeURIComponent(query)}&hl=en`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Raw response (first 500 chars):", text.substring(0, 500));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGFC();
