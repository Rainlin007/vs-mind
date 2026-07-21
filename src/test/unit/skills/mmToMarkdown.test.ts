import * as assert from 'assert';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

describe('mmf-format conversion script', () => {
    it('converts MMF into an AI-readable Markdown projection', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const scriptPath = path.join(projectRoot, 'skills/mmf-format/scripts/mmf-to-markdown.mjs');
        const tempDir = mkdtempSync(path.join(tmpdir(), 'vs-mind-mmf-'));
        const inputPath = path.join(tempDir, 'planning.mmf');

        try {
            writeFileSync(inputPath, JSON.stringify({
                nodeData: {
                    id: 'root',
                    topic: 'Product Plan',
                    note: 'Human context',
                    ai_note: 'Respect this constraint',
                    image: { url: 'data:image/png;base64,large', width: 10, height: 10 },
                    children: [{ id: 'child', topic: 'Next step' }],
                },
                themeTemplate: 'clayLight',
            }), 'utf8');

            const markdown = execFileSync(process.execPath, [scriptPath, inputPath], {
                encoding: 'utf8',
            });

            assert.ok(markdown.includes('`planning.mmf`'));
            assert.ok(markdown.includes('# Product Plan'));
            assert.ok(markdown.includes('> **备注：** Human context'));
            assert.ok(markdown.includes('> **AI 备注：** Respect this constraint'));
            assert.ok(markdown.includes('- Next step'));
            assert.ok(markdown.includes('图片数据未加入文本上下文'));
            assert.ok(!markdown.includes('data:image/png;base64,large'));
            assert.ok(!markdown.includes('themeTemplate'));
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('writes Markdown to an explicit output file without changing the MMF', () => {
        const projectRoot = path.resolve(__dirname, '../../../..');
        const scriptPath = path.join(projectRoot, 'skills/mmf-format/scripts/mmf-to-markdown.mjs');
        const tempDir = mkdtempSync(path.join(tmpdir(), 'vs-mind-mmf-'));
        const inputPath = path.join(tempDir, 'source.mmf');
        const outputPath = path.join(tempDir, 'context.md');
        const source = JSON.stringify({ nodeData: { id: 'root', topic: 'Root' } });

        try {
            writeFileSync(inputPath, source, 'utf8');
            const stdout = execFileSync(process.execPath, [scriptPath, inputPath, '--output', outputPath], {
                encoding: 'utf8',
            });

            assert.strictEqual(stdout, '');
            assert.ok(readFileSync(outputPath, 'utf8').includes('# Root'));
            assert.strictEqual(readFileSync(inputPath, 'utf8'), source);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
