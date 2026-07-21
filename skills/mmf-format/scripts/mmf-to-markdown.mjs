#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function decodeHtmlEntities(text) {
    const namedEntities = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    };
    return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
        if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
        if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
        return namedEntities[entity] ?? match;
    });
}

function htmlToText(html) {
    return decodeHtmlEntities(
        html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
            .replace(/<[^>]*>/g, '')
    );
}

function normalizeInlineText(text, fallback = 'Untitled') {
    const normalized = String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join(' ');
    return normalized || fallback;
}

function normalizeBlockLines(text) {
    return String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
}

function escapeLinkText(text) {
    return text.replace(/]/g, '\\]');
}

function escapeLinkTarget(target) {
    return String(target).trim().replace(/\)/g, '\\)');
}

function getTopic(node) {
    return normalizeInlineText(
        node.dangerouslySetInnerHTML
            ? htmlToText(node.dangerouslySetInnerHTML)
            : node.topic
    );
}

function formatNode(node) {
    const topic = getTopic(node);
    const title = node.hyperLink
        ? `[${escapeLinkText(topic)}](${escapeLinkTarget(node.hyperLink)})`
        : topic;
    const tags = Array.isArray(node.tags)
        ? node.tags
            .map(tag => normalizeInlineText(typeof tag === 'string' ? tag : tag?.text, '').replace(/\s+/g, '-'))
            .filter(Boolean)
            .map(tag => `#${tag}`)
        : [];
    return tags.length > 0 ? `${title} ${tags.join(' ')}` : title;
}

function appendDetails(lines, node, indent) {
    for (const line of normalizeBlockLines(node.note)) {
        lines.push(`${indent}> **备注：** ${line}`);
    }
    for (const line of normalizeBlockLines(node.ai_note)) {
        lines.push(`${indent}> **AI 备注：** ${line}`);
    }
    if (node.image) {
        lines.push(`${indent}> **图片：** 此节点包含图片；图片数据未加入文本上下文。`);
    }
}

function hasChildren(node) {
    return Array.isArray(node.children) && node.children.length > 0;
}

function appendLeaf(lines, node) {
    lines.push(`- ${formatNode(node)}`);
    appendDetails(lines, node, '  ');
}

function appendHeading(lines, node, depth) {
    if (lines.length > 0 && lines.at(-1) !== '') lines.push('');
    lines.push(`${'#'.repeat(Math.min(depth + 1, 6))} ${formatNode(node)}`);

    const details = [];
    appendDetails(details, node, '');
    const children = Array.isArray(node.children) ? node.children : [];
    const leaves = children.filter(child => !hasChildren(child));
    const branches = children.filter(hasChildren);

    if (details.length > 0 || children.length > 0) lines.push('');
    lines.push(...details);
    if (details.length > 0 && children.length > 0) lines.push('');
    for (const leaf of leaves) appendLeaf(lines, leaf);
    if (leaves.length > 0 && branches.length > 0) lines.push('');
    for (const branch of branches) appendHeading(lines, branch, depth + 1);
}

export function toAiMarkdown(data, sourceName = 'mindmap.mmf') {
    if (!data || typeof data !== 'object' || !data.nodeData || typeof data.nodeData !== 'object') {
        throw new Error('Invalid MMF: missing nodeData root node.');
    }

    const safeSourceName = path.basename(sourceName).replace(/`/g, '\\`');
    const lines = [
        `> VS Mind AI 上下文，由 \`${safeSourceName}\` 生成。源 MMF 由用户维护；AI 只读取本文，不修改源文件。`,
        '',
    ];
    appendHeading(lines, data.nodeData, 0);
    return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
    let inputPath;
    let outputPath;
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--output' || arg === '-o') {
            outputPath = argv[++index];
            if (!outputPath) throw new Error(`${arg} requires a Markdown file path.`);
        } else if (arg === '--help' || arg === '-h') {
            return { help: true };
        } else if (!inputPath) {
            inputPath = arg;
        } else {
            throw new Error(`Unexpected argument: ${arg}`);
        }
    }
    return { inputPath, outputPath, help: false };
}

async function main() {
    const { inputPath, outputPath, help } = parseArgs(process.argv.slice(2));
    if (help) {
        process.stdout.write('Usage: mmf-to-markdown.mjs <file.mmf> [--output <context.md>]\n');
        return;
    }
    if (!inputPath) throw new Error('An input .mmf file is required.');
    if (path.extname(inputPath).toLowerCase() !== '.mmf') {
        throw new Error('Input must use the .mmf extension.');
    }
    if (outputPath && path.resolve(outputPath) === path.resolve(inputPath)) {
        throw new Error('Output must not overwrite the source MMF file.');
    }

    const source = await readFile(inputPath, 'utf8');
    const markdown = toAiMarkdown(JSON.parse(source), path.basename(inputPath));
    if (outputPath) {
        await writeFile(outputPath, markdown, 'utf8');
    } else {
        process.stdout.write(markdown);
    }
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryUrl) {
    main().catch(error => {
        process.stderr.write(`MMF conversion failed: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
