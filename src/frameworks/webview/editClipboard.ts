/**
 * MindElixir sets user-select:none on the map and hijacks copy/cut/paste for node
 * clipboard ops. While #input-box is active we take over in capture phase only.
 */

const INPUT_BOX_ID = 'input-box';
const EDIT_SHORTCUT_KEYS = new Set(['a', 'c', 'v', 'x']);

interface EditClipboardHost {
    container: HTMLElement;
    bus: {
        addListener(event: string, callback: (payload: unknown) => void): void;
    };
}

function getInputBox(): HTMLDivElement | null {
    return document.getElementById(INPUT_BOX_ID) as HTMLDivElement | null;
}

/** Node topic / arrow / summary inline editor is open. */
export function isNodeTextEditing(): boolean {
    return !!getInputBox();
}

function isEditingActive(): boolean {
    const inputBox = getInputBox();
    if (!inputBox) {
        return false;
    }
    if (document.activeElement === inputBox) {
        return true;
    }

    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const focus = selection?.focusNode;
    return !!(anchor && inputBox.contains(anchor)) || !!(focus && inputBox.contains(focus));
}

function isMetaShortcut(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
}

function getSelectedText(): string {
    return window.getSelection()?.toString() ?? '';
}

function focusInputBox(): void {
    getInputBox()?.focus();
}

function selectAllText(inputBox: HTMLDivElement): void {
    inputBox.focus();
    const range = document.createRange();
    range.selectNodeContents(inputBox);
    const selection = window.getSelection();
    if (!selection) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

function deleteSelectedText(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
    }
    selection.deleteFromDocument();
}

function insertTextAtCursor(inputBox: HTMLDivElement, text: string): void {
    inputBox.focus();
    if (document.execCommand('insertText', false, text)) {
        return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        inputBox.textContent = (inputBox.textContent ?? '') + text;
        return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

function writePlainTextToEvent(event: ClipboardEvent, text: string): void {
    if (event.clipboardData) {
        event.clipboardData.setData('text/plain', text);
    }
}

async function writePlainTextToSystem(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }
}

async function readPlainTextFromSystem(): Promise<string> {
    try {
        return await navigator.clipboard.readText();
    } catch {
        return '';
    }
}

function clipboardHasImage(event: ClipboardEvent): boolean {
    const items = event.clipboardData?.items;
    if (!items) {
        return false;
    }
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            return true;
        }
    }
    return false;
}

function copySelectedText(event?: ClipboardEvent): void {
    const text = getSelectedText();
    if (!text) {
        return;
    }
    if (event?.clipboardData) {
        writePlainTextToEvent(event, text);
        return;
    }
    void writePlainTextToSystem(text);
}

function cutSelectedText(event?: ClipboardEvent): void {
    const text = getSelectedText();
    if (!text) {
        return;
    }
    if (event?.clipboardData) {
        writePlainTextToEvent(event, text);
    } else {
        void writePlainTextToSystem(text);
    }
    deleteSelectedText();
}

function pastePlainText(text: string): void {
    const inputBox = getInputBox();
    if (inputBox) {
        insertTextAtCursor(inputBox, text);
    }
}

function blockMindElixirClipboard(event: Event): void {
    event.stopImmediatePropagation();
    event.preventDefault();
}

function attachEditUndoRedo(inputBox: HTMLDivElement): void {
    if (inputBox.dataset.undoBound === 'true') {
        return;
    }
    inputBox.dataset.undoBound = 'true';

    inputBox.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) {
            return;
        }

        const key = event.key.toLowerCase();
        const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
        const isUndo = key === 'z' && !event.shiftKey;
        if (!isUndo && !isRedo) {
            return;
        }

        const command = isRedo ? 'redo' : 'undo';
        if (document.execCommand(command)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}

function onKeydown(event: KeyboardEvent): void {
    if (!isEditingActive() || !isMetaShortcut(event)) {
        return;
    }

    const inputBox = getInputBox();
    if (!inputBox) {
        return;
    }

    const key = event.key.toLowerCase();
    if (!EDIT_SHORTCUT_KEYS.has(key)) {
        return;
    }

    blockMindElixirClipboard(event);

    switch (key) {
        case 'a':
            selectAllText(inputBox);
            break;
        case 'c':
            copySelectedText();
            break;
        case 'x':
            cutSelectedText();
            break;
        case 'v':
            void readPlainTextFromSystem().then((text) => {
                if (text) {
                    pastePlainText(text);
                }
            });
            break;
    }
}

function onCopy(event: ClipboardEvent): void {
    if (!isEditingActive()) {
        return;
    }
    blockMindElixirClipboard(event);
    copySelectedText(event);
}

function onCut(event: ClipboardEvent): void {
    if (!isEditingActive()) {
        return;
    }
    blockMindElixirClipboard(event);
    cutSelectedText(event);
}

function onPaste(event: ClipboardEvent): void {
    if (!isEditingActive() || clipboardHasImage(event)) {
        return;
    }

    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) {
        return;
    }

    blockMindElixirClipboard(event);
    pastePlainText(text);
}

function watchInputBoxMount(container: HTMLElement): void {
    const observer = new MutationObserver(() => {
        const inputBox = getInputBox();
        if (inputBox) {
            requestAnimationFrame(focusInputBox);
            attachEditUndoRedo(inputBox);
        }
    });
    observer.observe(container, { childList: true, subtree: true });
}

export function setupEditClipboard(host: EditClipboardHost): void {
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCut, true);
    document.addEventListener('paste', onPaste, true);

    host.bus.addListener('operation', (operation) => {
        const op = operation as { name?: string };
        if (op.name === 'beginEdit') {
            requestAnimationFrame(focusInputBox);
        }
    });

    watchInputBoxMount(host.container);
}
