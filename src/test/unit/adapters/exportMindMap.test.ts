import * as assert from 'assert';
import { toExportJson } from '../../../adapters/exportMindMap';
import type { MindElixirData } from 'mind-elixir';

describe('exportMindMap Adapter Unit Test Suite', () => {
    const sampleData = {
        nodeData: {
            id: 'root',
            topic: 'Central Topic',
            root: true,
            children: [
                { id: 'child1', topic: 'Child 1' },
            ],
        },
        arrows: [],
    } as unknown as MindElixirData;

    it('toExportJson should stringify mind map data with indentation', () => {
        const result = toExportJson(sampleData);
        const parsed = JSON.parse(result);
        assert.strictEqual(parsed.nodeData.topic, 'Central Topic');
        assert.ok(result.includes('\n'));
    });
});
