import type { MindElixirData } from 'mind-elixir';
import { toExportJson } from '../../adapters/exportMindMap';
import { toExportPlaintext } from './plaintextExport';

export type ExportFormat = 'png' | 'json' | 'plaintext';

export interface ExportFileMessage {
    type: 'exportFile';
    format: ExportFormat;
    defaultName: string;
    text?: string;
    dataBase64?: string;
}

export interface ExportToolbarDeps {
    getDocumentBaseName: () => string;
    getExportData: () => MindElixirData;
    exportPng: () => Promise<Blob | null>;
    postMessage: (message: ExportFileMessage) => void;
    onError: (message: string) => void;
}

async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export class ExportToolbar {
    private exporting = false;
    private menuOpen = false;
    private readonly trigger: HTMLButtonElement;
    private readonly menu: HTMLElement;

    constructor(private readonly deps: ExportToolbarDeps) {
        this.trigger = document.getElementById('export-trigger') as HTMLButtonElement;
        this.menu = document.getElementById('export-menu') as HTMLElement;
        this.bindEvents();
    }

    private bindEvents(): void {
        this.trigger?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleMenu();
        });

        this.menu?.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((item) => {
            item.addEventListener('click', (event) => {
                event.stopPropagation();
                const format = item.dataset.export as ExportFormat | undefined;
                if (format) {
                    this.closeMenu();
                    void this.handleExport(format);
                }
            });
        });

        document.addEventListener('click', () => this.closeMenu());
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeMenu();
            }
        });
    }

    private toggleMenu(): void {
        if (this.menuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    private openMenu(): void {
        if (!this.menu || this.exporting) {
            return;
        }
        this.menuOpen = true;
        this.menu.classList.remove('hidden');
        this.trigger?.setAttribute('aria-expanded', 'true');
    }

    private closeMenu(): void {
        if (!this.menuOpen) {
            return;
        }
        this.menuOpen = false;
        this.menu?.classList.add('hidden');
        this.trigger?.setAttribute('aria-expanded', 'false');
    }

    private async handleExport(format: ExportFormat): Promise<void> {
        if (this.exporting) {
            return;
        }

        this.exporting = true;
        if (this.trigger) {
            this.trigger.disabled = true;
        }

        try {
            const baseName = this.deps.getDocumentBaseName() || 'mindmap';

            if (format === 'png') {
                const blob = await this.deps.exportPng();
                if (!blob) {
                    this.deps.onError('PNG 导出失败，请重试。');
                    return;
                }
                this.deps.postMessage({
                    type: 'exportFile',
                    format,
                    defaultName: `${baseName}.png`,
                    dataBase64: await blobToBase64(blob),
                });
                return;
            }

            const data = this.deps.getExportData();

            if (format === 'json') {
                this.deps.postMessage({
                    type: 'exportFile',
                    format,
                    defaultName: `${baseName}.mm`,
                    text: toExportJson(data),
                });
                return;
            }

            this.deps.postMessage({
                type: 'exportFile',
                format,
                defaultName: `${baseName}.txt`,
                text: toExportPlaintext(data),
            });
        } catch (error) {
            console.error('Export failed:', error);
            this.deps.onError('导出失败，请重试。');
        } finally {
            this.exporting = false;
            if (this.trigger) {
                this.trigger.disabled = false;
            }
        }
    }
}
