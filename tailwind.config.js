/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "'Poppins'", "'Inter'", 'sans-serif'],
      },
      colors: {
        primary: '#5f6fff',
        accent: '#00ff99',
        cyan: '#00d4ff',
        background: '#0a0a12',
        surface1: '#181a2a',
        surface2: '#23244a',
        white: '#fff',
        slate: {
          DEFAULT: '#4A4A4A',
          light: '#9CA3AF',
        },
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        glow: '0 0 32px 0 #5f6fff, 0 0 8px 0 #00d4ff',
        'glow-orangeblue': '0 0 32px 0 #a259ff, 0 0 8px 0 #5f6fff',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 1s ease both',
        'fade-in-up': 'fade-in-up 1s .2s cubic-bezier(.4,0,.2,1) both',
        'fade-in-down': 'fade-in-down 1s .2s cubic-bezier(.4,0,.2,1) both',
        float: 'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
