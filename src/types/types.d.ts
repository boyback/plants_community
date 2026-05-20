// 声明 CSS 模块类型
declare module '*.css' {
  const css: string;
  export default css;
}
// 声明 scss 模块类型
declare module '*.scss' {
  const content: string;
  export default content;
}

// 可选：声明图片/字体等资源
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }