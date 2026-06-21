/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — Pantone oficiales D'MARIO
        green:   { DEFAULT: '#183029', dark: '#0F201B', soft: '#244A3D' },
        gold:    { DEFAULT: '#58595B', soft: '#E1E1E0' },
        accent:  { DEFAULT: '#E75300', soft: '#FBE3D5' },
        navy:    '#00263D',
        // Superficie
        ivory:   '#F4F2EC',
        cream:   '#FAF8F2',
        paper:   '#FFFFFF',
        ink:     { DEFAULT: '#1A1F1D', soft: '#585A59', mute: '#8A8D8B' },
        rule:    '#E3E0D7',
        // Semántica
        risk:    { DEFAULT: '#A23314', soft: '#F6E1D6' },
        ok:      { DEFAULT: '#2F7D55', soft: '#DCEAE1' },
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        sans:    ['Hanken Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        brand: '3px',
        card:  '4px',
      },
    },
  },
  plugins: [],
};
