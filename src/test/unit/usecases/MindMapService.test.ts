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

    it('should initialize an empty mmf document with MindElixir JSON', async () => {
        const result = await service.getWebviewContent('', '/tmp/example.mmf');
        const parsed = JSON.parse(result.text);
        assert.strictEqual(parsed.nodeData.topic, 'Central Topic');
        assert.strictEqual(result.documentText, result.text);
    });

    it('should preserve mmf JSON when loading and saving', async () => {
        const json = JSON.stringify({
            nodeData: { id: 'root', topic: 'Root', root: true, children: [] },
            arrows: [],
        });

        const result = await service.getWebviewContent(json, '/tmp/example.mmf');
        assert.strictEqual(result.text, json);
        assert.strictEqual(service.serializeWebviewContent(json), json);
    });
});
