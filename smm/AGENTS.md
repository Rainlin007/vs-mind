# SMM Format — Agent Instructions

You are working with **SMM** (Simple Mind Map), a JSON mind-map file format. Extension: `.smm`.

This is a **format specification**, not an application. Do not assume a specific editor unless the user mentions one.

## Read first

1. [SPEC.md](./SPEC.md) — full specification (English)
2. [SPEC.zh-CN.md](./SPEC.zh-CN.md) — 中文规范
3. [schema.json](./schema.json) — machine validation

## Rules when reading or writing `.smm`

1. File body is **UTF-8 JSON** — one object at the root.
2. Tree lives under `root`: each node has `data` and `children[]`.
3. When **generating** new maps:
   - `"richText": true`
   - `"text": "<p>Title</p>"` (HTML in `<p>` tags)
   - unique `"uid"` per node (UUID v4)
   - `"expand": true` where children should be visible
4. Do **not** write implementation-specific or runtime fields unless asked:
   - omit `view` (canvas state — not part of the serialized document in most workflows)
   - omit `isActive`, `resetRichText`, `needUpdate`
5. Output valid JSON; 2-space indent is conventional.
6. Preserve unknown fields when editing existing files.

## Minimal document

```json
{
  "layout": "logicalStructure",
  "root": {
    "data": {
      "text": "<p>Topic</p>",
      "expand": true,
      "uid": "550e8400-e29b-41d4-a716-446655440000",
      "richText": true
    },
    "children": []
  },
  "theme": { "template": "default", "config": {} },
  "rainbowLinesConfig": { "open": false, "colorsList": [] }
}
```

## Tasks

| Task | Approach |
| --- | --- |
| Parse / summarize | Depth-first walk of `root`; strip HTML from `text` when `richText` |
| Create from outline | One node per line; indent = tree depth; new UUID per node |
| Edit | Locate by `uid`; keep other nodes' `uid` unchanged |
| Validate | `ajv validate -s smm/schema.json -d file.smm` |

## Cursor skill

Optional: copy [skill/](./skill/) to `.cursor/skills/smm-format/`.
