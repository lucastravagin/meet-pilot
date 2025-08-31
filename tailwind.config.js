/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/**/*.js",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'neon-purple': '#A259FF',
        'soft-purple': '#C084FC',
        'deep-purple': '#6D28D9',
        'dark-bg': '#0D0D0D',
        'dark-card': '#1A1A1A',
        'dark-surface': 'rgba(26, 26, 26, 0.8)',
      },
      fontFamily: {
        'system': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '20px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(162, 89, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(162, 89, 255, 0.4)',
      },
    },
  },
  plugins: [],
}
