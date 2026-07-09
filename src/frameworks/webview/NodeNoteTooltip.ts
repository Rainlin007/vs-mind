import { isNodeTextEditing } from './editClipboard';

type TopicElement = HTMLElement & { nodeObj?: { note?: string } };

export class NodeNoteTooltip {
    private readonly tooltip: HTMLDivElement;
    private activeTopic: TopicElement | null = null;

    constructor(private readonly root: HTMLElement) {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'node-note-tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.hidden = true;
        document.body.appendChild(this.tooltip);
        this.bindEvents();
    }

    /** Mark nodes that carry a note so users can spot them on the map. */
    syncNoteMarkers(): void {
        const topics = this.root.querySelectorAll('me-tpc');
        topics.forEach((element) => {
            const topic = element as TopicElement;
            const hasNote = !!topic.nodeObj?.note?.trim();
            topic.classList.toggle('has-note', hasNote);
        });
    }

    private bindEvents(): void {
        this.root.addEventListener('mouseover', this.onMouseOver);
        this.root.addEventListener('mouseout', this.onMouseOut);
        this.root.addEventListener('mousedown', this.hide);
        this.root.addEventListener('wheel', this.hide, { passive: true });
    }

    private onMouseOver = (event: MouseEvent): void => {
        if (isNodeTextEditing()) {
            this.hide();
            return;
        }

        const topic = this.findTopic(event.target);
        if (!topic) {
            this.hide();
            return;
        }

        const note = topic.nodeObj?.note?.trim();
        if (!note) {
            if (this.activeTopic === topic) {
                this.hide();
            }
            return;
        }

        if (this.activeTopic === topic && !this.tooltip.hidden) {
            return;
        }

        this.show(note, topic);
    };

    private onMouseOut = (event: MouseEvent): void => {
        const from = this.findTopic(event.target);
        const related = event.relatedTarget;
        const to = related instanceof Element ? this.findTopic(related) : null;

        if (from && to && from === to) {
            return;
        }

        if (related instanceof Node && this.tooltip.contains(related)) {
            return;
        }

        this.hide();
    };

    private findTopic(target: EventTarget | null): TopicElement | null {
        if (!(target instanceof Element)) {
            return null;
        }
        return target.closest('me-tpc') as TopicElement | null;
    }

    private show(note: string, topic: TopicElement): void {
        this.activeTopic = topic;
        this.tooltip.textContent = note;
        this.tooltip.hidden = false;
        this.position(topic);
    }

    private position(topic: TopicElement): void {
        const rect = topic.getBoundingClientRect();
        const margin = 8;
        const gap = 6;

        this.tooltip.style.left = '0';
        this.tooltip.style.top = '0';

        const tip = this.tooltip.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - tip.width / 2;
        let top = rect.bottom + gap;

        if (top + tip.height > window.innerHeight - margin) {
            top = rect.top - tip.height - gap;
        }

        left = Math.max(margin, Math.min(left, window.innerWidth - tip.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - tip.height - margin));

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    private hide = (): void => {
        this.activeTopic = null;
        this.tooltip.hidden = true;
    };
}
