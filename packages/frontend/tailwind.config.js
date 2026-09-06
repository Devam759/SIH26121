/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        oil: {
          red: '#ED1C24',
          'red-hover': '#D31E2A',
          'red-dark': '#8E1218',
          'red-deep': '#3A0B10',
          gold: '#EAA824',
          'gold-dark': '#B47B16',
          'gold-deep': '#3D2806',
          bg: '#0F1216',
          panel: '#161B22',
          card: '#1D232C',
          border: '#2E3642',
          borderLight: '#3E4856',
        },
      },
    },
  },
  plugins: [],
};
