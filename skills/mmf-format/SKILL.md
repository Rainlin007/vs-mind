---
name: mmf-format
description: >-
  Use when reading, writing, generating, or validating .mmf files in VS Mind,
  or when a task depends on the MMF MindElixir JSON structure, node tree,
  theme settings, or companion image files.
---

# VS Mind `.mmf` 文件格式

## 核心事实

| 项 | 说明 |
| --- | --- |
| 扩展名 | `.mmf`，无其他别名 |
| 编码 | UTF-8 纯文本 JSON |
| 引擎 | [MindElixir](https://github.com/ssshooter/mind-elixir-core) 5.13.0 原生 JSON |
| 图片 | 存于伴生文件 `{basename}_img.json`，主文件只保留节点 `image` 元数据 |

空文件在 VS Code 中打开时，扩展会自动写入默认内容（见 [examples.md](examples.md)）。

## 顶层结构 (`MindMapData`)

```json
{
  "nodeData": { /* 必填，根节点树 */ },
  "arrows": [],
  "themeTemplate": "clayLight",
  "backgroundPattern": "grid",
  "bgPatternColor": "#808080",
  "bgPatternOpacity": 5,
  "direction": 1,
  "lineStyle": "curve"
}
```

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `nodeData` | `Node` | — | **必填**。整棵树的根节点 |
| `arrows` | `unknown[]` | `[]` | 节点间箭头连线，通常留空数组 |
| `themeTemplate` | `string` | `clayLight` | 预设主题 ID（见下表） |
| `backgroundPattern` | enum | `grid` | `none` \| `dots` \| `grid` \| `crossDot` |
| `bgPatternColor` | `string` | `#808080` | 背景花纹颜色（hex） |
| `bgPatternOpacity` | `number` | `5` | 花纹不透明度，范围 5–100 |
| `direction` | `0\|1\|2` | `1` | 布局：`0` 向左，`1` 向右，`2` 双侧 |
| `lineStyle` | enum | `curve` | `curve` \| `straight` \| `elbow` \| `step` \| `branch` |

`theme` 字段由编辑器根据 `themeTemplate` 运行时派生，**手写文件时只写 `themeTemplate`**。

### 预设主题 ID (`themeTemplate`)

| 亮色 | 暗色 |
| --- | --- |
| `auroraLight` 微光紫 | `auroraDark` 午夜紫 |
| `mintLight` 薄荷绿 | `oceanDark` 深海青 |
| `clayLight` 暖阳橙（默认） | `obsidianDark` 曜石粉 |
| `graphiteLight` 石墨灰 | `amberDark` 琥珀夜 |

## 节点结构 (`Node`)

树形递归：`children` 为子节点数组。

```json
{
  "id": "unique-id",
  "topic": "节点文本",
  "root": true,
  "children": [],
  "style": {
    "fontSize": "16px",
    "color": "#000000",
    "fontWeight": "bold",
    "fontStyle": "italic",
    "background": "#f0f0f0"
  },
  "image": { "url": "node-id", "width": 200, "height": 150 },
  "hyperLink": "https://example.com",
  "note": "备注内容"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 全局唯一字符串，建议语义化（如 `idea1`、`sub1.1`） |
| `topic` | 是 | 节点显示文本；支持 Markdown（`**粗体**`、链接、`$公式$`） |
| `root` | 仅根节点 | 根节点设 `true` |
| `children` | 否 | 子节点数组，叶子节点可省略或 `[]` |
| `style` | 否 | 节点样式，省略则用主题默认 |
| `image` | 否 | `url` 为节点 `id`（非 base64），实际数据在 `_img.json` |
| `hyperLink` | 否 | 外部链接 URL |
| `note` | 否 | 节点备注（属性面板编辑） |

`style.fontSize` 常用值：`12px`、`14px`、`16px`、`20px`、`24px`、`32px`。

## 伴生图片文件 (`_img.json`)

与主文件同名，扩展名替换为 `_img.json`：

- `project.mmf` → `project_img.json`
- `plan.mmf` → `plan_img.json`

```json
{
  "image": [
    { "node-id-1": "data:image/jpeg;base64,..." },
    { "node-id-2": "data:image/png;base64,..." }
  ]
}
```

规则：
- `image` 为对象数组，每项 `{ [nodeId]: base64DataUrl }`
- 主文件节点 `image.url` 必须等于对应 `nodeId`
- 无图片时可不创建 `_img.json`

## 编写与修改规范

1. **输出合法 JSON**：缩进 2 空格，`JSON.stringify(obj, null, 2)` 风格，便于 Git diff。
2. **根节点必须有** `id`、`topic`、`root: true`。
3. **每个节点 `id` 唯一**，同一棵树内不重复。
4. **保持树结构一致**：增删节点时同步更新父节点 `children`。
5. **不要内联 base64 图片**到主文件；大图片放 `_img.json`。
6. **省略可选字段**而非写 `null`（与 MindElixir 行为一致）。

## 常见任务速查

### 新建最简导图

```json
{
  "nodeData": {
    "id": "root",
    "topic": "中心主题",
    "root": true,
    "children": [
      { "id": "branch1", "topic": "分支一" },
      { "id": "branch2", "topic": "分支二" }
    ]
  },
  "arrows": [],
  "themeTemplate": "clayLight",
  "backgroundPattern": "grid",
  "bgPatternColor": "#808080",
  "bgPatternOpacity": 5,
  "direction": 1,
  "lineStyle": "curve"
}
```

### 增删改节点

- **添加子节点**：在目标节点 `children` 末尾 push 新 `{ id, topic }`
- **添加兄弟节点**：在父节点 `children` 中目标节点后插入
- **删除节点**：从父节点 `children` 过滤掉该 `id`；若有图片，同步删除 `_img.json` 中对应项
- **重命名**：改 `topic`，**不要改 `id`**（除非同步更新图片映射）

### 从大纲文本生成

将层级文本（缩进或编号列表）转为树：`level 0` → 根 `children`，每深一层嵌套一级 `children`。

## 类型定义来源

项目内权威类型见 `src/domain/MindMap.ts`。更多完整示例见 [examples.md](examples.md)。

## 反模式（避免）

- 为 MMF 添加 MindElixir 数据结构之外的自定义外层封装
- 在 `topic` 中写 HTML（用 Markdown；仅 MindElixir 内部渲染用 `dangerouslySetInnerHTML`）
- 修改 `id` 但不更新 `_img.json` 键名
- 写入无效 `themeTemplate` / `direction` / `lineStyle` 枚举值
