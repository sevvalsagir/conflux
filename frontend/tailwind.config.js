/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base:     'var(--bg-base)',
          card:     'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          border:   'var(--border)',
        },
        accent: {
          green: '#7EE787',
          'green-dim': '#4ade6e',
          orange: '#F5A524',
          'orange-dim': '#d4891a',
        },
        status: {
          draft: '#6b7280',
          submitted: '#3b82f6',
          analyzing: '#8b5cf6',
          under_review: '#f59e0b',
          approved: '#7EE787',
          rejected: '#ef4444',
          deferred: '#f97316',
          in_progress: '#06b6d4',
          done: '#22c55e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
