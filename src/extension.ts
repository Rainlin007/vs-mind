import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { MindMapEditorProvider } from './mindMapEditorProvider'
import { getDefaultRootTopic, t } from './i18n'

const DEFAULT_DATA = {
  layout: 'logicalStructure',
  root: {
    data: { text: getDefaultRootTopic(), expand: true },
    children: [],
  },
  theme: { template: 'default', config: {} },
}

export function activate(context: vscode.ExtensionContext) {
  const provider = MindMapEditorProvider.register(context)
  context.subscriptions.push(provider)

  context.subscriptions.push(
    vscode.commands.registerCommand('mindMap.newFile', async (uri?: vscode.Uri) => {
      const targetDir = uri
        ? (fs.statSync(uri.fsPath).isDirectory() ? uri.fsPath : path.dirname(uri.fsPath))
        : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '')

      if (!targetDir) {
        vscode.window.showErrorMessage(t('noWorkspace'))
        return
      }

      const fileName = await vscode.window.showInputBox({
        prompt: t('fileNamePrompt'),
        value: 'untitled.smm',
        validateInput: (v) => v.endsWith('.smm') ? null : t('fileMustEndSmm'),
      })

      if (!fileName) return

      const filePath = path.join(targetDir, fileName)
      if (fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(t('fileExists'))
        return
      }

      const config = vscode.workspace.getConfiguration('mindMap')
      const data = {
        ...DEFAULT_DATA,
        layout: config.get<string>('defaultLayout', 'logicalStructure'),
        theme: { template: config.get<string>('defaultTheme', 'default'), config: {} },
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
      const doc = await vscode.workspace.openTextDocument(filePath)
      await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'mindMap.editor')
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('mindMap.openSource', () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab
      const input = tab?.input as { uri?: vscode.Uri } | undefined
      const uri = input?.uri
      if (!uri) return
      vscode.commands.executeCommand('vscode.openWith', uri, 'default', vscode.ViewColumn.Beside)
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('mindMap.openMindBeside', () => {
      const tab = vscode.window.tabGroups.activeTabGroup.activeTab
      const input = tab?.input as { uri?: vscode.Uri } | undefined
      const uri = input?.uri
      if (!uri) return
      vscode.commands.executeCommand('vscode.openWith', uri, 'mindMap.editor', vscode.ViewColumn.Beside)
    })
  )

  const webviewCommands = [
    'mindMap.exportPng',
    'mindMap.exportSvg',
    'mindMap.exportJson',
    'mindMap.fitCanvas',
    'mindMap.zoomIn',
    'mindMap.zoomOut',
    'mindMap.expandAll',
    'mindMap.collapseAll',
    'mindMap.search',
  ]

  for (const cmd of webviewCommands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd, () => {
        MindMapEditorProvider.postCommandToActiveWebview(cmd)
      })
    )
  }
}

export function deactivate() {}
