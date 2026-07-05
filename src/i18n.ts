import * as vscode from 'vscode'

type Locale = 'en' | 'zh-cn'

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    defaultRootTopic: 'Central Topic',
    noWorkspace: 'No workspace folder open',
    fileNamePrompt: 'Enter mind map file name',
    fileMustEndSmm: 'File must end with .smm',
    fileExists: 'File already exists',
    exportSuccess: 'Exported to {path}',
    configDisplayLanguage: 'Display language for the mind map editor UI',
    configDisplayLanguageAuto: 'Follow VS Code display language',
    configDisplayLanguageEn: 'English',
    configDisplayLanguageZhCn: 'Chinese (Simplified)',
    configDefaultLayout: 'Default layout for new mind maps',
    configDefaultTheme: 'Default theme for new mind maps',
    configAutoFit: 'Automatically fit canvas when opening a mind map',
  },
  'zh-cn': {
    defaultRootTopic: '中心主题',
    noWorkspace: '未打开工作区文件夹',
    fileNamePrompt: '输入思维导图文件名',
    fileMustEndSmm: '文件名必须以 .smm 结尾',
    fileExists: '文件已存在',
    exportSuccess: '已导出到 {path}',
    configDisplayLanguage: '思维导图编辑器的显示语言',
    configDisplayLanguageAuto: '跟随 VS Code 显示语言',
    configDisplayLanguageEn: '英语',
    configDisplayLanguageZhCn: '简体中文',
    configDefaultLayout: '新建思维导图的默认布局',
    configDefaultTheme: '新建思维导图的默认主题',
    configAutoFit: '打开思维导图时自动适应画布',
  },
}

export function resolveDisplayLanguage(): Locale {
  const config = vscode.workspace.getConfiguration('mindMap')
  const setting = config.get<string>('displayLanguage', 'auto')
  if (setting === 'en' || setting === 'zh-cn') {
    return setting
  }
  return vscode.env.language.toLowerCase().startsWith('zh') ? 'zh-cn' : 'en'
}

export function t(key: string, vars: Record<string, string> = {}): string {
  const locale = resolveDisplayLanguage()
  const template = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
}

export function getDefaultRootTopic(): string {
  return t('defaultRootTopic')
}
