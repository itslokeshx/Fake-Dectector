// ─── groqClient.js ──────────────────────────────────────────────────────────
// Ultra-fast Groq/Llama inference for the Fake News speed-critical path.
// Groq's LPU hardware delivers ~500 tok/s — 3-5x faster than cloud LLMs.
// Falls back gracefully if Groq is unavailable.

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Lean system prompt — no bloat, pure fact-checking directives
const TRUTHGUARD_SYSTEM_PROMPT = `You are TruthGuard AI, an elite real-time fact-checking system. Your job is to analyze claims and determine their truthfulness.

RULES:
1. Break claims into sub-claims (entities, events, data points). Verify each independently.
2. Strict Numeric Verification: Double-check percentages, scores, financial figures. If you cannot verify a number, mark it UNVERIFIED.
3. Context Mashup Check: Ensure statistics belong to the correct entity and are not falsely attributed.
4. Base confidence strictly on data completeness, not generic high numbers.
5. If you are unsure or cannot verify, use UNVERIFIED — never guess.

You MUST return valid JSON with this exact structure:
{
  "verdict": "REAL" | "FAKE" | "PARTIALLY TRUE" | "UNVERIFIED",
  "confidence": <integer 1-100>,
  "explanation": "### TruthGuard AI Report\\n* **Verdict:** [verdict]\\n* **Confidence:** [X%]\\n* **Sub-Claim Breakdown:**\\n  - [Sub-Claim 1]: [VERIFIED TRUE / FALSE / UNVERIFIED] - [1-sentence proof]\\n  - [Sub-Claim 2]: [VERIFIED TRUE / FALSE / UNVERIFIED] - [1-sentence proof]\\n* **Explanation:** [Concise 3-sentence summary]",
  "corrected_fact": "<If fake/misleading, provide correct information. Else empty string.>",
  "sources_used": [],
  "data_points": {
    "labels": ["Human Written", "Factual Accuracy", "Logical Consistency", "Emotional Objectivity", "Scam/Risk Safety"],
    "values": [<0-100>, <0-100>, <0-100>, <0-100>, <0-100>]
  }
}`;

/**
 * Call Groq for an instant fact-check verdict using Llama.
 * @param {string} claim - The user's claim to fact-check
 * @param {string} webContext - Optional web context text to augment the prompt
 * @param {string} dateStr - Current date string for temporal awareness
 * @returns {object} Parsed JSON verdict from Llama
 */
export async function callGroqFastVerdict(claim, webContext = '', dateStr = '') {
  const userMessage = [
    `[ Current Date: ${dateStr || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ]`,
    '',
    webContext ? `═══ LIVE WEB CONTEXT (USE THIS!) ═══\n${webContext}\n═══════════════════════════════════\n` : '',
    `═══ CLAIM TO FACT-CHECK ═══`,
    claim,
    `═══════════════════════════`,
  ].filter(Boolean).join('\n');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: TRUTHGUARD_SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 1536,
    stream: false
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Empty response from Groq API');
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse Groq response: ${raw.substring(0, 200)}`);
  }
}

/**
 * Check if Groq is configured and available
 */
export function isGroqAvailable() {
  return !!process.env.GROQ_API_KEY;
}
