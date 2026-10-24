import type { NodeObj } from 'mind-elixir';
import { isNodeTextEditing } from './editClipboard';

type TopicElement = HTMLElement & { nodeObj?: NodeObj };

interface ImageResizeHost {
    container: HTMLElement;
    map: HTMLElement;
    scaleVal: number;
    linkDiv(): void;
    move(dx: number, dy: number): void;
    reshapeNode(node: TopicElement, patch: Partial<NodeObj>): void;
}

interface Drag {
    topic: TopicElement;
    image: HTMLImageElement;
    original: NonNullable<NodeObj['image']>;
    pointerId: number;
    x: number;
    y: number;
    scale: number;
    transform: string;
    width: number;
    height: number;
}

/** Preview sizes in the DOM; commit once through MindElixir's undoable API. */
export class ImageResizeControl {
    private readonly handle: HTMLButtonElement;
    private readonly outline: HTMLDivElement;
    private readonly sizeLabel: HTMLDivElement;
    private drag: Drag | null = null;
    private scheduled = false;

    constructor(private readonly host: ImageResizeHost) {
        this.handle = document.createElement('button');
        this.handle.className = 'image-resize-handle';
        this.handle.type = 'button';
        this.handle.hidden = true;
        this.handle.setAttribute('aria-label', '调整图片大小');
        this.handle.setAttribute('aria-description', '拖拽保持图片比例，按 Esc 取消');
        this.outline = document.createElement('div');
        this.outline.className = 'image-resize-outline';
        this.outline.hidden = true;
        this.outline.setAttribute('aria-hidden', 'true');
        this.sizeLabel = document.createElement('div');
        this.sizeLabel.className = 'image-resize-size';
        this.sizeLabel.hidden = true;
        this.sizeLabel.setAttribute('aria-hidden', 'true');
        // Outside the canvas so the control never appears in exported images.
        document.body.appendChild(this.handle);
        document.body.appendChild(this.outline);
        document.body.appendChild(this.sizeLabel);
        this.handle.addEventListener('pointerdown', this.start);
        this.handle.addEventListener('pointermove', this.move);
        this.handle.addEventListener('pointerup', this.end);
        this.handle.addEventListener('pointercancel', this.cancel);
        this.handle.addEventListener('lostpointercapture', this.cancel);
        this.handle.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('keydown', event => {
            if (!this.drag) return;
            if (event.key === 'Escape') this.cancel();
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        this.host.container.addEventListener('wheel', event => {
            if (!this.drag) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, { capture: true, passive: false });
        window.addEventListener('blur', this.cancel);
        window.addEventListener('resize', this.schedule);
        document.addEventListener('scroll', this.schedule, true);
        this.host.container.addEventListener('load', this.schedule, true);
        new MutationObserver(this.schedule).observe(this.host.container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });
        // Includes property-panel resizing, which changes the canvas bounds.
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(this.schedule).observe(this.host.container);
        }
    }

    private schedule = (): void => {
        if (this.scheduled) return;
        this.scheduled = true;
        requestAnimationFrame(() => {
            this.scheduled = false;
            this.sync();
        });
    };

    private selectedImage(): { topic: TopicElement; image: HTMLImageElement } | null {
        const topics = this.host.container.querySelectorAll<TopicElement>('me-tpc.selected');
        if (topics.length !== 1 || isNodeTextEditing()) return null;
        const topic = topics[0];
        const image = topic.querySelector<HTMLImageElement>(':scope > img');
        return image && topic.nodeObj?.image ? { topic, image } : null;
    }

    private sync(): void {
        if (this.drag && !this.drag.image.isConnected) this.cancel();
        const selected = this.drag ?? this.selectedImage();
        if (!selected) {
            this.handle.hidden = true;
            this.outline.hidden = true;
            this.sizeLabel.hidden = true;
            return;
        }
        const rect = selected.image.getBoundingClientRect();
        const bounds = this.host.container.getBoundingClientRect();
        this.handle.hidden = !this.drag && (rect.width === 0 || rect.height === 0
            || rect.right < bounds.left || rect.right > bounds.right
            || rect.bottom < bounds.top || rect.bottom > bounds.bottom);
        this.handle.style.left = `${rect.right}px`;
        this.handle.style.top = `${rect.bottom}px`;
        this.handle.classList.toggle('is-resizing', !!this.drag);
        this.outline.hidden = this.handle.hidden;
        this.outline.style.left = `${rect.left}px`;
        this.outline.style.top = `${rect.top}px`;
        this.outline.style.width = `${rect.width}px`;
        this.outline.style.height = `${rect.height}px`;
        this.outline.style.clipPath = `inset(${Math.max(0, bounds.top - rect.top)}px ${Math.max(0, rect.right - bounds.right)}px ${Math.max(0, rect.bottom - bounds.bottom)}px ${Math.max(0, bounds.left - rect.left)}px)`;
        const dimensions = this.drag ?? selected.topic.nodeObj?.image;
        this.sizeLabel.hidden = this.handle.hidden;
        this.sizeLabel.textContent = dimensions ? `${Math.round(dimensions.width)} × ${Math.round(dimensions.height)}` : '';
        this.sizeLabel.style.left = `${Math.max(bounds.left + 8, Math.min(rect.right + 16, bounds.right - 112))}px`;
        this.sizeLabel.style.top = `${Math.max(bounds.top + 8, Math.min(rect.bottom + 16, bounds.bottom - 32))}px`;
    }

    private start = (event: PointerEvent): void => {
        if (event.button !== 0 || this.drag) return;
        const selected = this.selectedImage();
        const original = selected?.topic.nodeObj?.image;
        if (!selected || !original || original.width <= 0 || original.height <= 0) return;
        event.preventDefault();
        event.stopPropagation();
        this.drag = {
            ...selected, original: { ...original }, pointerId: event.pointerId,
            x: event.clientX, y: event.clientY, scale: this.host.scaleVal || 1,
            transform: this.host.map.style.transform,
            width: original.width, height: original.height,
        };
        this.handle.setPointerCapture(event.pointerId);
        this.sync();
    };

    private move = (event: PointerEvent): void => {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        if (!drag.image.isConnected) {
            this.cancel();
            return;
        }
        const dx = (event.clientX - drag.x) / drag.scale;
        const dy = (event.clientY - drag.y) / drag.scale;
        if (Math.hypot(dx, dy) < 3 && drag.width === drag.original.width
            && drag.height === drag.original.height) return;
        const { width, height } = drag.original;
        const delta = Math.abs(dx / width) >= Math.abs(dy / height) ? dx / width : dy / height;
        const longest = Math.max(width, height);
        const factor = Math.max(32 / longest, Math.min(1600 / longest, 1 + delta));
        drag.width = Math.max(1, Math.round(width * factor));
        drag.height = Math.max(1, Math.round(height * factor));
        const before = drag.image.getBoundingClientRect();
        drag.image.style.width = `${drag.width}px`;
        drag.image.style.height = `${drag.height}px`;
        this.host.linkDiv();
        // Growing root/left-hand nodes shifts layout. Keep the image's top-left
        // fixed so its resize handle follows the pointer at every canvas zoom.
        const after = drag.image.getBoundingClientRect();
        this.host.move(before.left - after.left, before.top - after.top);
        this.sync();
    };

    private end = (event: PointerEvent): void => {
        if (!this.drag || event.pointerId !== this.drag.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        this.finish(true);
    };

    private cancel = (): void => this.finish(false);

    private finish(commit: boolean): void {
        const drag = this.drag;
        if (!drag) return;
        this.drag = null;
        if (this.handle.hasPointerCapture(drag.pointerId)) {
            this.handle.releasePointerCapture(drag.pointerId);
        }
        if (drag.image.isConnected) {
            if (commit && (drag.width !== drag.original.width || drag.height !== drag.original.height)) {
                this.host.reshapeNode(drag.topic, {
                    image: { ...drag.original, width: drag.width, height: drag.height },
                });
            } else {
                drag.image.style.width = `${drag.original.width}px`;
                drag.image.style.height = `${drag.original.height}px`;
                this.host.map.style.transform = drag.transform;
                this.host.linkDiv();
            }
        }
        this.host.container.focus();
        this.schedule();
    }
}
