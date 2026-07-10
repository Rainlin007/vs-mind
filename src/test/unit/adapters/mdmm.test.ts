import * as assert from 'assert';
import type { MindElixirData } from 'mind-elixir';
import { fromMdmm, toMdmm } from '../../../adapters/mdmm';

describe('mdmm Adapter Unit Test Suite', () => {
    it('fromMdmm should parse headings, leaves, links, tags, notes, and images', () => {
        const data = fromMdmm([
            '# [Root](https://root.example) #planning',
            '',
            '> Root note',
            '',
            '- Leaf A',
            '',
            '## Branch',
            '',
            '> Branch note',
            '',
            '- [Leaf B](https://leaf.example) #todo',
            '  > Leaf note',
            '  ![Leaf B](https://example.com/image.png)',
            '',
        ].join('\n'));

        assert.strictEqual(data.nodeData.topic, 'Root');
        assert.strictEqual(data.nodeData.hyperLink, 'https://root.example');
        assert.deepStrictEqual(data.nodeData.tags, ['planning']);
        assert.strictEqual(data.nodeData.note, 'Root note');

        const rootChildren = data.nodeData.children ?? [];
        assert.strictEqual(rootChildren.length, 2);
        assert.strictEqual(rootChildren[0].topic, 'Leaf A');
        assert.strictEqual(rootChildren[1].topic, 'Branch');
        assert.strictEqual(rootChildren[1].note, 'Branch note');

        const branchChildren = rootChildren[1].children ?? [];
        assert.strictEqual(branchChildren.length, 1);
        assert.strictEqual(branchChildren[0].topic, 'Leaf B');
        assert.strictEqual(branchChildren[0].hyperLink, 'https://leaf.example');
        assert.deepStrictEqual(branchChildren[0].tags, ['todo']);
        assert.strictEqual(branchChildren[0].note, 'Leaf note');
        assert.strictEqual(branchChildren[0].image?.url, 'https://example.com/image.png');
    });

    it('toMdmm should write branches as headings and leaves as list items', () => {
        const data = {
            nodeData: {
                id: 'root',
                topic: 'Root',
                root: true,
                children: [
                    { id: 'leaf', topic: 'Leaf' },
                    {
                        id: 'branch',
                        topic: 'Branch',
                        children: [
                            { id: 'branch-leaf', topic: 'Branch Leaf' },
                        ],
                    },
                ],
            },
            arrows: [],
        } as unknown as MindElixirData;

        assert.strictEqual(toMdmm(data), [
            '# Root',
            '',
            '- Leaf',
            '',
            '## Branch',
            '',
            '- Branch Leaf',
            '',
        ].join('\n'));
    });
});
