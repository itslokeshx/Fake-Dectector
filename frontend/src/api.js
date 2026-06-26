import API_BASE from './config';

export async function analyzeText(text) {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed! status: ${response.status}`);
  }
  
  return await response.json();
}
