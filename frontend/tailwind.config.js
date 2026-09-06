/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07090E',
          900: '#0D111A',
          850: '#121724',
          800: '#182032',
          700: '#222D46',
          600: '#324163',
        },
        brand: {
          light: '#34D399',
          DEFAULT: '#10B981',
          dark: '#059669',
          neon: '#00F59B',
        },
        cyanGlow: '#06B6D4',
        amberGlow: '#F59E0B',
      },
      boxShadow: {
        'glow-brand': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
