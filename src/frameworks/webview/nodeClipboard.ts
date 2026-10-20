import { isNodeTextEditing } from './editClipboard';

interface NodeClipboardHost {
    container: HTMLElement;
    currentNodes?: HTMLElement[];
}

function isTextField(target: EventTarget | null): boolean {
    return target instanceof Element
        && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}

/**
 * VS Code can send clipboard commands to the document/body. MindElixir listens
 * on its container, so route those events through its native node clipboard
 * handlers to generate fresh subtree IDs and retain selection, history and
 * operation events.
 */
export function setupNodeClipboard(host: NodeClipboardHost): void {
    const forwardClipboard = (event: ClipboardEvent): void => {
        if (event.defaultPrevented || !event.clipboardData || !host.currentNodes?.length
            || isNodeTextEditing() || isTextField(document.activeElement)) {
            return;
        }

        // Events inside the map already reach MindElixir. Other UI controls own
        // their clipboard operations even while a node remains selected.
        if (event.target !== document && event.target !== document.body
            && event.target !== document.documentElement) {
            return;
        }

        const forwarded = new ClipboardEvent(event.type, {
            clipboardData: event.clipboardData,
            bubbles: true,
            cancelable: true,
        });
        host.container.dispatchEvent(forwarded);
        if (forwarded.defaultPrevented) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    };

    document.addEventListener('copy', forwardClipboard, true);
    document.addEventListener('cut', forwardClipboard, true);
    document.addEventListener('paste', forwardClipboard, true);
}
