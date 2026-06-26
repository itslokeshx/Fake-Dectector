import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function ShieldIconSVG({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" style={{ overflow: 'visible', flexShrink: 0 }}>
      <path d="M28 4L12 12V24C12 36 20 44 28 48C36 44 44 36 44 24V12L28 4Z" fill="rgba(37,99,235,0.08)" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M22 28L26 32L34 24" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="28" r="3" fill="#3b82f6" style={{ animation: 'pulse 2s infinite' }}/>
    </svg>
  );
}

export default function InitialLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  const texts = [
    'INITIALIZING SYSTEM COROUTINES...',
    'ESTABLISHING NEURAL UPLINK...',
    'LOADING DEEPFAKE DETECTION MODELS...',
    'VERIFYING SYSTEM INTEGRITY...',
    'SYSTEM ONLINE // READY'
  ];

  useEffect(() => {
    const duration = 2500; // 2.5 seconds total loading time
    const start = Date.now();
    
    // Disable scrolling while loading
    document.body.style.overflow = 'hidden';
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);

      if (p < 25) setTextIndex(0);
      else if (p < 50) setTextIndex(1);
      else if (p < 75) setTextIndex(2);
      else if (p < 95) setTextIndex(3);
      else setTextIndex(4);

      if (p === 100) {
        clearInterval(interval);
        setTimeout(() => {
          document.body.style.overflow = 'auto'; // allow scrolling again
          onComplete();
        }, 400);
      }
    }, 30);
    return () => {
      clearInterval(interval);
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#020408]"
    >
      {/* Background Hex Pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,<svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'56\\\' height=\\\'100\\\'><polygon points=\\\'28,2 54,16 54,44 28,58 2,44 2,16\\\' fill=\\\'none\\\' stroke=\\\'rgba(37,99,235,0.04)\\\' stroke-width=\\\'0.5\\\'/><polygon points=\\\'28,52 54,66 54,94 28,108 2,94 2,66\\\' fill=\\\'none\\\' stroke=\\\'rgba(37,99,235,0.04)\\\' stroke-width=\\\'0.5\\\'/></svg>")', backgroundSize: '56px 100px', animation: 'hexDrift 40s linear infinite', zIndex: 0, pointerEvents: 'none' }}></div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 relative"
        >
          {/* Subtle Glow Behind Icon */}
          <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20 rounded-full"></div>
          <ShieldIconSVG size={80} />
        </motion.div>

        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, color: '#f0f6ff', letterSpacing: '4px', margin: 0, textShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}>
          TRUTHGUARD <span style={{ color: '#3b82f6' }}>AI</span>
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#64748b', marginTop: 4, letterSpacing: '2px', textTransform: 'uppercase' }}>
          Advanced Fraud Detection Engine
        </p>

        <div className="w-full mt-10 h-1 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ 
              background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              boxShadow: '0 0 10px #3b82f6, 0 0 20px #06b6d4'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        <div className="mt-4 flex justify-between w-full text-xs font-mono tracking-widest items-center" style={{ color: '#94a3b8' }}>
          <span className="truncate flex-1">{texts[textIndex]}</span>
          <span className="text-[#3b82f6] ml-4 font-bold">{Math.floor(progress)}%</span>
        </div>
      </div>
    </motion.div>
  );
}
