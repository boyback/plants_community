# 头像挂饰设计稿 v1

静态预览页: `/public/design/avatar-pendant-drafts.html`

## 设计原则

- 挂饰不遮挡头像主体,优先占用右上角、右下角、顶部和外圈。
- 64px 头像下仍然要能识别主题,细节不能过碎。
- `meta.color` / `meta.gradient` 继续负责头像外圈;复杂挂饰后续可扩展 `meta.assetUrl`。
- 稀有度用视觉复杂度区分,不要只靠颜色堆叠。

## 草案清单

| slug | 名称 | 稀有度 | 主题 | 建议用途 |
| --- | --- | --- | --- | --- |
| `pendant-leaf-crown` | 叶冠环 | normal | 叶片外圈 | 普通成长挂饰 |
| `pendant-flower-bud` | 花苞角标 | rare | 花苞角标 | 开花主题成就 |
| `pendant-dew-ring` | 露珠边框 | normal | 水滴与清透边框 | 浇水/养护任务 |
| `pendant-sun-speckle` | 晒斑光环 | rare | 暖色光斑 | 度夏/阳台党 |
| `pendant-archive-bookmark` | 图鉴书签 | epic | 图鉴册+书签 | 图鉴贡献者 |
| `pendant-timeline-marker` | 时间轴节点 | rare | 时间节点 | 成长记录达人 |
| `pendant-trade-tag` | 交易挂牌 | rare | 小挂牌 | 交易信誉 |
| `pendant-moderator-badge` | 版主盾徽 | epic | 盾牌 | 版主/管理员 |
| `pendant-silver-peyote` | 银冠玉光环 | legendary | 银灰刺座 | 稀有植物收藏 |
| `pendant-star-asterias` | 星兜星环 | legendary | 星点兜形 | 仙人球/星兜主题 |
| `pendant-haworthia-window` | 玉露透窗 | epic | 玻璃窗面 | 玉露/十二卷 |
| `pendant-variegata-ribbon` | 锦化彩边 | legendary | 彩边缎带 | 锦化/缀化收藏 |

## 入库建议

独立 SVG 已输出到 `/public/design/pendants/`,可直接拖进 Figma 画布作为可编辑矢量图层。

### Figma 导入

1. 打开 Figma 文件。
2. Finder 选中 `/public/design/pendants/*.svg`。
3. 直接拖到 Figma 画布,或在 Figma 里使用 `File -> Place image...`。
4. 导入后建议统一放进一个 `Avatar pendants / v1` Frame,每个 SVG 命名为对应 slug。

### 入库字段

当前 `UserAvatar` 只支持 `preview` 文本角标和 `meta.color` / `meta.gradient` 外圈。若要完整还原这些挂饰,建议给 `SkinItem.meta` 增加:

```json
{
  "assetUrl": "/design/pendants/pendant-leaf-crown.svg",
  "anchor": "avatar",
  "scale": 1.16,
  "offsetX": 0,
  "offsetY": 0
}
```

后续可把这 12 个草案拆成独立 SVG,再让 `UserAvatar` 在头像上方渲染 `assetUrl`。
