import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiImage, FiMic, FiBriefcase, FiActivity } from 'react-icons/fi';
import { playBootSound, playScanTick } from '../utils/audio';

// ... (keep the rest the same)
const STEPS = [
  "▸ INITIALIZING QUANTUM ANALYSIS ENGINE...",
  "▸ ESTABLISHING SECURE CONNECTION...",
  "▸ EXTRACTING FORENSIC DATA PATTERNS...",
  "▸ RUNNING DEEP NEURAL NETWORK SCAN...",
  "▸ CROSS-REFERENCING GLOBAL DATABASES...",
  "▸ COMPUTING PROBABILITY SCORES...",
  "▸ GENERATING VERDICT..."
];

const ICONS = {
  news: <FiFileText size={36} color="#60a5fa" />,
  image: <FiImage size={36} color="#60a5fa" />,
  voice: <FiMic size={36} color="#60a5fa" />,
  job: <FiBriefcase size={36} color="#60a5fa" />,
  fraud: <FiActivity size={36} color="#60a5fa" />,
  research: <FiFileText size={36} color="#60a5fa" />,
  weather: <FiActivity size={36} color="#60a5fa" />
};

export default function LoaderOverlay({ module }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    playBootSound();
    const iv = setInterval(() => {
      setStepIdx(i => {
        const next = i + 1 < STEPS.length ? i + 1 : i;
        if (next !== i) playScanTick();
        return next;
      });
    }, 700);
    return () => clearInterval(iv);
  }, []);

  // Extra HUD noise
  const MOCK_IP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.X`;
  
  return createPortal(
    <motion.div
      className="fixed inset-0 flex items-center justify-center pointer-events-auto"
      style={{ 
        zIndex: 9999, 
        background: 'radial-gradient(ellipse at center, rgba(8,15,30,0.9) 0%, rgba(2,4,8,0.98) 100%)', 
        backdropFilter: 'blur(16px)'
      }}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      {/* SHARP LASER SCANNER EFFECT */}
      <div 
        style={{ 
          position: 'absolute', left: 0, right: 0, height: '3px', zIndex: 1, pointerEvents: 'none',
          background: '#06b6d4',
          boxShadow: '0 0 25px 8px rgba(6,182,212,0.6), inset 0 0 10px #fff',
          animation: 'laserSweep 2.5s cubic-bezier(0.25, 1, 0.5, 1) infinite alternate'
        }}
      />
      <div 
        style={{ 
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent, rgba(37,99,235,0.05) 50%, transparent)',
          backgroundSize: '100% 200%',
          animation: 'scanDrop 3s linear infinite'
        }}
      />
      <style>
        {`
          @keyframes dataFall {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { top: 110%; opacity: 0; }
          }
          @keyframes laserSweep {
            0% { top: 5%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 95%; opacity: 0.2; }
          }
          @keyframes scanDrop {
            0% { background-position: 0 -100vh; }
            100% { background-position: 0 100vh; }
          }
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 40px rgba(37,99,235,0.2) }
            50% { box-shadow: 0 0 80px rgba(6,182,212,0.5) }
          }
          .tech-circle { border-radius: 50%; position: absolute; inset: 0; }
        `}
      </style>

      {/* TECH CORNERS */}
      <div style={{ position:'absolute', top:30, left:30, borderTop:'2px solid #3b82f6', borderLeft:'2px solid #3b82f6', width:40, height:40 }} />
      <div style={{ position:'absolute', top:30, right:30, borderTop:'2px solid #3b82f6', borderRight:'2px solid #3b82f6', width:40, height:40 }} />
      <div style={{ position:'absolute', bottom:30, left:30, borderBottom:'2px solid #3b82f6', borderLeft:'2px solid #3b82f6', width:40, height:40 }} />
      <div style={{ position:'absolute', bottom:30, right:30, borderBottom:'2px solid #3b82f6', borderRight:'2px solid #3b82f6', width:40, height:40 }} />

      {/* FLOATING HUD DATA */}
      <div style={{ position:'absolute', top:40, left:80, fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#3b82f6', opacity:0.6 }}>
        <div>SYS.TRUTHGUARD_AI // v2.0</div>
        <div>NODE: {MOCK_IP}</div>
        <div style={{ animation:'pulse 1s infinite' }}>[ SECURE CONNECTION ]</div>
      </div>
      <div style={{ position:'absolute', bottom:40, right:80, fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#3b82f6', opacity:0.6, textAlign:'right' }}>
        <div>TARGET_MODULE: {module?.toUpperCase() || 'UNKNOWN'}</div>
        <div>MEM_ALLOC: OK</div>
      </div>

      <div className="flex flex-col items-center relative z-10" style={{ transform: 'scale(1.1)' }}>
        
        {/* ADVANCED SPINNER */}
        <div className="relative flex items-center justify-center p-8" style={{ width: 180, height: 180, animation: 'pulseGlow 2s infinite', borderRadius: '50%' }}>
          {/* Outer dashed ring */}
          <div className="tech-circle" style={{ border: '2px dashed rgba(6,182,212,0.3)', animation: 'spin 12s linear infinite reverse' }} />
          {/* Middle double-border ring */}
          <div className="tech-circle" style={{ inset: 12, borderTop: '3px solid #3b82f6', borderBottom: '3px solid #2563eb', borderLeft: '1px solid transparent', borderRight: '1px solid transparent', animation: 'spin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }} />
          {/* Inner solid ring */}
          <div className="tech-circle" style={{ inset: 26, border: '2px solid rgba(139,92,246,0.2)', borderLeftColor: '#8b5cf6', animation: 'spin 1.5s linear infinite' }} />
          {/* Core glow */}
          <div className="tech-circle" style={{ inset: 36, background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              {ICONS[module] || ICONS.news}
            </motion.div>
          </div>
        </div>

        {/* STATUS TEXT BOX */}
        <div className="mt-[40px] text-center" style={{ width: 400, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 12, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top:0, left:0, height:2, background: 'linear-gradient(90deg, #2563eb, #06b6d4)', animation: 'progressFill 5s ease forwards', width: '20%' }} />
          
          <div className="h-5 relative w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div 
                key={stepIdx} 
                className="absolute inset-0 flex items-center justify-center"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#60a5fa', letterSpacing: 1 }}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} 
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
              >
                {STEPS[stepIdx]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        {/* SEGMENTED PROGRESS BAR */}
        <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div 
              key={i} 
              style={{ 
                width: 16, height: 6, borderRadius: 2, 
                background: i < (stepIdx * 2 + 1) ? '#06b6d4' : 'rgba(255,255,255,0.05)',
                boxShadow: i < (stepIdx * 2 + 1) ? '0 0 10px rgba(6,182,212,0.6)' : 'none',
                transition: 'all 0.4s ease'
              }} 
            />
          ))}
        </div>
        
      </div>
    </motion.div>,
    document.body
  );
}
