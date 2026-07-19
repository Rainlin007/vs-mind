# Export Default Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every export save dialog default to the source MMF directory, or to the first workspace folder for an unsaved document.

**Architecture:** Keep format and destination resolution inside `ExportService`. Pass the active document URI from `MindMapEditorProvider`, and expose a small URI resolver so path behavior can be verified without opening a save dialog.

**Tech Stack:** TypeScript 4.9, VS Code extension API, Mocha, Node `assert`

## Global Constraints

- Apply the same directory behavior to PNG, MMF, Markdown, and plaintext exports.
- A saved document exports beside its source `.mmf` file.
- An unsaved document exports under the first workspace folder.
- An unsaved document without a workspace preserves the existing relative filename URI.
- Preserve existing filenames, extensions, filters, cancellation behavior, file writes, and success messages.
- Do not add dependencies or unrelated refactors.

---

### Task 1: Resolve and Forward Export Destinations

**Files:**
- Create: `src/test/integration/ExportService.test.ts`
- Modify: `src/frameworks/vscode/ExportService.ts`
- Modify: `src/frameworks/vscode/MindMapEditorProvider.ts`

**Interfaces:**
- Produces: `resolveExportDefaultUri(defaultBaseName: string, format: ExportFormat, sourceDocumentUri: vscode.Uri, workspaceFolders?: readonly vscode.WorkspaceFolder[]): vscode.Uri`
- Changes: `ExportService.saveExport(defaultBaseName: string, format: ExportFormat, content: string | Uint8Array, sourceDocumentUri: vscode.Uri): Promise<void>`
- Consumes: `document.uri` from `MindMapEditorProvider.resolveCustomTextEditor`

- [ ] **Step 1: Write failing URI resolution tests**

Create `src/test/integration/ExportService.test.ts`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { resolveExportDefaultUri } from '../../frameworks/vscode/ExportService';

suite('ExportService Test Suite', () => {
    test('defaults saved-document exports to the MMF directory', () => {
        const sourceUri = vscode.Uri.file('/tmp/maps/example.mmf');

        const result = resolveExportDefaultUri('example', 'markdown', sourceUri, []);

        assert.strictEqual(result.toString(), vscode.Uri.file('/tmp/maps/example.md').toString());
    });

    test('defaults unsaved-document exports to the first workspace folder', () => {
        const sourceUri = vscode.Uri.parse('untitled:Untitled-1');
        const workspaceFolder: vscode.WorkspaceFolder = {
            uri: vscode.Uri.file('/tmp/project'),
            name: 'project',
            index: 0,
        };

        const result = resolveExportDefaultUri('example', 'plaintext', sourceUri, [workspaceFolder]);

        assert.strictEqual(result.toString(), vscode.Uri.file('/tmp/project/example.txt').toString());
    });

    test('keeps the relative filename URI without a workspace', () => {
        const sourceUri = vscode.Uri.parse('untitled:Untitled-1');

        const result = resolveExportDefaultUri('example', 'png', sourceUri, []);

        assert.strictEqual(result.toString(), vscode.Uri.file('example.png').toString());
    });
});
```

- [ ] **Step 2: Compile to verify the tests fail for the missing resolver**

Run: `npm run compile`

Expected: FAIL with TypeScript error `Module '"../../frameworks/vscode/ExportService"' has no exported member 'resolveExportDefaultUri'.`

- [ ] **Step 3: Implement centralized default URI resolution**

In `src/frameworks/vscode/ExportService.ts`, add the resolver after `FORMAT_CONFIG`:

```typescript
export function resolveExportDefaultUri(
    defaultBaseName: string,
    format: ExportFormat,
    sourceDocumentUri: vscode.Uri,
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders,
): vscode.Uri {
    const config = FORMAT_CONFIG[format];
    const safeBaseName = defaultBaseName.trim() || 'mindmap';
    const defaultFileName = `${safeBaseName}.${config.extension}`;

    if (sourceDocumentUri.scheme !== 'untitled') {
        return vscode.Uri.joinPath(sourceDocumentUri, '..', defaultFileName);
    }

    const workspaceUri = workspaceFolders?.[0]?.uri;
    return workspaceUri
        ? vscode.Uri.joinPath(workspaceUri, defaultFileName)
        : vscode.Uri.file(defaultFileName);
}
```

Change `saveExport` to accept the source document URI and use the resolver:

```typescript
public async saveExport(
    defaultBaseName: string,
    format: ExportFormat,
    content: string | Uint8Array,
    sourceDocumentUri: vscode.Uri,
): Promise<void> {
    const config = FORMAT_CONFIG[format];
    const defaultUri = resolveExportDefaultUri(defaultBaseName, format, sourceDocumentUri);

    const targetUri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: config.filters,
        saveLabel: '导出',
    });
```

Keep the existing cancellation, binary/text conversion, write, and success-message code below the dialog call.

- [ ] **Step 4: Forward the active document URI for every export format**

In `src/frameworks/vscode/MindMapEditorProvider.ts`, change both `saveExport` calls:

```typescript
await this.exportService.saveExport(
    defaultName,
    format,
    Buffer.from(e.dataBase64, 'base64'),
    document.uri,
);
```

```typescript
await this.exportService.saveExport(defaultName, format, e.text, document.uri);
```

- [ ] **Step 5: Run the integration tests to verify the behavior passes**

Run: `npm test`

Expected: PASS, including all three `ExportService Test Suite` cases and the existing mind-map editor integration test.

- [ ] **Step 6: Run the complete relevant verification suite**

Run: `npm run test:unit && npm run test:webview && npm run lint && npm run compile`

Expected: all commands exit 0 with no test failures, lint errors, or TypeScript errors.

- [ ] **Step 7: Commit the implementation**

```bash
git add src/frameworks/vscode/ExportService.ts src/frameworks/vscode/MindMapEditorProvider.ts src/test/integration/ExportService.test.ts
git commit -m "fix: default exports to document directory"
```
