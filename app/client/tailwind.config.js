/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF9E8',
          100: '#FFF0C2',
          200: '#F9DE8B',
          300: '#EDC25A',
          400: '#DCAA3E',
          500: '#C58B2A',
          600: '#A96F1E',
          700: '#855118',
          800: '#643B19',
          900: '#442814',
        },
        accent: {
          50: '#ECFAF7',
          100: '#D3F3EC',
          200: '#AAE6DA',
          300: '#75D2C2',
          400: '#49B9A8',
          500: '#2F9D8E',
          600: '#247F74',
          700: '#21665E',
          800: '#1F514C',
          900: '#1D443F',
        },
        surface: {
          light: '#F8F6F1',
          'light-alt': '#F3F1EB',
          'light-card': '#FFFEFB',
          'light-border': '#E7E1D7',
          dark: '#11151C',
          'dark-alt': '#181E27',
          'dark-card': '#1D2430',
          'dark-border': '#303A48',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        roco: ['MIANFEIZITI', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
