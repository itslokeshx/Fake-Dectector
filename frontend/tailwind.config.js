/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#080b12',
        bg2: '#0d1117',
        card: '#111927',
        elevated: '#162032',
        accent: '#3b82f6',
        'accent-dim': '#1d4ed8',
        danger: '#ef4444',
        success: '#22c55e',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shake: 'shake 0.5s ease-in-out',
        'pop-in': 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        'fade-up': 'fadeUp 0.5s ease forwards',
        'progress-fill': 'progressFill 1.5s ease forwards',
      },
      keyframes: {
        pulseGlow: { '0%,100%': { filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' }, '50%': { filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.9))' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-8px)' }, '40%,80%': { transform: 'translateX(8px)' } },
        popIn: { '0%': { transform: 'scale(0.85)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        progressFill: { '0%': { 'stroke-dasharray': '0 314' }, '100%': { 'stroke-dasharray': 'var(--dash) 314' } },
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12), transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, #111927, #0d1117)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(59,130,246,0.2)',
        'glow-danger': '0 0 40px rgba(239,68,68,0.25)',
        'glow-success': '0 0 40px rgba(34,197,94,0.25)',
      },
    },
  },
  plugins: [],
}
