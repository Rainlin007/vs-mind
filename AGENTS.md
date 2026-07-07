# VS Mind — Agent Instructions

This repository is a **VS Code extension** that visualizes and edits mind maps.

## Extension code

| Path | Role |
| --- | --- |
| `src/` | Extension host (TypeScript) |
| `media/` | Webview source |
| `dist/` | Built bundles |
| `package.json` | Manifest, commands, settings |

## File format (separate concern)

This extension reads and writes **[SMM](../smm/README.md)** files (`.smm`).

**Do not** infer the format from extension code alone. For reading, writing, or generating `.smm` content, use the format specification:

- [smm/AGENTS.md](../smm/AGENTS.md)
- [smm/SPEC.md](../smm/SPEC.md)

## Development

```bash
npm install
npm run build
npm run watch
```

## 注意点

1. simple-mind-map 已经 fork，尽量避免在插件里面 patch，可以直接改原库；
