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
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        navy: {
          900: '#12355B', // Primary Navy Blue
          800: '#1A497D', // Slightly lighter primary
          700: '#2F6690', // Secondary Steel Blue
          600: '#3A7CA5',
          200: '#D6DEE8', // Light Steel border color
          100: '#E8EFF5', // Steel Blue Light BG
          50: '#F7F9FC',  // Main light background
        },
        successGreen: '#2D6A4F',
        warningAmber: '#D97706',
        dangerRed: '#C62828',
        slate: {
          150: '#e8edf4',
          205: '#dce3ed',
          250: '#c0c9d6',
          350: '#8d9bb0',
          450: '#6b7a93',
          550: '#4e5d73',
          650: '#3c4a5e',
          705: '#323e4f',
          750: '#2a3547',
          850: '#172033',
          905: '#0e1626',
          955: '#080e1a',
        },
        rose: {
          405: '#f4365c',
          450: '#eb3d5c',
        },
        emerald: {
          450: '#2dd4a0',
        },
        sky: {
          350: '#5cc0f2',
        },
      },
    },
  },
  plugins: [],
}
