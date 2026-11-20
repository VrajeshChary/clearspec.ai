/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        void: '#04070d',
        paper: {
          DEFAULT: '#070b13', // Deep obsidian with blue-black tint
          2: '#0c121e',       // Glass card surface
          3: '#131b2c',       // Elevated panel / header
          card: '#0f1726',    // Card interior
          well: '#080d16',    // Inset input / well
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
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
          subtle: 'rgba(255, 255, 255, 0.04)',
          emerald: 'rgba(16, 185, 129, 0.25)',
          red: 'rgba(244, 63, 94, 0.25)',
          amber: 'rgba(245, 158, 11, 0.25)',
        }
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.35)',
        'glow-red': '0 0 25px -4px rgba(244, 63, 94, 0.35)',
        'glow-amber': '0 0 25px -4px rgba(245, 158, 11, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.35)',
        'glass-bevel': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'laser-scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      animation: {
        'laser-scan': 'laser-scan 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
