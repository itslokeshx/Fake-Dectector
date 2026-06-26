import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { gatherWebContext, formatWebContextForPrompt } from './factChecker.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration — restrict origins in production
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''))
  : ['http://localhost:5174', 'http://localhost:5173'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Strip trailing slash for consistent matching
    const cleanOrigin = origin.replace(/\/$/, '');
    // Allow if in allowedOrigins OR during local development (no NODE_ENV or 'development')
    if (allowedOrigins.includes(cleanOrigin) || !process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    console.warn(`⚠️ Blocked by CORS: Origin ${origin} not in allowedOrigins:`, allowedOrigins);
    return callback(null, false); // Reject cleanly without throwing a 500 server error
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── API Key Rotation + Model Fallback ────────────────────────────────────────
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

// Model fallback chain: best → reliable
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const MODEL = MODELS[0]; // Primary model (shown in logs/health)

/**
 * Robustly converts any input to a 0-100 integer.
 * Handles strings like "85%", "Score: 90", or null values.
 */
function toSafeNum(val, fallback = 50) {
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.max(0, Math.min(100, Math.round(val)));
  if (!val) return fallback;
  const num = parseInt(String(val).replace(/[^0-9.]/g, ''), 10);
  return isNaN(num) ? fallback : Math.max(0, Math.min(100, num));
}

function geminiUrl(model, key) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Try each API key with retry + model fallback + grounding fallback
async function callGeminiWithKeyRotation(body) {
  let lastError = null;
  let triedWithoutGrounding = false;
  const hasGrounding = Array.isArray(body.tools) && body.tools.some(t => t.google_search);

  for (const model of MODELS) {
    console.log(`🤖 Trying model: ${model}`);

    for (let i = 0; i < API_KEYS.length; i++) {
      const key = API_KEYS[i];
      console.log(`🔑 Trying API key ${i + 1}/${API_KEYS.length}...`);

      // Retry once on 503 with a short backoff
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(geminiUrl(model, key), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (res.ok) {
            console.log(`✅ Key ${i + 1} succeeded on ${model}${attempt > 0 ? ' (retry)' : ''}.`);
            return { res, ok: true, model, grounded: hasGrounding && !triedWithoutGrounding };
          }

          const status = res.status;
          const errText = await res.text();

          // Retry on 503 (overloaded) once with backoff
          if (status === 503 && attempt === 0) {
            console.log(`⏳ Key ${i + 1} got 503 on ${model} — retrying in 1.5s...`);
            await sleep(1500);
            continue;
          }

          // On 429 with grounding enabled: strip grounding and retry ALL keys/models
          if (status === 429 && hasGrounding && !triedWithoutGrounding) {
            console.log(`⚠️  Key ${i + 1} got 429 — stripping Google Search grounding and retrying...`);
            triedWithoutGrounding = true;
            // Remove grounding tools from body
            body = { ...body };
            delete body.tools;
            // Reset loops: restart from first model, first key
            i = -1; // will become 0 after for-loop increment
            break;
          }

          // Skip expired/invalid keys entirely (don't retry, don't try other models)
          if (status === 400) {
            console.log(`⚠️  Key ${i + 1} invalid/expired (${errText.substring(0, 80)}) — skipping key.`);
            lastError = { status, errText };
            break;
          }

          console.log(`⚠️  Key ${i + 1} failed (${status}: ${errText.substring(0, 100)}) — trying next key...`);
          lastError = { status, errText };
          break; // Move to next key

        } catch (err) {
          console.log(`⚠️  Key ${i + 1} threw error: ${err.message} — trying next key...`);
          lastError = { status: 500, errText: err.message };
          break;
        }
      }
    }

    // If we just stripped grounding, restart the model loop
    if (triedWithoutGrounding && model === MODELS[0]) {
      console.log(`🔄 Retrying all models WITHOUT grounding...`);
      continue;
    }

    // If we're here, all keys failed for this model — try next model
    if (MODELS.indexOf(model) < MODELS.length - 1) {
      console.log(`🔄 All keys failed on ${model} — falling back to next model...`);
    }
  }

  // All models + keys exhausted
  return {
    ok: false,
    status: lastError?.status || 429,
    errText: lastError?.errText || 'All API keys and models exhausted. Please try again in a few minutes.'
  };
}

// ─── Parse Gemini JSON response safely ───────────────────────────────────────
async function parseGeminiResponse(res) {
  const geminiData = await res.json();
  let rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    const finishReason = geminiData?.candidates?.[0]?.finishReason;
    if (finishReason) {
      console.error("❌ Gemini blocked request. Reason:", finishReason);
      return { error: `Gemini API blocked request: ${finishReason}` };
    }
    return { error: 'Empty response from Gemini API.' };
  }

  rawText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const textToParse = jsonMatch ? jsonMatch[0] : rawText;

  try {
    const parsed = JSON.parse(textToParse);
    return { parsed };
  } catch (err) {
    console.error("❌ Strict parse failed, trying lax parse. Error:", err.message);
    try {
      // Clean up common JSON errors like trailing commas
      let cleanText = textToParse.replace(/,\s*([\]}])/g, '$1');
      
      const parsed = JSON.parse(cleanText);
      return { parsed };
    } catch (err2) {
      try {
        // Last resort: eval to allow unquoted keys or single quotes
        const evalParsed = (new Function(`return ${textToParse}`))();
        return { parsed: evalParsed };
      } catch (err3) {
        console.error("❌ All parsing failed. Raw output from Gemini was:", rawText);
        return { error: 'Failed to parse Gemini response.' };
      }
    }
  }
}

// ─── Warmup endpoint ──────────────────────────────────────────────────────────
app.get('/api/warmup', (req, res) => {
  res.json({ warmed: true, keys: API_KEYS.length, model: MODEL });
});

// ─── POST /api/analyze — Fake news detection (Web Search + Gemini Pipeline) ──
app.post('/api/analyze', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No text provided.' });
  }

  if (API_KEYS.length === 0) {
    return res.status(500).json({ error: 'No API keys configured.' });
  }

  try {
    // ─── STEP 1: Gather live web context (DuckDuckGo + Wikipedia + Fact-check sites) ──
    console.log('\n🌐 STEP 1: Gathering live web context...');
    let webContext;
    let webContextText = '';
    let webSearchSuccess = false;

    try {
      webContext = await gatherWebContext(text.trim());
      webContextText = formatWebContextForPrompt(webContext);
      webSearchSuccess = (
        (webContext.ddgResults?.length > 0) ||
        (webContext.wikiResults?.length > 0) ||
        (webContext.factCheckResults?.length > 0)
      );
      console.log(`✅ Web context gathered: ${webSearchSuccess ? 'SUCCESS' : 'NO RESULTS'}`);
    } catch (webErr) {
      console.error('⚠️ Web search pipeline failed (continuing with Gemini only):', webErr.message);
      webContextText = '\n[Web search pipeline encountered an error. Rely on your training knowledge but note the limitation.]\n';
    }

    // ─── STEP 2: Build enhanced Gemini prompt with web context ──
    console.log('📡 STEP 2: Sending text + web context to Gemini...');

    const currentDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const PROMPT = `[ SYSTEM DIRECTIVE: ELITE REAL-TIME TRUTHGUARD AI FACT-CHECKING SYSTEM ]
You are TruthGuard AI, an elite, hyper-accurate real-time fact-checking system.

Your primary directive is to eliminate numeric hallucinations, contextual mashups, and timeline errors. You must treat any data you cannot directly verify in real-time as UNVERIFIED rather than guessing.

⚠️ CRITICAL CONTEXT: You have been provided with LIVE WEB SEARCH RESULTS gathered moments ago. These results are CURRENT and REAL. Use them as your PRIMARY source of truth for factual claims.

--- MANDATORY PROCESSING RULES ---

1. DECONSTRUCT CLAIMS SYSTEMATICALLY:
   - Break every input down into independent sub-claims based on:
     * Entities (Companies, people, teams)
     * Actions/Events (Acquisitions, debuts, matches)
     * Data points (Percentages, stock prices, scores, dates)
   - Every single sub-claim must be individually verified against the live web results. If one sub-claim is true but another is false, you must explicitly separate them in your reasoning.

2. REAL-TIME DATA GUARDRAILS:
   - No Pre-Match or Pre-Market Approximations: Never use data from a live event or trading session unless you have verified the exact timestamp of the source material.
   - Strict Numeric Verification: When verifying stock movements, financial figures, scores, or statistics, you must double-check the exact percentage or number across at least two independent sources. If a number does not match perfectly, flag it as a data mismatch.
   - Context Mashup Check: Always cross-reference numbers/statistics to ensure they belong to the correct entity and have not been falsely attributed to another (e.g. attributing one company's layoffs or stock drops to a competitor).

3. STRICT REPORTING FORMAT:
   You must return ONLY extremely strict, valid JSON. No markdown fences.
   In the returned JSON, the "explanation" field MUST contain a Markdown-formatted report following this exact structure:
   
   ### TruthGuard AI Report
   * **Verdict:** [REAL / FAKE / PARTIALLY TRUE / UNVERIFIED]
   * **Confidence:** [X%] (Base this strictly on data completeness, not a generic high number)
   * **Sub-Claim Breakdown:**
     - [Sub-Claim 1]: [VERIFIED TRUE / FALSE / UNVERIFIED] - [Brief 1-sentence proof with specific source name]
     - [Sub-Claim 2]: [VERIFIED TRUE / FALSE / UNVERIFIED] - [Brief 1-sentence proof with specific source name]
   * **Explanation:** [A concise, 3-sentence summary detailing exactly what is true, what is false, and the precise correction. Do not use generic market phrases unless backed by a specific timestamped quote].

The JSON structure you return MUST be:
{
  "verdict": "REAL" | "FAKE" | "PARTIALLY TRUE" | "UNVERIFIED",
  "confidence": [integer 1-100],
  "explanation": "[The full Markdown-formatted report following the structure above. Use actual newlines (\\n) for formatting]",
  "corrected_fact": "[If fake/misleading/partially true, provide the CORRECT information found in the web results in 1-2 sentences. Else, leave empty.]",
  "sources_used": ["url1", "url2"],
  "data_points": {
     "labels": ["Human Written", "Factual Accuracy", "Logical Consistency", "Emotional Objectivity", "Scam/Risk Safety"],
     "values": [number, number, number, number, number]
  }
}`;

    const fullPromptText = PROMPT +
      `\n\n--- ENVIRONMENT CONTEXT ---\n[ Current Date: ${currentDateStr} ]\n[ Web Search Status: ${webSearchSuccess ? 'LIVE RESULTS AVAILABLE' : 'LIMITED — use training data'} ]` +
      `\n\n═══════════════════════════════════════════════\n` +
      `    LIVE WEB SEARCH RESULTS (USE THESE!)\n` +
      `═══════════════════════════════════════════════\n` +
      webContextText +
      `\n\n═══════════════════════════════════════════════\n` +
      `    TARGET TEXT TO FACT-CHECK\n` +
      `═══════════════════════════════════════════════\n` +
      text.trim();

    const body = {
      contents: [{ parts: [{ text: fullPromptText }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' }
    };

    // ─── STEP 3: Call Gemini with key rotation ──
    const { res: gemRes, ok, status, errText, grounded, model } = await callGeminiWithKeyRotation(body);

    if (!ok) {
      console.error(`❌ All keys failed. Last status: ${status}`);
      return res.status(200).json({
        verdict: 'FAKE',
        confidence: 88,
        explanation: 'API Rate Limited [Mock Data]. The analyzed content contains highly sensationalized language and lacks credible sourcing, typical of deceptive articles.',
        corrected_fact: 'Mock Demonstration: Always verify claims through reliable official channels.',
        data_points: { labels: ["Human Written", "Factual Accuracy", "Logical Consistency", "Emotional Objectivity", "Scam/Risk Safety"], values: [20, 15, 40, 25, 10] },
        engine: 'mock',
        error_hint: 'quota_exceeded',
        grounded: false,
        web_search: false
      });
    }

    const { parsed, error: parseError } = await parseGeminiResponse(gemRes);
    if (parseError) return res.status(502).json({ error: parseError });

    const verdict = ['REAL', 'FAKE', 'PARTIALLY TRUE', 'UNVERIFIED'].includes(parsed.verdict) ? parsed.verdict : 'UNVERIFIED';
    const confidence = toSafeNum(parsed.confidence, 75);

    let explanation = typeof parsed.explanation === 'string' ? parsed.explanation : 'No explanation provided.';
    if (!webSearchSuccess && !grounded) {
      explanation += "\n\n⚠️ Note: Both web search and Google Search grounding were unavailable; analysis based on AI knowledge only.";
    } else if (!grounded && webSearchSuccess) {
      explanation += "\n\n✅ Verified using live web search results from DuckDuckGo, Wikipedia, and fact-check databases.";
    }

    const corrected_fact = (verdict === 'FAKE' || verdict === 'PARTIALLY TRUE') && typeof parsed.corrected_fact === 'string' ? parsed.corrected_fact : '';
    const sources_used = Array.isArray(parsed.sources_used) ? parsed.sources_used.slice(0, 5) : [];

    // Normalize data_points
    const defaultLabels = ["Human Written", "Factual Accuracy", "Logical Consistency", "Emotional Objectivity", "Scam/Risk Safety"];
    const aiLabels = Array.isArray(parsed.data_points?.labels) ? parsed.data_points.labels : defaultLabels;
    const aiValues = Array.isArray(parsed.data_points?.values) ? parsed.data_points.values.map(v => toSafeNum(v)) : [confidence, 80, 80, 80, 80];

    // Ensure length matches labels
    const finalValues = aiLabels.map((_, i) => aiValues[i] !== undefined ? aiValues[i] : 70);
    const data_points = { labels: aiLabels, values: finalValues };

    // Build web search summary for the response
    const webSearchSummary = webSearchSuccess ? {
      ddg_results: webContext?.ddgResults?.length || 0,
      wiki_results: webContext?.wikiResults?.length || 0,
      factcheck_results: (webContext?.factCheckResults?.length || 0) + (webContext?.googleFactChecks?.length || 0),
      sources: [
        ...(webContext?.wikiResults?.slice(0, 2).map(r => ({ title: r.title, url: r.url, source: 'Wikipedia' })) || []),
        ...(webContext?.ddgResults?.slice(0, 3).map(r => ({ title: r.title, url: r.url, source: 'Web Search' })) || []),
        ...(webContext?.factCheckResults?.slice(0, 2).map(r => ({ title: r.title, url: r.url, source: r.source, rating: r.rating })) || []),
        ...(webContext?.googleFactChecks?.slice(0, 2).map(r => ({ title: r.title, url: r.url, source: r.source, rating: r.rating })) || [])
      ]
    } : null;

    console.log(`✅ Result: ${verdict} (${confidence}%) [WebSearch: ${webSearchSuccess}, Grounded: ${!!grounded}, Model: ${model}]`);
    return res.json({
      verdict, confidence, explanation, corrected_fact, sources_used, data_points,
      engine: 'gemini', grounded: !!grounded, model,
      web_search: webSearchSuccess,
      web_search_summary: webSearchSummary
    });

  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ─── POST /api/analyze-image — Legacy image endpoint ─────────────────────────
app.post('/api/analyze-image', async (req, res) => {
  const { base64, mimeType } = req.body;
  if (!base64) return res.status(400).json({ error: 'No image provided.' });
  if (API_KEYS.length === 0) return res.status(500).json({ error: 'No API keys configured.' });

  const PROMPT = `You are a strict AI image analysis expert. Analyze the image.
1. Determine if it is AI-generated or captured by a human.
2. Check for adult/NSFW content.
3. Check for fake/deepfake content.

Return ONLY valid JSON format:
{
  "verdict": "REAL",
  "generated_by": "Human",
  "confidence": 95,
  "adult_content": false,
  "fake_content": false,
  "explanation": "Clear reason.",
  "data_points": {
     "labels": ["AI Indicators", "Human Generation", "Adult Content Risk", "Fake Content Risk"],
     "values": [5, 95, 0, 0]
  }
}`;

  const body = {
    contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64 } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' }
  };

  try {
    const { res: gemRes, ok, status } = await callGeminiWithKeyRotation(body);

    if (!ok) {
      return res.status(200).json({
        verdict: 'FAKE', confidence: 95,
        explanation: 'API Rate Limited [Mock Data]. This image exhibits strong indicators of AI generation, including unnatural textures and lighting anomalies.',
        customTitle: 'Generated by AI',
        adult_content: false, fake_content: true,
        data_points: { labels: ["AI Indicators", "Human Generation", "Adult Content Risk", "Fake Content Risk"], values: [95, 5, 0, 90] },
        engine: 'mock', error_hint: 'quota_exceeded'
      });
    }

    const { parsed, error: parseError } = await parseGeminiResponse(gemRes);
    if (parseError) return res.status(502).json({ error: parseError });

    const verdict = (parsed.verdict === 'FAKE' || parsed.generated_by === 'AI' || parsed.fake_content) ? 'FAKE' : 'REAL';
    const confidence = toSafeNum(parsed.confidence, 85);
    const generated_by = (parsed.generated_by === 'AI' || verdict === 'FAKE') ? 'AI' : 'Human';
    const customTitle = generated_by === 'AI' ? 'Generated by AI' : 'Generated by Human!';
    const rawExplanation = typeof parsed.explanation === 'string' ? parsed.explanation : 'No explanation.';
    const combined = rawExplanation + '\n\n' + (parsed.adult_content ? '⚠️ Adult Content Detected!' : '✅ No Adult Content') + '\n' + (parsed.fake_content ? '⚠️ Fake Content Detected!' : '✅ Authentic Content');
    
    // Normalize image points
    const defaultLabels = ["AI Indicators", "Human Generation", "Adult Content Risk", "Fake Content Risk"];
    const aiLabels = Array.isArray(parsed.data_points?.labels) ? parsed.data_points.labels : defaultLabels;
    const aiValues = Array.isArray(parsed.data_points?.values) ? parsed.data_points.values.map(v => toSafeNum(v)) : [10, 90, 0, 0];
    const data_points = { labels: aiLabels, values: aiLabels.map((_, i) => aiValues[i] !== undefined ? aiValues[i] : 50) };

    return res.json({ verdict, confidence, explanation: combined, customTitle, adult_content: !!parsed.adult_content, fake_content: !!parsed.fake_content, data_points, engine: 'gemini' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ─── POST /api/analyze/image — Full forensics image analysis ─────────────────
app.post('/api/analyze/image', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No imageBase64 provided.' });
  if (API_KEYS.length === 0) return res.status(500).json({ error: 'No API keys configured.' });

  const PROMPT = `Analyze this image. Return ONLY this JSON:
{
  "ai_verdict": "AI_GENERATED or HUMAN_CREATED",
  "ai_confidence": "0-100",
  "ai_indicators": ["indicator1", "indicator2"],
  "ai_explanation": "2 sentence explanation",
  "content_safety": {
    "adult_content": false,
    "violence": false,
    "fake_person": false,
    "hate_content": false,
    "misleading": false,
    "overall_safe": true
  },
  "content_flags": [],
  "image_scores": {
    "labels": ["Face Naturalness", "Background", "Lighting", "Texture"],
    "values": [80, 80, 80, 80]
  },
  "summary": "one sentence"
}
Rules: AI_GENERATED if Midjourney/DALL-E style. HUMAN_CREATED if real photograph. Return ONLY JSON. Nothing else.`;

  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
        { text: PROMPT }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' }
  };

  try {
    console.log('📡 Calling Gemini Vision API...');
    const { res: gemRes, ok, status, errText } = await callGeminiWithKeyRotation(body);

    if (!ok) {
      console.error(`❌ All keys failed for image analysis.`);
      return res.status(200).json({
        ai_verdict: 'AI_GENERATED', ai_confidence: 94,
        ai_indicators: ['Unnatural lighting', 'Asymmetric features', 'Overly smooth textures'],
        ai_explanation: 'API Rate Limited [Mock Data]. Analysis strongly suggests this image is fully synthesized by generative AI models.',
        content_safety: { adult_content: false, violence: false, fake_person: true, hate_content: false, misleading: true, overall_safe: false },
        content_flags: ['AI_GENERATED', 'DEEPFAKE'],
        image_scores: { labels: ['Face Naturalness', 'Background Consistency', 'Lighting Coherence', 'Texture Realism'], values: [30, 40, 25, 35] },
        summary: 'Mock Analysis — Image appears highly artificial.',
        engine: 'mock', error_hint: 'quota_exceeded'
      });
    }

    const { parsed, error: parseError } = await parseGeminiResponse(gemRes);
    if (parseError) return res.status(502).json({ error: parseError });

    const ai_verdict = parsed.ai_verdict === 'AI_GENERATED' ? 'AI_GENERATED' : 'HUMAN_CREATED';
    const ai_confidence = toSafeNum(parsed.ai_confidence, 80);
    const ai_indicators = Array.isArray(parsed.ai_indicators) ? parsed.ai_indicators : [];
    const ai_explanation = typeof parsed.ai_explanation === 'string' ? parsed.ai_explanation : 'Analysis complete.';
    const cs = parsed.content_safety || {};
    const content_safety = {
      adult_content: !!cs.adult_content, violence: !!cs.violence,
      fake_person: !!cs.fake_person, hate_content: !!cs.hate_content,
      misleading: !!cs.misleading, overall_safe: cs.overall_safe !== undefined ? !!cs.overall_safe : true
    };
    const content_flags = Array.isArray(parsed.content_flags) ? parsed.content_flags : [];
    
    // Normalize image scores
    const defaultLabels = ['Face Naturalness', 'Background Consistency', 'Lighting Coherence', 'Texture Realism'];
    const aiLabels = Array.isArray(parsed.image_scores?.labels) ? parsed.image_scores.labels : defaultLabels;
    const aiValues = Array.isArray(parsed.image_scores?.values) ? parsed.image_scores.values.map(v => toSafeNum(v)) : [80, 80, 80, 80];
    const image_scores = { labels: aiLabels, values: aiLabels.map((_, i) => aiValues[i] !== undefined ? aiValues[i] : 80) };

    const summary = typeof parsed.summary === 'string' ? parsed.summary : `${ai_verdict.replace('_', ' ')}.`;

    console.log(`✅ Forensics Result: ${ai_verdict} (${ai_confidence}% confidence)`);
    return res.json({ ai_verdict, ai_confidence, ai_indicators, ai_explanation, content_safety, content_flags, image_scores, summary, engine: 'gemini' });

  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ─── POST /api/analyze/research — Fake research detection ────────────────────
app.post('/api/analyze/research', async (req, res) => {
  const { text, url } = req.body;
  const content = (text || '') + (url ? `\n\nURL Reference: ${url}` : '');
  if (!content.trim()) return res.status(400).json({ error: 'No research content provided.' });
  if (API_KEYS.length === 0) return res.status(500).json({ error: 'No API keys configured.' });

  const PROMPT = `You are an expert scientific fact-checker and research paper authenticity analyzer.

Analyze the given research claim or abstract for:
1. Scientific accuracy and credibility
2. Statistical validity of claims
3. Methodology soundness
4. Citation and peer review indicators
5. Red flags: extraordinary claims, conflict of interest, predatory journal signs, correlation vs causation errors, cherry-picked data, small sample sizes

Return ONLY valid JSON (no markdown):
{
  "verdict": "CREDIBLE" or "QUESTIONABLE" or "DEBUNKED",
  "confidence": integer 0-100,
  "explanation": "Extremely concise 2-3 sentence analysis. Do NOT list the factors. Keep it UI-friendly.",
  "credibility_score": integer 0-100,
  "methodology_score": integer 0-100,
  "evidence_score": integer 0-100,
  "peer_review_likelihood": integer 0-100,
  "consensus_score": integer 0-100,
  "red_flags": ["flag1", "flag2"],
  "supporting_facts": ["fact1", "fact2"],
  "corrected_fact": "real scientific consensus if DEBUNKED, empty string otherwise",
  "data_points": {
    "labels": ["Credibility","Methodology","Evidence","Peer Review","Consensus"],
    "values": [90, 85, 75, 40, 60] // STRICTLY REPLACE these 5 numbers with your actual calculated 0-100 integer scores. Do NOT output strings.
  }
}

Research content to analyze:\n`;

  const currentDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const body = {
    contents: [{ parts: [{ text: PROMPT + `\n\n--- ENVIRONMENT CONTEXT ---\n[ Current Date: ${currentDateStr} ]\n\n--- TARGET CONTENT FOR ANALYSIS ---\n` + content.trim() }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' }
  };

  try {
    console.log('📡 Calling AI for research analysis...');
    const { res: gemRes, ok, status, errText, grounded, model } = await callGeminiWithKeyRotation(body);

    if (!ok) {
      return res.status(200).json({
        verdict: 'DEBUNKED', confidence: 91,
        explanation: 'API Rate Limited [Mock Data]. The provided research claim lacks methodological soundness and contradicts established scientific consensus.',
        credibility_score: 15, methodology_score: 20, evidence_score: 10, peer_review_likelihood: 5, consensus_score: 5,
        red_flags: ['Small sample size', 'No control group', 'Cherry-picked data'],
        supporting_facts: [],
        corrected_fact: 'Mock Demonstration: Always consult peer-reviewed journals for verified scientific consensus.',
        data_points: { labels: ['Credibility','Methodology','Evidence','Peer Review','Consensus'], values: [15, 20, 10, 5, 5] },
        engine: 'mock', error_hint: 'quota_exceeded',
        grounded: false
      });
    }

    const { parsed, error: parseError } = await parseGeminiResponse(gemRes);
    if (parseError) return res.status(502).json({ error: parseError });

    const verdict = ['CREDIBLE','QUESTIONABLE','DEBUNKED'].includes(parsed.verdict) ? parsed.verdict : 'QUESTIONABLE';
    const confidence = toSafeNum(parsed.confidence, 70);
    
    let explanation = parsed.explanation || 'Analysis complete.';
    if (!grounded) {
      explanation += "\n\n⚠️ Note: Google Search is currently rate-limited; relying on offline AI knowledge.";
    }

    const credibility_score = Math.max(5, toSafeNum(parsed.credibility_score, 70));
    const methodology_score = Math.max(5, toSafeNum(parsed.methodology_score, 70));
    const evidence_score = Math.max(5, toSafeNum(parsed.evidence_score, 70));
    const peer_review_likelihood = Math.max(5, toSafeNum(parsed.peer_review_likelihood, 50));
    const consensus_score = Math.max(5, toSafeNum(parsed.consensus_score, 60));
    const red_flags = Array.isArray(parsed.red_flags) ? parsed.red_flags : [];
    const supporting_facts = Array.isArray(parsed.supporting_facts) ? parsed.supporting_facts : [];
    const corrected_fact = typeof parsed.corrected_fact === 'string' ? parsed.corrected_fact : '';
    
    // Normalize research data points
    const labels = ['Credibility', 'Methodology', 'Evidence', 'Peer Review', 'Consensus'];
    const fallbackValues = [credibility_score, methodology_score, evidence_score, peer_review_likelihood, consensus_score];
    const aiValues = Array.isArray(parsed.data_points?.values) ? parsed.data_points.values.map(v => Math.max(5, toSafeNum(v))) : fallbackValues;
    const data_points = { labels, values: labels.map((_, i) => aiValues[i] !== undefined ? aiValues[i] : fallbackValues[i]) };

    console.log(`✅ Research Result: ${verdict} (${confidence}%) [Grounded: ${!!grounded}, Model: ${model}]`);
    return res.json({ verdict, confidence, explanation, credibility_score, methodology_score, evidence_score, peer_review_likelihood, consensus_score, red_flags, supporting_facts, corrected_fact, data_points, engine: 'gemini', grounded: !!grounded, model });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ─── POST /api/analyze/weather — Weather prediction checker ──────────────────
app.post('/api/analyze/weather', async (req, res) => {
  const { city, prediction, predictedTempMin, predictedTempMax, predictedHumidity, predictedWind } = req.body;
  if (!city || !prediction) return res.status(400).json({ error: 'City and prediction are required.' });

  const WEATHER_API_KEY = 'f01aef374fdade0e1e8d9d284ee7b2c7';

  try {
    console.log(`🌤️ Fetching weather for: ${city}`);
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`
    );

    if (!weatherRes.ok) {
      const errData = await weatherRes.json();
      return res.status(400).json({ error: errData.message || 'City not found. Please check the city name.' });
    }

    const w = await weatherRes.json();

    const actualTemp = Math.round(w.main.temp * 10) / 10;
    const actualHumidity = w.main.humidity;
    const actualWindSpeed = Math.round(w.wind.speed * 3.6 * 10) / 10; // m/s → km/h
    const actualWeatherMain = w.weather[0].main; // Clear, Rain, Snow, ...
    const actualDescription = w.weather[0].description;
    const actualFeelsLike = Math.round(w.main.feels_like * 10) / 10;
    const actualPressure = w.main.pressure;
    const actualVisibility = Math.round((w.visibility || 10000) / 1000 * 10) / 10;
    const icon = w.weather[0].icon;
    const cityName = w.name;
    const country = w.sys.country;
    const sunrise = w.sys.sunrise;
    const sunset = w.sys.sunset;

    // Map user prediction to weather conditions
    const predictionMap = {
      'Sunny': ['Clear'],
      'Rainy': ['Rain', 'Drizzle'],
      'Snowing': ['Snow'],
      'Thunderstorm': ['Thunderstorm'],
      'Foggy': ['Fog', 'Mist', 'Haze', 'Smoke', 'Dust'],
      'Windy': ['__wind__'],
      'Partly Cloudy': ['Clouds'],
      'Clear Night': ['Clear']
    };

    const matchConditions = predictionMap[prediction] || [];
    let weatherCorrect = false;
    if (prediction === 'Windy') {
      weatherCorrect = actualWindSpeed > 30;
    } else {
      weatherCorrect = matchConditions.some(c => actualWeatherMain.toLowerCase().includes(c.toLowerCase()));
    }

    let weatherAccuracy = weatherCorrect ? 100 : 20;

    const predictedTempAvg = ((Number(predictedTempMin) || 20) + (Number(predictedTempMax) || 30)) / 2;
    const tempDiff = Math.abs(predictedTempAvg - actualTemp);
    const tempAccuracy = tempDiff < 3 ? 100 : tempDiff < 6 ? 85 : tempDiff < 10 ? 70 : Math.max(10, 50 - tempDiff * 2);

    const humidityDiff = Math.abs((Number(predictedHumidity) || 50) - actualHumidity);
    const humidityAccuracy = humidityDiff < 10 ? 100 : humidityDiff < 20 ? 80 : Math.max(10, 60 - humidityDiff);

    const windDiff = Math.abs((Number(predictedWind) || 10) - actualWindSpeed);
    const windAccuracy = windDiff < 10 ? 100 : windDiff < 25 ? 75 : Math.max(10, 50 - windDiff / 2);

    let overallAccuracy = Math.round(
      weatherAccuracy * 0.4 +
      tempAccuracy * 0.3 +
      humidityAccuracy * 0.15 +
      windAccuracy * 0.15
    );

    let verdict = (overallAccuracy >= 75 && weatherCorrect) ? 'CORRECT' 
      : (overallAccuracy >= 50 && weatherCorrect) ? 'PARTIALLY_CORRECT' 
      : 'INCORRECT';

    // ── FUSE WITH GEMINI AI LOGIC ──
    try {
      console.log('📡 Fusing OpenWeather data with Gemini for semantic verification...');
      const gemPrompt = `
      You are an expert meteorological AI judge.
      User predicted: "${prediction}"
      Actual Weather: "${actualWeatherMain}" (Description: "${actualDescription}")
      Current Unix Time: ${w.dt}
      Sunrise Unix Time: ${sunrise}
      Sunset Unix Time: ${sunset}
      
      Look closely: is it currently DAY or NIGHT? (Check if Current Time is between Sunrise and Sunset). 
      If it is NIGHT, but the user predicted "Sunny" OR "Clear", it is a completely WRONG prediction! (In our app, these signify daytime).
      If it is DAY, but they predicted something inherently nocturnal, that is also WRONG.
      
      Compare their prediction with the actual data.
      Return JSON only:
      {
        "is_correct_weather": boolean,
        "verdict": "CORRECT" or "PARTIALLY_CORRECT" or "INCORRECT",
        "reasoning": "Short 1 sentence explanation of daylight/weather mismatch if any"
      }
      `;
      
      const { res: gemRes, ok } = await callGeminiWithKeyRotation({
        contents: [{ parts: [{ text: gemPrompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      });

      if (ok) {
        const { parsed } = await parseGeminiResponse(gemRes);
        if (parsed && typeof parsed.is_correct_weather === 'boolean') {
           weatherCorrect = parsed.is_correct_weather;
           if (['CORRECT','PARTIALLY_CORRECT','INCORRECT'].includes(parsed.verdict)) {
              verdict = parsed.verdict;
           }
           
           // Recalculate accuracy based on Gemini's final weather determination
           weatherAccuracy = weatherCorrect ? 100 : 0;
           overallAccuracy = Math.round(weatherAccuracy * 0.4 + tempAccuracy * 0.3 + humidityAccuracy * 0.15 + windAccuracy * 0.15);
           console.log(`🧠 Gemini successfully intercepted verdict: ${verdict} (Reasoning: ${parsed.reasoning})`);
        }
      }
    } catch (err) {
      console.log('⚠️ Gemini weather fusion skipped due to error:', err.message);
    }
    // ───────────────────────────────

    console.log(`✅ Final Weather Result: ${verdict} (${overallAccuracy}% accuracy) for ${cityName}`);

    return res.json({
      verdict,
      overallAccuracy,
      weatherMatch: weatherCorrect,
      actual: {
        temp: actualTemp, feelsLike: actualFeelsLike, humidity: actualHumidity,
        windSpeed: actualWindSpeed, pressure: actualPressure, visibility: actualVisibility,
        description: actualDescription, weatherMain: actualWeatherMain,
        icon, sunrise, sunset, cityName, country
      },
      predicted: {
        weatherType: prediction,
        tempMin: Number(predictedTempMin) || 20,
        tempMax: Number(predictedTempMax) || 30,
        humidity: Number(predictedHumidity) || 50,
        wind: Number(predictedWind) || 10
      },
      comparison: {
        tempDiff: Math.round((actualTemp - predictedTempAvg) * 10) / 10,
        humidityDiff: actualHumidity - (Number(predictedHumidity) || 50),
        windDiff: Math.round((actualWindSpeed - (Number(predictedWind) || 10)) * 10) / 10,
        weatherCorrect
      },
      accuracy: {
        weather: weatherAccuracy,
        temperature: Math.round(tempAccuracy),
        humidity: Math.round(humidityAccuracy),
        wind: Math.round(windAccuracy)
      },
      data_points: {
        labels: ['Weather','Temperature','Humidity','Wind Speed'],
        values: [weatherAccuracy, Math.round(tempAccuracy), Math.round(humidityAccuracy), Math.round(windAccuracy)]
      }
    });

  } catch (err) {
    console.error(`❌ Weather error: ${err.message}`);
    return res.status(500).json({ error: 'Failed to fetch weather data: ' + err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: MODEL, keys: API_KEYS.length, keyLoaded: API_KEYS.length > 0 });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TruthGuard running on http://localhost:${PORT}`);
  console.log(`🔑 Keys loaded: ${API_KEYS.length}/3`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log('✅ Server ready!');
});
