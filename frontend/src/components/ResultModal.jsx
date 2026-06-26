import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiInfo, FiCheckCircle, FiCopy, FiGlobe, FiExternalLink } from 'react-icons/fi';
import { playSuccessChime, playErrorBuzzer } from '../utils/audio';

// ── Animated confidence circle ────────────────────────────────────────────────
function CircularConfidence({ value, color }) {
  const size = 180;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* background track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        {/* animated fill */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-lg">
        <motion.span
          className="font-bold leading-none"
          style={{ color, fontSize: 48, fontFamily: "'Bebas Neue', cursive", textShadow: `0 0 7px ${color}80` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
        >
          {value}%
        </motion.span>
        <span className="text-[10px] tracking-[3px] mt-2 font-mono font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
          CONFIDENCE
        </span>
      </div>
    </div>
  );
}

// ── Main Result Modal Component ─────────────────────────────────────────────
export default function ResultModal({ result, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const pieCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartRef = useRef(null);

  // Load Chart.js
  useEffect(() => {
    if (window.Chart) {
      setChartJsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => setChartJsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Play result sound on mount
  useEffect(() => {
    if (result && result.verdict === 'FAKE') {
      playErrorBuzzer();
    } else {
      playSuccessChime();
    }
  }, [result]);

  // Render charts
  useEffect(() => {
    if (!result || !result.data_points || !window.Chart || !chartJsLoaded) return;
    
    // Normalize data
    const labels = result.data_points.labels || [];
    const values = (result.data_points.values || []).map(v => {
      if (typeof v === 'number') return v;
      return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
    });

    if (!labels.length || !values.length) return;

    // Destroy old instances
    if (pieChartRef.current) pieChartRef.current.destroy();
    if (barChartRef.current) barChartRef.current.destroy();
    if (lineChartRef.current) lineChartRef.current.destroy();

    const colors = result.verdict === 'FAKE'
      ? ['#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d']
      : ['#22c55e','#16a34a','#15803d','#166534','#14532d'];

    // PIE (doughnut)
    if (pieCanvasRef.current) {
      pieChartRef.current = new window.Chart(pieCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: '#0f1318',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1500 },
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#94a3b8',
                font: { family: 'DM Sans', size: 12 },
                padding: 16
              }
            }
          }
        }
      });
    }

    // BAR
    if (barCanvasRef.current) {
      barChartRef.current = new window.Chart(barCanvasRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: result.verdict === 'FAKE'
              ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)',
            borderColor: result.verdict === 'FAKE' ? '#ef4444' : '#22c55e',
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1200 },
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: '#64748b', font: { size: 11 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              ticks: { color: '#64748b', font: { size: 11 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            }
          }
        }
      });
    }

    // LINE
    if (lineCanvasRef.current) {
      lineChartRef.current = new window.Chart(lineCanvasRef.current, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            borderColor: result.verdict === 'FAKE' ? '#ef4444' : '#22c55e',
            backgroundColor: result.verdict === 'FAKE' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: result.verdict === 'FAKE' ? '#ef4444' : '#22c55e',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1300 },
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: '#64748b', font: { size: 11 } },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              min: 0,
              max: 100,
              ticks: { color: '#64748b' },
              grid: { color: 'rgba(255,255,255,0.04)' }
            }
          }
        }
      });
    }

    return () => {
      if (pieChartRef.current) pieChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
      if (lineChartRef.current) lineChartRef.current.destroy();
    }
  }, [result, chartJsLoaded]);

  // Safely extract data
  const isFake = result.verdict === 'FAKE';
  const isPartiallyTrue = result.verdict === 'PARTIALLY TRUE';
  const isUnverified = result.verdict === 'UNVERIFIED';
  const confidence = result.confidence || 0;
  const explanation = result.explanation || 'No explanation provided.';
  const correctedFact = result.corrected_fact;
  const inputText = result.input_text || result.newsText || result.inputText || 'No input text provided.';
  const sourcesUsed = result.sources_used || [];
  const webSearch = result.web_search || false;
  const webSearchSummary = result.web_search_summary || null;
  
  const showCharts = result && result.data_points && result.data_points.labels && result.data_points.labels.length > 0;

  // Colors based on instruction
  const RED = '#ef4444';
  const GREEN = '#22c55e';
  const ORANGE = '#f97316';
  const YELLOW = '#eab308';
  
  let COLOR = GREEN;
  if (isFake) COLOR = RED;
  else if (isPartiallyTrue) COLOR = ORANGE;
  else if (isUnverified) COLOR = YELLOW;
  
  // Theme Variables
  const shadowGlow = `0 0 20px ${COLOR}20, 0 0 40px ${COLOR}0a`;
  const borderGrad = `linear-gradient(135deg, ${COLOR}60, ${COLOR}08)`;

  // Entrance animation variations
  const variants = {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.6, type: 'spring', bounce: 0.4 }
    },
    shake: {
      opacity: 1, scale: 1, y: 0,
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.6, type: 'spring' }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1050] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
        style={{ background: 'rgba(0, 5, 15, 0.90)', backdropFilter: 'blur(20px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="relative w-[98%] max-w-[1400px] my-auto transition-all duration-300"
          style={{
            background: 'linear-gradient(160deg, #090e17, #03050a)',
            borderRadius: 24,
            padding: 2, // Space for gradient border
            boxShadow: shadowGlow,
          }}
          initial="hidden"
          animate={isFake ? 'shake' : 'visible'}
          variants={variants}
          whileHover={{ y: -5, boxShadow: isFake ? `0 20px 80px rgba(239, 68, 68, 0.25)` : `0 20px 80px rgba(34, 197, 94, 0.15)` }}
          onClick={() => setExpanded(true)}
        >
          {/* Gradient Border Wrapper */}
          <div className="absolute inset-0 rounded-[24px] pointer-events-none" style={{ background: borderGrad, opacity: 0.5 }} />

          {/* Inner Content Container */}
          <div className="relative h-full rounded-[22px] overflow-hidden" style={{ background: '#070a12' }}>
            
            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top left, ${COLOR}, transparent 70%)` }} />
              
              <div className="relative z-10 flex items-center gap-5">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-bold tracking-[4px] uppercase" style={{ color: COLOR, fontFamily: "'Bebas Neue', cursive" }}>
                    {(() => {
                      const prefix = isFake ? '❌ ' : isPartiallyTrue ? '⚠️ ' : isUnverified ? '🔍 ' : '✅ ';
                      const fallbackText = isFake ? 'FAKE DETECTED' : isPartiallyTrue ? 'PARTIALLY TRUE' : isUnverified ? 'UNVERIFIED' : 'REAL';
                      return prefix + (result.customTitle || fallbackText);
                    })()}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    {isFake && (
                      <span className="badge text-[10px] font-mono border" style={{ color: '#ef4444', borderColor: '#ef444440', background: '#ef444410' }}>
                        🚩 HIGH RISK
                      </span>
                    )}
                    {result.adult_content && (
                      <span className="badge text-[10px] font-mono border" style={{ color: '#f97316', borderColor: '#f9731640', background: '#f9731610' }}>
                        🔞 ADULT CONTENT
                      </span>
                    )}
                    {result.fake_content && (
                      <span className="badge text-[10px] font-mono border" style={{ color: '#ef4444', borderColor: '#ef444440', background: '#ef444410' }}>
                        ⚠️ FAKE CONTENT
                      </span>
                    )}
                    {webSearch && (
                      <span className="badge text-[10px] font-mono border" style={{ color: '#3b82f6', borderColor: '#3b82f640', background: '#3b82f610' }}>
                        🌐 WEB VERIFIED
                      </span>
                    )}
                    {result.grounded && (
                      <span className="badge text-[10px] font-mono border" style={{ color: '#06b6d4', borderColor: '#06b6d440', background: '#06b6d410' }}>
                        🔗 GROUNDED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const report = `TruthGuard AI Report\nVerdict: ${result.verdict}\nConfidence: ${result.confidence || 0}%\nExplanation: ${result.explanation || 'N/A'}`;
                    navigator.clipboard.writeText(report);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                >
                  {copied ? <span className="text-emerald-400">✓ Copied!</span> : <><FiCopy /> Copy Report</>}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 hover:border-white/30"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Layout Body */}
            <div className="px-8 pb-8 flex flex-col gap-8">
              
              {/* Top Row: Input, Explanation & Confidence */}
              <div className="flex flex-col md:flex-row gap-8">
                
                {/* Left Column (Input & Explanation) */}
                <div className="flex-1 space-y-6">
                  
                  {/* Input Text */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[3px] font-mono mb-2">Analyzed Content</p>
                    <div className="p-5 rounded-2xl italic text-lg leading-relaxed shadow-inner border"
                      style={{ 
                        background: isFake ? 'rgba(239,68,68,0.02)' : 'rgba(255,255,255,0.02)', 
                        borderColor: isFake ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
                        color: isFake ? '#fca5a5' : '#e2e8f0'
                      }}>
                      "{inputText}"
                    </div>
                  </motion.div>

                  {/* Explanation */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[3px] font-mono mb-2 flex items-center gap-2">
                      <FiInfo /> AI Reasoning
                    </p>
                    <div className="p-5 rounded-2xl text-[15px] leading-relaxed border"
                      style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                      {explanation}
                    </div>
                  </motion.div>

                  {/* Corrected Fact (FAKE or PARTIALLY TRUE) */}
                  {(isFake || isPartiallyTrue) && correctedFact && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
                      <div className="p-5 rounded-2xl relative overflow-hidden"
                        style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#22c55e' }} />
                        <p className="text-xs uppercase tracking-[2px] font-mono mb-2 flex items-center gap-2" style={{ color: '#22c55e' }}>
                          <FiCheckCircle size={14} /> ✔ Correct Information
                        </p>
                        <p className="text-base leading-relaxed font-medium" style={{ color: '#ecfdf5' }}>
                          {correctedFact}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Web Sources Consulted */}
                  {(webSearch || sourcesUsed.length > 0) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                      <div className="p-5 rounded-2xl relative overflow-hidden"
                        style={{ background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#3b82f6' }} />
                        <p className="text-xs uppercase tracking-[2px] font-mono mb-3 flex items-center gap-2" style={{ color: '#3b82f6' }}>
                          <FiGlobe size={14} /> Web Sources Consulted
                        </p>

                        {/* Search pipeline stats */}
                        {webSearchSummary && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {webSearchSummary.ddg_results > 0 && (
                              <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.2)' }}>
                                🔍 DuckDuckGo: {webSearchSummary.ddg_results}
                              </span>
                            )}
                            {webSearchSummary.wiki_results > 0 && (
                              <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                                📚 Wikipedia: {webSearchSummary.wiki_results}
                              </span>
                            )}
                            {webSearchSummary.factcheck_results > 0 && (
                              <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                                🕵️ Fact-Check Sites: {webSearchSummary.factcheck_results}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Source links */}
                        {webSearchSummary?.sources?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {webSearchSummary.sources.slice(0, 5).map((src, i) => (
                              <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm transition-colors hover:text-blue-400 group"
                                style={{ color: '#94a3b8', textDecoration: 'none' }}>
                                <FiExternalLink size={12} className="flex-shrink-0" style={{ color: '#3b82f6' }} />
                                <span className="truncate" style={{ maxWidth: '90%' }}>
                                  {src.title || src.url}
                                </span>
                                {src.source && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                                    {src.source}
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Gemini sources (from AI response) */}
                        {sourcesUsed.length > 0 && !webSearchSummary?.sources?.length && (
                          <div className="flex flex-col gap-2">
                            {sourcesUsed.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm transition-colors hover:text-blue-400"
                                style={{ color: '#94a3b8', textDecoration: 'none' }}>
                                <FiExternalLink size={12} className="flex-shrink-0" style={{ color: '#3b82f6' }} />
                                <span className="truncate">{url}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Right Column (Confidence) */}
                <div className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col gap-6">
                  
                  {/* Confidence Circle */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="p-8 rounded-3xl border glass-elevated flex flex-col items-center justify-center relative overflow-hidden h-full"
                    style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at center, ${COLOR}, transparent 70%)` }} />
                    <CircularConfidence value={confidence} color={COLOR} />
                  </motion.div>

                </div>
              </div>

              {/* Bottom Row: Charts Grid */}
              {showCharts && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full"
                >
                  <div style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px' }}>
                    <p className="text-[#f1f5f9] font-['Bebas_Neue'] text-lg tracking-widest mb-4 uppercase">
                      Accuracy by Metric
                    </p>
                    <div className="relative h-[220px] w-full">
                      <canvas ref={lineCanvasRef} />
                    </div>
                  </div>

                  <div style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px' }}>
                    <p className="text-[#f1f5f9] font-['Bebas_Neue'] text-lg tracking-widest mb-4 uppercase">
                      Data Breakdown
                    </p>
                    <div className="relative h-[220px] w-full">
                      <canvas ref={pieCanvasRef} />
                    </div>
                  </div>

                  <div style={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px' }}>
                    <p className="text-[#f1f5f9] font-['Bebas_Neue'] text-lg tracking-widest mb-4 uppercase">
                      Comparison Metrics
                    </p>
                    <div className="relative h-[220px] w-full">
                      <canvas ref={barCanvasRef} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>



          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
