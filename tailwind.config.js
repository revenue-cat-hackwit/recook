/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

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
