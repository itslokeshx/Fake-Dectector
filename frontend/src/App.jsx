import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeNews } from './modules/newsDetector';
import { analyzeImage } from './modules/imageDetector';
import { analyzeVoice } from './modules/voiceAnalyzer';
import { analyzeJob } from './modules/jobChecker';
import { analyzeFraud, captureBrowserSignals } from './modules/fraudDetector';
import ResultModal from './components/ResultModal';
import ImageDetector from './components/ImageDetector';
import LoaderOverlay from './components/LoaderOverlay';
import InitialLoader from './components/InitialLoader';
import HeroPage from './components/HeroPage';
import ResearchDetector from './components/ResearchDetector';
import WeatherChecker from './components/WeatherChecker';

// ── Modules list (7 modules) ──────────────────────────────────────────────────
const MODULES = [
  { id: 'news',     icon: '📰', label: 'FAKE NEWS',       desc: 'Verify news claims and statements',      features: ['Real-time fact checking', 'Source credibility analysis', 'Corrected facts provided'],            engine: 'Advanced AI' },
  { id: 'image',    icon: '🖼️', label: 'AI IMAGE',        desc: 'Detect AI-generated images',             features: ['Pixel forensics analysis', 'Content safety scan', 'Artifact detection'],                        engine: 'Vision AI' },
  { id: 'voice',    icon: '🎤', label: 'DEEPFAKE VOICE',  desc: 'Identify synthetic audio',               features: ['Acoustic pattern analysis', 'Frequency examination', 'MFCC feature extraction'],                  engine: 'Web Audio' },
  { id: 'job',      icon: '💼', label: 'FAKE JOB',        desc: 'Spot fraudulent job postings',           features: ['Salary reality check', 'Domain verification', 'Urgency pattern detection'],                      engine: 'Advanced AI' },
  { id: 'fraud',    icon: '🕵️', label: 'FRAUD BEHAVIOR',  desc: 'Detect suspicious user activity',        features: ['Behavioral biometrics', 'Pattern anomaly detection', 'Risk score calculation'],                  engine: 'Advanced AI' },
  { id: 'research', icon: '🔬', label: 'FAKE RESEARCH',   desc: 'Verify research papers and claims',      features: ['Scientific credibility check', 'Methodology analysis', 'Red flag detection'],                    engine: 'Advanced AI' },
  { id: 'weather',  icon: '🌤️', label: 'WEATHER CHECK',   desc: 'Verify weather predictions',             features: ['Real-time OpenWeather data', 'Prediction vs actual', 'Accuracy scoring'],                       engine: 'OpenWeather' },
];

// ── SVGs & helpers ────────────────────────────────────────────────────────────
function ShieldIconSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 56 56" fill="none" style={{ overflow:'visible', flexShrink:0 }}>
      <path d="M28 4L12 12V24C12 36 20 44 28 48C36 44 44 36 44 24V12L28 4Z" fill="rgba(37,99,235,0.08)" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M22 28L26 32L34 24" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="28" r="3" fill="#3b82f6" style={{ animation:'pulse 2s infinite' }}/>
    </svg>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{ background: checked ? '#2563eb' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200"
        style={{ background: '#f0f6ff', left: checked ? '22px' : '4px' }} />
    </button>
  );
}

function NeuralNetworkCanvas({ isDark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const nodeCount = 65;
    const colors = isDark ? ['#3b82f6','#06b6d4','#8b5cf6','#22d3ee'] : ['#1e40af','#0891b2','#7c3aed','#0e7490'];
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const rand = Math.random();
      nodes.push({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        vx:(Math.random()-0.5)*0.45, vy:(Math.random()-0.5)*0.45,
        radius: Math.random()*1.5+1,
        color: rand<0.5?colors[0]:rand<0.75?colors[1]:rand<0.9?colors[2]:colors[3],
        pulse: Math.random()<0.12
      });
    }
    let animId;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // Draw edges + triangles
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        for (let j = i+1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const d12 = Math.sqrt((n.x-n2.x)**2+(n.y-n2.y)**2);
          if (d12 < 130) {
            // Edge
            ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(n2.x,n2.y);
            ctx.strokeStyle=n.color; ctx.globalAlpha=(1-d12/130)*(isDark?0.18:0.22);
            ctx.lineWidth=0.7; ctx.shadowBlur=0; ctx.stroke();
            // Triangle fill when 3rd close node exists
            for (let k = j+1; k < nodes.length; k++) {
              const n3 = nodes[k];
              const d13 = Math.sqrt((n.x-n3.x)**2+(n.y-n3.y)**2);
              const d23 = Math.sqrt((n2.x-n3.x)**2+(n2.y-n3.y)**2);
              if (d13 < 110 && d23 < 110) {
                ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(n2.x,n2.y); ctx.lineTo(n3.x,n3.y); ctx.closePath();
                ctx.fillStyle = n.color;
                ctx.globalAlpha = isDark ? 0.015 : 0.025;
                ctx.fill();
              }
            }
          }
        }
      }
      // Draw nodes on top
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.beginPath(); ctx.arc(n.x,n.y,n.pulse?3.5:n.radius,0,Math.PI*2);
        ctx.fillStyle=n.color; ctx.globalAlpha=n.pulse?1:0.7;
        if (n.pulse) { ctx.shadowBlur=12; ctx.shadowColor=n.color; } else { ctx.shadowBlur=0; }
        ctx.fill();
      }
      ctx.globalAlpha=1; ctx.lineWidth=1;
      animId=requestAnimationFrame(draw);
    };
    draw(); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isDark]);
  return <canvas ref={canvasRef} style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:3, pointerEvents:'none' }} />;
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark'; } catch { return 'dark'; }
  });
  const isDark = theme === 'dark';

  // ── Mouse Tracking Flashlight ──
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Hero page ──────────────────────────────────────────────────────────────
  const [heroShown, setHeroShown] = useState(() => {
    try { return !sessionStorage.getItem('hero_passed'); } catch { return true; }
  });
  const [appLoaded, setAppLoaded] = useState(false);
  const [showApp, setShowApp] = useState(!heroShown);

  const handleHeroComplete = () => {
    try { sessionStorage.setItem('hero_passed', '1'); } catch {}
    setHeroShown(false);
    setShowApp(true);
    showToast('success', 'Welcome to TruthGuard AI!', 'Select a module to begin.');
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const getInitialHistory = () => { try { const d = localStorage.getItem('tg_history'); if (d && d !== 'null') { const p = JSON.parse(d); return Array.isArray(p) ? p : []; } } catch{} return []; };
  const getInitialStats = () => { try { const d = localStorage.getItem('tg_stats'); if (d && d !== 'null') { const p = JSON.parse(d); if (p && typeof p === 'object') return { total:p.total||0, fake:p.fake||0, real:p.real||0 }; } } catch{} return { total:0, fake:0, real:0 }; };

  const [activeModule, setActiveModule] = useState(null);
  const [scanHistory, setScanHistory] = useState(getInitialHistory);
  const [stats, setStats] = useState(getInitialStats);
  const [currentTime, setCurrentTime] = useState({ h:'00', m:'00', s:'00' });
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [newsText, setNewsText] = useState('');
  const [jobText, setJobText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioWaveform, setAudioWaveform] = useState(null);
  const [fraudData, setFraudData] = useState({ logins:2, actionTime:900, deviceChanges:0, geoChanges:false, unusualHours:false, copyPaste:false, multiAccount:false, rapidClicks:false });

  const audioInputRef = useRef(null);

  // Clear inputs and results when switching modules
  useEffect(() => {
    setNewsText('');
    setJobText('');
    setAudioFile(null);
    setAudioWaveform(null);
    setResult(null);
    setFraudData({ logins:2, actionTime:900, deviceChanges:0, geoChanges:false, unusualHours:false, copyPaste:false, multiAccount:false, rapidClicks:false });
  }, [activeModule]);

  // Parse Audio Waveform
  useEffect(() => {
    if (!audioFile) { setAudioWaveform(null); return; }
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await audioCtx.decodeAudioData(e.target.result);
        const channelData = decoded.getChannelData(0);
        const step = Math.ceil(channelData.length / 80); // 80 bars
        const bars = [];
        for (let i = 0; i < 80; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            const idx = i * step + j;
            if (idx < channelData.length) sum += Math.abs(channelData[idx]);
          }
          bars.push(sum / step);
        }
        const max = Math.max(...bars, 0.001);
        setAudioWaveform(bars.map(b => (b / max) * 100)); // normalized 0-100
      } catch (err) {
        console.error("Waveform decode failed", err);
        setAudioWaveform(Array.from({length: 80}).map(() => Math.random() * 50 + 10)); // fallback mock
      }
    };
    fileReader.readAsArrayBuffer(audioFile);
  }, [audioFile]);

  useEffect(() => {
    const tick = () => { const now = new Date(); setCurrentTime({ h:now.getHours().toString().padStart(2,'0'), m:now.getMinutes().toString().padStart(2,'0'), s:now.getSeconds().toString().padStart(2,'0') }); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => { localStorage.setItem('tg_history', JSON.stringify(scanHistory)); }, [scanHistory]);
  useEffect(() => { localStorage.setItem('tg_stats', JSON.stringify(stats)); }, [stats]);

  const showToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, title, message }]);
    const dur = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000;
    setTimeout(() => { setToasts(t => t.filter(x => x.id !== id)); }, dur);
  }, []);

  const runAnalysis = async () => {
    if (activeModule === 'news' && !newsText.trim()) return showToast('warning', 'Empty Input', 'Please enter text to analyze.');
    if (activeModule === 'job' && !jobText.trim()) return showToast('warning', 'Empty Input', 'Please paste a job posting.');
    if (activeModule === 'voice' && !audioFile) return showToast('warning', 'No File', 'Please upload audio.');

    setLoading(true); setResult(null);
    showToast('info', 'Analyzing content', 'Please wait...');
    try {
      const apiKey = '';
      const [res] = await Promise.all([
        (async () => {
          if (activeModule === 'news') return { ...(await analyzeNews(newsText)), inputText: newsText.trim() };
          if (activeModule === 'job') { const r = await analyzeJob(jobText, apiKey); return { ...r, inputText: jobText.trim(), explanation: r.summary + '\n\n' + r.reasons.join('\n') }; }
          if (activeModule === 'voice') { const r = await analyzeVoice(audioFile, apiKey); return { ...r, inputText: `Audio "${audioFile.name}"`, explanation: r.summary + '\n\n' + r.reasons.join('\n') }; }
          if (activeModule === 'fraud') {
            const r = await analyzeFraud(fraudData, apiKey);
            const traits = [`${fraudData.logins} login attempts`, `${fraudData.actionTime}ms action speed`, `${fraudData.deviceChanges} device switch(es)`];
            if (fraudData.geoChanges) traits.push('location jumped');
            if (fraudData.unusualHours) traits.push('active at unusual hours');
            if (fraudData.copyPaste) traits.push('pasted inputs');
            if (fraudData.multiAccount) traits.push('multi-account signals');
            if (fraudData.rapidClicks) traits.push('rapid mechanical clicks');
            return { ...r, inputText: `Behavioral Analysis Profile: ${traits.join(', ')}.`, explanation: (r.summary||'Behavioral reasoning:') + '\n\n' + (r.reasons||[]).map(x => '• '+x).join('\n') };
          }
        })(),
        new Promise(r => setTimeout(r, 1500))
      ]);
      setResult(res);
      showToast('success', 'Analysis complete', 'View results below.');
      const isFake = res.verdict === 'FAKE';
      setStats(s => ({ total:s.total+1, fake:s.fake+(isFake?1:0), real:s.real+(!isFake?1:0) }));
      const mod = MODULES.find(m => m.id === activeModule);
      setScanHistory(h => [{ id:Date.now(), modId:activeModule, name:mod.label, icon:mod.icon, verdict:res.verdict, confidence:res.confidence, input:res.inputText||mod.label, time:new Date().toLocaleTimeString() }, ...h]);
    } catch (e) {
      showToast('error', 'Analysis failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const particles = Array.from({ length: 30 }).map((_,i) => ({
    id:i, size:Math.random()*2+1.5, left:Math.random()*100,
    delay:Math.random()*22, duration:Math.random()*14+11,
    color:Math.random()>0.5?(isDark?'rgba(37,99,235,0.5)':'rgba(37,99,235,0.3)'):(isDark?'rgba(6,182,212,0.4)':'rgba(6,182,212,0.25)')
  }));

  const activeModData = MODULES.find(m => m.id === activeModule);
  const isSpecialModule = activeModule === 'image' || activeModule === 'research' || activeModule === 'weather';

  const navBg = isDark ? 'rgba(2,4,8,0.90)' : 'rgba(238,242,255,0.95)';
  const sidebarBg = isDark ? 'rgba(4,8,16,0.65)' : 'rgba(255,255,255,0.98)';
  // Orb colors adapt to theme
  const orb1 = isDark ? 'rgba(37,99,235,0.22)' : 'rgba(37,99,235,0.14)';
  const orb2 = isDark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.12)';
  const orb3 = isDark ? 'rgba(139,92,246,0.16)' : 'rgba(139,92,246,0.10)';
  const orb4 = isDark ? 'rgba(34,197,94,0.10)'  : 'rgba(34,197,94,0.07)';
  const orb5 = isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)';

  return (
    <>
      {/* ── HERO PAGE ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {heroShown && <HeroPage key="hero" onGetStarted={handleHeroComplete} />}
      </AnimatePresence>

      {/* ── INITIAL LOADER (after hero) ────────────────────────────────────── */}
      <AnimatePresence>
        {showApp && !appLoaded && <InitialLoader key="initial-loader" onComplete={() => setAppLoaded(true)} />}
      </AnimatePresence>

      {/* ── MAIN APP ──────────────────────────────────────────────────────── */}
      {showApp && (
        <motion.div
          initial={{ opacity:0, y:40 }}
          animate={{ opacity: appLoaded ? 1 : 0, y: appLoaded ? 0 : 40 }}
          transition={{ duration:0.6, ease:'easeOut' }}
          className="flex flex-col h-screen w-screen overflow-hidden"
          style={{ background:'var(--bg)' }}
        >
          {/* ══ ADVANCED BACKGROUND SYSTEM ══ */}
          {/* Base fill */}
          <div style={{ position:'fixed', inset:0, zIndex:0, background:'var(--bg)', transition:'background 0.4s ease' }} />

          {/* FLASHLIGHT EFFECT */}
          <div 
            style={{
              position: 'fixed', left: 0, top: 0, width: '100%', height: '100%',
              pointerEvents: 'none', zIndex: 1,
              background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'}, transparent 80%)`,
              transition: 'background 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          />

          {/* 5 drifting mesh-gradient orbs */}
          <div className="bg-orb" style={{ width:700, height:700, top:'-10%', left:'-10%', background:`radial-gradient(circle, ${orb1} 0%, transparent 65%)`, animation:'orbDrift1 22s ease-in-out infinite' }} />
          <div className="bg-orb" style={{ width:600, height:600, top:'30%', right:'-8%', background:`radial-gradient(circle, ${orb2} 0%, transparent 65%)`, animation:'orbDrift2 28s ease-in-out infinite' }} />
          <div className="bg-orb" style={{ width:500, height:500, bottom:'-5%', left:'20%', background:`radial-gradient(circle, ${orb3} 0%, transparent 65%)`, animation:'orbDrift3 18s ease-in-out infinite' }} />
          <div className="bg-orb" style={{ width:350, height:350, top:'50%', left:'40%', background:`radial-gradient(circle, ${orb4} 0%, transparent 65%)`, animation:'orbDrift1 35s ease-in-out infinite 8s' }} />
          <div className="bg-orb" style={{ width:280, height:280, top:'10%', left:'55%', background:`radial-gradient(circle, ${orb5} 0%, transparent 65%)`, animation:'orbDrift2 25s ease-in-out infinite 4s' }} />

          {/* Rotating halo rings centred on screen */}
          <div className="bg-halo bg-halo-outer" />
          <div className="bg-halo bg-halo-mid" />
          <div className="bg-halo bg-halo-inner" />

          {/* Dot-grid overlay */}
          <div className="bg-dotgrid" />

          {/* Hex pattern */}
          <div className="bg-hexgrid" />

          {/* Neural network canvas (nodes + edges + triangles) */}
          <NeuralNetworkCanvas isDark={isDark} />

          {/* Vertical light beams */}
          {[12, 32, 52, 72, 88].map((pos,i) => (
            <div key={`beam-${i}`} style={{ position:'fixed', left:`${pos}%`, top:0, width:'1px', height:'100vh',
              background:`linear-gradient(180deg, transparent 0%, ${['rgba(37,99,235,0.2)','rgba(6,182,212,0.18)','rgba(139,92,246,0.15)','rgba(6,182,212,0.18)','rgba(37,99,235,0.2)'][i]} 50%, transparent 100%)`,
              animation:`beamFade ${[5,7,4,6,8][i]}s ease-in-out infinite ${[0,2.5,1,3.5,1.5][i]}s`, zIndex:4, pointerEvents:'none' }} />
          ))}

          {/* Scan line */}
          <div className="bg-scanline" style={{ top: '20%', animationDelay:'0s' }} />
          <div className="bg-scanline" style={{ top: '60%', animationDelay:'6s', opacity:0.5 }} />

          {/* Floating particles */}
          <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:4, overflow:'hidden' }}>
            {particles.map(p => <div key={p.id} style={{ position:'absolute', left:`${p.left}%`, width:p.size, height:p.size, borderRadius:'50%', background:p.color, boxShadow:`0 0 ${p.size*3}px ${p.color}`, animation:`particleFloat ${p.duration}s linear infinite ${p.delay}s` }} />)}
          </div>

          {loading && <LoaderOverlay module={activeModule} />}
          {result && <ResultModal result={result} onClose={() => setResult(null)} />}

          {/* ── NAVBAR ──────────────────────────────────────────────────── */}
          <nav style={{ flexShrink:0, height:56, zIndex:1000, background:navBg, backdropFilter:'blur(20px) saturate(1.5)', borderBottom:`1px solid var(--border-strong)`, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 24px', transition:'background 0.3s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <ShieldIconSVG />
              <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:24, color:'var(--text)', display:'flex', alignItems:'center', gap:6, paddingTop:4 }}>
                TRUTHGUARD <span style={{ color:'#3b82f6' }}>AI</span>
              </div>
            </div>

            <div className="hidden lg:flex gap-6 items-center" style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} /> SYSTEM: <span style={{ color:'var(--text)' }}>ONLINE</span>
              </div>
              <div style={{ color:'var(--text-muted)' }}>Total Scans: <span style={{ color:'#3b82f6' }}>{stats.total}</span></div>
              <div style={{ color:'var(--text-muted)' }}>Fake: <span style={{ color:'#ef4444' }}>{stats.fake}</span></div>
              <div style={{ color:'var(--text-muted)' }}>Real: <span style={{ color:'#22c55e' }}>{stats.real}</span></div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              {/* Dark/Light toggle */}
              <motion.button
                whileHover={{ scale:1.1 }}
                whileTap={{ scale:0.9 }}
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, transition:'all 0.3s ease' }}>
                {isDark ? '☀️' : '🌙'}
              </motion.button>

              {/* Clock */}
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:13, color:'#3b82f6', letterSpacing:2 }}>
                {currentTime.h}<span style={{ opacity:0.5 }}>:</span>{currentTime.m}<span style={{ opacity:0.5 }}>:</span>{currentTime.s}
              </div>
            </div>
          </nav>

          {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
          <div className="flex-1 flex overflow-hidden relative z-10 w-full">

            {/* ── SIDEBAR ─────────────────────────────────────────────── */}
            <aside style={{ width:300, flexShrink:0, background:sidebarBg, backdropFilter:'blur(24px)', borderRight:`1px solid var(--border-strong)`, display:'flex', flexDirection:'column', zIndex:20, transition:'background 0.4s ease' }} className="overflow-y-auto sidebar-panel">

              <div style={{ padding:'20px 14px 10px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'var(--text-muted)', letterSpacing:3, display:'flex', alignItems:'center', gap:8, marginBottom:14, marginLeft:6 }}>
                  <span>+</span> SELECT MODULE
                </div>
                <div className="flex flex-col gap-2">
                  {MODULES.map(m => {
                    const isActive = activeModule === m.id;
                    return (
                      <div key={m.id} onClick={() => setActiveModule(m.id)}
                        className="module-card"
                        style={{ background:isActive?'rgba(37,99,235,0.1)':'transparent', border:`1px solid ${isActive?'rgba(37,99,235,0.3)':'var(--border)'}`, borderRadius:14, padding:'13px 14px', cursor:'pointer', position:'relative', overflow:'hidden' }}
                        onMouseEnter={e => { if(!isActive) { e.currentTarget.style.background='rgba(37,99,235,0.04)'; e.currentTarget.style.borderColor='rgba(37,99,235,0.15)'; } }}
                        onMouseLeave={e => { if(!isActive) { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='var(--border)'; } }}>
                        {isActive && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:'#3b82f6', borderRadius:'0 2px 2px 0' }} />}
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:isActive?'rgba(37,99,235,0.15)':'rgba(255,255,255,0.03)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{m.icon}</div>
                          <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:17, color:isActive?'var(--text)':'var(--text-secondary)', letterSpacing:1 }}>{m.label}</div>
                        </div>
                        <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:9, color:'#3b82f6', display:'flex', alignItems:'center', gap:5, paddingLeft:2 }}>
                          <span style={{ width:3, height:3, borderRadius:'50%', background:'#3b82f6' }}/> {m.engine}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* History */}
              <div style={{ marginTop:'auto', padding:'20px 14px', borderTop:`1px solid var(--border)` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'var(--text-muted)', letterSpacing:3 }}>+ SCAN HISTORY</div>
                  <button onClick={() => { setScanHistory([]); setStats({total:0,fake:0,real:0}); showToast('warning','History cleared','All scans removed.'); }}
                    style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}
                    onMouseEnter={e=>e.currentTarget.style.color='var(--text)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>Clear</button>
                </div>
                <div className="flex flex-col gap-2">
                  {scanHistory.length === 0 ? (
                    <div style={{ padding:'16px 0', textAlign:'center', color:'var(--text-muted)', fontFamily:"'DM Sans', sans-serif", fontSize:12 }}>No recent scans</div>
                  ) : scanHistory.slice(0, 8).map(h => (
                    <div key={h.id} className="history-card" style={{ background:isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)', borderRadius:10, padding:'10px', border:`1px solid var(--border)`, display:'flex', gap:10 }}>
                      <div style={{ fontSize:14 }}>{h.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                          <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:11, color:'var(--text-secondary)', fontWeight:500 }}>{h.name}</span>
                          <span style={{ background:h.verdict==='FAKE'?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)', color:h.verdict==='FAKE'?'#ef4444':'#22c55e', borderRadius:4, padding:'1px 5px', fontSize:8, fontFamily:"'JetBrains Mono', monospace" }}>{h.verdict}</span>
                        </div>
                        <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:10, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.input}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* ── RIGHT MAIN ──────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto relative z-10 flex flex-col items-center custom-scrollbar"
              style={{ justifyContent:activeModule?'flex-start':'center', padding:activeModule?'50px 24px':'0' }}>

              <AnimatePresence mode="wait">
                {!activeModule ? (
                  // Hero/welcome state
                  <motion.div key="hero-inner" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, y:-20 }} transition={{ duration:0.5 }}
                    className="flex flex-col items-center text-center">
                    <div style={{ marginBottom:24, animation:'float 6s ease-in-out infinite' }}><ShieldIconSVG /></div>
                    <h1 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:'clamp(48px,7vw,100px)', lineHeight:0.9, letterSpacing:4, margin:0, color:'var(--text)', textShadow:isDark?'0 0 40px rgba(255,255,255,0.1)':'none' }}>
                      DETECT FAKE CONTENT
                    </h1>
                    <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:16, color:'#3b82f6', marginTop:16, letterSpacing:1 }}>
                      Powered by Advanced AI · Real-time Analysis
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-8">
                      {['⚡ Instant Analysis','🛡 7 Detection Modules','🤖 AI-Powered'].map((tag,i) => (
                        <div key={i} style={{ background:isDark?'rgba(37,99,235,0.05)':'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:30, padding:'8px 20px', fontFamily:"'DM Sans', sans-serif", fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
                          {tag}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--text-muted)', marginTop:52, letterSpacing:4, opacity:0.7 }} className="animate-pulse">
                      SELECT A MODULE → _
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key={activeModule} initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-30 }} transition={{ duration:0.3 }}
                    className="w-full max-w-3xl main-card"
                    style={{ background:isDark?'rgba(8,15,26,0.78)':'rgba(255,255,255,0.94)', backdropFilter:'blur(32px)', border:`1px solid var(--border-strong)`, borderRadius:24, padding:36 }}>

                    {/* Module header */}
                    <div style={{ textAlign:'center', marginBottom:28 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
                        <span style={{ fontSize:30 }}>{activeModData?.icon}</span>
                        <h2 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:38, color:'var(--text)', margin:0, letterSpacing:2 }}>{activeModData?.label}</h2>
                        <div style={{ background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.2)', color:'#3b82f6', borderRadius:20, padding:'4px 12px', fontSize:11, fontFamily:"'JetBrains Mono', monospace", transform:'translateY(-2px)' }}>{activeModData?.engine}</div>
                      </div>
                      <p style={{ fontFamily:"'DM Sans', sans-serif", fontSize:13, color:'var(--text-muted)', marginTop:6 }}>{activeModData?.desc}</p>
                    </div>

                    {/* Module panel */}
                    <div className="module-card" style={{ background:isDark?'rgba(8,15,26,0.5)':'rgba(0,0,0,0.02)', border:`1px solid var(--border)`, borderRadius:18, padding:28 }}>

                      {/* ── NEWS ── */}
                      {activeModule === 'news' && (
                        <div className="relative group">
                          <textarea 
                            style={{ width:'100%', background:'var(--input-bg)', border:`1px solid var(--border)`, borderRadius:12, padding:'20px 24px', color:'var(--text)', fontFamily:"'DM Sans', sans-serif", fontSize:15, lineHeight:1.6, minHeight:160, resize:'vertical', outline:'none', transition:'all 0.3s ease', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)' }}
                            placeholder="Paste news article, claim, or social media post here for AI verification..." 
                            value={newsText} onChange={e => setNewsText(e.target.value)}
                            onFocus={e => { e.target.style.borderColor='#3b82f6'; e.target.style.boxShadow='0 0 0 4px rgba(59,130,246,0.1), inset 0 4px 20px rgba(0,0,0,0.2)'; e.target.style.background='rgba(37,99,235,0.02)'; }} 
                            onBlur={e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='inset 0 4px 20px rgba(0,0,0,0.2)'; e.target.style.background='var(--input-bg)'; }} 
                          />
                          <div style={{ position:'absolute', top:12, right:16, fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#64748b' }}>TEXT_ANALYSIS</div>
                        </div>
                      )}

                      {/* ── JOB ── */}
                      {activeModule === 'job' && (
                        <div className="relative group">
                          <textarea 
                            style={{ width:'100%', background:'var(--input-bg)', border:`1px solid var(--border)`, borderRadius:12, padding:'20px 24px', color:'var(--text)', fontFamily:"'DM Sans', sans-serif", fontSize:15, lineHeight:1.6, minHeight:160, resize:'vertical', outline:'none', transition:'all 0.3s ease', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.2)' }}
                            placeholder="Paste the suspicious job description or email offer..." 
                            value={jobText} onChange={e => setJobText(e.target.value)}
                            onFocus={e => { e.target.style.borderColor='#8b5cf6'; e.target.style.boxShadow='0 0 0 4px rgba(139,92,246,0.1), inset 0 4px 20px rgba(0,0,0,0.2)'; e.target.style.background='rgba(139,92,246,0.02)'; }} 
                            onBlur={e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='inset 0 4px 20px rgba(0,0,0,0.2)'; e.target.style.background='var(--input-bg)'; }} 
                          />
                          <div style={{ position:'absolute', top:12, right:16, fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#64748b' }}>JOB_SCANNER</div>
                        </div>
                      )}

                      {/* ── VOICE ── */}
                      {activeModule === 'voice' && (
                        <div onClick={() => audioInputRef.current.click()}
                          style={{ border:`2px dashed rgba(6,182,212,0.3)`, borderRadius:16, padding:'50px 20px', textAlign:'center', cursor:'pointer', background:'var(--input-bg)', transition:'all 0.3s ease', position:'relative', overflow:'hidden' }}
                          onMouseEnter={e => { e.currentTarget.style.background=isDark?'rgba(6,182,212,0.05)':'rgba(6,182,212,0.03)'; e.currentTarget.style.borderColor='#06b6d4'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='var(--input-bg)'; e.currentTarget.style.borderColor='rgba(6,182,212,0.3)'; }}>
                          
                          <input ref={audioInputRef} type="file" accept="audio/*" style={{ display:'none' }} onChange={e => setAudioFile(e.target.files[0])} />
                          
                          {audioFile ? (
                            <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} className="flex flex-col items-center w-full">
                              <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(34,197,94,0.1)', color:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>✓</div>
                              <div style={{ color:'#f1f5f9', fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:18 }}>{audioFile.name}</div>
                              <div style={{ color:'#64748b', fontFamily:"'JetBrains Mono', monospace", fontSize:12, marginTop:6 }}>{(audioFile.size/1024).toFixed(1)} KB READY</div>
                              
                              {/* AUDIO WAVEFORM */}
                              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', height: '60px', width: '100%', marginTop: '24px', padding: '0 20px' }}>
                                {audioWaveform ? audioWaveform.map((h, i) => (
                                  <motion.div key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(10, h)}%` }}
                                    transition={{ type: 'spring', delay: i * 0.01 }}
                                    style={{ flex: 1, maxWidth: '4px', background: 'linear-gradient(to top, #06b6d4, #22c55e)', borderRadius: '2px', opacity: 0.8 }}
                                  />
                                )) : (
                                  <div style={{ color: '#06b6d4', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", animation: 'pulse 1s infinite' }}>EXTRACTING ACOUSTICS...</div>
                                )}
                              </div>
                            </motion.div>
                          ) : (
                            <>
                              <motion.div animate={{ y:[0,-10,0] }} transition={{ repeat:Infinity, duration:4, ease:'easeInOut' }} style={{ width:72, height:72, borderRadius:'50%', background:'rgba(6,182,212,0.1)', color:'#06b6d4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px', boxShadow: '0 0 30px rgba(6,182,212,0.15)' }}>
                                🎤
                              </motion.div>
                              <div style={{ color:'#e2e8f0', fontFamily:"'DM Sans', sans-serif", fontSize:18, fontWeight:500, marginBottom:8 }}>Upload Audio Snippet</div>
                              <div style={{ color:'#64748b', fontFamily:"'DM Sans', sans-serif", fontSize:14 }}>Drag & drop or <span style={{ color:'#06b6d4' }}>browse files</span> to verify voice authenticity</div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── FRAUD ── */}
                      {activeModule === 'fraud' && (
                        <div style={{ display:'grid', gap:20 }} className="md:grid-cols-2">
                          <div>
                            {['logins','actionTime'].map(k => (
                              <div key={k} style={{ marginBottom:14 }}>
                                <label style={{ display:'block', marginBottom:6, color:'var(--text-muted)', fontSize:12, fontFamily:"'DM Sans', sans-serif" }}>{k==='logins'?'Login attempts':'Action Speed (ms)'}</label>
                                <input type="number" style={{ width:'100%', background:'var(--input-bg)', border:`1px solid var(--border)`, borderRadius:8, padding:10, color:'var(--text)', outline:'none' }} value={fraudData[k]} onChange={e => setFraudData({...fraudData,[k]:+e.target.value})} onFocus={e=>e.target.style.borderColor='rgba(37,99,235,0.4)'} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                              </div>
                            ))}
                            <div>
                              <label style={{ display:'block', marginBottom:6, color:'var(--text-muted)', fontSize:12, fontFamily:"'DM Sans', sans-serif" }}>Device Changes: <span style={{ color:'var(--text)' }}>{fraudData.deviceChanges}</span></label>
                              <input type="range" min="0" max="10" style={{ width:'100%' }} value={fraudData.deviceChanges} onChange={e => setFraudData({...fraudData,deviceChanges:+e.target.value})} />
                            </div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {Object.keys(fraudData).slice(3).map(k => (
                              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--input-bg)', border:`1px solid var(--border)`, borderRadius:8, padding:'10px 14px' }}>
                                <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:13, color:'var(--text-secondary)' }}>{k}</span>
                                <Toggle checked={fraudData[k]} onChange={v => setFraudData({...fraudData,[k]:v})} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── IMAGE ── */}
                      {activeModule === 'image' && <ImageDetector />}

                      {/* ── RESEARCH ── */}
                      {activeModule === 'research' && <ResearchDetector />}

                      {/* ── WEATHER ── */}
                      {activeModule === 'weather' && <WeatherChecker />}

                      {/* Analyze button (for non-special modules) */}
                      {!isSpecialModule && (
                        <button onClick={runAnalysis} disabled={loading}
                          style={{ width:'100%', height:54, background:'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius:12, border:'none', fontFamily:"'Bebas Neue', cursive", fontSize:20, letterSpacing:3, color:'white', marginTop:22, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all 0.2s' }}
                          onMouseEnter={e => { if(!loading){ e.currentTarget.style.background='linear-gradient(135deg,#3b82f6,#2563eb)'; e.currentTarget.style.boxShadow='0 0 40px rgba(37,99,235,0.4)'; e.currentTarget.style.transform='translateY(-2px)'; } }}
                          onMouseLeave={e => { if(!loading){ e.currentTarget.style.background='linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; } }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', animation:'pulse 1s infinite' }} />
                          {loading ? 'ANALYZING...' : 'ANALYZE NOW'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>

          {/* ── TOAST SYSTEM ─────────────────────────────────────────────── */}
          <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
            <AnimatePresence>
              {toasts.map(t => {
                const isSucc=t.type==='success', isErr=t.type==='error', isWarn=t.type==='warning';
                const bdColor=isSucc?'#22c55e':isErr?'#ef4444':isWarn?'#f59e0b':'#3b82f6';
                const icon=isSucc?'✅':isErr?'❌':isWarn?'⚠️':'ℹ️';
                const dur=isErr?5000:isWarn?4000:3000;
                return (
                  <motion.div key={t.id} initial={{ opacity:0, x:100 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:100 }} transition={{ duration:0.3 }}
                    style={{ minWidth:280, maxWidth:400, background:isDark?'rgba(8,15,26,0.97)':'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.3)', borderLeft:`3px solid ${bdColor}`, position:'relative', overflow:'hidden' }}>
                    <div style={{ fontSize:20 }}>{icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'DM Sans', sans-serif", fontWeight:600, fontSize:14, color:bdColor }}>{t.title}</div>
                      <div style={{ fontFamily:"'DM Sans', sans-serif", fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{t.message}</div>
                    </div>
                    <button onClick={() => setToasts(ts => ts.filter(x=>x.id!==t.id))} style={{ background:'none', border:'none', color:'#334155', fontSize:16, cursor:'pointer', padding:4 }}
                      onMouseEnter={e=>e.currentTarget.style.color='#94a3b8'} onMouseLeave={e=>e.currentTarget.style.color='#334155'}>×</button>
                    <motion.div initial={{ width:'100%' }} animate={{ width:'0%' }} transition={{ duration:dur/1000, ease:'linear' }}
                      style={{ position:'absolute', bottom:0, left:0, height:2, background:bdColor, borderRadius:'0 0 12px 12px' }} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </>
  );
}
