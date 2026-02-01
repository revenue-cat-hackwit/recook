/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        visby: ['VisbyCF-Regular'],
        'visby-medium': ['VisbyCF-Medium'],
        'visby-bold': ['VisbyCF-DemiBold'],
      },
      colors: {
        primary: '#8BD65E',
      },
    },
  },
  plugins: [],
};
