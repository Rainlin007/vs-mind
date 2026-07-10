import * as assert from 'assert';
import { MindMapService } from '../../../usecases/MindMapService';
import type { IImageRepository } from '../../../domain/IImageRepository';
import type { ImageMap } from '../../../domain/MindMap';

class MemoryImageRepository implements IImageRepository {
    async readImages(): Promise<ImageMap> {
        return {};
    }

    async writeImages(): Promise<void> {
        return;
    }

    getImagesPath(mindMapFsPath: string): string {
        return `${mindMapFsPath}_img.json`;
    }
}

describe('MindMapService Unit Test Suite', () => {
    const service = new MindMapService(new MemoryImageRepository());

    it('should convert mdmm document text to webview json', async () => {
        const result = await service.getWebviewContent([
            '# Root',
            '',
            '## Branch',
            '',
            '- Leaf',
            '',
        ].join('\n'), '/tmp/example.mdmm');

        const parsed = JSON.parse(result.text);
        assert.strictEqual(result.format, 'mdmm');
        assert.strictEqual(result.documentText.includes('# Root'), true);
        assert.strictEqual(parsed.nodeData.topic, 'Root');
        assert.strictEqual(parsed.nodeData.children[0].topic, 'Branch');
        assert.strictEqual(parsed.nodeData.children[0].children[0].topic, 'Leaf');
    });

    it('should serialize webview json back to mdmm for mdmm documents', () => {
        const documentText = service.serializeWebviewContent(JSON.stringify({
            nodeData: {
                id: 'root',
                topic: 'Root',
                root: true,
                children: [
                    { id: 'leaf', topic: 'Leaf' },
                ],
            },
            arrows: [],
        }), '/tmp/example.mdmm');

        assert.strictEqual(documentText, '# Root\n\n- Leaf\n');
    });

    it('should leave json documents as json', async () => {
        const json = JSON.stringify({
            nodeData: { id: 'root', topic: 'Root', root: true, children: [] },
            arrows: [],
        });

        const result = await service.getWebviewContent(json, '/tmp/example.mm');
        assert.strictEqual(result.format, 'json');
        assert.strictEqual(result.text, json);
        assert.strictEqual(service.serializeWebviewContent(json, '/tmp/example.mm'), json);
    });
});
