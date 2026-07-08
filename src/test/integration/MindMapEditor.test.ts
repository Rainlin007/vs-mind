import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('MindMapEditor Test Suite', () => {
    let tmpDir: string;

    suiteSetup(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-mm-test-'));
    });

    suiteTeardown(() => {
        fs.rmdirSync(tmpDir, { recursive: true });
    });

    test('Should initialize empty .mindmap file with default content', async () => {
        const uri = vscode.Uri.file(path.join(tmpDir, 'empty.mindmap'));
        await vscode.workspace.fs.writeFile(uri, new Uint8Array(0));

        // Open the document using the custom editor
        try {
            // Use openWith to ensure custom editor is used
            await vscode.commands.executeCommand('vscode.openWith', uri, 'vscode-mm.mindmap');

            // We need to wait for the document to be opened and the provider to initialize
            // The doc might not be in workspace.textDocuments immediately or updated immediately

            // Poll for content change
            // We need to find the document.
            const doc = await vscode.workspace.openTextDocument(uri);

            let text = '';
            for (let i = 0; i < 50; i++) { // 5 seconds
                // Re-read doc text (it might update in place)
                text = doc.getText();
                if (text.trim().length > 0) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            assert.notStrictEqual(text.trim(), '', 'Document should not be empty after opening');
            const json = JSON.parse(text);
            assert.strictEqual(json.nodeData.topic, 'Central Topic', 'Should have default central topic');

        } catch (e) {
            assert.fail(e as Error);
        }
    }).timeout(10000);
});
