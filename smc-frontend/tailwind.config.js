/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: '#1E1B4B',
          900: '#272263',
          600: '#4F46E5',
          100: '#E0E7FF',
        },
        or: {
          400: '#FACC15',
          100: '#FEF9C3',
        },
        creme: {
          50: '#FFFCF2',
        },
        encre: {
          900: '#211C33',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
