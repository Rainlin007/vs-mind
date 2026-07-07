// 预设主题配置
//
// 整图外观完全由这里的预设决定。每个预设 = { value, name, dark, config }。
// - value: 主题 id，会写进 .smm 的 theme.template，必须唯一。
// - name:  展示名（中文 UI 用；英文 UI 会用 value 生成可读名，见 themes.js）。
// - dark:  是否深色（用于分组展示 + 联动编辑器深色 UI）。
// - config: partial themeConfig，会被 MindMap.defineTheme 用 mergeTheme(default, config) 合并。
//
// 可用字段参考 vendor/mind-map/simple-mind-map/src/theme/default.js，常用的有：
//   lineColor / lineWidth / lineStyle('curve'|'straight'|'direct') / lineRadius / showLineMarker
//   backgroundColor / paddingX / paddingY / generalizationLineWidth / generalizationLineColor
//   root / second / node / generalization（各自可设 fillColor / color / borderColor / borderWidth / fontSize / shape 等）
//
// 设计约定（现代审美，借鉴 Vercel Geist / Linear / Notion 的克制配色）：
//   - 统一 roundedRectangle 圆角卡片；曲线连线；节点内边距略宽，呼吸感更好。
//   - 单一品牌强调色：根节点实心填充强调色 + 白字；二级节点浅色底 + 细边框；三级起透明底 + 柔和文字。
//   - 暗色系用“近黑带冷调”背景（非纯黑），二级用抬升的表面色区分层级。

// 构造一套主题的辅助函数，保证节点层级样式一致，减少重复。
function makeTheme({
  bg,
  line,
  accent, // 强调色（根节点填充 / 概要）
  rootText = '#ffffff',
  // 二级节点
  secondFill,
  secondText,
  secondBorder,
  // 三级及以下文字
  nodeText,
  // 概要节点文字
  generalizationText = '#ffffff',
}) {
  return {
    lineStyle: 'curve',
    lineWidth: 4,
    lineColor: line,
    backgroundColor: bg,
    generalizationLineWidth: 4,
    generalizationLineColor: accent,
    paddingX: 26,
    paddingY: 12,
    root: {
      shape: 'roundedRectangle',
      fillColor: accent,
      color: rootText,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 8,
      fontSize: 24,
      fontWeight: 'bold',
    },
    second: {
      shape: 'roundedRectangle',
      fillColor: secondFill,
      color: secondText,
      borderColor: secondBorder,
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 'normal',
    },
    node: {
      shape: 'roundedRectangle',
      fillColor: 'transparent',
      color: nodeText,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 6,
      fontSize: 14,
      paddingX: 10,
      paddingY: 5,
      marginY: 15,
      marginX: 50
    },
    generalization: {
      shape: 'roundedRectangle',
      fillColor: accent,
      color: generalizationText,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 8,
      fontSize: 14,
    },
  }
}

export const presetThemes = [
  // ================= 亮色 4 套 =================

  // 1. 微光紫 —— 借鉴 Linear Lavender (#5e6ad2)，冷静克制
  {
    value: 'auroraLight',
    name: '微光紫',
    dark: false,
    config: makeTheme({
      bg: '#f7f8fa',
      line: '#c3c8e6',
      accent: '#5e6ad2',
      secondFill: '#eef0fb',
      secondText: '#3b3f66',
      secondBorder: '#d5d9f2',
      nodeText: '#4a4e69',
    }),
  },

  // 2. 薄荷绿 —— 现代 Emerald/Teal，清爽自然
  {
    value: 'mintLight',
    name: '薄荷绿',
    dark: false,
    config: makeTheme({
      bg: '#f4faf7',
      line: '#a9dcc8',
      accent: '#10a37f',
      secondFill: '#e4f5ee',
      secondText: '#1d5d4b',
      secondBorder: '#c7eadd',
      nodeText: '#37655a',
    }),
  },

  // 3. 暖阳橙 —— 借鉴 Notion 暖橙 (#dd5b00) 的柔和陶土感
  {
    value: 'clayLight',
    name: '暖阳橙',
    dark: false,
    config: makeTheme({
      bg: '#fbf7f3',
      line: '#ecc9ad',
      accent: '#e0733a',
      secondFill: '#fbeee2',
      secondText: '#8a4a24',
      secondBorder: '#f2d9c4',
      nodeText: '#6f5545',
    }),
  },

  // 4. 石墨灰 —— 借鉴 Vercel Geist 的极简中性（ink 即品牌）
  {
    value: 'graphiteLight',
    name: '石墨灰',
    dark: false,
    config: makeTheme({
      bg: '#fafafa',
      line: '#cfd2d6',
      accent: '#27272a',
      secondFill: '#f1f2f4',
      secondText: '#2b2d31',
      secondBorder: '#e2e4e8',
      nodeText: '#52555c',
    }),
  },

  // ================= 暗色 4 套 =================

  // 5. 午夜紫 —— 借鉴 Linear 暗色画布 (#0f1011) + Lavender 强调
  {
    value: 'auroraDark',
    name: '午夜紫',
    dark: true,
    config: makeTheme({
      bg: '#0f1011',
      line: '#3b3f5c',
      accent: '#6e79e0',
      secondFill: '#1a1b22',
      secondText: '#d7d9e6',
      secondBorder: '#2b2d3a',
      nodeText: '#a6a9bd',
    }),
  },

  // 6. 深海青 —— 借鉴 Vercel Cyan (#50e3c2) 的霓虹点缀，深靛蓝底
  {
    value: 'oceanDark',
    name: '深海青',
    dark: true,
    config: makeTheme({
      bg: '#0b1220',
      line: '#274156',
      accent: '#2dd4bf',
      rootText: '#04201b',
      secondFill: '#111c2e',
      secondText: '#cbe7e6',
      secondBorder: '#22344a',
      nodeText: '#8fb0b8',
      generalizationText: '#04201b',
    }),
  },

  // 7. 曜石粉 —— 借鉴 Vercel highlight magenta (#eb367f)，纯黑近调
  {
    value: 'obsidianDark',
    name: '曜石粉',
    dark: true,
    config: makeTheme({
      bg: '#0a0a0c',
      line: '#3a2a35',
      accent: '#ec4899',
      secondFill: '#17151a',
      secondText: '#ecdfe6',
      secondBorder: '#2a2630',
      nodeText: '#b6a8b0',
    }),
  },

  // 8. 琥珀夜 —— 暖炭底 + Amber，沉稳有质感
  {
    value: 'amberDark',
    name: '琥珀夜',
    dark: true,
    config: makeTheme({
      bg: '#14110c',
      line: '#4a3d28',
      accent: '#f59e0b',
      rootText: '#1f1500',
      secondFill: '#201a11',
      secondText: '#ecdfc9',
      secondBorder: '#33291a',
      nodeText: '#b8a888',
      generalizationText: '#1f1500',
    }),
  },
]

// 默认主题（新文档兜底），与 editor.js / defaultMindMapData.ts / package.json 保持一致
export const DEFAULT_PRESET_THEME = 'clayLight'
