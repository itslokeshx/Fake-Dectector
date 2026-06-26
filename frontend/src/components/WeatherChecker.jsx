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

const WEATHER_TYPES = [
  { id:'Sunny', icon:'☀️' }, { id:'Rainy', icon:'🌧️' },
  { id:'Snowing', icon:'❄️' }, { id:'Thunderstorm', icon:'🌩️' },
  { id:'Foggy', icon:'🌫️' }, { id:'Windy', icon:'💨' },
  { id:'Partly Cloudy', icon:'🌤️' }, { id:'Clear Night', icon:'🌙' },
];

function verdictTheme(verdict) {
  if (verdict === 'CORRECT') return { color:'#22c55e', title:'✅ PREDICTION CORRECT!', glow:'rgba(34,197,94,0.3)' };
  if (verdict === 'PARTIALLY_CORRECT') return { color:'#f59e0b', title:'⚠️ PARTIALLY CORRECT', glow:'rgba(245,158,11,0.3)' };
  return { color:'#ef4444', title:'❌ PREDICTION WRONG', glow:'rgba(239,68,68,0.35)' };
}

function scoreColor(v) { return v > 75 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'; }

function formatTime(unix) {
  if (!unix) return '--';
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

// ── Charts ────────────────────────────────────────────────────────────────────
function GroupedBarChart({ result, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (!loaded || !ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const pTempAvg = (result.predicted.tempMin + result.predicted.tempMax) / 2;
    chartRef.current = new window.Chart(ref.current, {
      type: 'bar',
      data: {
        labels: ['Temp (°C)', 'Humidity (%)', 'Wind (km/h)'],
        datasets: [
          { label:'Predicted', data:[pTempAvg, result.predicted.humidity, result.predicted.wind], backgroundColor:'rgba(59,130,246,0.7)', borderColor:'#3b82f6', borderWidth:1, borderRadius:4 },
          { label:'Actual', data:[result.actual.temp, result.actual.humidity, result.actual.windSpeed], backgroundColor:`${verdictTheme(result.verdict).color}99`, borderColor:verdictTheme(result.verdict).color, borderWidth:1, borderRadius:4 },
        ]
      },
      options: { responsive:true, maintainAspectRatio:false, animation:{ duration:1300 },
        plugins:{ legend:{ labels:{ color:'#94a3b8', font:{family:'DM Sans',size:11} } } },
        scales:{ x:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,0.04)' } } }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [loaded, result]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

function AccuracyDoughnut({ result, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (!loaded || !ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const vals = [result.accuracy.weather, result.accuracy.temperature, result.accuracy.humidity, result.accuracy.wind];
    const cols = vals.map(v => scoreColor(v));
    chartRef.current = new window.Chart(ref.current, {
      type: 'doughnut',
      data: { labels:['Weather','Temperature','Humidity','Wind'], datasets:[{ data:vals, backgroundColor:cols.map(c=>c+'aa'), borderColor:cols, borderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false, animation:{ duration:1200 }, cutout:'60%',
        plugins:{ legend:{ position:'bottom', labels:{ color:'#94a3b8', font:{family:'DM Sans',size:10}, padding:8 } } }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [loaded, result]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

function AccuracyLineChart({ result, loaded }) {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (!loaded || !ref.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const vals = [result.accuracy.weather, result.accuracy.temperature, result.accuracy.humidity, result.accuracy.wind];
    const themeColor = verdictTheme(result.verdict).color;
    chartRef.current = new window.Chart(ref.current, {
      type: 'line',
      data: {
        labels: ['Weather','Temp','Humidity','Wind'],
        datasets:[{ data:vals, borderColor:themeColor, backgroundColor:themeColor+'22', fill:true, tension:0.4, pointBackgroundColor:themeColor, pointRadius:5 }]
      },
      options: { responsive:true, maintainAspectRatio:false, animation:{ duration:1300 },
        plugins:{ legend:{ display:false } },
        scales:{ x:{ ticks:{ color:'#64748b', font:{size:11} }, grid:{ color:'rgba(255,255,255,0.04)' } }, y:{ min:0, max:100, ticks:{ color:'#64748b' }, grid:{ color:'rgba(255,255,255,0.04)' } } }
      }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [loaded, result]);
  return <div style={{ height:180, position:'relative' }}><canvas ref={ref} /></div>;
}

// ── Diff badge ────────────────────────────────────────────────────────────────
function DiffBadge({ diff, unit = '' }) {
  const abs = Math.abs(diff);
  const col = abs < 5 ? '#22c55e' : abs < 15 ? '#f59e0b' : '#ef4444';
  const sign = diff > 0 ? '+' : '';
  return <span style={{ color:col, fontFamily:"'JetBrains Mono', monospace", fontSize:12 }}>{sign}{diff}{unit}</span>;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const MODAL_CSS = `
@keyframes wFadeIn { from{opacity:0} to{opacity:1} }
@keyframes wSlideIn { from{transform:translate(-50%,-50%) scale(0.88);opacity:0} to{transform:translate(-50%,-50%) scale(1);opacity:1} }
.weather-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.82);backdrop-filter:blur(16px);z-index:1040;animation:wFadeIn .3s ease;}
.weather-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1050;width:98%;max-width:1400px;max-height:96vh;overflow-y:auto;border-radius:20px;padding:40px;animation:wSlideIn .4s ease;}
.weather-modal::-webkit-scrollbar{width:6px;}.weather-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:3px;}
@media(max-width:640px){.weather-modal{padding:20px;}}
`;

function WeatherResultModal({ result, onClose }) {
  const theme = verdictTheme(result.verdict);
  const loaded = useChartJs();
  const act = result.actual;
  const prd = result.predicted;

  useEffect(() => {
    if (result && (result.verdict === 'CORRECT' || result.verdict === 'PARTIALLY_CORRECT')) {
      playSuccessChime();
    } else if (result) {
      playErrorBuzzer();
    }
  }, [result]);

  return createPortal(
    <>
      <div className="weather-overlay" onClick={onClose} />
      <div className="weather-modal" style={{ background:'linear-gradient(180deg,#0a0f1a,#060c15)', border:`2px solid ${theme.color}`, boxShadow:`0 0 60px ${theme.glow}, 0 30px 80px rgba(0,0,0,0.7)` }}>
        <style>{MODAL_CSS}</style>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'white', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

        {/* TOP HERO */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:20, marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <img src={`https://openweathermap.org/img/wn/${act.icon}@2x.png`} alt={act.description} style={{ width:80, height:80, filter:'drop-shadow(0 0 16px rgba(255,255,255,0.3))' }} />
            <div>
              <h2 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:'clamp(26px,3.5vw,46px)', color:theme.color, margin:'0 0 4px', letterSpacing:3, lineHeight:1 }}>{theme.title}</h2>
              <p style={{ color:'#94a3b8', fontSize:14, margin:'0 0 6px', fontFamily:"'DM Sans', sans-serif" }}>📍 {act.cityName}, {act.country}</p>
              <span style={{ textTransform:'capitalize', color:'#64748b', fontSize:13, fontFamily:"'DM Sans', sans-serif" }}>{act.description}</span>
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:'clamp(52px,7vw,80px)', color:theme.color, lineHeight:1 }}>{act.temp}°C</div>
            <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, color:'#475569', letterSpacing:2, textTransform:'uppercase' }}>ACTUAL TEMPERATURE</div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:13, color:'#64748b', marginTop:4 }}>Overall: {result.overallAccuracy}% accuracy</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* PREDICTION vs ACTUAL */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${theme.color}44`, borderRadius:12, padding:'16px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:theme.color, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>YOUR PREDICTION</div>
                <div style={{ fontSize:28, marginBottom:6 }}>{WEATHER_TYPES.find(w=>w.id===prd.weatherType)?.icon || '❓'}</div>
                <div style={{ color:'#cbd5e1', fontFamily:"'DM Sans', sans-serif", fontSize:14 }}>{prd.weatherType}</div>
                <div style={{ color:'#64748b', fontSize:12, marginTop:4 }}>Temp: {prd.tempMin}–{prd.tempMax}°C</div>
                <div style={{ color:'#64748b', fontSize:12 }}>Humidity: {prd.humidity}% · Wind: {prd.wind} km/h</div>
              </div>
              <div style={{ background:'rgba(37,99,235,0.04)', border:'1px solid rgba(37,99,235,0.25)', borderRadius:12, padding:'16px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#3b82f6', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>ACTUAL WEATHER</div>
                <img src={`https://openweathermap.org/img/wn/${act.icon}.png`} alt="" style={{ width:40, height:40, marginBottom:2 }} />
                <div style={{ color:'#cbd5e1', fontFamily:"'DM Sans', sans-serif", fontSize:14, textTransform:'capitalize' }}>{act.description}</div>
                <div style={{ color:'#64748b', fontSize:12, marginTop:4 }}>Temp: {act.temp}°C · Feels {act.feelsLike}°C</div>
                <div style={{ color:'#64748b', fontSize:12 }}>Humidity: {act.humidity}% · Wind: {act.windSpeed} km/h</div>
              </div>
            </div>

            {/* ACCURACY SCORES */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
              {[
                { k:'WEATHER', v:result.accuracy.weather },
                { k:'TEMP', v:result.accuracy.temperature },
                { k:'HUMIDITY', v:result.accuracy.humidity },
                { k:'WIND', v:result.accuracy.wind },
              ].map((box,i) => {
                const sc = scoreColor(box.v);
                return (
                  <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderTop:`2px solid ${sc}`, borderRadius:10, padding:'10px', textAlign:'center' }}>
                    <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:28, color:sc, lineHeight:1 }}>{box.v}%</div>
                    <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:9, color:'#475569', letterSpacing:1, textTransform:'uppercase', marginTop:4 }}>{box.k}</div>
                  </div>
                );
              })}
            </div>

            {/* SUNRISE/SUNSET */}
            <div style={{ display:'flex', gap:10, flexGrow: 1 }}>
              <div style={{ flex:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'20px 10px', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ fontSize:28, marginBottom: 8 }}>🌅</div>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#475569', letterSpacing:2, textTransform:'uppercase' }}>Sunrise</div>
                <div style={{ color:'#f59e0b', fontFamily:"'Bebas Neue', cursive", fontSize:26 }}>{formatTime(act.sunrise)}</div>
              </div>
              <div style={{ flex:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'20px 10px', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ fontSize:28, marginBottom: 8 }}>🌇</div>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#475569', letterSpacing:2, textTransform:'uppercase' }}>Sunset</div>
                <div style={{ color:'#f59e0b', fontFamily:"'Bebas Neue', cursive", fontSize:26 }}>{formatTime(act.sunset)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* WEATHER DETAILS 2x3 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
              {[
                { icon:'🌡️', label:'Temp', actual:`${act.temp}°C`, diff:<DiffBadge diff={Math.round(result.comparison.tempDiff*10)/10} unit="°C" /> },
                { icon:'💧', label:'Humidity', actual:`${act.humidity}%`, diff:<DiffBadge diff={result.comparison.humidityDiff} unit="%" /> },
                { icon:'💨', label:'Wind', actual:`${act.windSpeed} km/h`, diff:<DiffBadge diff={Math.round(result.comparison.windDiff*10)/10} unit="km" /> },
                { icon:'🌡️', label:'Feels Like', actual:`${act.feelsLike}°C`, diff:null },
                { icon:'🔵', label:'Pressure', actual:`${act.pressure} hPa`, diff:null },
                { icon:'👁️', label:'Visibility', actual:`${act.visibility} km`, diff:null },
              ].map((card,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{card.icon}</div>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#475569', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>{card.label}</div>
                  <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:14, color:'#f1f5f9', fontWeight:600 }}>{card.actual}</div>
                  {card.diff && <div style={{ marginTop:4 }}>Diff: {card.diff}</div>}
                </div>
              ))}
            </div>

            {/* CHARTS */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:14 }}>
                <p style={{ fontFamily:"'Bebas Neue', cursive", fontSize:14, color:'#f1f5f9', margin:'0 0 10px', letterSpacing:1 }}>Accuracy Breakdown</p>
                <AccuracyDoughnut result={result} loaded={loaded} />
              </div>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:14 }}>
                <p style={{ fontFamily:"'Bebas Neue', cursive", fontSize:14, color:'#f1f5f9', margin:'0 0 10px', letterSpacing:1 }}>Accuracy by Metric</p>
                <AccuracyLineChart result={result} loaded={loaded} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Dual-handle range slider (simple two-value implementation) ─────────────────
function RangeInput({ label, min, max, value, onChange, unit = '', step = 1 }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <label style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#475569', letterSpacing:2, textTransform:'uppercase' }}>{label}</label>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#60a5fa' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:'#3b82f6' }} />
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#334155' }}>{min}{unit}</span>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#334155' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WeatherChecker() {
  const [city, setCity] = useState('');
  const [prediction, setPrediction] = useState('');
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(30);
  const [humidity, setHumidity] = useState(50);
  const [wind, setWind] = useState(15);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!city.trim() || !prediction) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/analyze/weather`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ city: city.trim(), prediction, predictedTempMin: tempMin, predictedTempMax: tempMax, predictedHumidity: humidity, predictedWind: wind })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch weather');
      setResult(data);
      document.body.style.overflow = 'hidden';
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width:'100%', background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 16px 12px 40px', color:'var(--text)', fontFamily:"'DM Sans', sans-serif", fontSize:14, outline:'none', transition:'border-color 0.2s' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* CITY INPUT */}
      <div>
        <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#475569', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>📍 Location</div>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>📍</span>
          <input type="text" value={city} onChange={e => setCity(e.target.value)} style={inputStyle}
            placeholder="Enter city name... (e.g. Chennai, Tokyo, London)"
            onFocus={e => e.target.style.borderColor='rgba(37,99,235,0.45)'}
            onBlur={e => e.target.style.borderColor='var(--border)'} />
        </div>
      </div>

      {/* WEATHER TYPE */}
      <div>
        <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#475569', letterSpacing:3, textTransform:'uppercase', marginBottom:10 }}>YOUR WEATHER PREDICTION</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
          {WEATHER_TYPES.map(w => {
            const sel = prediction === w.id;
            return (
              <button key={w.id} onClick={() => setPrediction(w.id)}
                style={{ background:sel?'rgba(37,99,235,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${sel?'#3b82f6':'rgba(255,255,255,0.08)'}`, borderRadius:10, padding:'12px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all 0.18s', transform:sel?'scale(1.05)':'scale(1)', color:sel?'#60a5fa':'#64748b' }}>
                <span style={{ fontSize:22 }}>{w.icon}</span>
                <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, fontWeight:sel?600:400 }}>{w.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SLIDERS */}
      <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <RangeInput label="Min Temperature" min={-20} max={50} value={tempMin} onChange={v => setTempMin(Math.min(v, tempMax-1))} unit="°C" />
          <RangeInput label="Max Temperature" min={-20} max={50} value={tempMax} onChange={v => setTempMax(Math.max(v, tempMin+1))} unit="°C" />
        </div>
        <div style={{ background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:8, padding:'8px 14px', marginBottom:16, textAlign:'center' }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#60a5fa' }}>Predicted Range: {tempMin}°C — {tempMax}°C</span>
        </div>
        <RangeInput label="Predicted Humidity" min={0} max={100} value={humidity} onChange={setHumidity} unit="%" />
        <RangeInput label="Predicted Wind Speed" min={0} max={150} value={wind} onChange={setWind} unit=" km/h" />
      </div>

      {error && <div style={{ padding:14, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:10, fontSize:14 }}>❌ {error}</div>}

      {/* SUBMIT */}
      <motion.button
        whileHover={{ y:-2, boxShadow:'0 0 30px rgba(37,99,235,0.4)' }}
        whileTap={{ scale:0.97 }}
        onClick={analyze} disabled={loading || !city.trim() || !prediction}
        style={{ width:'100%', height:54, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius:12, border:'none', fontFamily:"'Bebas Neue', cursive", fontSize:20, letterSpacing:3, color:'white', cursor:(loading||!city.trim()||!prediction)?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.2s', opacity:(loading||!city.trim()||!prediction)?0.6:1 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 1s infinite' }} />
        {loading ? 'CHECKING WEATHER...' : '🌤️ CHECK MY PREDICTION'}
      </motion.button>

      {loading && <LoaderOverlay module="weather" />}
      {result && <WeatherResultModal result={result} onClose={() => { setResult(null); document.body.style.overflow='unset'; }} />}
    </div>
  );
}
