/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Familjen Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: {
          DEFAULT: '#0a1110', // Deep slate-emerald base
          2: '#101a18',       // Slightly elevated card background
          3: '#152421',       // Interactive headers/wells
          card: '#121e1c',    // Elevated card surface
          well: '#0c1513',    // Recessed well surface
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        rule: {
          DEFAULT: 'rgba(52, 211, 153, 0.12)',
          strong: 'rgba(52, 211, 153, 0.22)',
          subtle: 'rgba(52, 211, 153, 0.06)',
        }
      }
    },
  },
  plugins: [],
}
