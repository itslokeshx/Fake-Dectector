// ─── jobChecker.js ────────────────────────────────────────────────────────────
// Now powered by Google Gemini API via Express backend (/api/analyze)

import API_BASE from '../config';

export async function analyzeJob(text) {
  if (!text || !text.trim()) {
    throw new Error('No text provided for analysis.');
  }

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: "Job Posting Analysis: " + text.trim() }),
  });

  if (!response.ok) {
    let errMsg = `Server error ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.error || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  let data_points = data.data_points;
  if (!data_points || !data_points.labels || data_points.labels.length === 0) {
    const isFake = data.verdict === 'FAKE';
    data_points = {
      labels: ['Authenticity', 'Company Verification', 'Salary Reality', 'Urgency Level', 'Risk Safety'],
      values: [
        isFake ? 20 : 90,
        isFake ? 30 : 85,
        isFake ? 10 : 80,
        isFake ? 15 : 95,
        isFake ? 25 : 90
      ]
    };
  }

  return {
    verdict: data.verdict,
    confidence: data.confidence,
    explanation: data.explanation,
    summary: data.verdict === 'FAKE' ? 'Fraud signals found — this job posting shows signs of being a scam or AI generated.' : 'No major fraud signals detected.',
    reasons: [data.explanation],
    data_points: data_points,
    engine: 'gemini',
  };
}
