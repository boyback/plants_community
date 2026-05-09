import type { Config } from 'tailwindcss';

/**
 * 颜色全部走 CSS 变量,供运行时主题切换。
 * - 变量在 globals.css 内 :root[data-theme="..."] 下定义
 * - 默认值 = 森林绿(leaf 系)
 * - 4 个预设主题:forest / sakura / ocean / vintage
 *
 * 用法:像以前一样写 `bg-leaf-500`,实际生成 `background-color: rgb(var(--leaf-500) / <alpha-value>)`
 */
function withVar(name: string) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: withVar('--leaf-50'),
          100: withVar('--leaf-100'),
          200: withVar('--leaf-200'),
          300: withVar('--leaf-300'),
          400: withVar('--leaf-400'),
          500: withVar('--leaf-500'),
          600: withVar('--leaf-600'),
          700: withVar('--leaf-700'),
          800: withVar('--leaf-800'),
          900: withVar('--leaf-900'),
        },
        sand: {
          50: withVar('--sand-50'),
          100: withVar('--sand-100'),
          200: withVar('--sand-200'),
          300: withVar('--sand-300'),
        },
        ink: {
          700: withVar('--ink-700'),
          800: withVar('--ink-800'),
          900: withVar('--ink-900'),
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
