import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#E86C3A',
          50: '#FDF2EC',
          100: '#FAE3D3',
          200: '#F5C4A7',
          300: '#F0A47B',
          400: '#EC884F',
          500: '#E86C3A',
          600: '#D4521E',
          700: '#A33F18',
          800: '#732D11',
          900: '#421A0A',
        },
      },
    },
  },
  plugins: [],
}

export default config
