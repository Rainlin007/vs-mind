import * as assert from 'assert';
import { createMindElixirMarkdownParser } from '../../../frameworks/webview/markdown';

describe('node markdown rendering', () => {
    const render = createMindElixirMarkdownParser();

    it('renders line breaks in plain and formatted node text', () => {
        assert.strictEqual(render('第一行\n**第二行**\r\n第三行', {}),
            '<p>第一行<br><strong class="md-bold">第二行</strong><br>第三行</p>');
    });

    it('preserves line breaks and indentation inside code blocks', () => {
        assert.strictEqual(render('```\nfirst\n  second\n```', {}),
            '<pre><code>first\n  second\n</code></pre>');
    });

    it('keeps paragraphs and lists as separate blocks', () => {
        assert.strictEqual(render('first\n\nsecond\n\n- one\n- two', {}),
            '<p>first</p>\n<p>second</p>\n<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
    });
});
