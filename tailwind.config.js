/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: {
          700: '#262a33',
          800: '#1a1d24',
          850: '#15181e',
          900: '#111317',
          950: '#0b0c0f',
        },
      },
      boxShadow: {
        soft: '0 20px 50px -20px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
