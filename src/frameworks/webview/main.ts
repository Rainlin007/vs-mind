/**
 * Interfaces for VS Code API and MindElixir
 */
import type { MindElixirData, NodeObj, Options, Theme } from 'mind-elixir';
import { prepareMindData, ThemePanel } from './ThemePanel';
import type { ThemeDocumentSettings } from './ThemePanel';
import { DEFAULT_SIDE_PANEL_WIDTH, SidePanel } from './SidePanel';
import { createMindElixirMarkdownParser } from './markdown';
import { NodeInspector } from './NodeInspector';
import { ExportToolbar } from './ExportToolbar';

interface VSCodeApi {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

interface MindElixirInstance {
    init(data: MindElixirData): void;
    refresh(): void;
    getData(): MindElixirData;
    changeTheme(theme: Theme, shouldRefresh?: boolean): void;
    initLeft(): void;
    initRight(): void;
    initSide(): void;
    linkDiv(): void;
    theme: Theme;
    generateMainBranch: unknown;
    generateSubBranch: unknown;
    bus: {
        addListener(event: string, callback: (payload: unknown) => void): void;
    };
    currentNode: {
        nodeObj?: NodeObj;
        style?: NodeObj['style'];
    } | null;
    container: HTMLElement;
    selectNode(node: HTMLElement | NodeObj): void;
    reshapeNode(node: MindElixirInstance['currentNode'], patch: Partial<NodeObj>): void;
    findEle(id: string): MindElixirInstance['currentNode'];
    exportPng: (noForeignObject?: boolean, injectCss?: string) => Promise<Blob | null>;
}

interface MindElixirCtor {
    new(options: Options): MindElixirInstance;
    RIGHT: number;
    LEFT: number;
    SIDE: number;
    E(id: string, el?: HTMLElement): HTMLElement | undefined;
}

declare const MindElixir: MindElixirCtor & { default?: MindElixirCtor };

declare global {
    interface Window {
        MindElixir: MindElixirCtor & { default?: MindElixirCtor };
        clipboardData: DataTransfer | null;
    }
}

function resolveMindElixirCtor(): MindElixirCtor {
    const mod = window.MindElixir;
    const Ctor = (mod.default ?? mod) as MindElixirCtor;
    if (typeof Ctor !== 'function') {
        throw new Error('MindElixir constructor not found. Check media/MindElixir.js load order.');
    }
    Ctor.RIGHT = mod.RIGHT ?? Ctor.RIGHT;
    Ctor.LEFT = mod.LEFT ?? Ctor.LEFT;
    Ctor.SIDE = mod.SIDE ?? Ctor.SIDE;
    Ctor.E = mod.E ?? Ctor.E;
    return Ctor;
}

/**
 * Handles image processing tasks like resizing.
 */
export class ImageProcessor {
    /**
     * Resizes a base64 image to fit within maxWidth and maxHeight.
     */
    static async resizeImage(base64: string, maxWidth: number, maxHeight: number): Promise<{ base64: string, width: number, height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }

                width = Math.floor(width);
                height = Math.floor(height);

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve({
                        base64: canvas.toDataURL('image/jpeg', 0.8),
                        width,
                        height
                    });
                } else {
                    resolve({ base64, width, height });
                }
            };
            img.onerror = () => resolve({ base64, width: 0, height: 0 });
            img.src = base64;
        });
    }
}

/**
 * Handles the image preview modal.
 */
export class ImageModal {
    private modal: HTMLDivElement;
    private lastSelectedNode: HTMLElement | null = null;

    constructor(
        lastSelectedNode: HTMLElement | null,
        private readonly mind: MindElixirInstance
    ) {
        this.lastSelectedNode = lastSelectedNode;
        this.modal = document.createElement('div');
        this.init();
    }

    init() {
        this.modal.id = 'image-popup';
        this.modal.style.display = 'none';
        this.modal.style.position = 'fixed';
        this.modal.style.zIndex = '1000';
        this.modal.style.left = '0';
        this.modal.style.top = '0';
        this.modal.style.width = '100%';
        this.modal.style.height = '100%';
        this.modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.modal.style.justifyContent = 'center';
        this.modal.style.alignItems = 'center';
        this.modal.style.cursor = 'zoom-out';
        this.modal.innerHTML = '<img id="popup-img" style="max-width:90%; max-height:90%; box-shadow: 0 0 20px rgba(0,0,0,0.5);">';
        document.body.appendChild(this.modal);

        this.modal.addEventListener('click', () => {
            this.hide();
        });
    }

    show(src: string, selectedNode: HTMLElement) {
        this.lastSelectedNode = selectedNode;
        const popupImg = this.modal.querySelector('#popup-img') as HTMLImageElement;
        if (popupImg) {
            popupImg.src = src;
            this.modal.style.display = 'flex';
        }
    }

    hide() {
        this.modal.style.display = 'none';
        if (this.lastSelectedNode && this.mind) {
            this.mind.selectNode(this.lastSelectedNode);
            if (this.mind.container) {
                this.mind.container.focus();
            }
        }
    }
}

/**
 * Main application class
 */
export class MindMapApp {
    private state: any;
    private originalImageCache: { [id: string]: string } = {};
    private lastContent: string | null = null;
    private lastSelectedNode: HTMLElement | null = null;
    public mind: MindElixirInstance;
    private imageModal: ImageModal;
    private inspector: NodeInspector;
    private themePanel: ThemePanel;
    private sidePanel: SidePanel;
    private exportToolbar: ExportToolbar;
    private documentBaseName = 'mindmap';

    constructor(
        private readonly vscode: VSCodeApi,
        MindElixirCtor: MindElixirCtor
    ) {
        this.state = vscode.getState() || {};

        this.mind = new MindElixirCtor({
            el: '#mindmap',
            direction: 1,
            draggable: true,
            contextMenu: true,
            toolBar: true,
            keypress: true,
            markdown: createMindElixirMarkdownParser() as Options['markdown'],
        });

        this.imageModal = new ImageModal(this.lastSelectedNode, this.mind);
        this.inspector = new NodeInspector(this.mind, () => this.saveChanges());
        this.themePanel = new ThemePanel(this.mind, () => this.saveChanges());
        const sidePanelWidth = typeof this.state.sidePanelWidth === 'number'
            ? this.state.sidePanelWidth
            : DEFAULT_SIDE_PANEL_WIDTH;
        const sidePanelVisible = this.state.sidePanelVisible === true;
        this.sidePanel = new SidePanel(sidePanelWidth, sidePanelVisible);
        this.sidePanel.onVisibilityChange = (visible) => {
            this.state.sidePanelVisible = visible;
            this.vscode.setState(this.state);
            this.vscode.postMessage({ type: 'sidePanelState', visible });
        };
        this.sidePanel.onWidthChange = (width) => {
            this.state.sidePanelWidth = width;
            this.vscode.setState(this.state);
        };
        this.vscode.postMessage({ type: 'sidePanelState', visible: this.sidePanel.isVisible() });

        this.exportToolbar = new ExportToolbar({
            getDocumentBaseName: () => this.documentBaseName,
            getExportData: () => this.buildExportPayload(),
            exportPng: () => this.mind.exportPng.call(this.mind),
            postMessage: (message) => this.vscode.postMessage(message),
            onError: (message) => this.vscode.postMessage({ type: 'exportError', message }),
        });

        this.initListeners();
        this.syncNodePanel();
    }

    private buildExportPayload() {
        const data = this.mind.getData();
        const themeSettings = this.themePanel.getSettings();
        return {
            ...data,
            ...themeSettings,
        };
    }

    private syncNodePanel() {
        const current = this.mind.currentNode;
        if (current?.nodeObj) {
            this.inspector.show(current.nodeObj);
            return;
        }
        this.inspector.hide();
    }

    initListeners() {
        window.addEventListener('message', event => this.handleVscodeMessage(event.data));
        window.addEventListener('paste', e => this.handlePaste(e as ClipboardEvent));

        const mindmapEl = document.getElementById('mindmap');
        if (mindmapEl) {
            mindmapEl.addEventListener('click', e => this.handleMindMapClick(e));
        }

        this.mind.bus.addListener('operation', (operation: any) => this.handleOperation(operation));

        this.mind.bus.addListener('selectNodes', () => {
            this.sidePanel.switchTab('node');
            this.syncNodePanel();
        });

        this.mind.bus.addListener('unselectNodes', () => {
            this.syncNodePanel();
        });
    }

    handleVscodeMessage(message: any) {
        switch (message.type) {
            case 'toggleSidePanel':
                this.sidePanel.toggle();
                break;
            case 'update': {
                const text = message.text;
                if (typeof message.documentBaseName === 'string' && message.documentBaseName) {
                    this.documentBaseName = message.documentBaseName;
                }
                if (message.images) {
                    this.originalImageCache = message.images;
                }
                if (text === this.lastContent) {
                    return;
                }

                const selectedNodeId = this.mind.currentNode && this.mind.currentNode.nodeObj ? this.mind.currentNode.nodeObj.id : null;

                let json;
                try {
                    json = JSON.parse(text);
                } catch {
                    return;
                }
                this.lastContent = text;
                try {
                    const doc = prepareMindData(json as MindElixirData & Partial<ThemeDocumentSettings>);
                    this.mind.init(doc);
                    this.mind.refresh();
                    this.themePanel.markMindReady();
                    this.themePanel.loadFromDocument(doc);

                    if (selectedNodeId) {
                        const newNode = MindElixir.E(selectedNodeId);
                        if (newNode) {
                            this.mind.selectNode(newNode);
                            if (this.mind.container) {
                                this.mind.container.focus();
                            }
                        } else {
                            this.syncNodePanel();
                        }
                    } else {
                        this.syncNodePanel();
                    }

                    if (message.images && Object.keys(message.images).length > 0) {
                        setTimeout(() => {
                            this.mind.refresh();
                        }, 10);
                    }
                } catch (e) {
                    console.error("Failed to init mind map", e);
                }
                break;
            }
        }
    }

    async handlePaste(e: ClipboardEvent) {
        if (!this.mind.currentNode) return;
        const items = e.clipboardData?.items;
        if (!items) return;

        let blob: File | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image/') !== -1) {
                blob = items[i].getAsFile();
                break;
            }
        }
        if (blob) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (!event.target) return;
                const base64 = event.target.result as string;
                const result = await ImageProcessor.resizeImage(base64, 200, 200);

                const nodeId = this.mind.currentNode?.nodeObj ? this.mind.currentNode.nodeObj.id : null;
                if (!nodeId) return;

                this.originalImageCache[nodeId] = base64;

                this.mind.reshapeNode(this.mind.currentNode, {
                    image: {
                        url: result.base64,
                        height: result.height,
                        width: result.width
                    }
                });

                this.mind.refresh();

                // Restore selection
                if (nodeId) {
                    const newNode = MindElixir.E(nodeId);
                    if (newNode) {
                        this.mind.selectNode(newNode);
                        if (this.mind.container) {
                            this.mind.container.focus();
                        }
                    }
                }

                this.saveChanges();
            };
            reader.readAsDataURL(blob);
        }
    }

    handleMindMapClick(e: MouseEvent) {
        const target = e.target as HTMLElement;

        const link = target.closest('.hyper-link') as HTMLAnchorElement | null;
        if (link?.href) {
            e.preventDefault();
            this.vscode.postMessage({ type: 'openExternal', url: link.href });
            return;
        }

        const img = target.tagName === 'IMG' ? target : target.closest('me-tpc')?.querySelector('img');

        if (img) {
            let parent: HTMLElement | null = img.parentElement;
            while (parent && !parent.hasAttribute('data-nodeid')) {
                parent = parent.parentElement;
            }
            if (parent) {
                const nodeId = parent.getAttribute('data-nodeid');
                if (nodeId) {
                    const cleanId = nodeId.startsWith('me') ? nodeId.substring(2) : nodeId;
                    const originalBase64 = this.originalImageCache[cleanId];
                    if (originalBase64) {
                        this.imageModal.show(originalBase64, parent);
                    }
                }
            }
        }
    }

    handleOperation(operation: any) {
        console.log('[MindElixir Operation]', operation);
        if (operation.name === 'removeNodes') {
            (operation.objs as any[]).forEach((obj: any) => {
                delete this.originalImageCache[obj.id];
            });
        }
        this.saveChanges();
    }

    saveChanges() {
        const payload = this.buildExportPayload();
        const text = JSON.stringify(payload, null, 2);
        this.lastContent = text;
        this.vscode.postMessage({
            type: 'change',
            text: text,
            images: this.originalImageCache
        });
    }
}

// Script run within the webview
if (typeof acquireVsCodeApi !== 'undefined') {
    const vscode = acquireVsCodeApi();
    if (window.MindElixir) {
        new MindMapApp(vscode, resolveMindElixirCtor());
    }
}
