/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'win-teal': '#008080',
        'win-gray': '#c0c0c0',
        'win-silver': '#c0c0c0',
        'win-darkgray': '#808080',
        'win-navy': '#000080',
        'win-navy-light': '#1084d0',
        'win-black': '#000000',
        'win-white': '#ffffff',
        'win-yellow': '#ffff80',
        'win-green': '#008000',
        'win-red': '#ff0000',
        'win-olive': '#808000',
        'win-button-face': '#c0c0c0',
        'win-button-shadow': '#808080',
        'win-button-highlight': '#ffffff',
        'win-button-darkshadow': '#000000',
      },
      fontFamily: {
        sans: ['"Pixelated MS Sans Serif"', '"MS Sans Serif"', 'Tahoma', 'Arial', 'sans-serif'],
        mono: ['"Lucida Console"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'win-xs': '11px',
        'win-sm': '12px',
        'win-base': '13px',
        'win-md': '14px',
        'win-lg': '16px',
        'win-xl': '18px',
      },
      boxShadow: {
        'win-raised': 'inset -1px -1px #000, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf',
        'win-sunken': 'inset 1px 1px #000, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf',
        'win-button': 'inset -1px -1px #000, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf',
        'win-button-pressed': 'inset 1px 1px #000, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf',
        'win-window': 'inset -1px -1px #000, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf',
      },
      keyframes: {
        'blink': {
          '0%, 50%': { opacity: '1' },
          '50.01%, 100%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'blink': 'blink 1s infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'scan-line': 'scan-line 4s linear infinite',
      },
    },
  },
  plugins: [],
};
