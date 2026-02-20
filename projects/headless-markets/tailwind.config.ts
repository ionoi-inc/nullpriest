import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg: '#080808',
        surface: '#0f0f0f',
        surface2: '#141414',
        border: '#1e1e1e',
        border2: '#2a2a2a',
        accent: '#00ff88',
        accent2: '#0088ff',
        muted: '#555555',
        muted2: '#888888',
      },
    },
  },
  plugins: [],
};

export default config;