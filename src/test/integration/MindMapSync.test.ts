import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { MindMapEditorProvider } from '../../frameworks/vscode/MindMapEditorProvider';
import { ExportService } from '../../frameworks/vscode/ExportService';
import { MindMapService, WebviewContent } from '../../usecases/MindMapService';

suite('Mind map document synchronization', () => {
    let directory: string;
    let document: vscode.TextDocument;
    let disposePanel: vscode.EventEmitter<void>;
    let viewState: vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>;
    let panel: vscode.WebviewPanel;
    let receive: (message: { type: string; text: string }) => Promise<void>;
    let readContent: sinon.SinonStub;
    let postMessage: sinon.SinonStub;
    const content = (text: string): WebviewContent => ({ text, documentText: text, images: {} });
    const flush = () => new Promise(resolve => setTimeout(resolve, 30));

    async function replace(text: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);
        assert.ok(await vscode.workspace.applyEdit(edit));
    }

    setup(async () => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-mind-sync-'));
        const uri = vscode.Uri.file(path.join(directory, 'map.mmf'));
        await vscode.workspace.fs.writeFile(uri, Buffer.from('initial'));
        document = await vscode.workspace.openTextDocument(uri);
        disposePanel = new vscode.EventEmitter<void>();
        viewState = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
        postMessage = sinon.stub().resolves(true);
        panel = {
            webview: {
                asWebviewUri: (value: vscode.Uri) => value,
                cspSource: 'test',
                postMessage,
                onDidReceiveMessage: (handler: typeof receive) => {
                    receive = handler;
                    return new vscode.Disposable(() => {});
                },
            },
            onDidDispose: disposePanel.event,
            onDidChangeViewState: viewState.event,
            visible: true,
            active: true,
        } as unknown as vscode.WebviewPanel;
        const service = new MindMapService({
            getImagesPath: filePath => `${filePath}_img.json`,
            readImages: async () => ({}),
            writeImages: async () => {},
        });
        readContent = sinon.stub(service, 'getWebviewContent').callsFake(async text => content(text));
        const provider = new MindMapEditorProvider(
            { extensionUri: vscode.Uri.file(directory) } as vscode.ExtensionContext,
            service,
            {} as ExportService,
        );
        await provider.resolveCustomTextEditor(document, panel);
        await flush();
        assert.strictEqual(postMessage.callCount, 1);
    });

    teardown(async () => {
        disposePanel.fire();
        disposePanel.dispose();
        viewState.dispose();
        await document.save();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    test('does not reload the canvas when saving only changes the dirty state', async () => {
        await replace('edited');
        await flush();
        assert.strictEqual(postMessage.lastCall.args[0].text, 'edited');
        const calls = readContent.callCount;
        const events: vscode.TextDocumentChangeEvent[] = [];
        const listener = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document === document) events.push(event);
        });
        try {
            assert.ok(await document.save());
            await flush();
            assert.ok(events.some(event => event.contentChanges.length === 0), 'save must emit a dirty-state event');
            assert.strictEqual(readContent.callCount, calls, 'save must not reread images or resend the document');
        } finally {
            listener.dispose();
        }
    });

    test('discards an older image read that finishes after a newer document update', async () => {
        let finishRead!: (value: WebviewContent) => void;
        readContent.onCall(readContent.callCount).returns(new Promise(resolve => { finishRead = resolve; }));
        await replace('older');
        await replace('newer');
        await flush();
        assert.strictEqual(postMessage.lastCall.args[0].text, 'newer');
        const calls = postMessage.callCount;
        finishRead(content('older'));
        await flush();
        assert.strictEqual(postMessage.callCount, calls, 'old snapshot must not overwrite the canvas');
    });

    test('auto-saves webview edits without sending a document reload', async () => {
        assert.strictEqual(vscode.workspace.getConfiguration('vscode-mm').get('autoSave'), true);
        await receive({ type: 'change', text: 'auto-saved edit' });
        assert.ok(document.isDirty);
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                listener.dispose();
                reject(new Error('Auto-save did not run'));
            }, 6500);
            const listener = vscode.workspace.onDidSaveTextDocument(saved => {
                if (saved !== document) return;
                clearTimeout(timeout);
                listener.dispose();
                resolve();
            });
        });
        await flush();
        assert.strictEqual(document.isDirty, false);
        assert.strictEqual(readContent.callCount, 1);
        assert.strictEqual(postMessage.callCount, 1);
    }).timeout(7000);

    test('invalidates a pending tab refresh when the webview sends an edit', async () => {
        let finishRead!: (value: WebviewContent) => void;
        readContent.onCall(readContent.callCount).returns(new Promise(resolve => { finishRead = resolve; }));
        viewState.fire({ webviewPanel: panel });
        await receive({ type: 'change', text: 'local edit' });
        finishRead(content('initial'));
        await flush();
        assert.strictEqual(document.getText(), 'local edit');
        assert.strictEqual(postMessage.callCount, 1, 'local edits must not be echoed or overwritten');
    });
});
