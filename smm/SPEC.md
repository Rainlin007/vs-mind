# SMM Format Specification

> **Version:** 1.0 · **Extension:** `.smm` · **Encoding:** UTF-8 JSON

**SMM** (Simple Mind Map) is a portable JSON format for tree-structured mind maps. It descends from the [simple-mind-map](https://github.com/wanglin2/mind-map) data model.

**中文规范：** [SPEC.zh-CN.md](./SPEC.zh-CN.md)

---

## For AI agents (read this first)

When asked to **create, edit, parse, or summarize** an `.smm` file:

1. Treat the file as **UTF-8 JSON** (the `.smm` extension is conventional).
2. Preserve the tree under `root` — each node has `data` + `children[]`.
3. When **generating** new maps, use:
   - `"richText": true`
   - `"text": "<p>Title</p>"` (HTML wrapped in `<p>`)
   - a unique `"uid"` per node (UUID v4)
   - `"expand": true` on nodes that should show children
4. Do **not** write canvas state (`view`) or runtime flags (`isActive`, `resetRichText`, `needUpdate`).
5. Output **valid JSON**, indented with 2 spaces.
6. Preserve unknown fields when editing.

**Minimal valid file:**

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

**JSON Schema:** [schema.json](./schema.json)

---

## 1. Overview

| Property | Value |
| --- | --- |
| Name | SMM (Simple Mind Map) |
| File extension | `.smm` |
| Media type | `application/json` (convention) |
| Encoding | UTF-8 |
| Root structure | Single JSON object |
| Relation to other formats | **Not** compatible with XMind, FreeMind (`.mm`), MindManager, or OPML |

The on-disk content is JSON. Some tools export the same structure with a `.json` extension; the schema is identical.

---

## 2. Document schema

### 2.1 Top level

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `layout` | yes | string | Canvas layout algorithm id |
| `root` | yes | object | Root node of the tree |
| `theme` | yes | object | Visual theme |
| `theme.template` | yes | string | Preset theme name |
| `theme.config` | yes | object | Theme overrides (often `{}`) |
| `rainbowLinesConfig` | no | object | Colored branch lines |
| `rainbowLinesConfig.open` | no | boolean | Enable rainbow lines |
| `rainbowLinesConfig.colorsList` | no | string[] | Custom color list |

### 2.2 Root node metadata

The `root` object is a **tree node** (see §3). It may also carry:

| Field | Description |
| --- | --- |
| `smmVersion` | Producer library version, e.g. `"0.14.0"` |

### 2.3 Fields outside the document

Some editors keep **transient state** separate from the saved file:

| Field | Typical handling |
| --- | --- |
| `view` | Canvas pan/zoom — often stored in editor session or sidecar, **not** in the `.smm` body |

When generating files for interchange, omit `view`.

---

## 3. Tree nodes

Every node:

```json
{
  "data": { },
  "children": [ ]
}
```

| Part | Type | Description |
| --- | --- | --- |
| `data` | object | Node content and per-node styles |
| `children` | array | Child nodes (use `[]` for leaves) |

Traverse **depth-first** to read the map as an outline.

### 3.1 Content fields (`data`)

| Field | Type | Description |
| --- | --- | --- |
| `text` | string | Node title (plain text or HTML) |
| `expand` | boolean | If `true`, children are visible |
| `uid` | string | Stable node id (UUID recommended) |
| `richText` | boolean | If `true`, `text` is HTML |
| `note` | string | Longer note (plain text) |
| `comment` | string | Node annotation; not rendered on canvas |
| `hyperlink` | string | URL |
| `hyperlinkTitle` | string | Link display name |
| `tag` | string[] | Tags |
| `icon` | string[] | Icon identifiers |
| `image` | string | Image URL |
| `imageTitle` | string | Image alt/title |
| `imageSize` | object | `{ "width": number, "height": number }` |
| `shape` | string | Node shape override |

### 3.2 Style fields (`data`)

Per-node overrides (optional). Common keys:

| Field | Type | Example |
| --- | --- | --- |
| `fillColor` | string | `"#ff6b6b"` |
| `color` | string | `"#ffffff"` |
| `fontSize` | number | `16` |
| `fontWeight` | string | `"bold"` |
| `fontStyle` | string | `"italic"` |
| `borderColor` | string | `"#333"` |
| `borderWidth` | number | `2` |
| `gradientStyle` | boolean | Enable gradient fill |
| `startColor` / `endColor` | string | Gradient colors |

Producers may add extra keys; preserve them when editing.

### 3.3 Runtime fields (omit when generating)

| Field | Meaning |
| --- | --- |
| `isActive` | Selection state in an editor session |
| `resetRichText` | Internal rich-text rebuild flag |
| `needUpdate` | Internal render flag |

---

## 4. Text and rich text

Maps produced with the simple-mind-map **RichText** plugin typically store HTML in `text`.

### 4.1 Plain text mode

Valid:

```json
"data": {
  "text": "Hello",
  "expand": true
}
```

Editors with RichText enabled may upgrade this on save.

### 4.2 Rich text mode (recommended for generation)

```json
"data": {
  "text": "<p>Hello</p>",
  "richText": true,
  "expand": true,
  "uid": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Rules:**

- Wrap visible text in `<p>...</p>`.
- Escape HTML entities: `&` → `&amp;`, `<` → `&lt;`, etc.
- Line breaks: extra `<p>` blocks or `<br>` inside one `<p>`.
- Allowed inline styling (optional): `<strong>`, `<em>`, `<u>`, `<span style="color:…">`.
- Do **not** include `<script>`, event handlers, or iframes.

### 4.3 Extracting plain text

1. If `richText` is not `true`, return `data.text`.
2. Otherwise strip HTML tags or parse `<p>` elements.
3. Decode HTML entities.

---

## 5. Layout values

Common `layout` identifiers:

| Value | Description |
| --- | --- |
| `logicalStructure` | Logic diagram |
| `logicalStructureLeft` | Logic diagram (left) |
| `mindMap` | Classic mind map |
| `organizationStructure` | Org chart |
| `catalogOrganization` | Catalog / directory |
| `timeline` | Horizontal timeline |
| `fishbone` | Fishbone diagram |

Extended set in simple-mind-map: `timeline2`, `verticalTimeline`, `verticalTimeline2`, `verticalTimeline3`, `fishbone2`, `rightFishbone`, `rightFishbone2`.

---

## 6. Themes

`theme.template` names a preset (string). Examples from the simple-mind-map ecosystem:

`default`, `classic`, `classicGreen`, `classicBlue`, `blackHumour`, `dark`, `morandi`, `mint`

Theme packs (e.g. `simple-mind-map-plugin-themes`) add many more names. Unknown names may fall back at render time.

`theme.config` merges overrides into the preset (usually `{}`).

---

## 7. Generation patterns

### 7.1 Outline → tree

Input:

```text
Product
  Design
    UI
    UX
  Engineering
```

Algorithm:

1. Root `data.text` = `"<p>Product</p>"`.
2. Each indented line → one child under its parent.
3. New UUID on every node.
4. `richText: true`, `expand: true` on all nodes.
5. Leaves: `"children": []`.

### 7.2 Editing

1. Parse JSON; locate nodes by `uid` or stripped `text`.
2. Change only intended nodes; **keep other `uid` values**.
3. Re-serialize with 2-space indent.
4. Validate against [schema.json](./schema.json) when possible.

### 7.3 Summarizing

Walk depth-first. Output title from `text`, plus optional `note`, `tag`, `hyperlink`.

---

## 8. Interoperability

| Format | Relationship to SMM |
| --- | --- |
| SMM (`.smm`) | This format |
| simple-mind-map JSON | Same schema |
| XMind / FreeMind / MindManager / OPML | **Not** compatible — convert manually |
| PNG / SVG | Rendered output only |

---

## 9. Examples

See [examples.md](./examples.md).

---

## 10. Validation

```bash
ajv validate -s smm/schema.json -d your-map.smm
```

---

## 11. License

MIT — see [LICENSE](../LICENSE) in the repository root.
