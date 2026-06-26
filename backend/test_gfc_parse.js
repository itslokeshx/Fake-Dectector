async function testGFC() {
  const query = 'rcb won the ipl 2026';
  const url = `https://toolbox.google.com/factcheck/api/search?query=${encodeURIComponent(query)}&hl=en`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    const text = await res.text();
    const jsonStr = text.replace(/^\)\]\}'\n/, '');
    const data = JSON.parse(jsonStr);
    
    const claimGroup = data[0][1][0];
    console.log("Claim group structure:", claimGroup);
    console.log("First element of claim group (the claim info):", claimGroup[0]);
    console.log("Fact check details inside claim info:", claimGroup[0][3]);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testGFC();
