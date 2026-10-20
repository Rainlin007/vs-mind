# Export Default Directory Design

## Goal

Open every export save dialog in the most relevant project location instead of relying on the process working directory.

## Behavior

- For a saved `.mmf` document, PNG, MMF, Markdown, and plaintext exports default to the directory containing that document.
- For an unsaved document, exports default to the first workspace folder.
- If an unsaved document has no open workspace, preserve the current relative default URI behavior.
- Preserve the existing default base name, format-specific extension, filters, save label, cancellation behavior, and success message.

## Design

- Pass the source document URI from `MindMapEditorProvider` to `ExportService.saveExport`.
- Let `ExportService` resolve the default URI in one place:
  - use the source document directory when the URI represents a saved file;
  - otherwise use the first workspace folder when available;
  - otherwise preserve the existing relative filename URI.
- Use VS Code URI utilities for path construction so the service does not manually concatenate filesystem paths.

## Testing

- Verify a saved document produces a default export URI beside the source `.mmf` file.
- Verify an unsaved document produces a default export URI under the first workspace folder.
- Verify an unsaved document without a workspace preserves the relative filename URI.
- Run the relevant unit tests, TypeScript compilation, and lint checks.
