import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { getDefaultRootTopic, resolveDisplayLanguage, t } from './i18n'
import { DEFAULT_MIND_MAP_DATA, DEFAULT_THEME_CONFIG } from './defaultMindMapData'

const DEFAULT_DATA = DEFAULT_MIND_MAP_DATA

function isValidView(view: unknown): boolean {
  if (!view || typeof view !== 'object') return false
  const v = view as { state?: unknown; transform?: unknown }
  return !!(v.state && typeof v.state === 'object' && v.transform && typeof v.transform === 'object')
}

function isValidMindMapData(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const root = (data as { root?: unknown }).root
  if (!root || typeof root !== 'object') return false
  const nodeData = (root as { data?: unknown }).data
  return !!(nodeData && typeof nodeData === 'object')
}

function getRainbowLinesConfigFromData(data: { rainbowLinesConfig?: { open?: boolean; colorsList?: string[] } }) {
  const config = data.rainbowLinesConfig
  if (config && typeof config === 'object') {
    return {
      open: !!config.open,
      colorsList: Array.isArray(config.colorsList) ? config.colorsList : [],
    }
  }
  return { open: false, colorsList: [] }
}

function normalizeMindMapData(data: unknown) {
  if (isValidMindMapData(data)) {
    const valid = data as typeof DEFAULT_DATA
    return {
      layout: valid.layout || DEFAULT_DATA.layout,
      root: {
        ...valid.root,
        data: {
          ...valid.root.data,
          text: valid.root.data.text || getDefaultRootTopic(),
          expand: valid.root.data.expand !== false,
        },
        children: valid.root.children || [],
      },
      theme: {
        template: valid.theme?.template || DEFAULT_DATA.theme.template,
        config: {
          ...DEFAULT_THEME_CONFIG,
          ...(valid.theme?.config || {}),
        },
      },
      rainbowLinesConfig: getRainbowLinesConfigFromData(valid),
      ...((valid as Record<string, unknown>).backgroundPattern
        ? {
            backgroundPattern: (valid as Record<string, unknown>).backgroundPattern,
            bgPatternColor: (valid as Record<string, unknown>).bgPatternColor || '#808080',
            bgPatternOpacity: (valid as Record<string, unknown>).bgPatternOpacity ?? 5,
          }
        : {}),
    }
  }

  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    (data as { data?: unknown }).data &&
    typeof (data as { data?: unknown }).data === 'object'
  ) {
    const rootNode = data as {
      data: { text?: string; expand?: boolean }
      children?: unknown[]
    }
    return {
      ...DEFAULT_DATA,
      root: {
        data: {
          text: rootNode.data.text || getDefaultRootTopic(),
          expand: rootNode.data.expand !== false,
        },
        children: rootNode.children || [],
      },
    }
  }

  return { ...DEFAULT_DATA }
}

function parseMindMapText(text: string) {
  try {
    const parsed = text.trim() ? JSON.parse(text) : null
    return normalizeMindMapData(parsed)
  } catch {
    return { ...DEFAULT_DATA }
  }
}

export class MindMapEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'mindMap.editor'
  private static activeWebview: vscode.Webview | undefined

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      MindMapEditorProvider.viewType,
      new MindMapEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
      }
    )
  }

  public static postCommandToActiveWebview(command: string) {
    if (MindMapEditorProvider.activeWebview) {
      MindMapEditorProvider.activeWebview.postMessage({ type: 'command', command })
    }
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  private getWorkspaceViews(): Record<string, unknown> {
    return this.context.workspaceState.get<Record<string, unknown>>('mindMap.views', {})
  }

  private getWorkspaceView(uri: vscode.Uri): unknown {
    return this.getWorkspaceViews()[uri.toString()]
  }

  private async setWorkspaceView(uri: vscode.Uri, view: unknown) {
    if (!isValidView(view)) return
    const views = { ...this.getWorkspaceViews(), [uri.toString()]: view }
    await this.context.workspaceState.update('mindMap.views', views)
  }

  private withWorkspaceView(uri: vscode.Uri, data: ReturnType<typeof normalizeMindMapData>) {
    const storedView = this.getWorkspaceView(uri)
    if (!isValidView(storedView)) return data
    return { ...data, view: storedView }
  }

  private async seedDocumentIfNeeded(document: vscode.TextDocument) {
    const text = document.getText()
    let needsSeed = !text.trim()
    if (!needsSeed) {
      try {
        needsSeed = !isValidMindMapData(JSON.parse(text))
      } catch {
        needsSeed = true
      }
    }
    if (!needsSeed) return

    const data = parseMindMapText(text)
    const config = vscode.workspace.getConfiguration('mindMap')
    data.layout = config.get<string>('defaultLayout', DEFAULT_DATA.layout)
    data.theme = {
      template: config.get<string>('defaultTheme', DEFAULT_DATA.theme.template),
      config: { ...DEFAULT_THEME_CONFIG },
    }
    data.rainbowLinesConfig = { ...DEFAULT_DATA.rainbowLinesConfig }
    data.backgroundPattern = DEFAULT_DATA.backgroundPattern
    data.bgPatternColor = DEFAULT_DATA.bgPatternColor
    data.bgPatternOpacity = DEFAULT_DATA.bgPatternOpacity

    const json = JSON.stringify(data, null, 2)
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    )
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, fullRange, json)
    await vscode.workspace.applyEdit(edit)
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      ],
    }

    webview.html = this.getHtmlForWebview(webview)

    MindMapEditorProvider.activeWebview = webview

    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.active) {
        MindMapEditorProvider.activeWebview = webview
      }
    })

    let isUpdatingFromWebview = false

    const config = vscode.workspace.getConfiguration('mindMap')
    const webviewConfig = this.getWebviewConfig(webview, config)

    await this.seedDocumentIfNeeded(document)

    const updateWebview = () => {
      if (isUpdatingFromWebview) return
      const data = this.withWorkspaceView(
        document.uri,
        parseMindMapText(document.getText())
      )

      webview.postMessage({
        type: 'init',
        data,
        config: webviewConfig,
      })
    }

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return
        if (isUpdatingFromWebview) return
        const data = this.withWorkspaceView(
          document.uri,
          parseMindMapText(document.getText())
        )
        webview.postMessage({ type: 'update', data })
      }
    )

    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          updateWebview()
          break

        case 'edit': {
          if (!message.data || typeof message.data !== 'object' || !message.data.root) {
            break
          }
          const { view: _view, ...fileData } = message.data as {
            view?: unknown
            root: unknown
          }
          const json = JSON.stringify(fileData, null, 2)
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          )
          const edit = new vscode.WorkspaceEdit()
          edit.replace(document.uri, fullRange, json)
          isUpdatingFromWebview = true
          try {
            await vscode.workspace.applyEdit(edit)
          } finally {
            isUpdatingFromWebview = false
          }
          break
        }

        case 'viewChange': {
          await this.setWorkspaceView(document.uri, message.view)
          break
        }

        case 'export': {
          const { format, dataUrl } = message
          const baseName = path.basename(document.uri.fsPath, '.smm')
          const ext = format === 'md' ? 'md' : format
          const defaultUri = vscode.Uri.file(
            path.join(path.dirname(document.uri.fsPath), `${baseName}.${ext}`)
          )

          const filterMap: Record<string, Record<string, string[]>> = {
            png: { 'PNG Images': ['png'] },
            svg: { 'SVG Files': ['svg'] },
            json: { 'JSON Files': ['json'] },
            md: { 'Markdown Files': ['md'] },
          }

          const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: filterMap[format] || { 'All Files': ['*'] },
          })

          if (!saveUri) break

          if (format === 'json') {
            fs.writeFileSync(saveUri.fsPath, document.getText(), 'utf8')
          } else if (format === 'png' && dataUrl) {
            const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
            fs.writeFileSync(saveUri.fsPath, Buffer.from(base64, 'base64'))
          } else if ((format === 'svg' || format === 'md') && dataUrl) {
            const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '')
            fs.writeFileSync(saveUri.fsPath, Buffer.from(base64, 'base64').toString('utf8'))
          }

          vscode.window.showInformationMessage(t('exportSuccess', { path: saveUri.fsPath }))
          break
        }

        case 'info':
          vscode.window.showInformationMessage(message.text)
          break

        case 'error':
          vscode.window.showErrorMessage(message.text)
          break
      }
    })

    const themeSubscription = vscode.window.onDidChangeActiveColorTheme(
      (theme) => {
        webview.postMessage({
          type: 'themeChanged',
          kind: theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark',
        })
      }
    )

    const configSubscription = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('mindMap.displayLanguage')) {
        webview.postMessage({
          type: 'languageChanged',
          language: resolveDisplayLanguage(),
        })
      }
    })

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose()
      themeSubscription.dispose()
      configSubscription.dispose()
      if (MindMapEditorProvider.activeWebview === webview) {
        MindMapEditorProvider.activeWebview = undefined
      }
    })
  }

  private getWebviewConfig(
    webview: vscode.Webview,
    config: vscode.WorkspaceConfiguration
  ) {
    const katexUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'katex')
    )
    return {
      autoFit: config.get<boolean>('autoFit', true),
      defaultLayout: config.get<string>('defaultLayout', 'logicalStructure'),
      defaultTheme: config.get<string>('defaultTheme', 'default'),
      language: resolveDisplayLanguage(),
      katexFontPath: `${katexUri.toString()}/`,
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const mediaPath = vscode.Uri.joinPath(this.context.extensionUri, 'media')
    const distPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist')

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaPath, 'editor.css')
    )
    const editorUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distPath, 'editor.js')
    )
    const version = this.context.extension.packageJSON.version ?? '0'
    const cspSource = webview.cspSource

    const htmlPath = vscode.Uri.joinPath(mediaPath, 'editor.html')
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8')

    html = html
      .replace(/\{\{cspSource\}\}/g, cspSource)
      .replace(/\{\{cssUri\}\}/g, cssUri.toString())
      .replace(/\{\{editorUri\}\}/g, `${editorUri}?v=${version}`)

    return html
  }
}
