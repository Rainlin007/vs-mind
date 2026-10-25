import type { MindElixirData, NodeObj } from 'mind-elixir';
import { captureViewport, restoreViewport, type ViewportSnapshot } from './preserveViewport';

type Topic = HTMLElement & { nodeObj?: NodeObj };
type Summary = NonNullable<MindElixirData['summaries']>[number];

export interface CanvasToolbarHost {
    map: HTMLElement;
    container: HTMLElement;
    nodeData: NodeObj;
    nodeDataBackup: NodeObj;
    isFocusMode: boolean;
    tempDirection: number | null;
    direction: number;
    scaleVal: number;
    currentNodes?: Topic[];
    bus: { addListener(event: string, callback: (payload: unknown) => void): void };
    findEle(id: string): Topic | null;
    refresh(data?: MindElixirData): void;
    focusNode(node: Topic): void;
    cancelFocus(): void;
    selectNode(node: Topic): void;
    expandNode(node: Topic, expanded?: boolean): void;
    addChild(node?: Topic): void;
    insertSibling(position: 'before' | 'after', node?: Topic): void;
    createArrow(from: Topic, to: Topic): void;
    createSummaryFrom(summary: Omit<Summary, 'id'>): void;
    editSummary(summary: Element): void;
    undo?: () => void;
    redo?: () => void;
    clearHistory?: () => void;
}

function findNode(root: NodeObj, id: string): NodeObj | undefined {
    if (root.id === id) return root;
    for (const child of root.children ?? []) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return undefined;
}

/** Canvas commands share the native editing/history APIs with keyboard actions. */
export class CanvasToolbar {
    private readonly element = document.querySelector<HTMLElement>('#canvas-actions');
    private readonly status = document.querySelector<HTMLElement>('#toolbar-status');
    private ready = false;
    private undoCount = 0;
    private redoCount = 0;
    private linkSource: string | null = null;
    private returnViewport: ViewportSnapshot | null = null;

    constructor(private readonly mind: CanvasToolbarHost, private readonly onViewChange: () => void) {
        if (!this.element) return;
        // Keep the selected node and text selection until the command commits editing.
        this.element.addEventListener('pointerdown', event => event.preventDefault());
        this.element.addEventListener('click', event => {
            const button = (event.target as Element).closest<HTMLButtonElement>('button');
            if (!button || button.disabled) return;
            document.getElementById('input-box')?.blur();
            this.run(button.id.slice('action-'.length));
            (document.getElementById('input-box') ?? this.mind.container).focus();
            this.sync();
        });
        for (const event of ['selectNodes', 'unselectNodes', 'selectArrow', 'selectSummary', 'expandNode']) {
            this.mind.bus.addListener(event, () => queueMicrotask(() => this.sync()));
        }
        this.mind.bus.addListener('operation', payload => {
            if ((payload as { name?: string }).name !== 'beginEdit') {
                ++this.undoCount;
                this.redoCount = 0;
            }
            queueMicrotask(() => this.sync());
        });
        this.mind.map.addEventListener('click', event => {
            if (!this.linkSource) return;
            const target = (event.target as Element).closest<Topic>('me-tpc');
            if (!target?.nodeObj || target.nodeObj.id === this.linkSource) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const source = this.mind.findEle(this.linkSource);
            this.cancelLink();
            if (source) this.mind.createArrow(source, target);
            this.sync();
        }, true);
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !this.linkSource) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.cancelLink();
            this.sync();
        }, true);
    }

    /** Install after MindElixir creates its history methods and our viewport wrappers. */
    initialize(): void {
        if (!this.element || this.ready) return;
        this.ready = true;
        const undo = this.mind.undo?.bind(this.mind);
        const redo = this.mind.redo?.bind(this.mind);
        const clear = this.mind.clearHistory?.bind(this.mind);
        this.mind.undo = () => {
            if (!this.undoCount) return;
            this.cancelLink();
            undo?.();
            --this.undoCount;
            ++this.redoCount;
            this.sync();
        };
        this.mind.redo = () => {
            if (!this.redoCount) return;
            this.cancelLink();
            redo?.();
            ++this.undoCount;
            --this.redoCount;
            this.sync();
        };
        this.mind.clearHistory = () => {
            clear?.();
            this.undoCount = this.redoCount = 0;
            this.cancelLink();
            this.sync();
        };
        this.setupFocus();
        this.sync();
    }

    private setupFocus(): void {
        const focus = this.mind.focusNode.bind(this.mind);
        const cancel = this.mind.cancelFocus.bind(this.mind);
        const refresh = this.mind.refresh.bind(this.mind);
        this.mind.focusNode = node => {
            if (!node.nodeObj?.parent) return;
            if (!this.mind.isFocusMode) this.returnViewport = captureViewport(this.mind);
            this.cancelLink();
            focus(node);
            this.onViewChange();
            this.sync();
        };
        this.mind.cancelFocus = () => {
            this.cancelLink();
            cancel();
            if (this.returnViewport) {
                const id = this.returnViewport.anchorNodeId?.slice(2);
                const node = id ? this.mind.findEle(id) : null;
                if (node) this.mind.selectNode(node);
                restoreViewport(this.mind, this.returnViewport);
                this.returnViewport = null;
            }
            this.onViewChange();
            this.sync();
        };
        this.mind.refresh = data => {
            if (!data || !this.mind.isFocusMode) {
                refresh(data);
                return;
            }
            const focusedId = this.mind.nodeData.id;
            const sameMap = data.nodeData.id === this.mind.nodeDataBackup.id;
            // History and document updates contain the entire map. Reconnect the
            // focused branch to that new tree so getData() never saves an old backup.
            refresh(data);
            const fullRoot = this.mind.nodeData;
            const branch = sameMap ? findNode(fullRoot, focusedId) : undefined;
            if (branch) {
                this.mind.nodeDataBackup = fullRoot;
                this.mind.nodeData = branch;
                refresh();
            } else {
                this.mind.isFocusMode = false;
                this.mind.tempDirection = null;
                this.returnViewport = null;
            }
            queueMicrotask(() => this.sync());
        };
    }

    private selected(): Topic[] {
        return (this.mind.currentNodes ?? []).filter(node => node.isConnected && node.nodeObj);
    }

    private summaryRange(): Omit<Summary, 'id'> | null {
        const nodes = this.selected();
        const parent = nodes[0]?.nodeObj?.parent;
        if (!parent?.children || nodes.some(node => node.nodeObj?.parent !== parent)) return null;
        const side = nodes[0].closest('me-main');
        if (nodes.some(node => node.closest('me-main') !== side)) return null;
        const indices = nodes.map(node => parent.children!.indexOf(node.nodeObj!)).sort((a, b) => a - b);
        if (indices.some((index, i) => index < 0 || index !== indices[0] + i)) return null;
        return { parent: parent.id, start: indices[0], end: indices[indices.length - 1], label: 'Summary' };
    }

    private cancelLink(): void {
        this.linkSource = null;
        this.mind.map.classList.remove('is-connecting');
        if (this.status) this.status.textContent = '';
    }

    private run(action: string): void {
        const nodes = this.selected();
        const node = nodes.length === 1 ? nodes[0] : undefined;
        if (action !== 'relationship') this.cancelLink();
        switch (action) {
            case 'fold':
                if (node?.nodeObj?.parent && node.nodeObj.children?.length) this.mind.expandNode(node);
                break;
            case 'child': if (node) this.mind.addChild(node); break;
            case 'sibling': if (node?.nodeObj?.parent) this.mind.insertSibling('after', node); break;
            case 'focus':
                if (this.mind.isFocusMode) this.mind.cancelFocus();
                else if (node?.nodeObj?.parent) this.mind.focusNode(node);
                break;
            case 'undo': this.mind.undo?.(); break;
            case 'redo': this.mind.redo?.(); break;
            case 'relationship':
                if (this.linkSource) this.cancelLink();
                else if (nodes.length === 2) this.mind.createArrow(nodes[0], nodes[1]);
                else if (node?.nodeObj) {
                    this.linkSource = node.nodeObj.id;
                    this.mind.map.classList.add('is-connecting');
                    if (this.status) this.status.textContent = 'Click a target node · Esc to cancel';
                }
                break;
            case 'summary': {
                const summary = this.summaryRange();
                if (!summary) break;
                this.mind.createSummaryFrom(summary);
                const element = this.mind.map.querySelector('.summary > g:last-child');
                if (element) this.mind.editSummary(element);
                break;
            }
        }
    }

    sync(): void {
        if (!this.element) return;
        const nodes = this.selected();
        const node = nodes.length === 1 ? nodes[0].nodeObj : undefined;
        const states: Record<string, boolean> = {
            fold: !!(node?.parent && node.children?.length),
            child: !!node,
            sibling: !!node?.parent,
            focus: this.mind.isFocusMode || !!node?.parent,
            undo: this.undoCount > 0,
            redo: this.redoCount > 0,
            relationship: !!this.linkSource || nodes.length === 1 || nodes.length === 2,
            summary: !!this.summaryRange(),
        };
        this.element.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
            button.disabled = !this.ready || !states[button.id.slice('action-'.length)];
        });
        this.label('fold', node?.expanded === false ? 'Expand branch' : 'Collapse branch');
        this.element.querySelector('#action-fold')?.classList.toggle('is-collapsed', node?.expanded === false);
        this.label('focus', this.mind.isFocusMode ? 'Exit focus' : 'Focus branch');
        this.element.querySelector('#action-focus')?.setAttribute('aria-pressed', String(!!this.mind.isFocusMode));
        this.element.querySelector('#action-relationship')?.setAttribute('aria-pressed', String(!!this.linkSource));
        const summary = this.element.querySelector<HTMLButtonElement>('#action-summary');
        if (summary) summary.title = states.summary ? 'Add summary' : 'Select a node or consecutive siblings on the same branch';
    }

    private label(id: string, label: string): void {
        const button = this.element?.querySelector<HTMLButtonElement>(`#action-${id}`);
        if (!button) return;
        button.title = label;
        button.setAttribute('aria-label', label);
    }
}
