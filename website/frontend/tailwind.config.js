/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'surface-dark': '#080b10',
        surface:        '#0c1018',
        panel:          '#12161f',
        'panel-light':  '#1a1f2e',
        border:         '#1e2535',
        'border-light': '#2a3448',
        accent:         '#e4ae39',
        'accent-light': '#f0c758',
        'team-t':       '#de9b35',
        'team-ct':      '#5b99d2',
      },
      boxShadow: {
        'glow-accent':    '0 0 25px rgba(228,174,57,0.25), 0 0 60px rgba(228,174,57,0.08)',
        'glow-accent-sm': '0 0 12px rgba(228,174,57,0.2)',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(228,174,57,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(228,174,57,0.03) 1px, transparent 1px)',
        'radial-glow':  'radial-gradient(ellipse at 50% 0%, rgba(228,174,57,0.06) 0%, transparent 60%)',
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease-out',
        'slide-up':   'slide-up 0.4s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
