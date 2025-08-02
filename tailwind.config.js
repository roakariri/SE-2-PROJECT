/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    
    screens: {
      'phone': '200px',
      'tablet': '601px',
      'laptop': '1024px',
      'big-laptop': '1182px',
      'semi-bigscreen': '1237px',
      'bigscreen': '1280px',
    },

    extend: {},
  },
  plugins: [],
};
