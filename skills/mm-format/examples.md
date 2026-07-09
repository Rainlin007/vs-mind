# `.mm` 格式示例

## 1. 默认空文件（扩展自动初始化）

```json
{
  "nodeData": {
    "id": "root",
    "topic": "Central Topic",
    "root": true,
    "children": []
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

## 2. 基础树形结构（仓库 `example.mindmap`）

```json
{
  "nodeData": {
    "id": "root",
    "topic": "Central Topic",
    "root": true,
    "children": [
      {
        "topic": "Idea 1",
        "id": "idea1",
        "children": [
          { "topic": "Sub-idea 1.1", "id": "sub1.1" },
          { "topic": "Sub-idea 1.2", "id": "sub1.2" }
        ]
      },
      {
        "topic": "Idea 2",
        "id": "idea2",
        "children": [
          { "topic": "Sub-idea 2.1", "id": "sub2.1" }
        ]
      },
      { "topic": "Idea 3", "id": "idea3" }
    ]
  },
  "linkData": {}
}
```

> 注：`linkData` 为旧格式字段，可兼容；新文件推荐 `arrows: []`。

## 3. 带样式、链接与备注

```json
{
  "nodeData": {
    "id": "root",
    "topic": "产品规划",
    "root": true,
    "children": [
      {
        "id": "mvp",
        "topic": "**MVP** 功能",
        "style": {
          "fontSize": "20px",
          "color": "#e0733a",
          "fontWeight": "bold"
        },
        "hyperLink": "https://example.com/mvp",
        "note": "Q3 前完成核心流程",
        "children": [
          { "id": "auth", "topic": "用户认证" },
          { "id": "editor", "topic": "导图编辑" }
        ]
      }
    ]
  },
  "arrows": [],
  "themeTemplate": "mintLight",
  "backgroundPattern": "dots",
  "bgPatternColor": "#10a37f",
  "bgPatternOpacity": 15,
  "direction": 2,
  "lineStyle": "straight"
}
```

## 4. 带图片节点 + 伴生 `_img.json`

**`roadmap.mm`**

```json
{
  "nodeData": {
    "id": "root",
    "topic": "路线图",
    "root": true,
    "children": [
      {
        "id": "screenshot",
        "topic": "界面截图",
        "image": {
          "url": "screenshot",
          "width": 320,
          "height": 180
        }
      }
    ]
  },
  "arrows": [],
  "themeTemplate": "graphiteLight",
  "backgroundPattern": "none",
  "direction": 1,
  "lineStyle": "curve"
}
```

**`roadmap_img.json`**

```json
{
  "image": [
    {
      "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

`image.url` 的值 `"screenshot"` 必须与 `_img.json` 中的键名一致。

## 5. 从 Markdown 大纲生成

输入大纲：

```text
项目计划
  需求分析
    用户访谈
    竞品调研
  开发
    前端
    后端
  上线
```

对应 JSON：

```json
{
  "nodeData": {
    "id": "root",
    "topic": "项目计划",
    "root": true,
    "children": [
      {
        "id": "req",
        "topic": "需求分析",
        "children": [
          { "id": "interview", "topic": "用户访谈" },
          { "id": "research", "topic": "竞品调研" }
        ]
      },
      {
        "id": "dev",
        "topic": "开发",
        "children": [
          { "id": "fe", "topic": "前端" },
          { "id": "be", "topic": "后端" }
        ]
      },
      { "id": "launch", "topic": "上线" }
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

## 6. 字段枚举速查

```
themeTemplate: auroraLight | mintLight | clayLight | graphiteLight
               auroraDark  | oceanDark | obsidianDark | amberDark

direction:     0 (向左) | 1 (向右) | 2 (双侧)

lineStyle:     curve | straight | markmap | straightUnderline

backgroundPattern: none | dots | grid | crossDot
```
