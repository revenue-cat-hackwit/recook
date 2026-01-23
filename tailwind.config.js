/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        visby: ['VisbyCF-Regular'],
        'visby-medium': ['VisbyCF-Medium'],
        'visby-bold': ['VisbyCF-Bold'],
      },
    },
  },
  plugins: [],
};
