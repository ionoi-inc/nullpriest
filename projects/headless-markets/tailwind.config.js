/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#0f0f0f',
        border: '#1e1e1e',
        text: '#e8e8e8',
        muted: '#555',
        accent: '#00ff88',
        accent2: '#0088ff',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};