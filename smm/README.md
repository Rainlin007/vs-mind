# SMM — Simple Mind Map Format

**SMM** is a JSON-based file format for hierarchical mind maps. Files use the `.smm` extension.

This directory contains the **format specification** — independent of any particular editor or application.

| Document | Purpose |
| --- | --- |
| [SPEC.md](./SPEC.md) | English specification (canonical) |
| [SPEC.zh-CN.md](./SPEC.zh-CN.md) | 中文规范 |
| [schema.json](./schema.json) | JSON Schema for validation |
| [examples.md](./examples.md) | Annotated examples |
| [AGENTS.md](./AGENTS.md) | Instructions for AI agents |
| [skill/](./skill/) | Cursor Agent Skill (optional) |

## What SMM is

- **Encoding:** UTF-8 JSON
- **Structure:** A tree of nodes under `root`, plus layout and theme metadata
- **Lineage:** Evolved from the [simple-mind-map](https://github.com/wanglin2/mind-map) data model
- **Not:** XMind, FreeMind (`.mm`), MindManager, or OPML

## Known implementations

Applications that read or write SMM (or structurally equivalent JSON):

| Implementation | Notes |
| --- | --- |
| [simple-mind-map](https://github.com/wanglin2/mind-map) | Reference renderer; JSON export matches SMM body |
| [VS Mind](../README.md) | VS Code extension in the parent repository; uses `.smm` as the native extension |

Implementation-specific behavior (e.g. where canvas zoom is stored) belongs in each app's docs, not in this format spec.

## For AI systems

Read [AGENTS.md](./AGENTS.md) or [SPEC.md](./SPEC.md) § "For AI agents".

Shareable URLs (after publish to GitHub):

```text
https://github.com/Rainlin007/vs-mind/blob/main/smm/SPEC.md
https://github.com/Rainlin007/vs-mind/blob/main/smm/SPEC.zh-CN.md
```

## License

MIT — same as the [parent repository](../LICENSE).
