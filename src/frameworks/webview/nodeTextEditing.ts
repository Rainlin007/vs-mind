import type { NodeObj } from 'mind-elixir';

type TopicElement = HTMLElement & { nodeObj?: NodeObj };

interface NodeTextEditingHost {
    bus: {
        addListener(event: string, callback: (payload: unknown) => void): void;
    };
    findEle(id: string): TopicElement | null;
    reshapeNode(node: TopicElement, patch: Partial<NodeObj>): void;
}

/** MindElixir ignores empty titles on blur; save them through its history API. */
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
