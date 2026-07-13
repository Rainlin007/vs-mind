import * as path from 'path';
import * as vscode from 'vscode';
import { MindMapService } from '../../usecases/MindMapService';
import { VSCodeImageRepository } from './VSCodeImageRepository';
import { ExportService } from './ExportService';
import { NODE_PANEL_SECTIONS_HTML } from '../webview/nodePanelHtml';
import { MAP_TOOLBAR_HTML } from '../webview/toolbarHtml';

export class MindMapEditorProvider implements vscode.CustomTextEditorProvider {

    private static readonly viewType = 'vscode-mm.mindmap';
    private static readonly panels = new Map<string, vscode.WebviewPanel>();
    private static activeUri: string | undefined;

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const imageRepository = new VSCodeImageRepository();
        const service = new MindMapService(imageRepository);
        const exportService = new ExportService();
        const provider = new MindMapEditorProvider(context, service, exportService);
        const providerRegistration = vscode.window.registerCustomEditorProvider(MindMapEditorProvider.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: true },
        });
        const toggleSidePanel = vscode.commands.registerCommand('vscode-mm.toggleSidePanel', () => {
            MindMapEditorProvider.toggleActiveSidePanel();
        });
        void vscode.commands.executeCommand('setContext', 'vscode-mm.sidePanelHidden', true);
        return vscode.Disposable.from(providerRegistration, toggleSidePanel);
    }

    private static toggleActiveSidePanel(): void {
        const uri = MindMapEditorProvider.activeUri;
        if (!uri) {
            return;
        }
        const panel = MindMapEditorProvider.panels.get(uri);
        panel?.webview.postMessage({ type: 'toggleSidePanel' });
    }

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly service: MindMapService,
        private readonly exportService: ExportService,
    ) { }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
    ): Promise<void> {
        const documentUri = document.uri.toString();
        MindMapEditorProvider.panels.set(documentUri, webviewPanel);
        MindMapEditorProvider.activeUri = documentUri;

        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        let disposed = false;

        const updateWebview = async () => {
            if (disposed) {
                return;
            }

            const result = await this.service.getWebviewContent(document.getText(), document.uri.fsPath);
            const isEmptyDocument = document.getText().trim().length === 0;

            if (isEmptyDocument) {
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, new vscode.Position(0, 0), result.documentText);
                await vscode.workspace.applyEdit(edit);
            }

            if (disposed) {
                return;
            }

            webviewPanel.webview.postMessage({
                type: 'update',
                text: result.text,
                images: result.images,
                documentBaseName: path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)),
            });
        }

        // Hook up event handlers so that we can synchronize the webview with the text document.
        // The text document acts as our model, so we have to update the webview whenever it changes.

        // Use a flag to prevent infinite loops (webview update -> document update -> webview update)
        let isInternalUpdate = false;

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                if (!isInternalUpdate) {
                    updateWebview();
                }
            }
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            disposed = true;
            changeDocumentSubscription.dispose();
            MindMapEditorProvider.panels.delete(documentUri);
            if (MindMapEditorProvider.activeUri === documentUri) {
                MindMapEditorProvider.activeUri = undefined;
            }
        });

        // Update the webview when it becomes visible again (e.g. switching tabs)
        webviewPanel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                MindMapEditorProvider.activeUri = documentUri;
            }
            if (e.webviewPanel.visible) {
                updateWebview();
            }
        });

        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'sidePanelState':
                    void vscode.commands.executeCommand('setContext', 'vscode-mm.sidePanelHidden', !e.visible);
                    return;
                case 'change':
                    isInternalUpdate = true;
                    await this.updateTextDocument(
                        document,
                        this.service.serializeWebviewContent(e.text),
                    );
                    isInternalUpdate = false;

                    if (e.images) {
                        await this.service.saveImages(document.uri.fsPath, e.images);
                    }
                    return;
                case 'openExternal':
                    if (typeof e.url === 'string' && e.url) {
                        await vscode.env.openExternal(vscode.Uri.parse(e.url));
                    }
                    return;
                case 'exportFile': {
                    const format = e.format;
                    if (format !== 'png' && format !== 'mmf' && format !== 'markdown' && format !== 'plaintext') {
                        return;
                    }
                    const defaultName = typeof e.defaultName === 'string'
                        ? path.basename(e.defaultName, path.extname(e.defaultName))
                        : path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
                    try {
                        if (format === 'png') {
                            if (typeof e.dataBase64 !== 'string' || !e.dataBase64) {
                                void vscode.window.showErrorMessage('PNG 导出数据无效。');
                                return;
                            }
                            await this.exportService.saveExport(
                                defaultName,
                                format,
                                Buffer.from(e.dataBase64, 'base64'),
                            );
                            return;
                        }
                        if (typeof e.text !== 'string') {
                            void vscode.window.showErrorMessage('导出内容无效。');
                            return;
                        }
                        await this.exportService.saveExport(defaultName, format, e.text);
                    } catch (error) {
                        console.error('Export failed:', error);
                        void vscode.window.showErrorMessage('导出失败，请重试。');
                    }
                    return;
                }
                case 'exportError':
                    if (typeof e.message === 'string' && e.message) {
                        void vscode.window.showErrorMessage(e.message);
                    }
                    return;
            }
        });

        updateWebview();
    }

    /**
     * Write out the json to a given document.
     */
    private updateTextDocument(document: vscode.TextDocument, jsonStr: string): Thenable<boolean> {
        const edit = new vscode.WorkspaceEdit();

        // Just replace the entire document.
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            jsonStr
        );

        return vscode.workspace.applyEdit(edit);
    }

    /**
     * Get the static html used for the editor webviews.
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        // Local path to script and css for the webview
        // We will continue to use 'media/main.js' as the target for the bundled webview script
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
        const mindElixirScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'MindElixir.js'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));
        const katexStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'katex.min.css'));

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return /* html */`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} 'self' data:; font-src ${webview.cspSource} 'self'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${webview.cspSource};">

				<link href="${styleMainUri}" rel="stylesheet" />
				<link href="${katexStyleUri}" rel="stylesheet" />
				<title>Mind Map</title>
			</head>
			<body>
				<div class="main-content">
					<div class="workspace-column">
						${MAP_TOOLBAR_HTML}
						<div class="map-area">
							<div id="bgPatternOverlay" class="bg-pattern-overlay"></div>
							<div id="mindmap"></div>
						</div>
					</div>
					<aside id="side-panel" class="side-panel hidden">
						<div id="side-panel-resizer" class="side-panel-resizer" title="拖动调整宽度"></div>
						<div class="side-panel-header">
							<div class="side-panel-tabs">
								<button id="panel-tab-node" class="side-panel-tab active" type="button" data-panel="node">节点</button>
								<button id="panel-tab-theme" class="side-panel-tab" type="button" data-panel="theme">主题</button>
							</div>
							<button id="btn-close-panel" class="panel-close-btn" type="button" title="关闭">&times;</button>
						</div>
						<div class="side-panel-body">
							<div id="panel-page-node" class="panel-page active">
								<div id="node-panel-empty" class="panel-empty-hint">选择一个节点以编辑样式</div>
								<div id="node-panel-content" class="panel-page-content hidden">
									<div class="panel-section">
										<label class="panel-label" for="inspector-size">字号</label>
										<select id="inspector-size" class="panel-select">
											<option value="">默认</option>
											<option value="12px">12</option>
											<option value="14px">14</option>
											<option value="16px">16</option>
											<option value="20px">20</option>
											<option value="24px">24</option>
											<option value="32px">32</option>
										</select>
									</div>
									<div class="panel-section">
										<label class="panel-label">颜色</label>
										<div class="style-color-field">
											<input type="color" id="inspector-color" class="panel-color" value="#000000" />
										</div>
										<div class="color-palette">
											<span class="color-swatch" data-color="#000000" style="background-color: #000000;"></span>
											<span class="color-swatch" data-color="#e74c3c" style="background-color: #e74c3c;"></span>
											<span class="color-swatch" data-color="#e67e22" style="background-color: #e67e22;"></span>
											<span class="color-swatch" data-color="#f1c40f" style="background-color: #f1c40f;"></span>
											<span class="color-swatch" data-color="#2ecc71" style="background-color: #2ecc71;"></span>
											<span class="color-swatch" data-color="#3498db" style="background-color: #3498db;"></span>
											<span class="color-swatch" data-color="#9b59b6" style="background-color: #9b59b6;"></span>
										</div>
									</div>
									${NODE_PANEL_SECTIONS_HTML}
								</div>
							</div>
							<div id="panel-page-theme" class="panel-page">
								<div class="panel-section">
									<label class="panel-label" for="theme-select">配色</label>
									<select id="theme-select" class="panel-select"></select>
								</div>
								<div class="panel-section">
									<label class="panel-label" for="direction-select">布局</label>
									<select id="direction-select" class="panel-select"></select>
								</div>
								<div class="panel-section">
									<label class="panel-label" for="line-style-select">线条样式</label>
									<select id="line-style-select" class="panel-select"></select>
								</div>
								<div class="panel-section">
									<label class="panel-label" for="bg-pattern-select">背景花纹</label>
									<select id="bg-pattern-select" class="panel-select">
										<option value="none">无</option>
										<option value="dots">点阵</option>
										<option value="grid">网格</option>
										<option value="crossDot">十字点</option>
									</select>
									<div class="style-row">
										<label class="style-label">花纹颜色</label>
										<div class="style-color-field">
											<input id="bg-pattern-color" class="panel-color" type="color" value="#808080" />
											<input id="bg-pattern-opacity" class="style-opacity" type="range" min="5" max="100" step="5" value="5" />
											<span id="bg-pattern-opacity-value" class="style-opacity-value">5%</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</aside>
				</div>
				<script nonce="${nonce}" src="${mindElixirScriptUri}"></script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
