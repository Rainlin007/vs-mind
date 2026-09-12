import { strict as assert } from 'assert';
import { createMindElixirMarkdownParser } from '../../../frameworks/webview/markdown';

describe('MindElixir markdown parser', () => {
    it('preserves line breaks in node topics', () => {
        const parser = createMindElixirMarkdownParser();

        const html = parser('第一行\n第二行', {});

        assert.match(html, /第一行\n第二行/);
    });

    it('preserves Markdown paragraphs while rendering each line', () => {
        const parser = createMindElixirMarkdownParser();

        const html = parser('第一行\n第二行\n\n第三行', {});

        assert.match(html, /<p>第一行\n第二行<\/p>/);
        assert.match(html, /<p>第三行<\/p>/);
    });
});
