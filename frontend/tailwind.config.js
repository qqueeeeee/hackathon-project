/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0C0C0E',
        surface: '#141416',
        surface2: '#1C1C1F',
        border: '#2A2A2D',
        'border-hover': '#3A3A3F',
        accent: '#4F6EF7',
        'accent-hover': '#3D5BE0',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: '#FAFAFA',
        'text-secondary': '#A1A1AA',
        'text-muted': '#52525B',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
