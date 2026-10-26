const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Colour ramp backed by CSS variables, so themes can swap the palette at runtime
const ramp = (name) =>
  Object.fromEntries(STEPS.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: ramp('accent'),
        primary: ramp('accent'),
        blue: ramp('accent'),
        indigo: ramp('accent2'),
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        gov: {
          emerald: '#059669',
          amber: '#d97706',
          rose: '#e11d48',
          blue: '#1d4ed8',
          indigo: '#4338ca',
          cyan: '#0891b2',
        }
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
