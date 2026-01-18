/** @type {import('tailwindcss').Config} */
module.exports = {
  // All files that use Tailwind CSS classes should be included here
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
