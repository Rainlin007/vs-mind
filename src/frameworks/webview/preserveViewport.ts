/**
 * MindElixir undo/redo calls refresh(), which rebuilds layout. We keep the same
 * screen position for the anchor node (selected node, else root) and restore pan/zoom.
 */

interface ViewportSnapshot {
    transform: string;
    scaleVal: number;
    anchorNodeId: string | null;
    anchorX: number;
    anchorY: number;
}

export interface ViewportPreservingMind {
    map: HTMLElement;
    scaleVal: number;
    currentNodes?: HTMLElement[];
}

function parseTransform(transform: string): { x: number; y: number } {
    const match = transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
    if (!match) {
        return { x: 0, y: 0 };
    }
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

function findAnchorElement(mind: ViewportPreservingMind, nodeId: string | null): HTMLElement | null {
    if (nodeId) {
        return mind.map.querySelector(`[data-nodeid="${nodeId}"]`);
    }
    return mind.map.querySelector('me-root > me-tpc');
}

function captureViewport(mind: ViewportPreservingMind): ViewportSnapshot | null {
    if (!mind.map) {
        return null;
    }

    const selected = mind.currentNodes?.[0];
    const snapshot: ViewportSnapshot = {
        transform: mind.map.style.transform,
        scaleVal: mind.scaleVal,
        anchorNodeId: selected?.getAttribute('data-nodeid') ?? null,
        anchorX: 0,
        anchorY: 0,
    };

    if (selected) {
        const rect = selected.getBoundingClientRect();
        snapshot.anchorX = rect.left + rect.width / 2;
        snapshot.anchorY = rect.top + rect.height / 2;
    }

    return snapshot;
}

function restoreViewport(mind: ViewportPreservingMind, snapshot: ViewportSnapshot): void {
    mind.map.style.transform = snapshot.transform;
    mind.scaleVal = snapshot.scaleVal;

    if (!snapshot.anchorNodeId) {
        return;
    }

    const target = findAnchorElement(mind, snapshot.anchorNodeId);
    if (!target) {
        return;
    }

    const rect = target.getBoundingClientRect();
    const dx = snapshot.anchorX - (rect.left + rect.width / 2);
    const dy = snapshot.anchorY - (rect.top + rect.height / 2);
    if (dx === 0 && dy === 0) {
        return;
    }

    const { x, y } = parseTransform(mind.map.style.transform);
    mind.map.style.transform = `translate3d(${x + dx}px, ${y + dy}px, 0) scale(${snapshot.scaleVal})`;
}

export function runWithViewportPreserved(
    mind: ViewportPreservingMind,
    action: () => void,
    onHistoryChange?: () => void,
): void {
    const snapshot = captureViewport(mind);
    action();
    if (!snapshot) {
        onHistoryChange?.();
        return;
    }

    requestAnimationFrame(() => {
        restoreViewport(mind, snapshot);
        onHistoryChange?.();
    });
}
