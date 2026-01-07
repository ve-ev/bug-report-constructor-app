/* eslint-env node */
/* global module */
/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

const APP_PINK = '#FF008C';

module.exports = {
  content: ['./src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          ...colors.pink,
          300: APP_PINK,
          400: APP_PINK,
          500: APP_PINK,
          600: APP_PINK,
          700: APP_PINK
        }
      }
    }
  },
  plugins: []
};
