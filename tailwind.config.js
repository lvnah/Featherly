/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: '#ffffff',
        line: '#e2e8f0',
        ink: '#0b1410',
        brand: {
          50: '#eef8f4',
          100: '#d3eee3',
          200: '#a8dfc9',
          300: '#6cc9a6',
          400: '#2fae83',
          500: '#007454',
          600: '#00634a',
          700: '#00523d',
          800: '#00412f',
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
