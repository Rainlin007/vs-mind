import { isNodeTextEditing } from './editClipboard';

interface NodeAddButtonHost {
    container: HTMLElement;
    map: HTMLElement;
    currentNodes?: HTMLElement[];
    direction: number;
    scaleVal: number;
    editable?: boolean;
    addChild(node: HTMLElement): void;
    bus: {
        addListener(event: string, callback: (payload: unknown) => void): void;
    };
}

/** A canvas control, kept outside node DOM so it cannot affect layout or export. */
export class NodeAddButton {
    private readonly button: HTMLButtonElement;
    private readonly observer: MutationObserver;
    private pendingFrame = false;

    constructor(private readonly mind: NodeAddButtonHost) {
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'node-add-child';
        this.button.textContent = '+';
        this.button.title = '添加子节点 (Tab)';
        this.button.setAttribute('aria-label', '添加子节点');
        this.button.hidden = true;
        mind.map.appendChild(this.button);

        this.button.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
        });
        this.button.addEventListener('keydown', event => event.stopPropagation());
        this.button.addEventListener('keyup', event => event.stopPropagation());
        this.button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const node = this.selectedNode();
            if (node) {
                this.button.hidden = true;
                this.mind.addChild(node);
            }
        });

        for (const event of ['selectNodes', 'unselectNodes', 'operation', 'linkDiv', 'scale']) {
            mind.bus.addListener(event, () => this.scheduleUpdate());
        }
        // Refresh and editor removal do not always emit an operation.
        this.observer = new MutationObserver(() => this.scheduleUpdate());
        this.observer.observe(mind.container, { childList: true, subtree: true });
    }

    private selectedNode(): HTMLElement | null {
        const nodes = this.mind.currentNodes;
        if (this.mind.editable === false || nodes?.length !== 1 || isNodeTextEditing()) {
            return null;
        }
        return nodes[0].isConnected ? nodes[0] : null;
    }

    private scheduleUpdate(): void {
        if (this.pendingFrame) return;
        this.pendingFrame = true;
        requestAnimationFrame(() => {
            this.pendingFrame = false;
            this.update();
        });
    }

    private update(): void {
        const node = this.selectedNode();
        this.button.hidden = !node;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const mapRect = this.mind.map.getBoundingClientRect();
        const scale = this.mind.scaleVal;
        const left = !!node.closest('.lhs')
            || (node.parentElement?.tagName === 'ME-ROOT' && this.mind.direction === 0);
        const expand = node.parentElement?.querySelector(':scope > me-epd')?.getBoundingClientRect();
        const edge = left
            ? Math.min(rect.left, expand?.left ?? rect.left)
            : Math.max(rect.right, expand?.right ?? rect.right);
        const x = (edge - mapRect.left) / scale;
        const y = (rect.top + rect.height / 2 - mapRect.top) / scale;
        this.button.style.left = `${left ? x - 30 : x + 8}px`;
        this.button.style.top = `${y - 11}px`;
    }
}
