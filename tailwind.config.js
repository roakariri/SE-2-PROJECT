/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    
    screens: {
      'phone': '200px',
      'tablet': '601px',
      'laptop': '1024px',
      'big-laptop': '1182px',
      'landingHeader' : '1433px',
      'semi-bigscreen': '1237px',
      'bigscreen': '1280px',
    },

    extend: {
      fontFamily: {
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
