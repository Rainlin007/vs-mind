import type { MindElixirData, NodeObj, TagObj } from 'mind-elixir';

type MdmmData = MindElixirData & {
    themeTemplate?: string;
    backgroundPattern?: 'none' | 'dots' | 'grid' | 'crossDot';
    bgPatternColor?: string;
    bgPatternOpacity?: number;
    lineStyle?: 'curve' | 'straight' | 'markmap' | 'straightUnderline';
};

interface HeadingEntry {
    level: number;
    node: NodeObj;
}

interface ParsedContent {
    topic: string;
    hyperLink?: string;
    tags?: string[];
}

const DEFAULT_SETTINGS = {
    themeTemplate: 'clayLight',
    backgroundPattern: 'grid' as const,
    bgPatternColor: '#808080',
    bgPatternOpacity: 5,
    direction: 1 as const,
    lineStyle: 'curve' as const,
};

function createId(): string {
    return `mdmm-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`.slice(0, 18);
}

export function createDefaultMindMapData(): MdmmData {
    return {
        nodeData: {
            id: 'root',
            topic: 'Central Topic',
            root: true,
            children: [],
        } as NodeObj & { root: true },
        arrows: [],
        ...DEFAULT_SETTINGS,
    };
}

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

function unescapeMarkdownText(text: string): string {
    return text.replace(/\\([\\[\]()#])/g, '$1').trim();
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
    if (leaves.length === 0) {
        return;
    }

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

export function toMdmm(data: MindElixirData): string {
    const root = data.nodeData;
    if (!root) {
        return '';
    }

    const lines: string[] = [];
    appendHeadingNode(lines, root, 0);

    return `${lines.join('\n')}\n`;
}

function parseNodeContent(raw: string): ParsedContent {
    let text = raw.trim();
    const tags: string[] = [];

    text = text.replace(/(?:^|\s)#([^\s#]+)/g, (match, tag) => {
        tags.push(unescapeMarkdownText(tag));
        return match.startsWith(' ') ? ' ' : '';
    }).trim();

    const linkMatch = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
        return {
            topic: unescapeMarkdownText(linkMatch[1]),
            hyperLink: linkMatch[2].trim(),
            tags: tags.length > 0 ? tags : undefined,
        };
    }

    return {
        topic: normalizeInlineText(unescapeMarkdownText(text)),
        tags: tags.length > 0 ? tags : undefined,
    };
}

function createNode(rawContent: string, root = false): NodeObj {
    const parsed = parseNodeContent(rawContent);
    const node: NodeObj = {
        id: root ? 'root' : createId(),
        topic: parsed.topic,
    };

    if (root) {
        (node as NodeObj & { root?: boolean }).root = true;
    }
    if (parsed.hyperLink) {
        node.hyperLink = parsed.hyperLink;
    }
    if (parsed.tags && parsed.tags.length > 0) {
        node.tags = parsed.tags;
    }

    return node;
}

function appendChild(parent: NodeObj, child: NodeObj): void {
    if (!parent.children) {
        parent.children = [];
    }
    parent.children.push(child);
}

function findHeadingParent(stack: HeadingEntry[], level: number, root: NodeObj): NodeObj {
    for (let index = stack.length - 1; index >= 0; index--) {
        if (stack[index].level < level) {
            return stack[index].node;
        }
    }
    return root;
}

function appendNoteLine(node: NodeObj, noteLine: string): void {
    const note = noteLine.trim();
    if (!note) {
        return;
    }
    node.note = node.note ? `${node.note}\n${note}` : note;
}

function parseImageLine(line: string): { alt: string; url: string } | null {
    const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (!match) {
        return null;
    }
    return {
        alt: unescapeMarkdownText(match[1]),
        url: match[2].trim(),
    };
}

function attachImage(node: NodeObj, image: { alt: string; url: string }): void {
    node.image = {
        url: image.url,
        width: 160,
        height: 120,
    };
    if (!node.topic && image.alt) {
        node.topic = image.alt;
    }
}

export function fromMdmm(text: string): MdmmData {
    const rootFallback = createDefaultMindMapData().nodeData;
    let root: NodeObj | null = null;
    let lastNode: NodeObj | null = null;
    const stack: HeadingEntry[] = [];

    for (const rawLine of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            const level = heading[1].length;
            const content = heading[2].replace(/\s+#+\s*$/, '').trim();

            if (!root) {
                root = createNode(content, true);
                stack.length = 0;
                stack.push({ level, node: root });
                lastNode = root;
                continue;
            }

            const node = createNode(content);
            const parent = level === 1 ? root : findHeadingParent(stack, level, root);
            appendChild(parent, node);
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            stack.push({ level, node });
            lastNode = node;
            continue;
        }

        const listItem = line.match(/^[-*]\s+(.+)$/);
        if (listItem) {
            if (!root) {
                root = rootFallback;
                stack.push({ level: 1, node: root });
            }
            const parent = stack.length > 0 ? stack[stack.length - 1].node : root;
            const node = createNode(listItem[1]);
            appendChild(parent, node);
            lastNode = node;
            continue;
        }

        const quote = line.match(/^>\s?(.*)$/);
        if (quote && lastNode) {
            appendNoteLine(lastNode, quote[1]);
            continue;
        }

        const image = parseImageLine(line);
        if (image && lastNode) {
            attachImage(lastNode, image);
        }
    }

    const nodeData = root ?? rootFallback;
    return {
        nodeData,
        arrows: [],
        ...DEFAULT_SETTINGS,
    };
}
