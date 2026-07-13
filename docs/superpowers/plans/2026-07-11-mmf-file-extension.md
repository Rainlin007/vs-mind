# MMF File Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.mmf` the only editable mind-map document extension while preserving raw MindElixir JSON as the document body.

**Architecture:** The extension host treats every registered document as raw MindElixir JSON, so format branching is removed from `MindMapService`. VS Code registration, export messages, save-dialog configuration, and image sidecar naming use MMF terminology consistently; Markdown, plaintext, and PNG remain export-only formats.

**Tech Stack:** TypeScript 4.9, VS Code custom editors, MindElixir 5.13, Mocha, Node assert, esbuild.

## Global Constraints

- Register only `*.mmf`; do not register or migrate `.mm`, `.mindmap`, or `.mdmm`.
- Store raw UTF-8 MindElixir JSON without an envelope or version field.
- Preserve PNG, Markdown, and plaintext export behavior.
- Keep image sidecars named `<document-base>_img.json`.
- Do not add dependencies.

---

### Task 1: MMF Document Core

**Files:**
- Modify: `src/domain/MindMap.ts`
- Modify: `src/usecases/MindMapService.ts`
- Create: `src/adapters/imageSidecar.ts`
- Modify: `src/frameworks/vscode/VSCodeImageRepository.ts`
- Modify: `src/frameworks/vscode/MindMapEditorProvider.ts`
- Modify: `src/domain/IImageRepository.ts`
- Modify: `src/test/unit/usecases/MindMapService.test.ts`
- Create: `src/test/unit/adapters/imageSidecar.test.ts`
- Modify: `src/test/integration/MindMapEditor.test.ts`

**Interfaces:**
- Produces: `createDefaultMindMapData(): MindMapData`
- Produces: `getImageSidecarPath(mmfFsPath: string): string`
- Produces: `MindMapService.getWebviewContent(text: string, fsPath: string): Promise<WebviewContent>` with raw JSON and no format discriminator
- Produces: `MindMapService.serializeWebviewContent(text: string): string`

- [x] **Step 1: Write failing MMF service and sidecar tests**

Replace legacy format assertions with raw MMF assertions and add:

```ts
it('should initialize an empty mmf document with MindElixir JSON', async () => {
    const result = await service.getWebviewContent('', '/tmp/example.mmf');
    const parsed = JSON.parse(result.text);
    assert.strictEqual(parsed.nodeData.topic, 'Central Topic');
    assert.strictEqual(result.documentText, result.text);
});

it('should preserve mmf JSON when loading and saving', async () => {
    const json = JSON.stringify({ nodeData: { id: 'root', topic: 'Root' } });
    const result = await service.getWebviewContent(json, '/tmp/example.mmf');
    assert.strictEqual(result.text, json);
    assert.strictEqual(service.serializeWebviewContent(json), json);
});

it('uses an _img.json sidecar for mmf documents', () => {
    assert.strictEqual(getImageSidecarPath('/tmp/example.mmf'), '/tmp/example_img.json');
});
```

- [x] **Step 2: Run tests and verify the legacy implementation fails**

Run: `npm run compile && npx mocha out/test/unit/usecases/MindMapService.test.js out/test/unit/adapters/imageSidecar.test.js`

Expected: FAIL because `getImageSidecarPath` does not exist and the service still exposes JSON/MDMM format branching.

- [x] **Step 3: Implement the minimal MMF-only document path**

Move default MindElixir data creation into `src/domain/MindMap.ts`, reduce `MindMapService` to raw JSON pass-through, and add:

```ts
export function getImageSidecarPath(mmfFsPath: string): string {
    return mmfFsPath.replace(/\.mmf$/i, '_img.json');
}
```

Use this helper from `VSCodeImageRepository.getImagesPath`, update `MindMapEditorProvider` to call `serializeWebviewContent(e.text)` without a format path, update comments to `.mmf`, and rename the integration fixture to `empty.mmf`.

- [x] **Step 4: Run focused tests and verify green**

Run: `npm run compile && npx mocha out/test/unit/usecases/MindMapService.test.js out/test/unit/adapters/imageSidecar.test.js`

Expected: all focused tests PASS.

### Task 2: MMF Export Protocol and MDMM Removal

**Files:**
- Modify: `src/frameworks/webview/ExportToolbar.ts`
- Modify: `src/frameworks/webview/toolbarHtml.ts`
- Modify: `src/frameworks/webview/markdownExport.ts`
- Modify: `src/frameworks/webview/plaintextExport.ts`
- Modify: `src/frameworks/vscode/ExportService.ts`
- Modify: `src/frameworks/vscode/MindMapEditorProvider.ts`
- Create: `src/test/unit/webview/ExportToolbar.test.ts`
- Delete: `src/adapters/mdmm.ts`
- Delete: `src/test/unit/adapters/mdmm.test.ts`
- Modify: `src/test/webview/main.test.ts`

**Interfaces:**
- Produces: `ExportFormat = 'png' | 'mmf' | 'markdown' | 'plaintext'` in webview and extension host
- Produces: MMF export messages with `defaultName: <base>.mmf` and raw MindElixir JSON text
- Preserves: `toExportMarkdown(data: MindElixirData): string`

- [x] **Step 1: Write a failing export toolbar test**

Construct `ExportToolbar` with stubbed DOM controls, trigger the `data-export="mmf"` click handler, and assert:

```ts
assert.deepStrictEqual(postMessage.firstCall.args[0], {
    type: 'exportFile',
    format: 'mmf',
    defaultName: 'example.mmf',
    text: JSON.stringify(data, null, 2),
});
```

- [x] **Step 2: Run the focused test and verify red**

Run: `npm run compile && npx mocha out/test/unit/webview/ExportToolbar.test.js`

Expected: FAIL because `mmf` is not an export format and the current JSON export defaults to `.mm`.

- [x] **Step 3: Implement MMF export and remove MDMM**

Change both `ExportFormat` unions to:

```ts
export type ExportFormat = 'png' | 'mmf' | 'markdown' | 'plaintext';
```

Rename the toolbar item from JSON to MMF, emit `.mmf`, configure the save dialog filter as `{ 'Mind Map Format': ['mmf'] }`, and remove all MDMM cases. Move the Markdown serialization helpers needed by `toExportMarkdown` into `markdownExport.ts`, then delete the MDMM parser and its tests. Load MindElixir's import-only plaintext converter lazily so CommonJS test discovery can load the toolbar, and bring the webview DOM mocks up to the APIs used by `NodeNoteTooltip` and `MutationObserver`.

- [x] **Step 4: Run export and Markdown tests and verify green**

Run: `npm run compile && npx mocha out/test/unit/webview/ExportToolbar.test.js out/test/unit/webview/markdownExport.test.js out/test/unit/adapters/exportMindMap.test.js`

Expected: all focused tests PASS.

### Task 3: Registration, Documentation, and Full Verification

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `specifications.md`
- Rename: `skills/mm-format/` to `skills/mmf-format/`
- Modify: `debug/webview.html`
- Modify: `src/test/integration/index.ts`

**Interfaces:**
- Produces: VS Code custom editor selector containing only `*.mmf`
- Documents: MMF as raw MindElixir JSON and the sole editable document format

- [x] **Step 1: Add a manifest assertion before editing registration**

Run this one-off assertion and verify it fails against the old manifest:

```bash
node -e "const p=require('./package.json'); const s=p.contributes.customEditors[0].selector.map(x=>x.filenamePattern); if (JSON.stringify(s)!=='[\"*.mmf\"]') process.exit(1)"
```

Expected: exit code 1 because the manifest still contains `.mm`, `.mindmap`, and `.mdmm`.

- [x] **Step 2: Update manifest and documentation**

Set the selector to only `{ "filenamePattern": "*.mmf" }`. Replace legacy file-format references in both README languages and the active specification, describe MMF as raw MindElixir JSON, remove MDMM from supported and export format lists, update development examples to `.mmf`, and rename the repository format skill to `mmf-format`. Preserve historical changelog entries while adding the MMF-only change under the unreleased release.

- [x] **Step 3: Verify registration and stale-reference cleanup**

Run the manifest assertion again; expected exit code 0.

Run: `rg -n "mdmm|\.mindmap|\.mm\b|\['mm'" src package.json README.md`

Expected: no legacy document-format references.

- [x] **Step 4: Run the full verification suite**

Run: `npm run compile`

Run: `npm run test:unit`

Run: `npm run test:webview`

Run: `npm run lint`

Expected: every command exits 0 with no test failures or lint errors.

Run: `npm run test:browser`

Expected: Chromium renders the map, exposes MMF without JSON/MDMM controls, emits a `.mmf` export message containing MindElixir JSON, and passes all interaction checks. Failed browser checks must set the harness result to failed rather than relying only on uncaught errors.

- [x] **Step 5: Review the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors; only MMF implementation, tests, and documentation changes remain.
