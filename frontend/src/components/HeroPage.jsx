import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LightPillar from './LightPillar';
import FloatingLines from './FloatingLines';

const LOAD_MESSAGES = [
  'Initializing TruthGuard AI...',
  'Loading detection modules...',
  'Connecting to Analysis API...',
  'Preparing analysis engines...',
  'System ready!',
];

function NeuralCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    const nodes = [];
    const colors = ['#3b82f6', '#06b6d4', '#8b5cf6'];
    for (let i = 0; i < 60; i++) {
      const r = Math.random();
      nodes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, radius: 2, color: r < 0.6 ? colors[0] : r < 0.9 ? colors[1] : colors[2], pulse: Math.random() < 0.12 });
    }
    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.pulse ? 3 : n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color; ctx.globalAlpha = n.pulse ? 1 : 0.6;
        if (n.pulse) { ctx.shadowBlur = 8; ctx.shadowColor = n.color; } else { ctx.shadowBlur = 0; }
        ctx.fill();
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.sqrt((n.x - n2.x) ** 2 + (n.y - n2.y) ** 2);
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = n.color; ctx.globalAlpha = (1 - dist / 130) * 0.12; ctx.shadowBlur = 0; ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1; animId = requestAnimationFrame(draw);
    };
    draw(); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />;
}

function useCountUp(target, duration = 1500, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration, start]);
  return val;
}

const PILLS = ['📰 Fake News', '🖼️ AI Image', '🎤 Deepfake Voice', '💼 Fake Job', '🕵️ Fraud', '🔬 Fake Research', '🌤️ Weather Check'];

const CREATORS = [
  {
    name: 'Thuyavan M',
    role: 'Full-Stack Developer',
    dept: 'CSE 2023 to 2027',
    avatar: 'T',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.35)',
    tags: ['React', 'Node.js', 'Express.js'],
    links: { github: '#', linkedin: '#' }
  },
  {
    name: 'Sandhiya A',
    role: 'AI & UI Developer',
    dept: 'CSE 2023 to 2027',
    avatar: 'S',
    color: '#06b6d4',
    glow: 'rgba(6,182,212,0.35)',
    tags: ['Python', 'UI/UX', 'AI Models'],
    links: { github: '#', linkedin: '#' }
  },
];

export default function HeroPage({ onGetStarted }) {
  const [loading, setLoading] = useState(false);
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setStatsVisible(true), 900); return () => clearTimeout(t); }, []);

  const c7 = useCountUp(7, 1200, statsVisible);
  const c99 = useCountUp(99, 1400, statsVisible);

  const handleGetStarted = () => {
    setLoading(true);
    setLoadProgress(0);
    setLoadMsgIdx(0);
    const msgInterval = setInterval(() => {
      setLoadMsgIdx(i => Math.min(i + 1, LOAD_MESSAGES.length - 1));
    }, 350);
    const startTime = Date.now();
    const progTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setLoadProgress(Math.min(100, Math.round((elapsed / 1800) * 100)));
    }, 30);
    setTimeout(() => {
      clearInterval(msgInterval); clearInterval(progTimer);
      setLoadProgress(100);
      setTimeout(() => { onGetStarted(); }, 400);
    }, 1800);
  };

  return (
    <motion.div
      key="hero"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: '#000',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* ── FloatingLines Background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 60%, #08102a 0%, #020510 60%, #000000 100%)' }}>
        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <FloatingLines
  linesGradient={["#0e1ce1","#2fbfc1","#4af547"]}
  animationSpeed={2.0}
  interactive
  bendRadius={5}
  bendStrength={-1.5}
  mouseDamping={0.05}
  parallax
  parallaxStrength={0.3}
/>
        </div>
      </div>

      {/* Thin dark overlay — just enough to keep text sharp */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 3, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />


      {/* ── Loading overlay ── */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(2,4,8,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
            <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 0.9s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1px solid rgba(6,182,212,0.3)', borderTopColor: '#06b6d4', animation: 'spin 1.4s linear infinite reverse' }} />
              <span style={{ fontSize: 38 }}>🛡️</span>
            </div>
            <div style={{ width: 420, maxWidth: '80vw' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 3, overflow: 'hidden', marginBottom: 16 }}>
                <motion.div animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.1 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #06b6d4, #8b5cf6)', borderRadius: 4 }} />
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={loadMsgIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#60a5fa', textAlign: 'center', margin: 0 }}>
                  {LOAD_MESSAGES[loadMsgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable page content ── */}
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px 80px' }}>

        {/* ══ HERO SECTION ══ */}
        <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(6,182,212,0.12))', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 30, padding: '8px 24px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#60a5fa', letterSpacing: 3, marginBottom: 36, display: 'inline-block' }}>
            🛡️ TRUTHGUARD AI — v2.0
          </motion.div>

          {/* Title lines */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}
            style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(48px, 8vw, 96px)', color: '#f8fafc', lineHeight: 0.95, letterSpacing: 5 }}>
            THE ULTIMATE
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
            style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: 5, background: 'linear-gradient(135deg, #3b82f6, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', backgroundSize: '300% 300%', animation: 'gradientShift 5s ease infinite' }}>
            FAKE DETECTION
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}
            style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(48px, 8vw, 96px)', color: '#f8fafc', lineHeight: 0.95, letterSpacing: 5, marginBottom: 30 }}>
            PLATFORM
          </motion.div>

          {/* Subtitle */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.7 }}
            style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 'clamp(14px, 2vw, 17px)', color: 'rgba(203,213,225,0.72)', maxWidth: 580, lineHeight: 1.85, margin: '0 0 44px 0' }}>
            Powered by Advanced AI to detect fake news, AI-generated images, deepfakes, fraudulent job postings, fake research papers &amp; verify weather predictions.
          </motion.p>

          {/* ── Stats row ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.6 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, width: '100%', maxWidth: 720, marginBottom: 48 }}>
            {[
              { num: `${c7}`, label: 'Detection\nModules', accent: '#3b82f6' },
              { num: `${c99}%`, label: 'Accuracy\nRate', accent: '#06b6d4' },
              { num: '<5S', label: 'Analysis\nSpeed', accent: '#8b5cf6' },
              { num: 'FREE', label: 'API\nAccess', accent: '#22c55e' },
            ].map((s, i) => (
              <motion.div key={i}
                whileHover={{ y: -4, boxShadow: `0 8px 30px ${s.accent}33` }}
                style={{ background: 'rgba(5, 10, 25, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderTop: `2px solid ${s.accent}`, borderRadius: 14, padding: '18px 8px', textAlign: 'center', transition: 'all 0.25s', cursor: 'default' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(28px, 4vw, 44px)', color: s.accent, lineHeight: 1 }}>{s.num}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: '#e2e8f0', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6, lineHeight: 1.4, whiteSpace: 'pre-line', textShadow: '0px 2px 4px rgba(0,0,0,0.7)' }}>{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── GET STARTED button ── */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{ position: 'absolute', inset: -8, borderRadius: 22, border: '1px solid rgba(37,99,235,0.35)', animation: 'ringPulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
              <motion.button
                whileHover={{ y: -3, boxShadow: '0 0 60px rgba(37,99,235,0.6), 0 12px 40px rgba(0,0,0,0.4)' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGetStarted}
                style={{ height: 64, padding: '0 52px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)', borderRadius: 14, border: 'none', fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 4, color: 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 0 40px rgba(37,99,235,0.4), 0 8px 32px rgba(0,0,0,0.3)' }}>
                <span style={{ fontSize: 18 }}>🛡️</span>
                GET STARTED
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ fontSize: 18 }}>→</motion.span>
              </motion.button>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#cbd5e1', margin: 0, textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>No signup required · Completely free</p>
          </motion.div>

          {/* ── Feature pills ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.6 }}
            style={{ marginTop: 44, width: '100%' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {PILLS.map((pill, i) => (
                <motion.div key={i}
                  whileHover={{ y: -2, borderColor: 'rgba(37,99,235,0.6)', color: '#ffffff', background: 'rgba(37,99,235,0.2)' }}
                  style={{ background: 'rgba(5, 10, 25, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '7px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#e2e8f0', cursor: 'default', whiteSpace: 'nowrap', transition: 'all 0.2s', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                  {pill}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ══ DIVIDER ══ */}
        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 1.6, duration: 0.8 }}
          style={{ width: '100%', maxWidth: 700, height: 1, background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.3), rgba(6,182,212,0.3), transparent)', margin: '72px 0 64px' }} />

        {/* ══ CREATORS SECTION ══ */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.7 }}
          style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Section heading */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#3b82f6', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
              ✦ Built by
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(32px, 5vw, 52px)', color: '#f8fafc', margin: 0, letterSpacing: 4 }}>
              THE CREATORS
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#cbd5e1', marginTop: 10, maxWidth: 420, lineHeight: 1.7 }}>
              This project was designed and developed by students passionate about AI &amp; cybersecurity.
            </p>
          </div>

          {/* Creator cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, width: '100%', maxWidth: 680 }}>
            {CREATORS.map((c, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.0 + i * 0.15, duration: 0.6 }}
                whileHover={{ y: -6, boxShadow: `0 16px 48px ${c.glow}` }}
                style={{ background: 'rgba(5, 10, 25, 0.7)', border: `1px solid rgba(255,255,255,0.15)`, borderTop: `3px solid ${c.color}`, borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'all 0.3s', cursor: 'default', backdropFilter: 'blur(12px)' }}>

                {/* Avatar circle */}
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${c.color}33, ${c.color}66)`, border: `2px solid ${c.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontFamily: "'Bebas Neue', cursive", color: c.color, letterSpacing: 0, boxShadow: `0 0 24px ${c.glow}` }}>
                    {c.avatar}
                  </div>
                  {/* Online dot */}
                  <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2px solid #020408', boxShadow: '0 0 8px rgba(34,197,94,0.8)' }} />
                </div>

                {/* Name */}
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, color: '#f8fafc', letterSpacing: 2, marginBottom: 4 }}>{c.name}</div>

                {/* Role badge */}
                <div style={{ background: `${c.color}18`, border: `1px solid ${c.color}44`, borderRadius: 20, padding: '4px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: c.color, letterSpacing: 1, marginBottom: 10 }}>
                  {c.role}
                </div>

                {/* Dept */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#64748b' }}>
                  <span style={{ fontSize: 16 }}>🎓</span>
                  {c.dept}
                </div>

                {/* Divider */}
                <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, transparent, ${c.color}40, transparent)`, margin: '18px 0' }} />

                {/* Tags */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {c.tags.map((tag, ti) => (
                    <span key={ti} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>{tag}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* College badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4, duration: 0.6 }}
            style={{ marginTop: 36, padding: '14px 36px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 40, display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)' }}>
            <span style={{ fontSize: 22 }}>🏛️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>University College of Engineering Kanchipuram (UCEK)</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Dept. of CSE · Academic Project · 2023–2027</div>
            </div>
          </motion.div>

          {/* Project tagline */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6, duration: 0.6 }}
            style={{ marginTop: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#e2e8f0', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 20, height: 1, background: '#e2e8f0' }} />
            Made with ❤️ for a safer digital world
            <span style={{ display: 'inline-block', width: 20, height: 1, background: '#e2e8f0' }} />
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}
