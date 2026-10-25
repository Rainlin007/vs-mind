import type { NodeObj } from 'mind-elixir';

type TopicElement = HTMLElement & { nodeObj?: NodeObj };

interface NodeTextEditingHost {
    bus: {
        addListener(event: string, callback: (payload: unknown) => void): void;
    };
    findEle(id: string): TopicElement | null;
    reshapeNode(node: TopicElement, patch: Partial<NodeObj>): void;
}

/** Keep image nodes visible and save empty titles through MindElixir's history API. */
export function setupNodeTextEditing(host: NodeTextEditingHost): void {
    host.bus.addListener('operation', (payload) => {
        const operation = payload as { name?: string; obj?: NodeObj };
        if (operation.name !== 'beginEdit' || !operation.obj) {
            return;
        }

        const editor = document.getElementById('input-box');
        const node = host.findEle(operation.obj.id);
        if (!editor || !node?.nodeObj) {
            return;
        }

        const text = node.querySelector<HTMLElement>(':scope > .text');
        if (text && node.querySelector(':scope > img')) {
            // MindElixir hides the whole node and overlays its bounds. For image
            // nodes, overlay only the title; use canvas units even when zoomed.
            const nodeRect = node.getBoundingClientRect();
            const textRect = text.getBoundingClientRect();
            const scale = nodeRect.width / node.offsetWidth || 1;
            editor.style.left = `${parseFloat(editor.style.left) + (textRect.left - nodeRect.left) / scale}px`;
            editor.style.top = `${parseFloat(editor.style.top) + (textRect.top - nodeRect.top) / scale}px`;
            editor.style.right = 'auto';
            editor.style.minWidth = `${Math.max(textRect.width / scale, 16)}px`;
            editor.style.padding = '0';
            editor.style.margin = '0';
            editor.style.border = '0';
            editor.style.borderRadius = '0';
            editor.style.lineHeight = getComputedStyle(text).lineHeight;
            node.style.opacity = '1';
            const visibility = text.style.visibility;
            text.style.visibility = 'hidden';
            editor.addEventListener('blur', () => {
                text.style.visibility = visibility;
            }, { once: true });
        }

        let cancelled = false;
        editor.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !event.isComposing) {
                cancelled = true;
            }
        }, true);
        editor.addEventListener('blur', () => {
            if (cancelled || !node.isConnected || editor.innerText.trim() !== ''
                || node.nodeObj?.topic === '') {
                return;
            }

            // This runs before MindElixir removes the editor. reshapeNode keeps
            // the image and other properties and emits a single undoable change.
            host.reshapeNode(node, { topic: '' });
        }, { once: true });
    });
}
