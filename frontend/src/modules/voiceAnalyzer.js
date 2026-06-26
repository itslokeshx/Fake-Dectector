// ─── voiceAnalyzer.js ─────────────────────────────────────────────────────────
// Web Audio API feature extraction → Claude AI analysis → Rule-based fallback

import { normalizeConfidence } from './newsDetector.js';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

async function extractAudioFeatures(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const data = audioBuffer.getChannelData(0);
  const N = data.length;

  let rmsSum = 0, zcr = 0, peak = 0, silentCount = 0;
  for (let i = 0; i < N; i++) {
    rmsSum += data[i] * data[i];
    if (Math.abs(data[i]) > peak) peak = Math.abs(data[i]);
    if (Math.abs(data[i]) < 0.008) silentCount++;
    if (i > 0 && data[i] * data[i - 1] < 0) zcr++;
  }
  const rms = Math.sqrt(rmsSum / N);

  // Frame-by-frame energy variance
  const FRAME = 1024;
  const frames = Math.floor(N / FRAME);
  const frameEnergies = [];
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = f * FRAME; i < (f + 1) * FRAME; i++) e += data[i] * data[i];
    frameEnergies.push(e / FRAME);
  }
  const meanEnergy = frameEnergies.reduce((a, b) => a + b, 0) / (frames || 1);
  const energyVariance = frameEnergies.reduce((a, b) => a + (b - meanEnergy) ** 2, 0) / (frames || 1);

  ctx.close();

  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    rms: rms.toFixed(5),
    zcr: (zcr / N).toFixed(5),
    peak: peak.toFixed(4),
    silenceRatio: (silentCount / N).toFixed(4),
    energyVariance: energyVariance.toFixed(8),
    dynamicRange: (peak - rms).toFixed(4),
  };
}

async function claudeAudioAnalysis(features, fileName, apiKey) {
  const msg = `Audio forensics analysis for deepfake detection.
File: ${fileName} | Duration: ${features.duration.toFixed(2)}s | Sample Rate: ${features.sampleRate}Hz | Channels: ${features.channels}
RMS Energy: ${features.rms} | Peak: ${features.peak} | ZCR: ${features.zcr}
Silence Ratio: ${features.silenceRatio} | Energy Variance: ${features.energyVariance}

Evaluate for synthetic/TTS/deepfake voice. Explain results in simple terms any non-technical person can understand.
Return ONLY JSON: {"verdict":"FAKE"|"REAL","confidence":0-100,"reasons":["plain English reason","reason","reason"],"riskFlags":["flag"],"summary":"one sentence plain English"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'x-api-key': apiKey,
      'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL, max_tokens: 700,
      system: 'You are an expert audio forensics analyst specializing in deepfake voice detection. Always explain findings in plain non-technical language.',
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
  
  const data_points = {
    labels: ['Silence Ratio', 'Energy Variance', 'Peak Volume', 'ZCR', 'Duration Naturalness'],
    values: [
      parseFloat(features.silenceRatio) > 0.32 ? 20 : 80,
      parseFloat(features.energyVariance) < 0.0003 ? 15 : 85,
      parseFloat(features.rms) < 0.015 ? 30 : 90,
      (parseFloat(features.zcr) < 0.01 || parseFloat(features.zcr) > 0.6) ? 25 : 85,
      features.duration < 3 ? 10 : 90
    ]
  };

  return { ...parsed, fakeScore, realScore: 100 - fakeScore, engine: 'claude', data_points };
}

function ruleBasedVoice(features, fileName) {
  let rawScore = 0;
  const flags = [], reasons = [];
  const { duration, sampleRate, channels, rms, zcr, silenceRatio, energyVariance } = features;

  if (parseFloat(silenceRatio) > 0.32) {
    rawScore += 30; flags.push('High silence ratio');
    reasons.push(`${(parseFloat(silenceRatio) * 100).toFixed(1)}% of the audio is silence — AI voices often insert unnatural pauses`);
  }
  if (parseFloat(energyVariance) < 0.0003) {
    rawScore += 35; flags.push('Low energy variance');
    reasons.push('The voice energy is unnaturally consistent throughout — real human voices vary naturally');
  }
  if (duration < 3) {
    rawScore += 20; flags.push('Very short clip');
    reasons.push('Clips shorter than 3 seconds are commonly used in voice cloning and TTS samples');
  }
  if (channels === 1 && (sampleRate === 44100 || sampleRate === 48000)) {
    rawScore += 12; flags.push('Mono + exact standard sample rate');
    reasons.push('Single-channel audio at exactly standard sample rate — common output of text-to-speech engines');
  }
  if (parseFloat(rms) < 0.015) {
    rawScore += 15; flags.push('Very low energy level');
    reasons.push('The overall audio volume is unusually low — may indicate synthetic or heavily processed speech');
  }
  const zcrVal = parseFloat(zcr);
  if (zcrVal < 0.01 || zcrVal > 0.6) {
    rawScore += 10; flags.push('Abnormal voice frequency pattern');
    reasons.push('The voice frequency pattern is outside the normal human speech range');
  }
  if (/tts|synth|voice_?clone|elevenlabs|bark|tortoise|eleven_labs/i.test(fileName)) {
    rawScore += 50; flags.push('TTS/voice-clone tool name in filename');
    reasons.push(`The filename "${fileName}" suggests this was generated by a voice cloning tool`);
  }

  if (reasons.length === 0) {
    reasons.push(
      `Audio duration (${duration.toFixed(1)}s) and energy levels appear natural`,
      'Voice frequency patterns are within normal human speech range',
      'No signs of text-to-speech or voice cloning detected'
    );
  }

  const verdict = rawScore > 44 ? 'FAKE' : 'REAL';
  const confidence = normalizeConfidence(verdict, Math.min(99, rawScore));
  const fakeScore = verdict === 'FAKE' ? confidence : 100 - confidence;

  const data_points = {
    labels: ['Silence Ratio', 'Energy Variance', 'Peak Volume', 'ZCR', 'Duration Naturalness'],
    values: [
      parseFloat(silenceRatio) > 0.32 ? 20 : 80,
      parseFloat(energyVariance) < 0.0003 ? 15 : 85,
      parseFloat(rms) < 0.015 ? 30 : 90,
      (parseFloat(zcr) < 0.01 || parseFloat(zcr) > 0.6) ? 25 : 85,
      duration < 3 ? 10 : 90
    ]
  };

  return {
    verdict,
    confidence,
    fakeScore,
    realScore: 100 - fakeScore,
    reasons,
    riskFlags: flags.length ? flags : ['No synthetic voice indicators found'],
    summary: verdict === 'FAKE'
      ? `${flags.length} deepfake signals detected — this voice recording appears synthetic.`
      : `No deepfake indicators found — this recording appears to be a genuine human voice.`,
    engine: 'web-audio',
    data_points
  };
}

export async function analyzeVoice(file, apiKey) {
  const features = await extractAudioFeatures(file);
  if (apiKey) {
    try { return await claudeAudioAnalysis(features, file.name, apiKey); } catch (_) {}
  }
  return ruleBasedVoice(features, file.name);
}
