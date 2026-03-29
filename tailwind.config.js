/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark:    '#0f172a',
        },
      },
      fontFamily: {
        /* Latin (FR / EN) : Outfit — très lisible, moderne, caractères larges */
        sans:   ['Outfit', 'system-ui', 'sans-serif'],
        /* Arabe : Noto Sans Arabic — excellente lisibilité, poids complets */
        arabic: ['Noto Sans Arabic', 'Cairo', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        /* Échelle légèrement agrandie partout */
        'xs':   ['0.78rem',  { lineHeight: '1.4' }],
        'sm':   ['0.875rem', { lineHeight: '1.5' }],
        'base': ['0.9375rem',{ lineHeight: '1.6' }],
        'lg':   ['1.0625rem',{ lineHeight: '1.5' }],
        'xl':   ['1.1875rem',{ lineHeight: '1.4' }],
        '2xl':  ['1.375rem', { lineHeight: '1.35'}],
        '3xl':  ['1.625rem', { lineHeight: '1.3' }],
        '4xl':  ['2rem',     { lineHeight: '1.2' }],
      },
      boxShadow: {
        card:         '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        glass:        '0 8px 32px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' },      to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};