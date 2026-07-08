import { marked, type Tokens } from 'marked';
import katex from 'katex';
import type { NodeObj } from 'mind-elixir';

type MarkdownObj = NodeObj | { useMd?: boolean; label?: string };

/**
 * MindElixir markdown parser with KaTeX math support.
 * Based on the official mind-elixir dev.ts reference implementation.
 */
export function createMindElixirMarkdownParser(): (text: string, obj: MarkdownObj) => string {
    const renderer = {
        strong(token: Tokens.Strong) {
            if (token.raw.startsWith('**')) {
                return `<strong class="md-bold">${token.text}</strong>`;
            }
            if (token.raw.startsWith('__')) {
                return `<strong class="md-highlight">${token.text}</strong>`;
            }
            return `<strong>${token.text}</strong>`;
        },
        link(token: Tokens.Link) {
            const href = token.href || '';
            const title = token.title ? ` title="${token.title}"` : '';
            const text = token.text || '';
            return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title}>${text}</a>`;
        },
    };

    marked.use({ renderer, gfm: true });

    return (text: string, _obj: MarkdownObj) => {
        if (!text) {
            return '';
        }

        try {
            let html = marked.parse(text) as string;

            html = html.replace(/\$\$([^$]+)\$\$/g, (_, math: string) => {
                return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
            });

            html = html.replace(/\$([^$]+)\$/g, (_, math: string) => {
                return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
            });

            return html.trim().replace(/\n/g, '');
        } catch {
            return text;
        }
    };
}
