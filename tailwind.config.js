/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: '#12151b',
        line: '#262c36',
        ink: '#0b0d10',
        slate: { 50: '#161a21', 100: '#1c212a', 200: '#282e39', 300: '#3a414e', 400: '#5b6372', 500: '#8a93a3', 600: '#aab2c0', 700: '#c8cfdb', 800: '#dfe4ec', 900: '#f2f4f8' },
        red: { 50: '#2a1214', 100: '#3a171a', 500: '#ef4444', 600: '#f87171', 700: '#fca5a5' },
        amber: { 50: '#2a2110', 100: '#3a2d14', 400: '#fbbf24', 700: '#fcd34d' },
        brand: {
          50: '#0d1f19',
          100: '#11291f',
          200: '#174b39',
          300: '#5fc9a0',
          400: '#2fae83',
          500: '#007454',
          600: '#0a9470',
          700: '#8ee6c3',
          800: '#b7f2da',
          900: '#002f22',
        },
      },
      boxShadow: {
        panel: '0 24px 60px -28px rgba(0, 116, 84, 0.28)',
        soft: '0 10px 30px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
