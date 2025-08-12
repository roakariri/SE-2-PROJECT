/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    
    screens: {
      'phone': '200px',
      'tablet': '601px',
      'laptop': '1024px',
      'big-laptop': '1182px',
      'biggest' : '1645px',
        'semi-biggest': '1440px',
      'semi-bigscreen': '1237px',
      'bigscreen': '1280px',
    },

    extend: {
      fontFamily: {
        'dm-sans': ['DM Sans', 'sans-serif'],
      },

        textShadow: {
            glow: '0 0 5px #fff, 0 0 5px #ffd700, 0 0 5px #ffd700',
        },
    },
  },
  plugins: [

      require('tailwindcss-textshadow'),
  ],
};
