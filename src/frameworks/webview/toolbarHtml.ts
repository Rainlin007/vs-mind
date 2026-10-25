/** Icon-only toolbar in the VS Code title bar style. Keep all UI text in English. */
const ICON_EXPORT = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M8.5 1.5a.5.5 0 0 0-1 0v7.793L5.354 7.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 9.293V1.5zM2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>`;

const ICON_CHEVRON = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M4.5 6.5 8 10l3.5-3.5L12 7.5 8 11.5 4 7.5l.5-1z"/></svg>`;

function action(id: string, label: string, path: string, shortcut = ''): string {
    return `<button id="action-${id}" class="toolbar-btn canvas-action" type="button" disabled
        title="${label}${shortcut ? ` (${shortcut})` : ''}" aria-label="${label}">
        <span class="toolbar-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${path}</svg></span></button>`;
}

export const CANVAS_ACTIONS_HTML = `<div id="canvas-actions" class="canvas-actions">
    <div class="toolbar-group">${action('fold', 'Collapse branch', '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M5 8h6"/><path class="fold-plus" d="M8 5v6"/>')}</div>
    <div class="toolbar-group">${action('child', 'Add child', '<rect x="1" y="2" width="5" height="4" rx="1"/><path d="M3.5 6v5H8m3-3v6m-3-3h6"/>', 'Tab')}${action('sibling', 'Add sibling', '<rect x="6" y="1" width="7" height="4" rx="1"/><path d="M6 3H3v9h3m4-3v6m-3-3h6"/>', 'Enter')}</div>
    <div class="toolbar-group">${action('focus', 'Focus branch', '<path d="M6 2H2v4m8-4h4v4M2 10v4h4m4 0h4v-4"/><circle cx="8" cy="8" r="2.5"/>')}</div>
    <div class="toolbar-group">${action('undo', 'Undo', '<path d="M6 3 2 7l4 4M2 7h7a4 4 0 0 1 4 4v2"/>', 'Ctrl/Cmd+Z')}${action('redo', 'Redo', '<path d="m10 3 4 4-4 4m4-4H7a4 4 0 0 0-4 4v2"/>', 'Ctrl/Cmd+Shift+Z')}</div>
    <div class="toolbar-group">${action('relationship', 'Relationship', '<rect x="1" y="9" width="4" height="4" rx="1"/><rect x="11" y="3" width="4" height="4" rx="1"/><path d="M5 11h2a2 2 0 0 0 2-2V7a2 2 0 0 1 2-2m-3-2 3 2-3 2"/>')}${action('summary', 'Summary', '<path d="M2 3h4M2 8h4m-4 5h4m2-11h2v12H8m2-6h4"/>')}</div>
    </div><span id="toolbar-status" class="toolbar-status" role="status" aria-live="polite"></span>`;

export const MAP_TOOLBAR_HTML = `
					<header class="map-toolbar" role="toolbar" aria-label="Mind map toolbar">
                        ${CANVAS_ACTIONS_HTML}
						<div class="toolbar-group">
							<div class="export-dropdown">
								<button id="export-trigger" class="toolbar-btn export-trigger" type="button" title="Export" aria-haspopup="menu" aria-expanded="false" aria-label="Export">
									<span class="toolbar-icon" aria-hidden="true">${ICON_EXPORT}</span>
									<span class="toolbar-chevron" aria-hidden="true">${ICON_CHEVRON}</span>
								</button>
								<div id="export-menu" class="export-menu hidden" role="menu" aria-label="Export format">
									<button class="export-menu-item" type="button" data-export="png" role="menuitem">PNG</button>
									<button class="export-menu-item" type="button" data-export="mmf" role="menuitem">MMF</button>
									<button class="export-menu-item" type="button" data-export="markdown" role="menuitem">Markdown</button>
									<button class="export-menu-item" type="button" data-export="plaintext" role="menuitem">Plaintext</button>
								</div>
							</div>
						</div>
					</header>`;
