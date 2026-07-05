# SMM Examples

Specification: [SPEC.md](./SPEC.md)

## 1. Plain text

```json
{
  "layout": "mindMap",
  "root": {
    "data": { "text": "Product Launch", "expand": true },
    "children": [
      {
        "data": { "text": "Research", "expand": true },
        "children": [
          { "data": { "text": "User interviews" }, "children": [] }
        ]
      }
    ]
  },
  "theme": { "template": "default", "config": {} }
}
```

## 2. Rich text with metadata

```json
{
  "layout": "logicalStructure",
  "root": {
    "data": {
      "text": "<p>Project Plan</p>",
      "expand": true,
      "uid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "richText": true
    },
    "children": [
      {
        "data": {
          "text": "<p>Phase 1</p>",
          "expand": true,
          "note": "Due Q1",
          "hyperlink": "https://example.com/phase1",
          "hyperlinkTitle": "Phase 1 doc",
          "tag": ["priority", "mvp"],
          "uid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "richText": true
        },
        "children": []
      }
    ],
    "smmVersion": "0.14.0"
  },
  "theme": { "template": "classicGreen", "config": {} },
  "rainbowLinesConfig": { "open": true, "colorsList": [] }
}
```

## 3. Per-node styling

```json
{
  "data": {
    "text": "<p>Important</p>",
    "expand": true,
    "richText": true,
    "fillColor": "#ff6b6b",
    "color": "#ffffff",
    "fontSize": 16,
    "borderColor": "#c92a2a",
    "borderWidth": 2,
    "shape": "rectangle"
  },
  "children": []
}
```

## 4. Outline → tree

Input:

```text
Marketing
  Social
    Twitter
  Email
```

Each line → one node; indent → depth; every node gets a new `uid`, `richText: true`, `text: "<p>…</p>"`, `expand: true`, leaves use `"children": []`.
