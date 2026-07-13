import * as assert from 'assert';
import * as sinon from 'sinon';
import type { MindElixirData } from 'mind-elixir';
import { ExportToolbar } from '../../../frameworks/webview/ExportToolbar';

describe('ExportToolbar Unit Test Suite', () => {
    const originalDocument = global.document;

    afterEach(() => {
        (global as typeof globalThis).document = originalDocument;
        sinon.restore();
    });

    it('exports MindElixir JSON as an mmf file', async () => {
        let itemClick: ((event: { stopPropagation(): void }) => void) | undefined;
        const trigger = {
            addEventListener: sinon.spy(),
            setAttribute: sinon.spy(),
            disabled: false,
        };
        const item = {
            dataset: { export: 'mmf' },
            addEventListener: sinon.stub().callsFake((type: string, handler: typeof itemClick) => {
                if (type === 'click') {
                    itemClick = handler;
                }
            }),
        };
        const menu = {
            querySelectorAll: sinon.stub().returns([item]),
            classList: { add: sinon.spy(), remove: sinon.spy() },
        };
        const documentStub = {
            getElementById: sinon.stub().callsFake((id: string) => id === 'export-trigger' ? trigger : menu),
            addEventListener: sinon.spy(),
        };
        (global as typeof globalThis).document = documentStub as unknown as Document;

        const data = {
            nodeData: { id: 'root', topic: 'Root' },
            arrows: [],
        } as unknown as MindElixirData;
        const postMessage = sinon.spy();

        new ExportToolbar({
            getDocumentBaseName: () => 'example',
            getExportData: () => data,
            exportPng: async () => null,
            postMessage,
            onError: sinon.spy(),
        });

        assert.ok(itemClick);
        itemClick({ stopPropagation() { } });
        await new Promise<void>((resolve) => setImmediate(resolve));

        assert.deepStrictEqual(postMessage.firstCall?.args[0], {
            type: 'exportFile',
            format: 'mmf',
            defaultName: 'example.mmf',
            text: JSON.stringify(data, null, 2),
        });
    });
});
