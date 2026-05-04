import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // 清新自然绿主题
        leaf: {
          50: '#f2faf4',
          100: '#e1f4e6',
          200: '#c3e8cd',
          300: '#98d4ac',
          400: '#66b985',
          500: '#459c67',
          600: '#337d51',
          700: '#2a6442',
          800: '#254f37',
          900: '#1f4130',
        },
        sand: {
          50: '#fbf8f2',
          100: '#f4ecdb',
          200: '#e9d7b5',
          300: '#dabc87',
        },
        ink: {
          700: '#2c3a33',
          800: '#1f2a24',
          900: '#121915',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.06)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
