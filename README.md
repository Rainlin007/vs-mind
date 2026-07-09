# VS Mind

**English** | [中文](#中文)

A VS Code extension that provides a visual mind map editor. Edit `.mm` / `.mindmap` files directly in the editor with drag-and-drop nodes, themes, and styling — powered by [MindElixir](https://github.com/ssshooter/mind-elixir-core).

![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.74.0-blue)
![MindElixir](https://img.shields.io/badge/MindElixir-5.13.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Visual editing** — Create, edit, and rearrange mind map nodes with drag-and-drop
- **Right-side property panel** — Two tabs: **Node** (font, color, bold/italic) and **Theme** (colors, layout, line style, background pattern)
- **8 preset themes** — 4 light + 4 dark color schemes
- **Layout & lines** — Left / right / bilateral layout; curve, polyline, underline, and right-angle underline styles
- **Background patterns** — None, dots, grid, or cross-dot with adjustable color and opacity
- **Node images** — Paste images from clipboard; click to preview full size
- **Export options** — Export to PNG, JSON, plaintext, or Markdown
- **Resizable panel** — Drag the left edge of the side panel to adjust width (180–520 px)
- **Plain JSON storage** — Mind map data is saved as readable JSON; easy to version-control with Git

## Supported File Formats

| Extension   | Description              |
| ----------- | ------------------------ |
| `.mm`       | Mind map document        |
| `.mindmap`  | Mind map document (alias) |

## Getting Started

### Install from Marketplace

Search for **VS Mind** in the VS Code Extensions view and install.

### Install from Source

```bash
git clone https://github.com/Rainlin007/vs-mind.git
cd vs-mind
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host, then open or create a `.mm` file.

## Usage

1. Open a `.mm` or `.mindmap` file — VS Code opens it with the mind map editor automatically.
2. Use the **canvas toolbar** (right side of the map) for node operations: add child/sibling, delete, etc.
3. Open the **property panel** via the sidebar icon in the editor title bar (top-right).
4. In the **Node** tab, select a node to edit font size, color, bold, and italic.
5. In the **Theme** tab, change color scheme, layout direction, line style, and background pattern.
6. Drag the **left edge** of the property panel to resize it.
7. Changes are saved automatically to the file.

### Keyboard & Interaction

- **Tab** — Add a child node (when a node is selected)
- **Enter** — Add a sibling node
- **Delete** — Remove selected node(s)
- **Double-click** — Edit node text
- **Ctrl/Cmd + V** — Paste an image into the selected node

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.74+

### Scripts

| Command | Description |
| ------- | ----------- |
| `npm run compile` | Vendor MindElixir, compile TypeScript, bundle webview |
| `npm run watch` | Watch TypeScript compilation |
| `npm run watch:webview` | Watch webview bundle (esbuild) |
| `npm run test:unit` | Unit tests |
| `npm run test:webview` | Webview logic tests (Mocha) |
| `npm run test:browser` | Browser smoke test (Puppeteer) |
| `npm run test` | VS Code integration tests |
| `npm run test:all` | Run all test suites |
| `npm run package` | Package `.vsix` extension |
| `npm run build` | Compile + package |

### Debug

1. Run the **Run Extension** launch configuration (F5).
2. In the Extension Development Host, open a `.mm` file.
3. For standalone webview debugging, open `debug/webview.html` in a browser or run `npm run test:browser`.

### Project Structure

```
src/
├── domain/           # Core types (MindMap, ImageRepository)
├── usecases/         # Business logic (MindMapService)
├── adapters/         # Data transformation
├── frameworks/
│   ├── vscode/       # Extension host (editor provider, image storage)
│   └── webview/      # Editor UI (MindElixir, panels, themes)
└── test/             # Unit, webview, and integration tests
media/                # Bundled CSS/JS (MindElixir + main)
debug/                # Standalone webview test page
```

## Document Format

Mind maps are stored as UTF-8 JSON. Example fields:

```json
{
  "nodeData": { "id": "root", "topic": "Central Topic", "root": true, "children": [] },
  "arrows": [],
  "themeTemplate": "clayLight",
  "backgroundPattern": "grid",
  "bgPatternColor": "#808080",
  "bgPatternOpacity": 5,
  "direction": 1,
  "lineStyle": "curve"
}
```

| Field | Description |
| ----- | ----------- |
| `themeTemplate` | Preset theme ID (`auroraLight`, `mintLight`, `clayLight`, …) |
| `direction` | Layout: `0` left, `1` right, `2` bilateral |
| `lineStyle` | `curve` \| `straight` \| `markmap` \| `straightUnderline` |
| `backgroundPattern` | `none` \| `dots` \| `grid` \| `crossDot` |

## License

[MIT](LICENSE)

## Links

- Repository: [github.com/Rainlin007/vs-mind](https://github.com/Rainlin007/vs-mind)
- Issues: [github.com/Rainlin007/vs-mind/issues](https://github.com/Rainlin007/vs-mind/issues)
- MindElixir: [github.com/ssshooter/mind-elixir-core](https://github.com/ssshooter/mind-elixir-core)

---

# 中文

一款在 VS Code 中直接编辑思维导图的扩展。支持 `.mm` / `.mindmap` 文件的可视化编辑、主题配色与节点样式，底层基于 [MindElixir](https://github.com/ssshooter/mind-elixir-core)。

[English](#vs-mind) | **中文**

## 功能特性

- **可视化编辑** — 拖拽节点，增删改思维导图结构
- **右侧属性面板** — 分 **节点**（字号、颜色、粗体/斜体）和 **主题**（配色、布局、线条、背景花纹）两个 Tab
- **8 套预设主题** — 4 款亮色 + 4 款暗色
- **布局与线条** — 向左 / 向右 / 双侧布局；曲线、折线、下划线、直角下划线
- **背景花纹** — 无 / 点阵 / 网格 / 十字点，可调颜色与透明度
- **节点图片** — 从剪贴板粘贴图片，点击可全屏预览
- **导出选项** — 支持导出 PNG、JSON、纯文本或 Markdown
- **面板可调宽** — 拖动属性面板左边缘调整宽度（180–520 px）
- **纯 JSON 存储** — 文件内容为可读 JSON，方便 Git 版本管理

## 支持的文件格式

| 扩展名      | 说明       |
| ----------- | ---------- |
| `.mm`       | 思维导图   |
| `.mindmap`  | 思维导图（别名） |

## 快速开始

### 从扩展市场安装

在 VS Code 扩展视图中搜索 **VS Mind** 并安装。

### 从源码安装

```bash
git clone https://github.com/Rainlin007/vs-mind.git
cd vs-mind
npm install
npm run compile
```

在 VS Code 中按 **F5** 启动扩展开发宿主，然后打开或新建 `.mm` 文件。

## 使用说明

1. 打开 `.mm` 或 `.mindmap` 文件，VS Code 会自动用思维导图编辑器打开。
2. 使用画布**右侧工具栏**进行节点操作：添加子节点/兄弟节点、删除等。
3. 点击编辑器标题栏右上角的**侧栏图标**打开/关闭属性面板。
4. 在 **节点** Tab 中选中节点，可调整字号、颜色、粗体、斜体。
5. 在 **主题** Tab 中可切换配色、布局方向、线条样式和背景花纹。
6. 拖动属性面板**左边缘**可调整面板宽度。
7. 修改会自动保存到文件。

### 快捷键与交互

- **Tab** — 为选中节点添加子节点
- **Enter** — 添加兄弟节点
- **Delete** — 删除选中节点
- **双击** — 编辑节点文字
- **Ctrl/Cmd + V** — 向选中节点粘贴图片

## 开发

### 环境要求

- Node.js 18+
- VS Code 1.74+

### 常用命令

| 命令 | 说明 |
| ---- | ---- |
| `npm run compile` | 打包 MindElixir、编译 TypeScript、构建 webview |
| `npm run watch` | 监听 TypeScript 编译 |
| `npm run watch:webview` | 监听 webview 打包（esbuild） |
| `npm run test:unit` | 单元测试 |
| `npm run test:webview` | Webview 逻辑测试 |
| `npm run test:browser` | 浏览器冒烟测试（Puppeteer） |
| `npm run test` | VS Code 集成测试 |
| `npm run test:all` | 运行全部测试 |
| `npm run package` | 打包 `.vsix` 扩展 |
| `npm run build` | 编译并打包 |

### 调试

1. 使用 **Run Extension** 启动配置（F5）。
2. 在扩展开发宿主中打开 `.mm` 文件。
3. 也可在浏览器中打开 `debug/webview.html`，或运行 `npm run test:browser` 进行独立 webview 测试。

### 项目结构

```
src/
├── domain/           # 核心类型
├── usecases/         # 业务逻辑
├── adapters/         # 数据转换
├── frameworks/
│   ├── vscode/       # 扩展宿主（编辑器、图片存储）
│   └── webview/      # 编辑器 UI（MindElixir、面板、主题）
└── test/             # 单元 / webview / 集成测试
media/                # 打包后的 CSS/JS
debug/                # 独立 webview 测试页
```

## 文件格式

思维导图以 UTF-8 JSON 保存，示例：

```json
{
  "nodeData": { "id": "root", "topic": "中心主题", "root": true, "children": [] },
  "arrows": [],
  "themeTemplate": "clayLight",
  "backgroundPattern": "grid",
  "bgPatternColor": "#808080",
  "bgPatternOpacity": 5,
  "direction": 1,
  "lineStyle": "curve"
}
```

| 字段 | 说明 |
| ---- | ---- |
| `themeTemplate` | 预设主题 ID（如 `auroraLight`、`clayLight` 等） |
| `direction` | 布局：`0` 向左，`1` 向右，`2` 双侧 |
| `lineStyle` | `curve` 曲线 \| `straight` 折线 \| `markmap` 下划线 \| `straightUnderline` 直角下划线 |
| `backgroundPattern` | `none` 无 \| `dots` 点阵 \| `grid` 网格 \| `crossDot` 十字点 |

### 预设主题一览

| 亮色 | 暗色 |
| ---- | ---- |
| 微光紫 `auroraLight` | 午夜紫 `auroraDark` |
| 薄荷绿 `mintLight` | 深海青 `oceanDark` |
| 暖阳橙 `clayLight` | 曜石粉 `obsidianDark` |
| 石墨灰 `graphiteLight` | 琥珀夜 `amberDark` |

## 许可证

[MIT](LICENSE)

## 相关链接

- 仓库：[github.com/Rainlin007/vs-mind](https://github.com/Rainlin007/vs-mind)
- 问题反馈：[github.com/Rainlin007/vs-mind/issues](https://github.com/Rainlin007/vs-mind/issues)
- MindElixir：[github.com/ssshooter/mind-elixir-core](https://github.com/ssshooter/mind-elixir-core)
