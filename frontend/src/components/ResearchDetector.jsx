import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LoaderOverlay from './LoaderOverlay';
import { playSuccessChime, playErrorBuzzer } from '../utils/audio';
import API_BASE from '../config';

// ── Chart.js loader ────────────────────────────────────────────────────────────
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

// ── Theme color per verdict ───────────────────────────────────────────────────
function verdictTheme(verdict) {
  if (verdict === 'CREDIBLE') return { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: '#06b6d4', title: '✅ RESEARCH VERIFIED', glow: 'rgba(6,182,212,0.3)' };
  if (verdict === 'DEBUNKED') return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: '#ef4444', title: '❌ RESEARCH DEBUNKED', glow: 'rgba(239,68,68,0.3)' };
  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', title: '⚠️ QUESTIONABLE CLAIMS', glow: 'rgba(245,158,11,0.3)' };
}

// ── Score color helper ─────────────────────────────────────────────────────────
function scoreColor(v) { return v > 75 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'; }

// ── Circular meter ─────────────────────────────────────────────────────────────
function ConfidenceMeter({ value, color }) {
  const r = 54, stroke = 8, size = (r + stroke) * 2, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
            transition={{ duration:1.5, ease:'easeOut' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:28, fontWeight:'bold', color:'#fff' }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize:11, letterSpacing:3, color:'#94a3b8', marginTop:6, fontFamily:"'DM Sans', sans-serif" }}>CONFIDENCE</span>
    </div>
  );
}

// ── Radar chart ────────────────────────────────────────────────────────────────
function RadarChart({ data_points, color, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    const labels = data_points?.labels || [];
    const values = (data_points?.values || []).map(v => Number(v) || 0);

    if (!loaded || !ref.current || !labels.length || !values.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    chartRef.current = new window.Chart(ref.current, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: color + '33', borderColor: color, borderWidth: 2, pointBackgroundColor: color, pointRadius: 4 }]
      },
      options: { responsive:true, maintainAspectRatio:false, animation:{ duration:1400 },
        scales: { r: { beginAtZero:true, max:100, ticks:{ color:'#64748b', backdropColor:'transparent', stepSize:25, font:{size:10} }, grid:{ color:'rgba(255,255,255,0.07)' }, angleLines:{ color:'rgba(255,255,255,0.08)' }, pointLabels:{ color:'#94a3b8', font:{size:11, family:'DM Sans'} } } },
        plugins: { legend:{ display:false } }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data_points, loaded, color]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

// ── Doughnut chart ─────────────────────────────────────────────────────────────
function DoughnutChart({ data_points, color, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    const labels = data_points?.labels || [];
    const values = (data_points?.values || []).map(v => Number(v) || 0);

    if (!loaded || !ref.current || !labels.length || !values.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    // Ensure colors match values length
    const colors = values.map(v => scoreColor(v));
    
    chartRef.current = new window.Chart(ref.current, {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors.map(c => c+'aa'), borderColor: colors, borderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false, animation:{ duration:1200 }, cutout:'65%',
        plugins: { legend:{ position:'bottom', labels:{ color:'#94a3b8', font:{ family:'DM Sans', size:10 }, padding:8 } } } }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data_points, loaded, color]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

// ── Horizontal bar chart ───────────────────────────────────────────────────────
function HBarChart({ data_points, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    const labels = data_points?.labels || [];
    const values = (data_points?.values || []).map(v => Number(v) || 0);

    if (!loaded || !ref.current || !labels.length || !values.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    
    const colors = values.map(v => scoreColor(v));
    chartRef.current = new window.Chart(ref.current, {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors.map(c => c+'bb'), borderColor: colors, borderWidth:1, borderRadius:4 }] },
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, animation:{ duration:1200 },
        plugins: { legend:{ display:false } },
        scales: {
          x: { min:0, max:100, ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,0.04)' } },
          y: { ticks:{ color:'#94a3b8', font:{ family:'DM Sans', size:11 } }, grid:{ display:false } }
        }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data_points, loaded]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

// ── Modal overlay styles ───────────────────────────────────────────────────────
const MODAL_STYLES = `
@keyframes fadeInResearch { from { opacity:0 } to { opacity:1 } }
@keyframes slideInResearch { from { transform:translate(-50%,-50%) scale(0.9); opacity:0 } to { transform:translate(-50%,-50%) scale(1); opacity:1 } }
.research-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); backdrop-filter:blur(16px); z-index:1040; animation:fadeInResearch 0.3s ease; }
.research-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1050; width:98%; max-width:1400px; max-height:96vh; overflow-y:auto; border-radius:20px; padding:40px; animation:slideInResearch 0.4s ease; }
.research-modal::-webkit-scrollbar { width:6px; }
.research-modal::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.18); border-radius:3px; }
@media(max-width:640px) { .research-modal { padding:20px; } }
`;

// ── Result Modal ───────────────────────────────────────────────────────────────
function ResearchResultModal({ result, onClose }) {
  const theme = verdictTheme(result.verdict);
  const loaded = useChartJs();
  const SCORE_BOXES = [
    { label:'CREDIBILITY', value: result.credibility_score },
    { label:'METHODOLOGY', value: result.methodology_score },
    { label:'EVIDENCE', value: result.evidence_score },
    { label:'PEER REVIEW', value: result.peer_review_likelihood },
  ];

  useEffect(() => {
    if (result && result.verdict === 'CREDIBLE') {
      playSuccessChime();
    } else if (result) {
      playErrorBuzzer();
    }
  }, [result]);

  return createPortal(
    <>
      <div className="research-overlay" onClick={onClose} />
      <div className="research-modal" style={{ background:'linear-gradient(180deg, #0c1117, #0a0f18)', border:`2px solid ${theme.border}`, boxShadow:`0 0 0 1px ${theme.border}, 0 0 60px ${theme.glow}, 0 30px 80px rgba(0,0,0,0.7)` }}>
        <style>{MODAL_STYLES}</style>

        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

        {/* TOP ROW */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:20, marginBottom:28 }}>
          <div>
            <h2 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:'clamp(28px,4vw,46px)', color:theme.color, margin:'0 0 6px 0', letterSpacing:3, lineHeight:1 }}>{theme.title}</h2>
            <p style={{ color:'#94a3b8', fontSize:14, margin:0, fontFamily:"'DM Sans', sans-serif" }}>Scientific Credibility Analysis</p>
            <div style={{ display:'inline-block', background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:20, padding:'4px 14px', fontSize:11, color:theme.color, fontFamily:"'JetBrains Mono', monospace", letterSpacing:1, marginTop:8 }}>{result.verdict}</div>
          </div>
          <ConfidenceMeter value={result.confidence} color={theme.color} />
        </div>

        {/* Explanation */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderLeft:`3px solid ${theme.color}`, borderRadius:10, padding:'16px 20px', marginBottom:24 }}>
          <p style={{ color:'#cbd5e1', fontSize:14, lineHeight:1.7, margin:0, fontFamily:"'DM Sans', sans-serif" }}>{result.explanation}</p>
        </div>

        {/* Score grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:24 }}>
          {SCORE_BOXES.map((b,i) => {
            const sc = scoreColor(b.value);
            return (
              <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderTop:`2px solid ${sc}`, borderRadius:12, padding:'16px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:40, color:sc, lineHeight:1 }}>{b.value}%</div>
                <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:10, color:'#475569', letterSpacing:2, textTransform:'uppercase', marginTop:4 }}>{b.label}</div>
              </div>
            );
          })}
        </div>

        {/* Red flags */}
        {result.red_flags?.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
            <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#94a3b8', margin:'0 0 12px 0', textTransform:'uppercase' }}>⚠️ RED FLAGS DETECTED</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {result.red_flags.map((flag,i) => (
                <span key={i} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'#fca5a5', fontFamily:"'DM Sans', sans-serif" }}>▲ {flag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Supporting facts */}
        {result.verdict === 'CREDIBLE' && result.supporting_facts?.length > 0 && (
          <div style={{ background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
            <p style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#94a3b8', margin:'0 0 12px 0', textTransform:'uppercase' }}>✓ SUPPORTING EVIDENCE</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {result.supporting_facts.map((fact,i) => (
                <span key={i} style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'#86efac', fontFamily:"'DM Sans', sans-serif" }}>✓ {fact}</span>
              ))}
            </div>
          </div>
        )}

        {/* Corrected fact banner */}
        {result.verdict === 'DEBUNKED' && result.corrected_fact && (
          <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:12, padding:'18px 22px', marginBottom:24 }}>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#a5b4fc', letterSpacing:2, marginBottom:10 }}>📌 SCIENTIFIC CONSENSUS:</div>
            <p style={{ color:'#e2e8f0', fontSize:14, lineHeight:1.7, margin:0, fontFamily:"'DM Sans', sans-serif" }}>{result.corrected_fact}</p>
          </div>
        )}

        {/* Charts */}
        {result.data_points?.labels?.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:18 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:20 }}>
              <p style={{ fontFamily:"'Bebas Neue', cursive", fontSize:16, color:'#f1f5f9', margin:'0 0 14px 0', letterSpacing:1 }}>Criteria Radar</p>
              <RadarChart data_points={result.data_points} color={theme.color} loaded={loaded} />
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:20 }}>
              <p style={{ fontFamily:"'Bebas Neue', cursive", fontSize:16, color:'#f1f5f9', margin:'0 0 14px 0', letterSpacing:1 }}>Score Breakdown</p>
              <DoughnutChart data_points={result.data_points} color={theme.color} loaded={loaded} />
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:20 }}>
              <p style={{ fontFamily:"'Bebas Neue', cursive", fontSize:16, color:'#f1f5f9', margin:'0 0 14px 0', letterSpacing:1 }}>Individual Scores</p>
              <HBarChart data_points={result.data_points} loaded={loaded} />
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

// ── EXAMPLE CHIPS ──────────────────────────────────────────────────────────────
const EXAMPLES = ['Vaccines cause autism', '5G causes cancer', 'Coffee cures all diseases'];

// ── Main component ─────────────────────────────────────────────────────────────
export default function ResearchDetector() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    const content = text.trim() || url.trim();
    if (!content) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze/research`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: text.trim(), url: url.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
      document.body.style.overflow = 'hidden';
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Textarea */}
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        style={{ width:'100%', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:10, padding:16, color:'var(--text)', fontFamily:"'DM Sans', sans-serif", fontSize:14, minHeight:160, resize:'vertical', outline:'none', transition:'border-color 0.2s' }}
        placeholder="Paste research paper abstract, study claims, or scientific statements..."
        onFocus={e => e.target.style.borderColor='rgba(37,99,235,0.45)'}
        onBlur={e => e.target.style.borderColor='var(--border)'}
      />

      {/* URL input */}
      <div style={{ position:'relative', marginTop:10 }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔗</span>
        <input
          type="text" value={url} onChange={e => setUrl(e.target.value)}
          style={{ width:'100%', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 16px 12px 40px', color:'var(--text)', fontFamily:"'DM Sans', sans-serif", fontSize:14, outline:'none', transition:'border-color 0.2s' }}
          placeholder="Or paste research paper URL..."
          onFocus={e => e.target.style.borderColor='rgba(37,99,235,0.45)'}
          onBlur={e => e.target.style.borderColor='var(--border)'}
        />
      </div>

      {/* Example chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
        {EXAMPLES.map((ex,i) => (
          <button key={i} onClick={() => setText(ex)}
            style={{ background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'#60a5fa', cursor:'pointer', fontFamily:"'DM Sans', sans-serif", transition:'all 0.18s' }}
            onMouseEnter={e => { e.target.style.background='rgba(37,99,235,0.14)'; e.target.style.borderColor='rgba(37,99,235,0.35)'; }}
            onMouseLeave={e => { e.target.style.background='rgba(37,99,235,0.06)'; e.target.style.borderColor='rgba(37,99,235,0.15)'; }}>
            {ex}
          </button>
        ))}
      </div>

      {error && <div style={{ marginTop:14, padding:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:10, fontSize:14 }}>❌ {error}</div>}

      {/* Analyze button */}
      <motion.button
        whileHover={{ y:-2, boxShadow:'0 0 30px rgba(37,99,235,0.4)' }}
        whileTap={{ scale:0.97 }}
        onClick={analyze} disabled={loading || (!text.trim() && !url.trim())}
        style={{ width:'100%', height:54, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius:12, border:'none', fontFamily:"'Bebas Neue', cursive", fontSize:20, letterSpacing:3, color:'white', marginTop:20, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.2s', opacity:(loading||(!text.trim()&&!url.trim()))?0.6:1 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 1s infinite' }} />
        {loading ? 'ANALYZING RESEARCH...' : '🔬 ANALYZE RESEARCH'}
      </motion.button>

      {loading && <LoaderOverlay module="research" />}

      {/* Result modal */}
      {result && <ResearchResultModal result={result} onClose={() => { setResult(null); document.body.style.overflow='unset'; }} />}
    </div>
  );
}
