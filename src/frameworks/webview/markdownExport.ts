import type { MindElixirData, NodeObj, TagObj } from 'mind-elixir';

type NodeWithAiNote = NodeObj & { ai_note?: string };

function decodeHtmlEntities(text: string): string {
    const namedEntities: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        nbsp: ' ',
    };

    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
        if (entity.startsWith('#x')) {
            return String.fromCharCode(parseInt(entity.slice(2), 16));
        }
        if (entity.startsWith('#')) {
            return String.fromCharCode(parseInt(entity.slice(1), 10));
        }
        return namedEntities[entity] ?? match;
    });
}

function htmlToText(html: string): string {
    return decodeHtmlEntities(
        html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/<[^>]*>/g, '')
    );
}

function normalizeInlineText(text: string | undefined, fallback = 'Untitled'): string {
    const normalized = (text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ');

    return normalized || fallback;
}

function normalizeBlockLines(text: string | undefined): string[] {
    return (text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function escapeMarkdownLinkText(text: string): string {
    return text.replace(/]/g, '\\]');
}

function escapeMarkdownTarget(target: string): string {
    return target.trim().replace(/\)/g, '\\)');
}

function formatTag(tag: string | TagObj): string {
    const value = typeof tag === 'string' ? tag : tag.text;
    const normalized = normalizeInlineText(value, '').replace(/\s+/g, '-');
    return normalized ? `#${normalized}` : '';
}

function getNodeTopic(node: NodeObj): string {
    return normalizeInlineText(
        node.dangerouslySetInnerHTML
            ? htmlToText(node.dangerouslySetInnerHTML)
            : node.topic
    );
}

function formatNodeContent(node: NodeObj): string {
    const topic = getNodeTopic(node);
    const title = node.hyperLink
        ? `[${escapeMarkdownLinkText(topic)}](${escapeMarkdownTarget(node.hyperLink)})`
        : topic;
    const tags = node.tags?.map(formatTag).filter(Boolean) ?? [];

    return tags.length > 0 ? `${title} ${tags.join(' ')}` : title;
}

function getNodeDetailLines(node: NodeObj, indent: string): string[] {
    const lines: string[] = [];

    for (const noteLine of normalizeBlockLines(node.note)) {
        lines.push(`${indent}> ${noteLine}`);
    }

    for (const aiNoteLine of normalizeBlockLines((node as NodeWithAiNote).ai_note)) {
        lines.push(`${indent}> **AI 备注：** ${aiNoteLine}`);
    }

    const imageUrl = node.image?.url;
    if (imageUrl) {
        lines.push(`${indent}![${escapeMarkdownLinkText(getNodeTopic(node))}](${escapeMarkdownTarget(imageUrl)})`);
    }

    return lines;
}

function hasChildren(node: NodeObj): boolean {
    return (node.children?.length ?? 0) > 0;
}

function appendLeafList(lines: string[], leaves: NodeObj[]): void {
    for (const leaf of leaves) {
        lines.push(`- ${formatNodeContent(leaf)}`);
        lines.push(...getNodeDetailLines(leaf, '  '));
    }
}

function appendHeadingNode(lines: string[], node: NodeObj, depth: number): void {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('');
    }

    const headingLevel = Math.min(depth + 1, 6);
    lines.push(`${'#'.repeat(headingLevel)} ${formatNodeContent(node)}`);

    const detailLines = getNodeDetailLines(node, '');
    const children = node.children ?? [];
    const leafChildren = children.filter((child) => !hasChildren(child));
    const headingChildren = children.filter(hasChildren);

    if (detailLines.length > 0 || leafChildren.length > 0 || headingChildren.length > 0) {
        lines.push('');
    }
    lines.push(...detailLines);
    if (detailLines.length > 0 && (leafChildren.length > 0 || headingChildren.length > 0)) {
        lines.push('');
    }

    appendLeafList(lines, leafChildren);
    if (leafChildren.length > 0 && headingChildren.length > 0) {
        lines.push('');
    }

    for (const child of headingChildren) {
        appendHeadingNode(lines, child, depth + 1);
    }
}

export function toExportMarkdown(data: MindElixirData): string {
    const root = data.nodeData;
    if (!root) {
        return '';
    }

    const lines: string[] = [];
    appendHeadingNode(lines, root, 0);
    return `${lines.join('\n')}\n`;
}
