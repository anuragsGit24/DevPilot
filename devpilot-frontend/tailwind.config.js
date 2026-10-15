/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#e8eef7',
          100: '#c5d4e9',
          200: '#9fb7d9',
          300: '#7599c9',
          400: '#5480be',
          500: '#2d65b3',
          600: '#1e4f9c',
          700: '#1A3055',
          800: '#0F2044',
          900: '#0A1628',
        },
        blue: {
          50:  '#e0f7ff',
          100: '#b3ecff',
          200: '#80dfff',
          300: '#4dd2ff',
          400: '#26c7ff',
          500: '#0093CC',
          600: '#00AEEF',
          700: '#007ab3',
          800: '#005c87',
          900: '#003d5c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'sidebar': '4px 0 16px rgba(0,0,0,0.15)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        'dialog': '0 20px 60px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        'lg': '0.625rem',
        'xl': '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
        'slide-out-right': 'slide-out-right 0.25s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
        'skeleton': 'skeleton-pulse 1.5s ease-in-out infinite',
        'spin-slow': 'spin-slow 1s linear infinite',
      },
    },
  },
  plugins: [],
}
