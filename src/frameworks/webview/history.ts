export interface MindMapHistorySnapshot {
    text: string;
    images: Record<string, string>;
}

function cloneSnapshot(snapshot: MindMapHistorySnapshot): MindMapHistorySnapshot {
    return {
        text: snapshot.text,
        images: { ...snapshot.images },
    };
}

function snapshotsEqual(a: MindMapHistorySnapshot, b: MindMapHistorySnapshot): boolean {
    if (a.text !== b.text) {
        return false;
    }

    const aKeys = Object.keys(a.images);
    const bKeys = Object.keys(b.images);
    if (aKeys.length !== bKeys.length) {
        return false;
    }

    return aKeys.every(key => a.images[key] === b.images[key]);
}

/** One history for the document, sidebar settings, and image sidecar. */
export class MindMapHistory {
    private undoStack: MindMapHistorySnapshot[] = [];
    private redoStack: MindMapHistorySnapshot[] = [];
    private current: MindMapHistorySnapshot | null = null;

    constructor(private readonly maxEntries = 100) { }

    reset(snapshot: MindMapHistorySnapshot): void {
        this.current = cloneSnapshot(snapshot);
        this.undoStack = [];
        this.redoStack = [];
    }

    record(snapshot: MindMapHistorySnapshot): boolean {
        const next = cloneSnapshot(snapshot);
        if (!this.current) {
            this.current = next;
            return true;
        }
        if (snapshotsEqual(this.current, next)) {
            return false;
        }

        this.undoStack.push(this.current);
        if (this.undoStack.length > this.maxEntries) {
            this.undoStack.shift();
        }
        this.current = next;
        this.redoStack = [];
        return true;
    }

    undo(): MindMapHistorySnapshot | null {
        if (!this.current || this.undoStack.length === 0) {
            return null;
        }

        this.redoStack.push(this.current);
        this.current = this.undoStack.pop() as MindMapHistorySnapshot;
        return cloneSnapshot(this.current);
    }

    redo(): MindMapHistorySnapshot | null {
        if (!this.current || this.redoStack.length === 0) {
            return null;
        }

        this.undoStack.push(this.current);
        this.current = this.redoStack.pop() as MindMapHistorySnapshot;
        return cloneSnapshot(this.current);
    }
}
