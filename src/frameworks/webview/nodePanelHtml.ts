/**
 * Shared node panel markup for webview and debug page.
 */
export const NODE_PANEL_SECTIONS_HTML = `
									<div class="panel-section">
										<label class="panel-label" for="inspector-hyperlink">超链接</label>
										<input type="url" id="inspector-hyperlink" class="panel-input" placeholder="https://example.com" />
									</div>
									<div class="panel-section">
										<label class="panel-label" for="inspector-note">注释</label>
										<textarea id="inspector-note" class="panel-textarea" rows="3" placeholder="节点备注，选中节点时可在此编辑"></textarea>
									</div>
									<div class="panel-section">
										<label class="panel-label" for="inspector-ai-note">AI 备注</label>
										<textarea id="inspector-ai-note" class="panel-textarea" rows="4" placeholder="仅提供给 AI 的背景、目标和约束"></textarea>
									</div>
									<p class="panel-hint">节点文字支持 Markdown：**粗体**、*斜体*、[链接](url)、$E=mc^2$、$$\\int f(x)dx$$</p>
`;
