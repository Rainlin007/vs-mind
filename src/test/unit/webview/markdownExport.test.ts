import * as assert from 'assert';
import type { MindElixirData } from 'mind-elixir';
import { toExportMarkdown } from '../../../frameworks/webview/markdownExport';

describe('markdownExport Unit Test Suite', () => {
    it('should export branch nodes as headings and leaves as list items', () => {
        const data = {
            nodeData: {
                id: 'root',
                topic: 'Central Topic',
                root: true,
                hyperLink: 'https://example.com',
                note: 'Root note',
                ai_note: 'Use the approved constraints only.',
                tags: ['planning', ''],
                image: {
                    url: 'data:image/png;base64,abc',
                    width: 100,
                    height: 80,
                },
                children: [
                    { id: 'child2', topic: 'Child 2' },
                    {
                        id: 'child1',
                        topic: 'Child 1',
                        note: 'Child note',
                        children: [
                            { id: 'grandchild1', topic: 'Grandchild' },
                        ],
                    },
                ],
            },
            arrows: [],
        } as unknown as MindElixirData;

        assert.strictEqual(toExportMarkdown(data), [
            '# [Central Topic](https://example.com) #planning',
            '',
            '> Root note',
            '> **AI 备注：** Use the approved constraints only.',
            '![Central Topic](data:image/png;base64,abc)',
            '',
            '- Child 2',
            '',
            '## Child 1',
            '',
            '> Child note',
            '',
            '- Grandchild',
            '',
        ].join('\n'));
    });

    it('should convert html node content to text', () => {
        const data = {
            nodeData: {
                id: 'root',
                topic: 'Ignored',
                dangerouslySetInnerHTML: '<strong>HTML</strong><br>Topic &amp; More',
            },
        } as unknown as MindElixirData;

        assert.strictEqual(toExportMarkdown(data), '# HTML Topic & More\n');
    });

    it('should place summaries after their grouped sibling range', () => {
        const data = {
            nodeData: {
                id: 'root',
                topic: 'Delivery Plan',
                children: [
                    {
                        id: 'research',
                        topic: 'Research',
                        children: [{ id: 'interviews', topic: 'Interviews' }],
                    },
                    { id: 'build', topic: 'Build' },
                    { id: 'ship', topic: 'Ship' },
                ],
            },
            summaries: [{
                id: 'summary-1',
                parent: 'root',
                start: 0,
                end: 1,
                label: 'Research and implementation are ready for review.',
            }],
        } as unknown as MindElixirData;

        assert.strictEqual(toExportMarkdown(data), [
            '# Delivery Plan',
            '',
            '## Research',
            '',
            '- Interviews',
            '',
            '## Build',
            '',
            '## 摘要（Research ～ Build）',
            '',
            'Research and implementation are ready for review.',
            '',
            '## Ship',
            '',
        ].join('\n'));
    });
});
