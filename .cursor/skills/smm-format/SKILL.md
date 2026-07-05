---
name: smm-format
description: Read, create, and edit SMM (.smm) mind map files — UTF-8 JSON tree format from the simple-mind-map ecosystem. Use when working with .smm files, SMM JSON, or when generating or parsing mind map documents.
---

# SMM Format

**SMM** is a mind-map **file format**, not an application. Read the specification — do not infer schema from any single editor.

Canonical copy: [smm/skill/SKILL.md](../../smm/skill/SKILL.md)

## Canonical docs

- [smm/SPEC.md](../../smm/SPEC.md) — English specification
- [smm/SPEC.zh-CN.md](../../smm/SPEC.zh-CN.md) — 中文规范
- [smm/AGENTS.md](../../smm/AGENTS.md) — agent quick reference
- [smm/schema.json](../../smm/schema.json) — JSON Schema

## Rules

1. UTF-8 JSON; extension `.smm` is conventional.
2. Tree under `root`: `data` + `children[]` per node.
3. Generate with `richText: true`, `text: "<p>…</p>"`, unique `uid`, `expand: true` as needed.
4. Omit `view` and runtime flags (`isActive`, etc.).
5. Valid JSON, 2-space indent; preserve unknown fields when editing.

## Examples

[smm/examples.md](../../smm/examples.md)
