export type SidePanelTab = 'node' | 'theme';

export const DEFAULT_SIDE_PANEL_WIDTH = 260;
export const MIN_SIDE_PANEL_WIDTH = 180;
export const MAX_SIDE_PANEL_WIDTH = 520;

export class SidePanel {
    private panel: HTMLElement;
    private resizer: HTMLElement | null;
    private tabs: HTMLButtonElement[];
    private pages: Record<SidePanelTab, HTMLElement>;
    private activeTab: SidePanelTab = 'node';
    private width: number;
    private dragging = false;
    onVisibilityChange?: (visible: boolean) => void;
    onWidthChange?: (width: number) => void;

    constructor(initialWidth = DEFAULT_SIDE_PANEL_WIDTH) {
        this.panel = document.getElementById('side-panel') as HTMLElement;
        this.resizer = document.getElementById('side-panel-resizer');
        this.tabs = Array.from(document.querySelectorAll('.side-panel-tab')) as HTMLButtonElement[];
        this.pages = {
            node: document.getElementById('panel-page-node') as HTMLElement,
            theme: document.getElementById('panel-page-theme') as HTMLElement,
        };
        this.width = this.clampWidth(initialWidth);
        this.applyWidth();
        this.initListeners();
        this.initResize();
    }

    switchTab(tab: SidePanelTab): void {
        if (!this.pages[tab]) return;
        this.activeTab = tab;
        this.tabs.forEach((button) => {
            button.classList.toggle('active', button.dataset.panel === tab);
        });
        Object.entries(this.pages).forEach(([name, page]) => {
            page?.classList.toggle('active', name === tab);
        });
    }

    show(): void {
        this.panel?.classList.remove('hidden');
        this.onVisibilityChange?.(true);
    }

    hide(): void {
        this.panel?.classList.add('hidden');
        this.onVisibilityChange?.(false);
    }

    toggle(): void {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    isTarget(element: EventTarget | null): boolean {
        return !!element && !!(element as HTMLElement).closest?.('#side-panel');
    }

    isVisible(): boolean {
        return !!this.panel && !this.panel.classList.contains('hidden');
    }

    getActiveTab(): SidePanelTab {
        return this.activeTab;
    }

    getWidth(): number {
        return this.width;
    }

    setWidth(width: number): void {
        this.width = this.clampWidth(width);
        this.applyWidth();
    }

    private clampWidth(width: number): number {
        return Math.min(MAX_SIDE_PANEL_WIDTH, Math.max(MIN_SIDE_PANEL_WIDTH, Math.round(width)));
    }

    private applyWidth(): void {
        if (!this.panel) return;
        this.panel.style.width = `${this.width}px`;
    }

    private initListeners(): void {
        this.tabs.forEach((button) => {
            button.addEventListener('click', () => {
                const tab = button.dataset.panel as SidePanelTab;
                if (tab) this.switchTab(tab);
            });
        });

        document.getElementById('btn-close-panel')?.addEventListener('click', () => {
            this.hide();
        });
    }

    private initResize(): void {
        if (!this.resizer) return;

        const onMouseMove = (event: MouseEvent) => {
            if (!this.dragging) return;
            this.setWidth(window.innerWidth - event.clientX);
        };

        const stopDragging = () => {
            if (!this.dragging) return;
            this.dragging = false;
            this.resizer?.classList.remove('active');
            document.body.style.removeProperty('user-select');
            document.body.style.removeProperty('cursor');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stopDragging);
            this.onWidthChange?.(this.width);
        };

        this.resizer.addEventListener('mousedown', (event) => {
            if (!this.isVisible()) return;
            event.preventDefault();
            this.dragging = true;
            this.resizer?.classList.add('active');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', stopDragging);
        });
    }
}
