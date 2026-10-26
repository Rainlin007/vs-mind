import { isNodeTextEditing } from './editClipboard';

interface ImagePreviewHost {
    container: HTMLElement;
    currentNodes?: HTMLElement[];
    spacePressed?: boolean;
    bus: { addListener(event: string, callback: (payload: unknown) => void): void };
}

/** Let MindElixir select, drag and edit nodes before considering image preview. */
export function setupImagePreview(
    host: ImagePreviewHost,
    show: (node: HTMLElement, image: HTMLImageElement) => void,
): void {
    let press: { node: HTMLElement; image: HTMLImageElement; x: number; y: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => {
        clearTimeout(timer);
        timer = undefined;
        press = null;
    };

    // Capture selection before MindElixir changes it on pointerdown.
    document.addEventListener('pointerdown', event => {
        cancel();
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
            || host.spacePressed || isNodeTextEditing()
            || host.container.querySelector('.is-connecting')) return;
        const node = (event.target as Element).closest<HTMLElement>('me-tpc');
        if (!node || !host.container.contains(node)
            || host.currentNodes?.length !== 1 || host.currentNodes[0] !== node) return;
        const image = node.querySelector<HTMLImageElement>(':scope > img');
        if (!image) return;
        const rect = image.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right
            || event.clientY < rect.top || event.clientY > rect.bottom) return;
        press = { node, image, x: event.clientX, y: event.clientY };
    }, true);

    document.addEventListener('pointermove', event => {
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) cancel();
    }, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('keydown', cancel, true);
    host.container.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('blur', cancel);
    host.bus.addListener('operation', cancel);
    host.bus.addListener('unselectNodes', cancel);

    host.container.addEventListener('click', event => {
        const clicked = press;
        press = null;
        if (!clicked || event.defaultPrevented || isNodeTextEditing()
            || (event.target as Element).closest('me-tpc') !== clicked.node) return;
        // MindElixir recognizes double clicks on pointerup within 300 ms.
        // A second press or beginEdit cancels preview before it can cover the editor.
        timer = setTimeout(() => {
            timer = undefined;
            if (clicked.node.isConnected && clicked.image.isConnected && !isNodeTextEditing()
                && host.currentNodes?.length === 1 && host.currentNodes[0] === clicked.node) {
                show(clicked.node, clicked.image);
            }
        }, 300);
    });
}
