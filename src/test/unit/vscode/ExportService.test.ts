import * as assert from 'assert';
import * as path from 'path';
import * as sinon from 'sinon';
import { ExportService } from '../../../frameworks/vscode/ExportService';

class FakeUri {
    readonly scheme = 'file';
    readonly authority = '';
    readonly query = '';
    readonly fragment = '';

    constructor(readonly path: string) { }

    get fsPath(): string {
        return this.path;
    }

    static file(filePath: string): FakeUri {
        return new FakeUri(filePath);
    }

    static parse(value: string): FakeUri {
        if (!value.startsWith('file://')) {
            throw new Error('Invalid URI');
        }
        return new FakeUri(value.slice('file://'.length));
    }

    static joinPath(base: FakeUri, ...parts: string[]): FakeUri {
        return new FakeUri(path.posix.join(base.path, ...parts));
    }

    with(change: { path?: string }): FakeUri {
        return new FakeUri(change.path ?? this.path);
    }

    toString(): string {
        return `file://${this.path}`;
    }
}

describe('ExportService', () => {
    function createState() {
        const values = new Map<string, unknown>();
        return {
            get: sinon.stub().callsFake((key: string, fallback?: unknown) => (
                values.has(key) ? values.get(key) : fallback
            )),
            update: sinon.stub().callsFake(async (key: string, value: unknown) => {
                values.set(key, value);
            }),
        };
    }

    it('starts in the containing workspace and remembers the successful export directory', async () => {
        const state = createState();
        const workspaceUri = FakeUri.file('/workspace');
        const firstTarget = FakeUri.file('/exports/plan.md');
        const secondTarget = FakeUri.file('/exports/plan.txt');
        const showSaveDialog = sinon.stub();
        showSaveDialog.onFirstCall().resolves(firstTarget);
        showSaveDialog.onSecondCall().resolves(secondTarget);
        const writeFile = sinon.stub().resolves();
        const runtime = {
            Uri: FakeUri,
            window: {
                showSaveDialog,
                showInformationMessage: sinon.stub(),
            },
            workspace: {
                workspaceFolders: [{ uri: workspaceUri }],
                getWorkspaceFolder: sinon.stub().returns({ uri: workspaceUri }),
                fs: { writeFile },
            },
        };
        const service = new ExportService(state as never, runtime as never);
        const sourceUri = FakeUri.file('/workspace/maps/source.mmf');

        await service.saveExport('plan', 'markdown', '# Plan', sourceUri as never);
        await service.saveExport('plan', 'plaintext', 'Plan', sourceUri as never);

        assert.strictEqual(showSaveDialog.firstCall.args[0].defaultUri.path, '/workspace/plan.md');
        assert.strictEqual(showSaveDialog.secondCall.args[0].defaultUri.path, '/exports/plan.txt');
        assert.ok(state.update.calledWith('vscode-mm.lastExportDirectory', 'file:///exports'));
        assert.ok(writeFile.calledTwice);
    });

    it('falls back to the source document directory outside a workspace', async () => {
        const state = createState();
        const showSaveDialog = sinon.stub().resolves(undefined);
        const runtime = {
            Uri: FakeUri,
            window: {
                showSaveDialog,
                showInformationMessage: sinon.stub(),
            },
            workspace: {
                workspaceFolders: undefined,
                getWorkspaceFolder: sinon.stub().returns(undefined),
                fs: { writeFile: sinon.stub() },
            },
        };
        const service = new ExportService(state as never, runtime as never);

        await service.saveExport(
            'standalone',
            'mmf',
            '{}',
            FakeUri.file('/documents/maps/source.mmf') as never,
        );

        assert.strictEqual(
            showSaveDialog.firstCall.args[0].defaultUri.path,
            '/documents/maps/standalone.mmf',
        );
        assert.ok(state.update.notCalled);
    });
});
