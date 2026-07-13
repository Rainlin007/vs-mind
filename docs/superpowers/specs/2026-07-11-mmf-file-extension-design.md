# MMF File Extension Design

## Goal

Use `.mmf` (Mind Map Format) as the only editable mind-map document extension in VS Mind.

## File Model

- An MMF document is UTF-8 JSON serialized directly from the MindElixir data structure.
- The document has no VS Mind envelope, format marker, or schema version field.
- VS Mind does not import, migrate, or register legacy `.mm`, `.mindmap`, or `.mdmm` documents.
- MindElixir remains the source of truth for the JSON object shape.

## Extension Behavior

- The VS Code custom editor registers only `*.mmf`.
- New empty `.mmf` documents receive the existing default MindElixir JSON content.
- Saving writes the webview's MindElixir JSON directly to the `.mmf` document.
- JSON export uses the `.mmf` extension and MMF terminology.
- Image sidecar data for `example.mmf` remains `example_img.json`.

## Cleanup

- Remove the MDMM adapter, export option, tests, and documentation.
- Remove `.mm` and `.mindmap` selectors, labels, examples, and tests.
- Keep unrelated image, Markdown, plaintext, and PNG export behavior unchanged.

## Verification

- Unit tests cover MMF document detection, default content, serialization, and sidecar naming.
- Webview tests cover the MMF export filename.
- The TypeScript build, unit tests, webview tests, and lint must pass.
