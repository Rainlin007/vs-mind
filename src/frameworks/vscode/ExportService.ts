import * as path from 'path';
import * as vscode from 'vscode';

export type ExportFormat = 'png' | 'json' | 'plaintext';

interface ExportFormatConfig {
    extension: string;
    filters: Record<string, string[]>;
    binary: boolean;
}

const FORMAT_CONFIG: Record<ExportFormat, ExportFormatConfig> = {
    png: {
        extension: 'png',
        filters: { 'PNG 图片': ['png'] },
        binary: true,
    },
    json: {
        extension: 'mm',
        filters: { '思维导图': ['mm', 'mindmap', 'json'] },
        binary: false,
    },
    plaintext: {
        extension: 'txt',
        filters: { '纯文本': ['txt'] },
        binary: false,
    },
};

export class ExportService {
    public async saveExport(
        defaultBaseName: string,
        format: ExportFormat,
        content: string | Uint8Array,
    ): Promise<void> {
        const config = FORMAT_CONFIG[format];
        const safeBaseName = defaultBaseName.trim() || 'mindmap';
        const defaultUri = vscode.Uri.file(`${safeBaseName}.${config.extension}`);

        const targetUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: config.filters,
            saveLabel: '导出',
        });

        if (!targetUri) {
            return;
        }

        const bytes = config.binary
            ? (content as Uint8Array)
            : Buffer.from(content as string, 'utf8');

        await vscode.workspace.fs.writeFile(targetUri, bytes);
        void vscode.window.showInformationMessage(`已导出: ${path.basename(targetUri.fsPath)}`);
    }
}
