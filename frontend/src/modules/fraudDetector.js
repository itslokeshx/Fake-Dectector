// ─── fraudDetector.js ─────────────────────────────────────────────────────────
// Primary: Claude API  |  Fallback: Behavioral scoring engine

import { normalizeConfidence } from './newsDetector.js';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export function captureBrowserSignals() {
  return {
    userAgent: navigator.userAgent.substring(0, 100),
    screen: `${screen.width}×${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages?.join(', ') || navigator.language,
    touchSupport: navigator.maxTouchPoints > 0,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    platform: navigator.platform || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  };
}

async function callClaude(form, browser, apiKey) {
  const msg = `Behavioral fraud analysis.
LOGIN SIGNALS: attempts=${form.logins}, time_between_actions=${form.actionTime}ms, device_changes=${form.deviceChanges}
BEHAVIORAL FLAGS: geo_change=${form.geoChanges}, unusual_hours=${form.unusualHours}, copy_paste=${form.copyPaste}, multiple_accounts=${form.multiAccount}, rapid_clicks=${form.rapidClicks}
BROWSER FINGERPRINT: screen=${browser.screen}, tz=${browser.timezone}, lang=${browser.language}, touch=${browser.touchSupport}, cores=${browser.hardwareConcurrency}, pixelRatio=${browser.pixelRatio}
Analyze for bot/fraud. Explain in simple non-technical language. Return ONLY JSON: {"verdict":"FAKE"|"REAL","confidence":0-100,"reasons":["plain English reason","reason","reason"],"riskFlags":["flag"],"summary":"one sentence"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: CLAUDE_MODEL, max_tokens: 700,
      system: 'You are a cybersecurity fraud analyst. Explain all findings in simple, everyday language — assume the reader has no technical background.',
      messages: [{ role: 'user', content: msg }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.content[0].text.trim();
  const m = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(m ? m[0] : raw);
  parsed.confidence = normalizeConfidence(parsed.verdict, parsed.confidence);
  const fakeScore = parsed.verdict === 'FAKE' ? parsed.confidence : 100 - parsed.confidence;
  return { ...parsed, fakeScore, realScore: 100 - fakeScore, engine: 'claude' };
}

function scoringEngine(form, browser) {
  let rawScore = 0;
  const flags = [], reasons = [];

  if (form.logins > 10) {
    rawScore += 55; flags.push('Excessive login attempts');
    reasons.push(`${form.logins} login attempts in one hour — this is a common pattern used by bots trying to break into accounts`);
  } else if (form.logins > 5) {
    rawScore += 30; flags.push('Too many login attempts');
    reasons.push(`${form.logins} login attempts — a normal user tries once or twice, not ${form.logins} times`);
  }

  if (form.actionTime < 80) {
    rawScore += 50; flags.push('Bot-speed actions');
    reasons.push(`Actions happening every ${form.actionTime}ms — no human can react that fast, this is almost certainly a bot`);
  } else if (form.actionTime < 300) {
    rawScore += 22; flags.push('Unusually fast interactions');
    reasons.push(`${form.actionTime}ms between actions — even very fast typists need at least 300-500ms`);
  }

  if (form.deviceChanges > 5) {
    rawScore += 32; flags.push(`${form.deviceChanges} device switches`);
    reasons.push(`${form.deviceChanges} different devices detected — this can mean someone is using a VPN or multiple fake identities`);
  } else if (form.deviceChanges > 2) {
    rawScore += 16; flags.push('Multiple device changes');
    reasons.push(`${form.deviceChanges} device changes in one session — normal users don't switch devices repeatedly`);
  }

  if (form.geoChanges) {
    rawScore += 20; flags.push('Location jump detected');
    reasons.push('The user\'s location changed suddenly during the session — this could mean a VPN is being used to hide their real location');
  }
  if (form.unusualHours) {
    rawScore += 16; flags.push('Active at 2am–5am');
    reasons.push('Activity at 2am–5am is a common pattern for automated bot programs, which run around the clock');
  }
  if (form.copyPaste) {
    rawScore += 14; flags.push('Credentials copy-pasted');
    reasons.push('Passwords were pasted rather than typed — this is how credential-stuffing attacks work (using stolen password lists)');
  }
  if (form.multiAccount) {
    rawScore += 38; flags.push('Multiple account signals');
    reasons.push('Signs of multiple accounts from the same source — commonly seen in fraud rings or automated account creation');
  }
  if (form.rapidClicks) {
    rawScore += 28; flags.push('Rapid click pattern');
    reasons.push('Clicks are happening in an inhuman rapid sequence — real users take a moment between clicks');
  }
  if (browser.hardwareConcurrency === 2 && browser.deviceMemory === 1) {
    rawScore += 10; flags.push('Headless browser fingerprint');
    reasons.push('The device profile matches a headless browser — a tool used by bots to simulate human browsing');
  }

  if (reasons.length === 0) {
    reasons.push(
      'Login frequency is normal — only a couple of attempts',
      'Response timing is consistent with real human behavior',
      'No suspicious patterns like VPN usage, device switching, or bot-speed actions detected'
    );
  }

  const verdict = rawScore > 48 ? 'FAKE' : 'REAL';
  const confidence = normalizeConfidence(verdict, Math.min(99, rawScore));
  const fakeScore = verdict === 'FAKE' ? confidence : 100 - confidence;

  return {
    verdict,
    confidence,
    fakeScore,
    realScore: 100 - fakeScore,
    reasons,
    riskFlags: flags.length ? flags : ['No suspicious behavior detected'],
    summary: verdict === 'FAKE'
      ? `${flags.length} fraud signals detected — this session shows bot or fraudulent behavior.`
      : 'Behavior appears normal and consistent with a real human user.',
    engine: 'simulated',
  };
}

export async function analyzeFraud(form, apiKey) {
  const browser = captureBrowserSignals();
  if (apiKey) {
    try { return await callClaude(form, browser, apiKey); } catch (_) {}
  }
  return scoringEngine(form, browser);
}
