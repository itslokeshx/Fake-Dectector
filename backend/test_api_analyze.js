async function testAPI() {
  const payload = {
    text: "rcb won the ipl 2026 final",
    module: "news"
  };

  try {
    const res = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("API test failed:", err.message);
  }
}

testAPI();
