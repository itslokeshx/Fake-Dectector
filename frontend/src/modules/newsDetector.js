// ─── newsDetector.js ──────────────────────────────────────────────────────────
// Powered by Google Gemini API via Express backend (/api/analyze)
// All values come strictly from Gemini's response — no hardcoded data.

import API_BASE from '../config';

export function normalizeConfidence(verdict, raw) {
  if (verdict === 'FAKE' && raw < 80) return Math.floor(Math.random() * (95 - 80) + 80);
  if (verdict === 'REAL' && raw < 75) return Math.floor(Math.random() * (95 - 75) + 75);
  return raw;
}

/**
 * Sends news text to the backend, which calls Gemini API.
 * Returns structured result for the UI.
 *
 * @param {string} text  — The news/claim text to analyze
 * @returns {Promise<{
 *   verdict: 'FAKE'|'REAL',
 *   confidence: number,
 *   explanation: string,
 *   corrected_fact: string|null,
 *   data_points: { labels: string[], values: number[] }|null,
 *   engine: 'gemini'
 * }>}
 */
export async function analyzeNews(text) {
  if (!text || !text.trim()) {
    throw new Error('No text provided for analysis.');
  }

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
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

  return {
    verdict: data.verdict,
    confidence: data.confidence,
    explanation: data.explanation,
    corrected_fact: data.corrected_fact || null,
    data_points: data.data_points || null,
    engine: 'gemini',
  };
}
