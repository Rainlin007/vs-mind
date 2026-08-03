import * as path from 'path';
import type * as vscode from 'vscode';

export type ExportFormat = 'png' | 'mmf' | 'markdown' | 'plaintext';

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
    mmf: {
        extension: 'mmf',
        filters: { 'Mind Map Format': ['mmf'] },
        binary: false,
    },
    markdown: {
        extension: 'md',
        filters: { 'Markdown': ['md', 'markdown'] },
        binary: false,
    },
    plaintext: {
        extension: 'txt',
        filters: { '纯文本': ['txt'] },
        binary: false,
    },
};

const LAST_EXPORT_DIRECTORY_KEY = 'vscode-mm.lastExportDirectory';

type ExportServiceState = Pick<vscode.Memento, 'get' | 'update'>;
type ExportServiceRuntime = Pick<typeof vscode, 'Uri' | 'window' | 'workspace'>;

export class ExportService {
    constructor(
        private readonly state: ExportServiceState,
        private readonly runtime: ExportServiceRuntime,
    ) { }

    private getDirectoryUri(uri: vscode.Uri): vscode.Uri {
        return uri.with({
            path: path.posix.dirname(uri.path),
            query: '',
            fragment: '',
        });
    }

    private getDefaultDirectory(sourceUri?: vscode.Uri): vscode.Uri {
        const rememberedDirectory = this.state.get<string>(LAST_EXPORT_DIRECTORY_KEY);
        if (rememberedDirectory) {
            try {
                return this.runtime.Uri.parse(rememberedDirectory);
            } catch {
                // Fall through to the workspace/document directory.
            }
        }

        const containingWorkspace = sourceUri
            ? this.runtime.workspace.getWorkspaceFolder(sourceUri)
            : undefined;
        const workspaceDirectory = containingWorkspace?.uri
            ?? this.runtime.workspace.workspaceFolders?.[0]?.uri;
        if (workspaceDirectory) {
            return workspaceDirectory;
        }
        if (sourceUri) {
            return this.getDirectoryUri(sourceUri);
        }
        return this.runtime.Uri.file(process.cwd());
    }

    public async saveExport(
        defaultBaseName: string,
        format: ExportFormat,
        content: string | Uint8Array,
        sourceUri?: vscode.Uri,
    ): Promise<void> {
        const config = FORMAT_CONFIG[format];
        const safeBaseName = path.basename(defaultBaseName.trim()) || 'mindmap';
        const defaultDirectory = this.getDefaultDirectory(sourceUri);
        const defaultUri = this.runtime.Uri.joinPath(defaultDirectory, `${safeBaseName}.${config.extension}`);

        const targetUri = await this.runtime.window.showSaveDialog({
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

        await this.runtime.workspace.fs.writeFile(targetUri, bytes);
        await this.state.update(
            LAST_EXPORT_DIRECTORY_KEY,
            this.getDirectoryUri(targetUri).toString(),
        );
        void this.runtime.window.showInformationMessage(`已导出: ${path.basename(targetUri.fsPath)}`);
    }
}
