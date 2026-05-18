/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Helvetica', 'sans-serif'],
        mono: ['DM Mono', 'monospace']
      }
    }
  },
  darkMode: 'selector'
};
