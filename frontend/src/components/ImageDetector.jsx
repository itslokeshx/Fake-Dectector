import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE from '../config';

// Chart.js loader
function useChartJs() {
  const [loaded, setLoaded] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);
  return loaded;
}

// Image compressor using canvas
function compressImage(file) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = (h / w) * MAX; w = MAX; }
        else { w = (w / h) * MAX; h = MAX; }
      }
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };
    img.src = URL.createObjectURL(file);
  });
}

// Global styles for animations and specific mobile media queries
const styleBlock = `
@keyframes fadeInOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleInCard {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shakeCard {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}
@keyframes pulseBadge {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

.result-card-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1040;
  animation: fadeInOverlay 0.3s ease;
}

.result-card-modal {
  position: fixed;
  inset: 0;
  z-index: 1050;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.result-card-modal::-webkit-scrollbar { width: 6px; }
.result-card-modal::-webkit-scrollbar-track { background: transparent; }
.result-card-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

.card-ai {
  background: linear-gradient(180deg, #1a0808ee, #0f0f0fee);
  border-top: 2px solid #ef4444;
  border-bottom: 2px solid #ef4444;
  box-shadow: inset 0 0 80px rgba(239,68,68,0.08);
  animation: scaleInCard 0.4s ease, shakeCard 0.5s ease;
}

.card-human {
  background: linear-gradient(180deg, #071a0eee, #0f0f0fee);
  border-top: 2px solid #22c55e;
  border-bottom: 2px solid #22c55e;
  box-shadow: inset 0 0 80px rgba(34,197,94,0.06);
  animation: scaleInCard 0.4s cubic-bezier(0.34,1.56,0.64,1);
}

.modal-close-btn {
  position: fixed;
  top: 16px; right: 16px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
  z-index: 1060;
}
.modal-close-btn:hover {
  background: rgba(255,255,255,0.2);
}

@media (max-width: 768px) {
  .result-card-modal { padding: 16px; }
  .card-top-row { flex-direction: column; text-align: center; gap: 12px; }
  .card-title { font-size: 28px !important; }
  .charts-grid { grid-template-columns: 1fr !important; }
}
`;

function DoughnutChart({ image_scores, isAI, chartJsLoaded }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartJsLoaded || !image_scores?.labels?.length || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    const colors = isAI 
      ? ['#ef4444', '#dc2626', '#b91c1c', '#7f1d1d']
      : ['#22c55e', '#16a34a', '#15803d', '#166534'];

    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: image_scores.labels,
        datasets: [{
          data: image_scores.values,
          backgroundColor: colors,
          borderColor: '#0f1318',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1500 },
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'DM Sans', size: 11 }, padding: 12 } }
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [image_scores, isAI, chartJsLoaded]);

  return <div style={{ height: 200, position: 'relative' }}><canvas ref={canvasRef} /></div>;
}

function BarChart({ image_scores, isAI, chartJsLoaded }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartJsLoaded || !image_scores?.labels?.length || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    const barColors = image_scores.values.map(v => v > 75 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444');
    
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: image_scores.labels,
        datasets: [{
          data: image_scores.values,
          backgroundColor: barColors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1200 },
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b', font: { family: 'DM Sans', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 0, max: 100, ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [image_scores, isAI, chartJsLoaded]);

  return <div style={{ height: 200, position: 'relative' }}><canvas ref={canvasRef} /></div>;
}

function LineChart({ image_scores, isAI, chartJsLoaded }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartJsLoaded || !image_scores?.labels?.length || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: image_scores.labels,
        datasets: [{
          data: image_scores.values,
          borderColor: isAI ? '#ef4444' : '#22c55e',
          backgroundColor: isAI ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: isAI ? '#ef4444' : '#22c55e',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1300 },
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b', font: { family: 'DM Sans', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 0, max: 100, ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [image_scores, isAI, chartJsLoaded]);

  return <div style={{ height: 200, position: 'relative' }}><canvas ref={canvasRef} /></div>;
}

// Circular Confidence SVG Meter
function ConfidenceMeter({ value, color }) {
  const radius = 54;
  const stroke = 8;
  const size = (radius + stroke) * 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
          <motion.circle
            cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 'bold', color: '#fff', margin: 0 }}>
            {value}%
          </motion.span>
        </div>
      </div>
      <span style={{ fontSize: 12, letterSpacing: 3, color: '#94a3b8', marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>CONFIDENCE</span>
    </div>
  );
}

function ScanLoading({ imageUrl, step, progress }) {
  const steps = [
    '🔍 Compressing and uploading image...',
    '🧠 Vision AI analyzing pixels...',
    '🎨 Checking AI generation artifacts...',
    '🛡️ Running content safety scan...',
    '📊 Computing confidence scores...',
  ];
  return (
    <div style={{ marginTop: 24 }}>
      {imageUrl && (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', maxHeight: 280 }}>
          <img src={imageUrl} alt="Scanning" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', filter: 'brightness(0.5)' }} />
          <motion.div
            style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #00ff88 50%, transparent)', boxShadow: '0 0 18px #00ff88, 0 0 40px #00ff8866' }}
            animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#00ff88', fontSize: 13, textShadow: '0 0 10px #00ff88' }}>
              {steps[step % steps.length]}
            </motion.p>
          </div>
        </div>
      )}
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 6, marginTop: 16 }}>
        <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #00ff88)', borderRadius: 99 }} animate={{ width: `${progress}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <p style={{ color: '#475569', fontSize: 12 }}>Analyzing with Vision AI...</p>
        <p style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{progress}%</p>
      </div>
    </div>
  );
}

export default function ImageDetector() {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // UI states per standard instruction
  const [result, setResult] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  
  const fileInputRef = useRef(null);
  const chartJsLoaded = useChartJs();

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadingStep(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    setProgress(0);
    const start = Date.now();
    const DURATION = 8000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(98, Math.round((elapsed / DURATION) * 100)));
    }, 200);
    return () => clearInterval(timer);
  }, [loading]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) return alert('Invalid image format.');
    if (f.size > 10 * 1024 * 1024) return alert('Image must be under 10MB.');
    setFile(f); setError(null);
    setImageUrl(URL.createObjectURL(f));
  }, []);

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const { base64, mimeType } = await compressImage(file);
      const res = await fetch(`${API_BASE}/api/analyze/image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      
      setProgress(100);
      setResult(data);
      setShowOverlay(true);
      document.body.style.overflow = 'hidden';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setResult(null);
    document.body.style.overflow = 'unset';
  };

  const isAI = result?.ai_verdict === 'AI_GENERATED';
  const COLOR = isAI ? '#ef4444' : '#22c55e';

  // Badge logic
  let badgeLabel = 'LOW', badgeBg = 'rgba(234,179,8,0.2)', badgeColor = '#eab308';
  if (result?.ai_confidence > 85) { badgeLabel = 'HIGH'; badgeBg = 'rgba(239,68,68,0.2)'; badgeColor = '#ef4444'; }
  else if (result?.ai_confidence >= 60) { badgeLabel = 'MEDIUM'; badgeBg = 'rgba(251,146,60,0.2)'; badgeColor = '#fb923c'; }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{styleBlock}</style>
      
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => !loading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14, padding: 32, textAlign: 'center', cursor: loading ? 'wait' : 'pointer',
          background: drag ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s'
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        {file ? (
          <>
            <p style={{ color: '#22c55e', fontWeight: 600 }}>✓ {file.name}</p>
            <p style={{ color: '#475569', fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB • Click to replace</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
            <p style={{ color: '#cbd5e1', fontWeight: 500 }}>Drop image here or click to browse</p>
          </>
        )}
      </div>

      {imageUrl && !loading && !result && (
        <img src={imageUrl} alt="Preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', marginTop: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }} />
      )}

      {file && !loading && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={analyze}
          style={{ width: '100%', marginTop: 16, padding: '15px 0', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: "'Bebas Neue', cursive", letterSpacing: 2 }}>
          🔍 ANALYZE WITH VISION AI
        </motion.button>
      )}

      {loading && <ScanLoading imageUrl={imageUrl} step={loadingStep} progress={progress} />}
      {error && <div style={{ marginTop: 16, padding: 14, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 10 }}>❌ {error}</div>}

      {showOverlay && result && createPortal(
        <>
          <div className="result-card-overlay" onClick={closeOverlay} />
          
          <div className={`result-card-modal ${isAI ? 'card-ai' : 'card-human'}`}>
            <button className="modal-close-btn" onClick={closeOverlay}>✕</button>
            
            {isAI && (
              <div style={{ position: 'fixed', top: 16, right: 64, background: badgeBg, padding: '4px 12px', borderRadius: 20, color: badgeColor, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, border: `1px solid ${badgeColor}`, animation: 'pulseBadge 1.5s infinite', zIndex: 1070 }}>{badgeLabel}</div>
            )}

            {/* MAX-WIDTH CENTERING WRAPPER */}
            <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

              {/* TOP ROW */}
              <div className="card-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 44 }}>{isAI ? '🤖' : '📷'}</span>
                  <div>
                    <h2 className="card-title" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, color: COLOR, margin: 0, letterSpacing: 4, lineHeight: 1 }}>{isAI ? 'AI GENERATED' : 'HUMAN CREATED'}</h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: '4px 0 0 0', fontFamily: "'DM Sans', sans-serif" }}>{isAI ? 'Artificial Intelligence Detected' : 'Authentic Photograph Detected'}</p>
                  </div>
                </div>
                <ConfidenceMeter value={result.ai_confidence || 0} color={COLOR} />
              </div>

              {/* AI INDICATORS */}
              {isAI && result.ai_indicators?.length > 0 && (
                <div style={{ marginTop: 14, background: 'rgba(239,68,68,0.08)', padding: '12px 16px', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>⚠️ AI GENERATION SIGNALS:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {result.ai_indicators.map((ind, i) => (
                      <motion.span key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif" }}>
                        ⚠️ {ind}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* EXPLANATION */}
              <div style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, animation: 'fadeInOverlay 0.5s ease 0.3s both' }}>
                <p style={{ fontWeight: 600, fontSize: 12, color: COLOR, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 8px 0', fontFamily: "'DM Sans', sans-serif" }}>WHY THIS WAS FLAGGED</p>
                <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{result.ai_explanation}</p>
              </div>

              {/* 2x2 GRIDS FOR SAFETY & CHARTS */}
              <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: result.image_scores?.labels?.length > 0 ? '1fr 1fr' : '1fr', gap: 20, marginTop: 20 }}>
                
                {/* 1. SAFETY GRID */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 20, borderRadius: 12 }}>
                  <p style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 16px 0', fontFamily: "'DM Sans', sans-serif" }}>CONTENT SAFETY ANALYSIS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: '🔞', label: 'Adult Content', unsafe: result.content_safety?.adult_content },
                      { icon: '🔪', label: 'Violence', unsafe: result.content_safety?.violence },
                      { icon: '👤', label: 'Fake Person', unsafe: result.content_safety?.fake_person },
                      { icon: '⛔', label: 'Hate Content', unsafe: result.content_safety?.hate_content },
                      { icon: '📢', label: 'Misleading', unsafe: result.content_safety?.misleading },
                      { icon: '🛡️', label: 'Overall Safety', unsafe: !result.content_safety?.overall_safe },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}><span>{s.icon}</span> <span>{s.label}</span></span>
                        {s.unsafe ? (
                          <span style={{ background: '#450a0a', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>DETECTED</span>
                        ) : (
                          <span style={{ background: '#052e16', color: '#22c55e', border: '1px solid #22c55e', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>SAFE</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. DOUGHNUT CHART */}
                {result.image_scores?.labels?.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: '#f1f5f9', letterSpacing: 1, margin: '0 0 16px 0' }}>Image Analysis Breakdown</p>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                      <div style={{ width: '100%', height: '100%' }}>
                        <DoughnutChart image_scores={result.image_scores} isAI={isAI} chartJsLoaded={chartJsLoaded} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BAR CHART */}
                {result.image_scores?.labels?.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 }}>
                     <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: '#f1f5f9', letterSpacing: 1, margin: '0 0 16px 0' }}>Quality Score Analysis</p>
                     <BarChart image_scores={result.image_scores} isAI={isAI} chartJsLoaded={chartJsLoaded} />
                  </div>
                )}

                {/* 4. LINE CHART */}
                {result.image_scores?.labels?.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 }}>
                     <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: '#f1f5f9', letterSpacing: 1, margin: '0 0 16px 0' }}>Score Trend Distribution</p>
                     <LineChart image_scores={result.image_scores} isAI={isAI} chartJsLoaded={chartJsLoaded} />
                  </div>
                )}

              </div>

            </div>{/* end centering wrapper */}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
