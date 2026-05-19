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
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#D69F23',
          600: '#B8860B',
          700: '#8B6914',
          800: '#5D4E37',
          900: '#3D2E1F',
        },
        surface: {
          light: '#FFFFFF',
          'light-alt': '#F8F9FA',
          'light-card': '#FFFFFF',
          'light-border': '#E5E7EB',
          dark: '#0F1419',
          'dark-alt': '#1A1F2E',
          'dark-card': '#1E2433',
          'dark-border': '#2D3548',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', '"PingFang SC"', 'sans-serif'],
        roco: ['MIANFEIZITI', '"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
