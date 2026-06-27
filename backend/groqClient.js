// ─── groqClient.js ──────────────────────────────────────────────────────────
// Ultra-fast Groq/Llama inference for the Fake News speed-critical path.
// Groq's LPU hardware delivers ~500 tok/s — 3-5x faster than cloud LLMs.
// Supports 3-key rotation with automatic fallback on rate limits.

import Groq from 'groq-sdk';

// ─── Lazy Key Reader ───────────────────────────────────────────────────────
// IMPORTANT: Must be a function, NOT a module-level constant.
// ES module imports run before dotenv.config() in index.js, so reading
// process.env at the top level yields undefined for all keys.
function getGroqKeys() {
  return [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);
}

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call Groq with automatic key rotation and retry.
 * Mirrors the Gemini key-rotation strategy: tries each key in order,
 * retries once on 503, skips on 400, rotates to next on 429/5xx.
 * @param {object} payload - The chat.completions.create payload (without apiKey)
 * @returns {object} The parsed JSON verdict from Llama
 */
async function callGroqWithKeyRotation(payload) {
  const GROQ_KEYS = getGroqKeys();
  if (GROQ_KEYS.length === 0) {
    throw new Error('No Groq API keys configured.');
  }

  let lastError = null;

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const key = GROQ_KEYS[i];
    console.log(`🔑 Groq: Trying key ${i + 1}/${GROQ_KEYS.length}...`);

    // Retry once on transient errors (503 / network blip)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const groq = new Groq({ apiKey: key });
        const completion = await groq.chat.completions.create(payload);

        console.log(`✅ Groq key ${i + 1} succeeded${attempt > 0 ? ' (retry)' : ''}.`);
        const raw = completion.choices[0]?.message?.content;
        if (!raw) throw new Error('Empty response from Groq API');

        // Parse JSON
        try {
          return JSON.parse(raw);
        } catch {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error(`Failed to parse Groq response: ${raw.substring(0, 200)}`);
        }

      } catch (err) {
        const status = err?.status || err?.statusCode;

        // 503 overloaded — retry once with backoff
        if (status === 503 && attempt === 0) {
          console.log(`⏳ Groq key ${i + 1} got 503 — retrying in 1s...`);
          await sleep(1000);
          continue;
        }

        // 429 rate-limited — rotate to next key immediately
        if (status === 429) {
          console.log(`⚠️  Groq key ${i + 1} rate-limited (429) — rotating to next key...`);
          lastError = err;
          break; // skip remaining attempts, try next key
        }

        // 400 bad key — skip key, don't retry
        if (status === 400 || status === 401) {
          console.log(`⚠️  Groq key ${i + 1} invalid/expired (${status}) — skipping key.`);
          lastError = err;
          break;
        }

        // Other errors — rotate to next key
        console.log(`⚠️  Groq key ${i + 1} failed (${status || err.message}) — trying next key...`);
        lastError = err;
        break;
      }
    }
  }

  // All keys exhausted
  throw lastError || new Error('All Groq API keys exhausted.');
}

/**
 * Public API: Call Groq for an instant fact-check verdict.
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

  return callGroqWithKeyRotation({
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
}

/**
 * Check if at least one Groq key is configured.
 */
export function isGroqAvailable() {
  return getGroqKeys().length > 0;
}

/**
 * Expose key count for health/warmup endpoints.
 */
export function groqKeyCount() {
  return getGroqKeys().length;
}
