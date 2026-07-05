# SMM 格式规范

> **版本：** 1.0 · **扩展名：** `.smm` · **编码：** UTF-8 JSON

**SMM**（Simple Mind Map）是一种用于树形思维导图的 JSON 文件格式，源自 [simple-mind-map](https://github.com/wanglin2/mind-map) 数据模型。

**English:** [SPEC.md](./SPEC.md)

---

## 给 AI 的速查

处理 `.smm` 文件时：

1. 文件体为 **UTF-8 JSON**（`.smm` 仅为扩展名约定）。
2. 树在 `root` 下：节点含 `data` + `children[]`。
3. **生成**时：`richText: true`，`text: "<p>标题</p>"`，每节点唯一 `uid`（UUID），需要展示子节点时 `expand: true`。
4. 不要写入 `view` 及运行时字段（`isActive` 等）。
5. 输出合法 JSON，建议 2 空格缩进；编辑时保留未知字段。

**JSON Schema：** [schema.json](./schema.json)

---

## 1. 概述

| 属性 | 说明 |
| --- | --- |
| 名称 | SMM（Simple Mind Map） |
| 扩展名 | `.smm` |
| 编码 | UTF-8 JSON |
| 与其他格式 | **不兼容** XMind、FreeMind、MindManager、OPML |

部分工具以 `.json` 导出相同结构，schema 一致。

---

## 2. 文档结构

### 顶层

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `layout` | 是 | 布局算法 id |
| `root` | 是 | 树根节点 |
| `theme` | 是 | 主题（`template` + `config`） |
| `rainbowLinesConfig` | 否 | 彩虹分支线 |

### 不在文件内的字段

| 字段 | 说明 |
| --- | --- |
| `view` | 画布平移/缩放，常由编辑器单独保存，**不应**出现在用于交换的 `.smm` 正文中 |

---

## 3. 树节点

```json
{ "data": { }, "children": [ ] }
```

### 内容字段（`data`）

`text`、`expand`、`uid`、`richText`、`note`、`comment`、`hyperlink`、`hyperlinkTitle`、`tag`、`icon`、`image`、`shape` 等。

### 样式字段（`data`，可选）

`fillColor`、`color`、`fontSize`、`borderColor`、`borderWidth`、`gradientStyle` 等。

### 运行时字段（生成时省略）

`isActive`、`resetRichText`、`needUpdate`

---

## 4. 文本与富文本

富文本模式（推荐 AI 生成）：

```json
"data": {
  "text": "<p>标题</p>",
  "richText": true,
  "expand": true,
  "uid": "550e8400-e29b-41d4-a716-446655440000"
}
```

规则：用 `<p>` 包裹；转义 HTML 实体；禁止 `<script>` 与事件属性。

---

## 5. 布局与主题

常用 `layout`：`logicalStructure`、`mindMap`、`organizationStructure`、`timeline`、`fishbone` 等。

`theme.template` 为预设主题名字符串；`theme.config` 常为 `{}`。

---

## 6. 生成模式

- **大纲 → 树**：每行一个节点，缩进表示层级，每节点新 UUID。
- **编辑**：按 `uid` 定位，勿改无关节点的 `uid`。
- **总结**：深度优先遍历，从 `text` 取标题。

---

## 7. 互通性

| 格式 | 与 SMM 关系 |
| --- | --- |
| SMM / simple-mind-map JSON | 同结构 |
| XMind 等 | 不兼容 |
| PNG / SVG | 仅渲染结果 |

---

## 8. 示例与校验

示例见 [examples.md](./examples.md)。

```bash
ajv validate -s smm/schema.json -d your-map.smm
```

---

## 9. 许可

MIT — 见仓库根目录 [LICENSE](../LICENSE)。
