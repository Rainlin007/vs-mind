/** Top toolbar markup — VS Code editor title bar style */
const ICON_EXPORT = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M8.5 1.5a.5.5 0 0 0-1 0v7.793L5.354 7.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 9.293V1.5zM2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>`;

const ICON_CHEVRON = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M4.5 6.5 8 10l3.5-3.5L12 7.5 8 11.5 4 7.5l.5-1z"/></svg>`;

export const MAP_TOOLBAR_HTML = `
					<header class="map-toolbar" role="toolbar" aria-label="导出">
						<div class="toolbar-group">
							<div class="export-dropdown">
								<button id="export-trigger" class="toolbar-btn export-trigger" type="button" title="导出" aria-haspopup="menu" aria-expanded="false" aria-label="导出">
									<span class="toolbar-icon" aria-hidden="true">${ICON_EXPORT}</span>
									<span class="toolbar-chevron" aria-hidden="true">${ICON_CHEVRON}</span>
								</button>
								<div id="export-menu" class="export-menu hidden" role="menu" aria-label="导出格式">
									<button class="export-menu-item" type="button" data-export="png" role="menuitem">PNG</button>
									<button class="export-menu-item" type="button" data-export="json" role="menuitem">JSON</button>
									<button class="export-menu-item" type="button" data-export="markdown" role="menuitem">Markdown</button>
									<button class="export-menu-item" type="button" data-export="plaintext" role="menuitem">Plaintext</button>
								</div>
							</div>
						</div>
					</header>`;
