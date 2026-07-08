import type { NodeObj } from 'mind-elixir';

export interface NodeInspectorMind {
    currentNode: {
        nodeObj?: NodeObj;
        style?: NodeObj['style'];
    } | null;
    reshapeNode(node: NodeInspectorMind['currentNode'], patch: Partial<NodeObj>): void;
    findEle(id: string): NodeInspectorMind['currentNode'];
    container: HTMLElement | null;
}

type InspectorNode = (HTMLElement & { nodeObj?: NodeObj; style?: NodeObj['style'] }) | NodeObj;

function resolveInspectorNode(node: InspectorNode): { nodeObj: NodeObj; style: Record<string, string | undefined> } | null {
    if ('nodeObj' in node && node.nodeObj) {
        const nodeObj = node.nodeObj;
        return { nodeObj, style: { ...(nodeObj.style || {}) } };
    }

    if ('topic' in node && 'id' in node) {
        const nodeObj = node;
        return { nodeObj, style: { ...(nodeObj.style || {}) } };
    }

    return null;
}

/**
 * Node property inspector: font, color, hyperlink, and note.
 */
export class NodeInspector {
    private content: HTMLElement | null;
    private emptyHint: HTMLElement | null;
    private sizeInput: HTMLSelectElement;
    private colorInput: HTMLInputElement;
    private hyperlinkInput: HTMLInputElement | null;
    private noteInput: HTMLTextAreaElement | null;
    private noteSaveTimer: ReturnType<typeof setTimeout> | null = null;
    private editingNodeId: string | null = null;

    constructor(
        private readonly mind: NodeInspectorMind,
        private readonly onChange: () => void
    ) {
        this.content = document.getElementById('node-panel-content');
        this.emptyHint = document.getElementById('node-panel-empty');
        this.sizeInput = document.getElementById('inspector-size') as HTMLSelectElement;
        this.colorInput = document.getElementById('inspector-color') as HTMLInputElement;
        this.hyperlinkInput = document.getElementById('inspector-hyperlink') as HTMLInputElement | null;
        this.noteInput = document.getElementById('inspector-note') as HTMLTextAreaElement | null;

        this.initListeners();
    }

    initListeners() {
        if (!this.content) return;

        this.sizeInput.addEventListener('change', () => this.updateStyle('fontSize', this.sizeInput.value));
        this.colorInput.addEventListener('input', () => this.updateStyle('color', this.colorInput.value));

        const swatches = this.content.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.getAttribute('data-color');
                if (color) {
                    this.colorInput.value = color;
                    this.updateStyle('color', color);
                }
            });
        });

        this.hyperlinkInput?.addEventListener('focus', () => this.captureEditingNodeId());
        this.hyperlinkInput?.addEventListener('blur', () => {
            const nodeId = this.editingNodeId ?? this.mind.currentNode?.nodeObj?.id ?? null;
            const value = this.hyperlinkInput?.value ?? '';
            window.setTimeout(() => this.commitHyperlink(value, nodeId), 0);
        });
        this.hyperlinkInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.hyperlinkInput?.blur();
            }
        });
        this.noteInput?.addEventListener('input', () => this.updateNote(this.noteInput!.value));
        this.noteInput?.addEventListener('blur', () => this.flushNoteSave());
    }

    updateStyle(prop: string, value: string) {
        const node = this.mind.currentNode;
        if (!node?.nodeObj) return;

        const currentStyle: Record<string, string> = { ...(node.style as Record<string, string> | undefined) };
        const allowList = ['fontSize', 'color', 'background'] as const;
        const newStyle: Record<string, string> = {};

        for (const key of allowList) {
            if (currentStyle[key]) {
                newStyle[key] = currentStyle[key];
            }
        }

        newStyle[prop] = value;
        if (value === '') {
            delete newStyle[prop];
        }

        this.mind.reshapeNode(node, { style: newStyle as NodeObj['style'] });
        this.focusMap();
        this.onChange();
    }

    private captureEditingNodeId() {
        const id = this.mind.currentNode?.nodeObj?.id;
        if (id) {
            this.editingNodeId = id;
        }
    }

    private resolveTargetNode(nodeId?: string | null): NodeInspectorMind['currentNode'] {
        const current = this.mind.currentNode;
        if (current?.nodeObj) {
            return current;
        }
        const id = nodeId ?? this.editingNodeId;
        if (!id) {
            return null;
        }
        try {
            return this.mind.findEle(id) ?? null;
        } catch {
            return null;
        }
    }

    private normalizeHyperlink(value: string): string {
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }
        if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) {
            return trimmed;
        }
        return `https://${trimmed}`;
    }

    private commitHyperlink(rawValue: string, nodeId: string | null) {
        const normalized = this.normalizeHyperlink(rawValue);
        if (this.hyperlinkInput && normalized !== this.hyperlinkInput.value) {
            this.hyperlinkInput.value = normalized;
        }
        this.updateHyperlink(normalized, nodeId);
    }

    private updateHyperlink(value: string, nodeId?: string | null) {
        const node = this.resolveTargetNode(nodeId);
        if (!node?.nodeObj) return;

        const current = node.nodeObj.hyperLink || '';
        if (value === current) return;

        const patch: Partial<NodeObj> = value
            ? { hyperLink: value }
            : { hyperLink: undefined };

        this.mind.reshapeNode(node, patch);
        this.onChange();
    }

    private updateNote(value: string) {
        const node = this.mind.currentNode;
        if (!node?.nodeObj) return;

        if (value) {
            node.nodeObj.note = value;
        } else {
            delete node.nodeObj.note;
        }

        this.scheduleNoteSave();
    }

    private scheduleNoteSave() {
        if (this.noteSaveTimer) {
            clearTimeout(this.noteSaveTimer);
        }
        this.noteSaveTimer = setTimeout(() => {
            this.noteSaveTimer = null;
            this.onChange();
        }, 400);
    }

    private flushNoteSave() {
        if (!this.noteSaveTimer) return;
        clearTimeout(this.noteSaveTimer);
        this.noteSaveTimer = null;
        this.onChange();
    }

    private focusMap() {
        this.mind.container?.focus();
    }

    show(node: InspectorNode) {
        if (!this.content || !this.emptyHint) return;

        const resolved = resolveInspectorNode(node);
        if (!resolved) return;

        const { nodeObj, style } = resolved;

        this.sizeInput.value = style.fontSize || '';
        this.colorInput.value = style.color || '#000000';
        if (this.hyperlinkInput) this.hyperlinkInput.value = nodeObj.hyperLink || '';
        if (this.noteInput) this.noteInput.value = nodeObj.note || '';
        this.editingNodeId = nodeObj.id;

        this.emptyHint.classList.add('hidden');
        this.content.classList.remove('hidden');
        this.setPanelEnabled(true);
    }

    hide() {
        if (!this.content || !this.emptyHint) return;
        this.emptyHint.classList.remove('hidden');
        this.content.classList.add('hidden');
        this.setPanelEnabled(false);
    }

    private setPanelEnabled(enabled: boolean) {
        this.sizeInput.disabled = !enabled;
        this.colorInput.disabled = !enabled;
        if (this.hyperlinkInput) this.hyperlinkInput.disabled = !enabled;
        if (this.noteInput) this.noteInput.disabled = !enabled;
        this.content?.querySelectorAll('.color-swatch').forEach((swatch) => {
            (swatch as HTMLElement).style.pointerEvents = enabled ? '' : 'none';
            (swatch as HTMLElement).style.opacity = enabled ? '' : '0.4';
        });
    }
}
