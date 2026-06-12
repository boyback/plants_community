# 前端尺寸体系规范

## 目标

项目后续前端尺寸统一基于设计稿 px 编写,由构建插件转换为 vw。

现有 Tailwind CSS、断点 class、手写媒体查询属于历史遗留,后续按模块逐步迁移并最终移除。

## 设计基准

- PC 基准宽度:1920
- H5 基准宽度:375
- 源码尺寸:按设计稿写 px
- 输出单位:px 转 vw

## 新代码规则

- 新增样式使用 `.module.scss` 或明确归属的 `.scss` 文件
- 新增 JSX/TSX 不写 Tailwind class 名
- `className` 只允许引用语义化类名,例如 `styles.previewPanel`
- 不新增 Tailwind 响应式断点 class:`sm:`、`md:`、`lg:`、`xl:`、`2xl:`
- 不新增手写 `@media` 来做尺寸适配
- 不新增 `window.innerWidth`、`clientWidth`、`ResizeObserver` 来计算布局尺寸
- 不用 JS `scale()` 模拟 PC/H5 预览尺寸
- 不把 PC/H5 两套尺寸混在同一个组件内部
- 普通业务尺寸写设计稿 px,交给 px→vw 插件转换

## PC/H5 差异

确实需要 PC/H5 两套结构时,拆成明确的容器或组件:

- `PcXXX`
- `H5XXX`
- 或由上层页面/路由决定使用哪套容器

组件内部不再通过断点 class 或媒体查询改变结构。

## Tailwind 处理原则

Tailwind 当前仍为历史兼容保留,不能直接从构建中删除,否则现有页面会大面积失样。

迁移节奏:

1. 新增模块不再使用 Tailwind class。
2. 被重构模块优先迁移到普通 CSS/CSS Modules。
3. 尺寸使用设计稿 px,由 px→vw 插件统一转换。
4. 模块迁移完成后删除对应 Tailwind 断点 class。
5. 全量迁移完成后再移除 Tailwind 构建依赖。

## 插件接入要求

当前已接入仓库内 PostCSS 插件:

- `scripts/postcss-px-to-vw.cjs`
- `postcss.config.js`

默认转换规则:

- 默认按 PC 基准 1920 转换
- 文件路径包含 `h5` 或 `mobile` 时按 H5 基准 375 转换
- 文件路径包含 `pc` 或 `desktop` 时按 PC 基准 1920 转换
- `1px` 默认不转换,用于保留边框等物理细线
- `url(...)`、`var(...)` 内的值不转换

可用注释:

```css
/* px-vw: h5 */
.demo {
  width: 375px;
}

/* px-vw: pc */
.demo {
  width: 1920px;
}

/* px-vw: off */
.hairline {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

/* px-vw: on */
```

插件后续增强方向:

- PC 按 1920 转换
- H5 按 375 转换
- 支持按文件、目录或注释区分 PC/H5 基准
- 可排除第三方 CSS
- 可排除 1px 边框、阴影、特殊 transform 等不应转换的值
- 可配置小数精度

## 发帖页预览后续规则

发帖页预览不再使用 JS 缩放模拟响应式。

后续应拆为:

- H5 预览:使用 H5 容器,基准 375
- PC 预览:使用 PC 容器,基准 1920

两者尺寸由 px→vw 输出控制,不使用 Tailwind 断点或 ResizeObserver。
