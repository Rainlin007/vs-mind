import MindMap from 'simple-mind-map'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
import Formula from 'simple-mind-map/src/plugins/Formula.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import Search from 'simple-mind-map/src/plugins/Search.js'
import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust.js'
import Painter from 'simple-mind-map/src/plugins/Painter.js'
import RainbowLines from 'simple-mind-map/src/plugins/RainbowLines.js'
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine.js'
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame.js'
import {
  applyDomI18n,
  getLayoutOptions,
  getMindMapLocaleOptions,
  getShapeOptions,
  setLocale,
  t,
  updateStatusBarI18n,
} from './i18n.js'
import { getThemeGroups, registerThemes } from './themes.js'
import {
  buildRainbowLinesConfig,
  getRainbowLinePresets,
  getRainbowPresetById,
  resolveRainbowPresetId,
} from './rainbowLines.js'

registerThemes(MindMap)

MindMap.usePlugin(Drag)
  .usePlugin(Select)
  .usePlugin(KeyboardNavigation)
  .usePlugin(RichText)
  .usePlugin(Formula)
  .usePlugin(Export)
  .usePlugin(Search)
  .usePlugin(NodeImgAdjust)
  .usePlugin(Painter)
  .usePlugin(RainbowLines)
  .usePlugin(AssociativeLine)
  .usePlugin(OuterFrame)

const vscode = acquireVsCodeApi()

const DEFAULT_MIND_MAP_DATA = {
  layout: 'logicalStructure',
  root: { data: { text: '', expand: true }, children: [] },
  theme: { template: 'default', config: {} },
  rainbowLinesConfig: { open: false, colorsList: [] },
}

function getRainbowLinesConfig(data) {
  const config = data?.rainbowLinesConfig
  if (config && typeof config === 'object') {
    return {
      open: !!config.open,
      colorsList: Array.isArray(config.colorsList) ? config.colorsList : [],
    }
  }
  return { ...DEFAULT_MIND_MAP_DATA.rainbowLinesConfig }
}

function getDefaultRootText() {
  return t('defaultRootTopic')
}

function isValidView(view) {
  return !!(
    view &&
    typeof view === 'object' &&
    view.state &&
    typeof view.state === 'object' &&
    view.transform &&
    typeof view.transform === 'object'
  )
}

function isValidMindMapData(data) {
  return !!(
    data &&
    typeof data === 'object' &&
    data.root &&
    typeof data.root === 'object' &&
    data.root.data &&
    typeof data.root.data === 'object'
  )
}

function normalizeThemeConfig(config) {
  if (!config || typeof config !== 'object') return {}
  const normalized = { ...config }
  if (
    !normalized.backgroundColor ||
    normalized.backgroundColor === 'transparent' ||
    normalized.backgroundColor === 'none'
  ) {
    delete normalized.backgroundColor
  }
  return normalized
}

function normalizeMindMapData(data) {
  if (isValidMindMapData(data)) {
    const theme = data.theme || DEFAULT_MIND_MAP_DATA.theme
    return {
      layout: data.layout || DEFAULT_MIND_MAP_DATA.layout,
      root: {
        ...data.root,
        data: {
          ...data.root.data,
          text: data.root.data.text || getDefaultRootText(),
          expand: data.root.data.expand !== false,
        },
        children: data.root.children || [],
      },
      theme: {
        template: theme.template || DEFAULT_MIND_MAP_DATA.theme.template,
        config: normalizeThemeConfig(theme.config),
      },
      rainbowLinesConfig: getRainbowLinesConfig(data),
      ...(isValidView(data.view) ? { view: data.view } : {}),
    }
  }

  if (data && typeof data === 'object' && data.data && typeof data.data === 'object') {
    return {
      ...DEFAULT_MIND_MAP_DATA,
      root: {
        data: {
          text: data.data.text || getDefaultRootText(),
          expand: data.data.expand !== false,
        },
        children: data.children || [],
      },
    }
  }

  return {
    ...DEFAULT_MIND_MAP_DATA,
    root: {
      ...DEFAULT_MIND_MAP_DATA.root,
      data: {
        ...DEFAULT_MIND_MAP_DATA.root.data,
        text: getDefaultRootText(),
      },
    },
  }
}

let mindMap = null
let debounceTimer = null
let viewDebounceTimer = null
let activeNodes = []
let isPainterMode = false
let hasPendingEdit = false
let lastSyncedJSON = ''
let currentLayout = 'logicalStructure'
let currentTheme = 'default'
let rainbowLinesOpen = false
let currentRainbowPreset = 'close'

function setCurrentLayout(value) {
  currentLayout = value
  if (layoutSelect) layoutSelect.value = value
}

function setCurrentTheme(value) {
  currentTheme = value
  if (themeSelect) themeSelect.value = value
}

function renderLayoutSelect() {
  if (!layoutSelect) return
  layoutSelect.innerHTML = ''
  for (const option of getLayoutOptions()) {
    const el = document.createElement('option')
    el.value = option.value
    el.textContent = option.label
    layoutSelect.appendChild(el)
  }
  layoutSelect.value = currentLayout
}

function renderThemeSelect() {
  if (!themeSelect) return
  themeSelect.innerHTML = ''
  for (const group of getThemeGroups()) {
    const optgroup = document.createElement('optgroup')
    optgroup.label = group.label
    for (const theme of group.themes) {
      const option = document.createElement('option')
      option.value = theme.value
      option.textContent = theme.label
      optgroup.appendChild(option)
    }
    themeSelect.appendChild(optgroup)
  }
  themeSelect.value = currentTheme
}

function applyLayout(layout) {
  if (!mindMap || layout === currentLayout) return
  mindMap.setLayout(layout)
  setCurrentLayout(layout)
  syncDocumentFromMindMap()
}

function applyTheme(theme) {
  if (!mindMap || theme === currentTheme) return
  mindMap.setTheme(theme)
  setCurrentTheme(theme)
  updateCanvasSettingsPanel()
  syncDocumentFromMindMap()
}

function syncDocumentFromMindMap() {
  if (!mindMap) return false
  const newData = getDocumentData()
  const compareJSON = JSON.stringify(buildDocumentSnapshot(newData))
  if (compareJSON === lastSyncedJSON) return false
  lastSyncedJSON = compareJSON
  vscode.postMessage({ type: 'edit', data: newData })
  return true
}

function getDocumentData() {
  const { view, ...content } = mindMap.getData(true)
  const { rainbowLinesConfig } = mindMap.opt
  return {
    ...content,
    rainbowLinesConfig: {
      open: !!(rainbowLinesConfig && rainbowLinesConfig.open),
      colorsList: rainbowLinesConfig?.colorsList || [],
    },
  }
}

function setRainbowLinesState(config) {
  const normalized = getRainbowLinesConfig({ rainbowLinesConfig: config })
  rainbowLinesOpen = normalized.open
  currentRainbowPreset = resolveRainbowPresetId(normalized)
  if (rainbowLinesSelect) rainbowLinesSelect.value = currentRainbowPreset
  updateRainbowPreview()
}

function createRainbowColorsBar(colors) {
  const bar = document.createElement('div')
  bar.className = 'rainbow-colors-bar'
  for (const color of colors) {
    const chip = document.createElement('span')
    chip.className = 'rainbow-color-chip'
    chip.style.backgroundColor = color
    bar.appendChild(chip)
  }
  return bar
}

function renderRainbowSelect() {
  if (!rainbowLinesSelect) return
  rainbowLinesSelect.innerHTML = ''
  const offOption = document.createElement('option')
  offOption.value = 'close'
  offOption.textContent = t('rainbow.off')
  rainbowLinesSelect.appendChild(offOption)
  for (const preset of getRainbowLinePresets()) {
    const option = document.createElement('option')
    option.value = preset.id
    option.textContent = preset.label
    rainbowLinesSelect.appendChild(option)
  }
  rainbowLinesSelect.value = currentRainbowPreset
  updateRainbowPreview()
}

function updateRainbowPreview() {
  if (!rainbowLinesPreviewEl) return
  rainbowLinesPreviewEl.innerHTML = ''
  if (currentRainbowPreset === 'close') {
    rainbowLinesPreviewEl.classList.add('hidden')
    return
  }
  const preset = getRainbowPresetById(currentRainbowPreset)
  if (!preset) {
    rainbowLinesPreviewEl.classList.add('hidden')
    return
  }
  rainbowLinesPreviewEl.classList.remove('hidden')
  rainbowLinesPreviewEl.appendChild(createRainbowColorsBar(preset.list))
}

function applyRainbowLinesConfig(config) {
  if (!mindMap) return
  const normalized = getRainbowLinesConfig({ rainbowLinesConfig: config })
  if (mindMap.rainbowLines) {
    mindMap.rainbowLines.updateRainLinesConfig(normalized)
  } else {
    mindMap.updateConfig({ rainbowLinesConfig: normalized })
  }
  setRainbowLinesState(normalized)
}

function selectRainbowPreset(presetId) {
  if (!mindMap || !mindMap.rainbowLines) return
  applyRainbowLinesConfig(buildRainbowLinesConfig(presetId))
  syncDocumentFromMindMap()
}

// ===== DOM Elements =====
const $ = (id) => document.getElementById(id)
const toolbar = {
  undo: $('btn-undo'),
  redo: $('btn-redo'),
  addChild: $('btn-add-child'),
  addSibling: $('btn-add-sibling'),
  delete: $('btn-delete'),
  painter: $('btn-painter'),
  search: $('btn-search'),
  zoomIn: $('btn-zoom-in'),
  zoomOut: $('btn-zoom-out'),
  zoomLevel: $('zoom-level'),
  fit: $('btn-fit'),
  expandAll: $('btn-expand-all'),
  collapseAll: $('btn-collapse-all'),
  exportBtn: $('btn-export'),
  exportMenu: $('export-menu'),
  sidebarToggle: $('btn-sidebar-toggle'),
}

const searchPanel = $('searchPanel')
const searchInput = $('search-input')
const replaceInput = $('replace-input')
const searchCount = $('search-count')
const sidePanel = $('sidePanel')
const sidePanelTabs = Array.from(document.querySelectorAll('.side-panel-tab'))
const sidePanelPages = {
  node: $('panel-page-node'),
  theme: $('panel-page-theme'),
}
const nodePanelEmpty = $('node-panel-empty')
const nodePanelContent = $('node-panel-content')
const contextMenuEl = $('contextMenu')
const statusNodes = $('status-nodes')
const statusZoom = $('status-zoom')

// Side panel fields
const nodeText = $('node-text')
const nodeNote = $('node-note')
const nodeComment = $('node-comment')
const nodeLink = $('node-link')
const nodeLinkTitle = $('node-link-title')
const nodeTagsEl = $('node-tags')
const nodeTagInput = $('node-tag-input')
const nodeShape = $('node-shape')
const nodeColor = $('node-color')
const nodeColorOpacity = $('node-color-opacity')
const nodeBgColor = $('node-bg-color')
const nodeBgOpacity = $('node-bg-opacity')
const nodeFontSize = $('node-font-size')
const lineWidthInput = $('line-width')
const canvasBgColor = $('canvas-bg-color')
const themeSelect = $('theme-select')
const layoutSelect = $('layout-select')
const rainbowLinesSelect = $('rainbow-lines-select')
const rainbowLinesPreviewEl = $('rainbow-lines-preview')
const resetNodeBtn = $('btn-reset-node')
const resetThemeBtn = $('btn-reset-theme')

let currentSidePanelTab = 'node'

// Formula dialog
const formulaDialogEl = $('formulaDialog')
const formulaInputEl = $('formula-input')
const formulaConfirmBtn = $('formula-confirm')
const formulaCancelBtn = $('formula-cancel')
let formulaDialogCallback = null

function htmlEscapeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function htmlEscapeAttr(text) {
  return htmlEscapeText(text)
}

function extractPlainTextFromRichHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  tmp.querySelectorAll('.ql-formula').forEach((el) => {
    const value = el.getAttribute('data-value')
    if (value) {
      el.replaceWith(document.createTextNode(`$${decodeHtmlEntities(value)}$`))
      return
    }
    const annotation = el.querySelector('annotation')
    if (annotation?.textContent) {
      el.replaceWith(document.createTextNode(`$${annotation.textContent.trim()}$`))
    }
  })

  const paragraphs = Array.from(tmp.querySelectorAll('p'))
  if (paragraphs.length) {
    return paragraphs.map((p) => p.textContent || '').join('\n').replace(/\n$/, '')
  }
  return (tmp.textContent || '').replace(/\n$/, '')
}

function convertRichHtmlToPlainSource(html) {
  if (!html) return ''
  let sourceHtml = html
  if (mindMap?.formula?.latexRichToText) {
    sourceHtml = mindMap.formula.latexRichToText(sourceHtml)
  }
  return extractPlainTextFromRichHtml(sourceHtml)
}

function getPlainTextForNode(node) {
  if (!node) return ''
  const data = node.getData()
  if (!data?.text) return ''
  if (!data.richText) return data.text
  return convertRichHtmlToPlainSource(data.text)
}

function syncNodeTextInputField(force = false) {
  if (!force && document.activeElement === nodeText) return
  if (activeNodes.length !== 1) {
    nodeText.value = ''
    return
  }
  const node = activeNodes[0]
  const text = getPlainTextForNode(node)
  nodeText.value = text
  mindMap?.execCommand('SET_NODE_DATA', node, { textInput: text })
}

function renderFormulaSpan(latex) {
  const span = document.createElement('span')
  span.className = 'ql-formula'
  span.setAttribute('data-value', htmlEscapeAttr(latex))
  if (window.katex) {
    window.katex.render(latex, span, getKatexRenderConfig())
  }
  return span.outerHTML
}

function processPlainLine(line) {
  const parts = String(line).split(/(\$.+?\$)/g)
  let inner = ''
  for (const part of parts) {
    if (!part) continue
    if (/^\$.+?\$$/.test(part)) {
      const latex = part.slice(1, -1).trim()
      if (latex && mindMap?.formula?.checkFormulaIsLegal(latex)) {
        inner += renderFormulaSpan(latex)
      } else {
        inner += htmlEscapeText(part)
      }
    } else {
      inner += htmlEscapeText(part)
    }
  }
  return inner || '<br>'
}

function buildRichTextHtmlFromPlainInput(text) {
  const lines = String(text ?? '').split('\n')
  if (!lines.length) return '<p><br></p>'
  return lines.map((line) => `<p>${processPlainLine(line)}</p>`).join('')
}

function applySidePanelNodeText(node, text) {
  if (!mindMap || !node) return
  const source = String(text ?? '')
  const html = buildRichTextHtmlFromPlainInput(source)
  mindMap.execCommand('SET_NODE_TEXT', node, html, true, true)
  mindMap.execCommand('SET_NODE_DATA', node, { textInput: source })
}

function showSidePanelForEditing(focusText = true) {
  sidePanel.classList.remove('hidden')
  toolbar.sidebarToggle.classList.add('active')
  if (focusText) {
    nodeText.focus()
    const len = nodeText.value.length
    nodeText.setSelectionRange(len, len)
  }
}

function insertFormulaToNode(node, latex) {
  const trimmed = latex?.trim()
  if (!trimmed || !mindMap?.formula || !node) return
  if (!mindMap.formula.checkFormulaIsLegal(trimmed)) return

  const current = getPlainTextForNode(node)
  const spacer = current && !/\s$/.test(current) ? ' ' : ''
  const newText = `${current}${spacer}$${trimmed}$`
  applySidePanelNodeText(node, newText)

  if (activeNodes.length === 1 && activeNodes[0] === node) {
    nodeText.value = newText
  }
  showSidePanelForEditing(true)
}

function getKatexRenderConfig() {
  return mindMap?.formula?.config || {
    throwOnError: false,
    errorColor: '#f00',
    output: 'html',
  }
}

function decodeHtmlEntities(value) {
  const el = document.createElement('textarea')
  el.innerHTML = value
  return el.value
}

function hydrateFormulaHtml(html) {
  if (!html || typeof html !== 'string' || !html.includes('ql-formula') || !window.katex) {
    return html
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  let changed = false

  doc.querySelectorAll('.ql-formula').forEach((el) => {
    const rawValue = el.getAttribute('data-value')
    if (!rawValue) return

    const hasRenderedContent = el.querySelector('.katex-html, .katex-mathml, math')
    if (hasRenderedContent && el.textContent.trim()) return

    const value = decodeHtmlEntities(rawValue)
    el.innerHTML = ''
    window.katex.render(value, el, getKatexRenderConfig())
    changed = true
  })

  return changed ? doc.body.innerHTML : html
}

function walkMindMapNodes(node, fn) {
  if (!node) return
  fn(node)
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => walkMindMapNodes(child, fn))
  }
}

function hydrateAllFormulaNodes() {
  if (!mindMap?.renderer?.root) return false

  let changed = false
  walkMindMapNodes(mindMap.renderer.root, (node) => {
    const data = node.getData()
    if (!data?.richText || !data.text?.includes?.('ql-formula')) return
    const fixed = hydrateFormulaHtml(data.text)
    if (fixed !== data.text) {
      node.setData({ text: fixed, resetRichText: true })
      changed = true
    }
  })

  if (changed) mindMap.render()
  return changed
}

function showFormulaDialog(onConfirm) {
  if (!formulaDialogEl || !formulaInputEl) return
  formulaDialogCallback = onConfirm
  formulaInputEl.value = ''
  formulaDialogEl.classList.remove('hidden')
  formulaInputEl.focus()
}

function hideFormulaDialog() {
  if (!formulaDialogEl) return
  formulaDialogEl.classList.add('hidden')
  formulaInputEl.value = ''
  formulaDialogCallback = null
}

function confirmFormulaDialog() {
  const latex = formulaInputEl?.value?.trim()
  if (!latex) {
    formulaInputEl?.focus()
    return
  }
  const callback = formulaDialogCallback
  hideFormulaDialog()
  callback?.(latex)
}

function initFormulaUi() {
  formulaConfirmBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    confirmFormulaDialog()
  })

  formulaCancelBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    hideFormulaDialog()
  })

  formulaDialogEl?.addEventListener('click', (e) => {
    if (e.target === formulaDialogEl) hideFormulaDialog()
  })

  formulaInputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmFormulaDialog()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      hideFormulaDialog()
    }
  })
}

initFormulaUi()

const SHORTCUT_GUARD_SELECTOR =
  '#sidePanel, #searchPanel, #formulaDialog, .formula-dialog-panel'

function getShortcutEventElement(e) {
  if (e?.target instanceof HTMLElement) return e.target
  if (document.activeElement instanceof HTMLElement) return document.activeElement
  return null
}

function isInsideShortcutGuard(el) {
  return el instanceof HTMLElement && !!el.closest(SHORTCUT_GUARD_SELECTOR)
}

function isOnEditNodeElement(el) {
  if (!(el instanceof HTMLElement) || !mindMap) return false
  const editClasses = mindMap.editNodeClassList || []
  for (const cls of editClasses) {
    if (el.classList.contains(cls)) return true
    if (el.closest(`.${cls}`)) return true
  }
  return false
}

function shouldEnableMindMapShortcut(e) {
  const el = getShortcutEventElement(e)
  if (!el) return false
  // Inline edit: library registers Enter/Tab tmp shortcuts after save()
  if (isOnEditNodeElement(el)) return true
  if (isInsideShortcutGuard(el)) return false
  if (el.matches('input, textarea, select')) return false

  if (el === document.body) return true
  return false
}

function releaseMindMapShortcutsIfSafe() {
  if (!mindMap?.keyCommand) return
  if (isInsideShortcutGuard(document.activeElement)) return
  mindMap.keyCommand.recovery()
}

function bindShortcutGuards() {
  ;[sidePanel, searchPanel, formulaDialogEl].filter(Boolean).forEach((root) => {
    root.addEventListener('focusout', () => {
      // relatedTarget is often null when clicking the canvas; defer to activeElement
      setTimeout(() => releaseMindMapShortcutsIfSafe(), 0)
    })
  })
}

bindShortcutGuards()

// ===== Mind Map Init =====
function initMindMap(data, config) {
  const container = $('mindMapContainer')
  if (mindMap) {
    mindMap.destroy()
    mindMap = null
  }

  const fullData = normalizeMindMapData(data)

  const doInit = () => {
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      requestAnimationFrame(doInit)
      return
    }

    try {
      const themeTemplate = (fullData.theme && fullData.theme.template) || 'default'
      const hasSavedView = isValidView(fullData.view)
      const shouldFit = !hasSavedView && (config?.autoFit !== false)
      mindMap = new MindMap({
        el: container,
        data: fullData.root,
        layout: fullData.layout || 'logicalStructure',
        theme: themeTemplate,
        themeConfig: (fullData.theme && fullData.theme.config) || {},
        viewData: hasSavedView ? fullData.view : null,
        rainbowLinesConfig: getRainbowLinesConfig(fullData),
        fit: shouldFit,
        readonly: false,
        enableShortcutOnlyWhenMouseInSvg: false,
        customCheckEnableShortcut: shouldEnableMindMapShortcut,
        enableAutoEnterTextEditWhenKeydown: false,
        openRealtimeRenderOnNodeTextEdit: true,
        enableEditFormulaInRichTextEdit: true,
        katexFontPath: config?.katexFontPath || '',
        getKatexOutputType: () => 'html',
        scaleRatio: 0.06,
        ...getMindMapLocaleOptions(),
        errorHandler: (code, err) => {
          console.error('MindMap error:', code, err)
          vscode.postMessage({ type: 'error', text: t('error.initFailed', { message: err?.message || code }) })
        },
        customHandleMousewheel: (e) => {
          e.preventDefault()
          if (e.ctrlKey) {
            if (e.deltaY > 0) {
              mindMap.view.narrow()
            } else if (e.deltaY < 0) {
              mindMap.view.enlarge()
            }
          } else {
            const factor = 0.5
            mindMap.view.translateX(-e.deltaX * factor)
            mindMap.view.translateY(-e.deltaY * factor)
          }
        },
      })
    } catch (err) {
      console.error('MindMap init failed:', err)
      vscode.postMessage({ type: 'error', text: t('error.initFailed', { message: err.message }) })
      return
    }

    setCurrentLayout(fullData.layout || 'logicalStructure')
    setCurrentTheme((fullData.theme && fullData.theme.template) || 'default')
    setRainbowLinesState(getRainbowLinesConfig(fullData))

    bindMindMapEvents()
    patchDragDropPreview()
    updateStatusBar()
    updateThemePanel()
    updateSidePanel()
    requestAnimationFrame(() => hydrateAllFormulaNodes())

    // Record the initial state so we don't trigger false dirty
    setTimeout(() => {
      if (mindMap) {
        lastSyncedJSON = JSON.stringify(buildDocumentSnapshot(getDocumentData()))
      }
    }, 100)
  }

  doInit()
}

// simple-mind-map 默认把放置目标检测节流到 300ms，占位预览会明显滞后
function patchDragDropPreview() {
  if (!mindMap?.drag) return

  const drag = mindMap.drag
  const detectDropTarget = Drag.prototype.checkOverlapNode
  let rafId = 0

  drag.checkOverlapNode = function scheduleDropTargetCheck() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      detectDropTarget.call(drag)
    })
  }
}

let inlineEditSidePanelTimer = null

function bindMindMapEvents() {
  mindMap.on('data_change', onDataChange)
  mindMap.on('view_data_change', onViewChange)
  mindMap.on('scale', onScaleChange)
  mindMap.on('node_active', onNodeActive)
  mindMap.on('node_contextmenu', onNodeContextMenu)
  mindMap.on('before_show_text_edit', () => {
    const node = mindMap.richText?.node
    if (node && document.activeElement !== nodeText) {
      const plain = getPlainTextForNode(node)
      nodeText.value = plain
    }
  })
  mindMap.on('node_text_edit_change', ({ node, text, richText }) => {
    if (!richText || document.activeElement === nodeText) return
    if (activeNodes.length !== 1 || activeNodes[0] !== node) return
    clearTimeout(inlineEditSidePanelTimer)
    inlineEditSidePanelTimer = setTimeout(() => {
      nodeText.value = convertRichHtmlToPlainSource(text)
    }, 100)
  })
  mindMap.on('hide_text_edit', (_el, nodes) => {
    // Inline edit ends while focus may still be on .ql-editor; always unpause.
    requestAnimationFrame(() => {
      mindMap.keyCommand.recovery()
    })
    syncTextInputFromNodes(nodes)
    if (activeNodes.length === 1) {
      syncNodeTextInputField(true)
    }
  })
  mindMap.on('draw_click', () => {
    hideContextMenu()
    releaseMindMapShortcutsIfSafe()
  })
  mindMap.on('expand_btn_click', updateStatusBar)

  mindMap.on('search_info_change', (data) => {
    if (data) {
      searchCount.textContent = data.currentIndex > -1
        ? `${data.currentIndex + 1}/${data.total}`
        : t('search.results', { count: data.total })
    } else {
      searchCount.textContent = ''
    }
  })
}

function buildDocumentSnapshot(data) {
  const normalized = normalizeMindMapData(data)
  return {
    layout: normalized.layout,
    root: normalized.root,
    theme: normalized.theme,
    rainbowLinesConfig: normalized.rainbowLinesConfig,
  }
}

function flushEdit() {
  clearTimeout(debounceTimer)
  if (!mindMap) return
  if (syncDocumentFromMindMap()) {
    updateStatusBar()
  }
  hasPendingEdit = false
}

function onDataChange() {
  scheduleDocumentSync()
}

function onViewChange(viewData) {
  clearTimeout(viewDebounceTimer)
  viewDebounceTimer = setTimeout(() => {
    vscode.postMessage({ type: 'viewChange', view: viewData })
  }, 200)
}

function scheduleDocumentSync() {
  hasPendingEdit = true
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flushEdit, 200)
}

function onScaleChange(scale) {
  const pct = Math.round(scale * 100)
  toolbar.zoomLevel.textContent = pct + '%'
  updateStatusBarI18n(undefined, pct)
}

function syncTextInputFromNodes(nodes) {
  if (!mindMap || !nodes?.length) return
  nodes.forEach((node) => {
    mindMap.execCommand('SET_NODE_DATA', node, {
      textInput: getPlainTextForNode(node),
    })
  })
}

function onNodeActive(node, activeNodeList) {
  if (document.activeElement === nodeText && activeNodes.length === 1) {
    applySidePanelNodeText(activeNodes[0], nodeText.value)
  }
  activeNodes = activeNodeList || []
  updateSidePanel()
  if (activeNodes.length === 1) {
    switchSidePanelTab('node')
  }
  if (document.activeElement === nodeText) {
    nodeText.blur()
  }
}

// ===== Toolbar Actions =====
toolbar.undo.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('BACK')
})

toolbar.redo.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('FORWARD')
})

toolbar.addChild.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('INSERT_CHILD_NODE')
})

toolbar.addSibling.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('INSERT_NODE')
})

toolbar.delete.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('REMOVE_NODE')
})

toolbar.painter.addEventListener('click', () => {
  if (!mindMap) return
  isPainterMode = !isPainterMode
  toolbar.painter.classList.toggle('active', isPainterMode)
  if (isPainterMode) {
    mindMap.painter.startPainter()
  } else {
    mindMap.painter.endPainter()
  }
})

toolbar.search.addEventListener('click', toggleSearch)

toolbar.zoomIn.addEventListener('click', () => {
  if (mindMap) mindMap.view.enlarge()
})

toolbar.zoomOut.addEventListener('click', () => {
  if (mindMap) mindMap.view.narrow()
})

toolbar.fit.addEventListener('click', () => {
  if (mindMap) mindMap.view.fit()
})

toolbar.expandAll.addEventListener('click', () => {
  if (mindMap) mindMap.execCommand('EXPAND_ALL')
})

toolbar.collapseAll.addEventListener('click', () => {
  collapseAllNodes()
})

function collapseAllNodes() {
  if (!mindMap) return
  // UNEXPAND_ALL defaults to setRootNodeCenter(); pass false to keep current view
  mindMap.execCommand('UNEXPAND_ALL', false)
}

function positionDropdownMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect()
  menu.style.top = `${rect.bottom + 2}px`
  menu.style.left = `${rect.left}px`
}

function closeToolbarMenus(except) {
  if (toolbar.exportMenu !== except) toolbar.exportMenu.classList.remove('show')
}

// Export dropdown
function positionExportMenu() {
  positionDropdownMenu(toolbar.exportMenu, toolbar.exportBtn)
}

toolbar.exportBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  const willShow = !toolbar.exportMenu.classList.contains('show')
  closeToolbarMenus(willShow ? toolbar.exportMenu : null)
  if (willShow) positionExportMenu()
  toolbar.exportMenu.classList.toggle('show', willShow)
})

document.addEventListener('click', () => {
  closeToolbarMenus()
})

toolbar.exportMenu.addEventListener('click', (e) => {
  e.stopPropagation()
  const item = e.target.closest('.dropdown-item')
  if (!item) return
  const format = item.dataset.format
  handleExport(format)
  toolbar.exportMenu.classList.remove('show')
})

// Sidebar toggle
function syncMindMapLayoutAfterSidePanelToggle() {
  requestAnimationFrame(() => {
    if (mindMap) mindMap.resize()
  })
}

toolbar.sidebarToggle.addEventListener('click', () => {
  sidePanel.classList.toggle('hidden')
  toolbar.sidebarToggle.classList.toggle('active', !sidePanel.classList.contains('hidden'))
  syncMindMapLayoutAfterSidePanelToggle()
})

$('btn-close-panel').addEventListener('click', () => {
  sidePanel.classList.add('hidden')
  toolbar.sidebarToggle.classList.remove('active')
  syncMindMapLayoutAfterSidePanelToggle()
})

// ===== Export =====
async function handleExport(format) {
  if (!mindMap) return

  if (format === 'json') {
    const data = mindMap.getData(true)
    vscode.postMessage({ type: 'export', format: 'json' })
    return
  }

  if (format === 'png') {
    try {
      const dataUrl = await mindMap.doExport.export('png', false, 'mind-map')
      vscode.postMessage({ type: 'export', format: 'png', dataUrl })
    } catch (err) {
      vscode.postMessage({ type: 'error', text: t('error.pngExportFailed', { message: err.message }) })
    }
    return
  }

  if (format === 'svg') {
    try {
      const svgContent = await mindMap.doExport.export('svg', false, 'mind-map')
      vscode.postMessage({ type: 'export', format: 'svg', svgContent })
    } catch (err) {
      vscode.postMessage({ type: 'error', text: t('error.svgExportFailed', { message: err.message }) })
    }
  }
}

// ===== Search =====
function toggleSearch() {
  searchPanel.classList.toggle('hidden')
  if (!searchPanel.classList.contains('hidden')) {
    searchInput.focus()
    searchInput.select()
  } else {
    if (mindMap) mindMap.search.endSearch()
    searchCount.textContent = ''
  }
}

searchInput.addEventListener('input', () => {
  if (!mindMap) return
  const keyword = searchInput.value
  if (keyword) {
    mindMap.search.search(keyword)
  } else {
    mindMap.search.endSearch()
    searchCount.textContent = ''
  }
})

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      mindMap.search.searchPrev()
    } else {
      mindMap.search.searchNext()
    }
  }
  if (e.key === 'Escape') {
    toggleSearch()
  }
})

$('btn-search-prev').addEventListener('click', () => {
  if (mindMap) mindMap.search.searchPrev()
})

$('btn-search-next').addEventListener('click', () => {
  if (mindMap) mindMap.search.searchNext()
})

$('btn-replace').addEventListener('click', () => {
  if (!mindMap || !replaceInput.value) return
  mindMap.search.replace(replaceInput.value)
})

$('btn-replace-all').addEventListener('click', () => {
  if (!mindMap || !replaceInput.value) return
  mindMap.search.replaceAll(replaceInput.value)
})

$('btn-search-close').addEventListener('click', toggleSearch)

// ===== Side Panel =====
function parseColorChannels(color) {
  if (!color || color === 'transparent' || color === 'none') return null
  if (typeof color !== 'string') return null

  if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map((char) => char + char).join('')
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const a = parseInt(hex.slice(6, 8), 16) / 255
      return { r, g, b, a }
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      }
    }
    return null
  }

  const rgbaMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
    }
  }

  const tmp = document.createElement('div')
  tmp.style.color = color
  document.body.appendChild(tmp)
  const computed = window.getComputedStyle(tmp).color
  document.body.removeChild(tmp)
  const computedMatch = computed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i)
  if (!computedMatch) return null
  return {
    r: Number(computedMatch[1]),
    g: Number(computedMatch[2]),
    b: Number(computedMatch[3]),
    a: computedMatch[4] === undefined ? 1 : Number(computedMatch[4]),
  }
}

function channelsToHex({ r, g, b }) {
  const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function colorToHexInputValue(color, fallback = '#fafafa', blendBackground = null) {
  const parsed = parseColorChannels(color)
  if (!parsed) return fallback

  let { r, g, b, a } = parsed
  if (a < 1) {
    const bg = parseColorChannels(blendBackground) || parseColorChannels(fallback)
    if (bg) {
      r = r * a + bg.r * (1 - a)
      g = g * a + bg.g * (1 - a)
      b = b * a + bg.b * (1 - a)
    }
  }

  return channelsToHex({ r, g, b })
}

function parseColorForPanel(color, fallbackHex) {
  if (!color || color === 'transparent' || color === 'none') {
    return { hex: fallbackHex, opacity: 0 }
  }
  const parsed = parseColorChannels(color)
  if (!parsed) {
    return { hex: fallbackHex, opacity: 100 }
  }
  return {
    hex: channelsToHex(parsed),
    opacity: Math.round(parsed.a * 100),
  }
}

function formatColorWithOpacity(hex, opacityPercent, options = {}) {
  const { useTransparentAtZero = false } = options
  const opacity = Math.max(0, Math.min(100, Number(opacityPercent) || 0))
  if (opacity === 0 && useTransparentAtZero) return 'transparent'
  if (opacity === 100) return hex
  const parsed = parseColorChannels(hex)
  if (!parsed) return hex
  const alpha = Math.round(opacity) / 100
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`
}

function updateOpacityLabel(input) {
  const label = document.getElementById(`${input.id}-value`)
  if (label) label.textContent = `${input.value}%`
}

const THEME_PANEL_CONFIG_KEYS = [
  'backgroundColor',
  'backgroundImage',
  'backgroundRepeat',
  'backgroundPosition',
  'backgroundSize',
  'lineWidth',
  'generalizationLineWidth',
]

function switchSidePanelTab(tab) {
  if (!sidePanelPages[tab]) return
  currentSidePanelTab = tab
  sidePanelTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === tab)
  })
  Object.entries(sidePanelPages).forEach(([name, page]) => {
    page?.classList.toggle('active', name === tab)
  })
}

function resetThemePanelSettings() {
  if (!mindMap) return
  const themeName = mindMap.getTheme()
  const custom = { ...mindMap.getCustomThemeConfig() }
  for (const key of THEME_PANEL_CONFIG_KEYS) {
    delete custom[key]
  }
  mindMap.setThemeConfig(custom)
  mindMap.setTheme(themeName)
  applyRainbowLinesConfig({ open: false, colorsList: [] })
  updateThemePanel()
  syncDocumentFromMindMap()
}

function resetNodePanelSettings() {
  if (!mindMap || activeNodes.length !== 1) return
  const node = activeNodes[0]
  mindMap.execCommand('REMOVE_CUSTOM_STYLES', node)
  mindMap.execCommand('SET_NODE_NOTE', node, '')
  mindMap.execCommand('SET_NODE_HYPERLINK', node, '', '')
  mindMap.execCommand('SET_NODE_TAG', node, [])
  mindMap.execCommand('SET_NODE_DATA', node, { comment: '' })
  updateSidePanel()
  syncDocumentFromMindMap()
}

function setNodePanelFieldsEnabled(enabled) {
  const fields = [
    nodeText,
    nodeNote,
    nodeComment,
    nodeLink,
    nodeLinkTitle,
    nodeTagInput,
    nodeShape,
    nodeColor,
    nodeColorOpacity,
    nodeBgColor,
    nodeBgOpacity,
    nodeFontSize,
  ]
  for (const field of fields) {
    if (field) field.disabled = !enabled
  }
  if (resetNodeBtn) resetNodeBtn.disabled = !enabled
}

function updateThemePanel() {
  renderThemeSelect()
  renderLayoutSelect()
  updateCanvasSettingsPanel()
}

function updateCanvasSettingsPanel() {
  if (!mindMap || !lineWidthInput) return
  lineWidthInput.value = mindMap.getThemeConfig('lineWidth')
  if (canvasBgColor) {
    canvasBgColor.value = colorToHexInputValue(
      mindMap.getThemeConfig('backgroundColor'),
      '#fafafa',
    )
  }
  if (mindMap.opt?.rainbowLinesConfig) {
    setRainbowLinesState(mindMap.opt.rainbowLinesConfig)
  } else {
    renderRainbowSelect()
  }
}

function setCanvasBackgroundColor(color) {
  if (!mindMap || !color || color === 'transparent') return
  mindMap.setThemeConfig({
    ...mindMap.getCustomThemeConfig(),
    backgroundColor: color,
  })
  syncDocumentFromMindMap()
}

function setLineWidth(width) {
  if (!mindMap) return
  const normalized = Math.max(1, Math.min(10, Number(width) || 1))
  if (lineWidthInput) lineWidthInput.value = normalized
  mindMap.setThemeConfig({
    ...mindMap.getCustomThemeConfig(),
    lineWidth: normalized,
    generalizationLineWidth: normalized,
  })
  syncDocumentFromMindMap()
}

function updateSidePanel() {
  const hasSingleNode = activeNodes.length === 1
  if (nodePanelEmpty) {
    nodePanelEmpty.classList.toggle('hidden', hasSingleNode)
  }
  if (nodePanelContent) {
    nodePanelContent.classList.toggle('hidden', !hasSingleNode)
  }
  setNodePanelFieldsEnabled(hasSingleNode)

  if (!hasSingleNode) {
    nodeText.value = ''
    nodeNote.value = ''
    nodeComment.value = ''
    nodeLink.value = ''
    nodeLinkTitle.value = ''
    nodeTagsEl.innerHTML = ''
    nodeShape.value = ''
    return
  }

  const node = activeNodes[0]
  const data = node.getData()

  syncNodeTextInputField()
  nodeNote.value = data.note || ''
  nodeComment.value = data.comment || ''
  nodeLink.value = data.hyperlink || ''
  nodeLinkTitle.value = data.hyperlinkTitle || ''
  nodeShape.value = data.shape || ''

  // Tags
  renderTags(data.tag || [])

  // Style — show effective colors and separate opacity controls
  const canvasBgHex = colorToHexInputValue(mindMap?.getThemeConfig('backgroundColor'), '#ffffff')
  const fontState = parseColorForPanel(node.getStyle('color'), '#333333')
  const bgState = parseColorForPanel(node.getStyle('fillColor'), canvasBgHex)
  nodeColor.value = fontState.hex
  nodeColorOpacity.value = fontState.opacity
  updateOpacityLabel(nodeColorOpacity)
  nodeBgColor.value = bgState.hex
  nodeBgOpacity.value = bgState.opacity
  updateOpacityLabel(nodeBgOpacity)
  nodeFontSize.value = node.getStyle('fontSize') || 14
}

function renderTags(tags) {
  nodeTagsEl.innerHTML = ''
  tags.forEach((tag, i) => {
    const el = document.createElement('span')
    el.className = 'tag-item'
    el.innerHTML = `${tag}<span class="tag-remove" data-index="${i}">&times;</span>`
    nodeTagsEl.appendChild(el)
  })
}

// Side panel event listeners
let sidePanelDebounce = null

function bindSidePanelField(el, eventName, handler) {
  el?.addEventListener(eventName, handler)
}

bindSidePanelField(nodeText, 'input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    applySidePanelNodeText(activeNodes[0], nodeText.value)
  }, 300)
})

bindSidePanelField(nodeText, 'blur', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  applySidePanelNodeText(activeNodes[0], nodeText.value)
})

bindSidePanelField(nodeNote, 'input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    mindMap.execCommand('SET_NODE_NOTE', activeNodes[0], nodeNote.value)
  }, 300)
})

bindSidePanelField(nodeComment, 'input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    mindMap.execCommand('SET_NODE_DATA', activeNodes[0], { comment: nodeComment.value })
  }, 300)
})

bindSidePanelField(nodeLink, 'change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_HYPERLINK', activeNodes[0], nodeLink.value, nodeLinkTitle.value)
})

bindSidePanelField(nodeLinkTitle, 'change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_HYPERLINK', activeNodes[0], nodeLink.value, nodeLinkTitle.value)
})

bindSidePanelField(nodeTagInput, 'keydown', (e) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const tag = nodeTagInput.value.trim()
  if (!tag || !mindMap || activeNodes.length !== 1) return
  const current = activeNodes[0].getData().tag || []
  mindMap.execCommand('SET_NODE_TAG', activeNodes[0], [...current, tag])
  nodeTagInput.value = ''
  updateSidePanel()
})

bindSidePanelField(nodeTagsEl, 'click', (e) => {
  const removeBtn = e.target.closest('.tag-remove')
  if (!removeBtn || !mindMap || activeNodes.length !== 1) return
  const index = parseInt(removeBtn.dataset.index)
  const current = activeNodes[0].getData().tag || []
  current.splice(index, 1)
  mindMap.execCommand('SET_NODE_TAG', activeNodes[0], current)
  updateSidePanel()
})

bindSidePanelField(nodeShape, 'change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_SHAPE', activeNodes[0], nodeShape.value)
})

bindSidePanelField(nodeColor, 'input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  const color = formatColorWithOpacity(nodeColor.value, nodeColorOpacity.value)
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'color', color)
})

bindSidePanelField(nodeColorOpacity, 'input', () => {
  updateOpacityLabel(nodeColorOpacity)
  if (!mindMap || activeNodes.length !== 1) return
  const color = formatColorWithOpacity(nodeColor.value, nodeColorOpacity.value)
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'color', color)
})

bindSidePanelField(nodeBgColor, 'input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  const color = formatColorWithOpacity(nodeBgColor.value, nodeBgOpacity.value, {
    useTransparentAtZero: true,
  })
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'fillColor', color)
})

bindSidePanelField(nodeBgOpacity, 'input', () => {
  updateOpacityLabel(nodeBgOpacity)
  if (!mindMap || activeNodes.length !== 1) return
  const color = formatColorWithOpacity(nodeBgColor.value, nodeBgOpacity.value, {
    useTransparentAtZero: true,
  })
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'fillColor', color)
})

bindSidePanelField(nodeFontSize, 'change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'fontSize', parseInt(nodeFontSize.value))
})

bindSidePanelField(lineWidthInput, 'change', () => {
  setLineWidth(lineWidthInput.value)
})

bindSidePanelField(lineWidthInput, 'input', () => {
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    setLineWidth(lineWidthInput.value)
  }, 300)
})

canvasBgColor?.addEventListener('input', () => {
  setCanvasBackgroundColor(canvasBgColor.value)
})

bindSidePanelField(themeSelect, 'change', () => {
  applyTheme(themeSelect.value)
})

bindSidePanelField(rainbowLinesSelect, 'change', () => {
  selectRainbowPreset(rainbowLinesSelect.value)
})

bindSidePanelField(layoutSelect, 'change', () => {
  applyLayout(layoutSelect.value)
})

for (const tabButton of sidePanelTabs) {
  tabButton.addEventListener('click', () => {
    switchSidePanelTab(tabButton.dataset.panel)
  })
}

resetNodeBtn?.addEventListener('click', resetNodePanelSettings)
resetThemeBtn?.addEventListener('click', resetThemePanelSettings)

// ===== Context Menu =====
function onNodeContextMenu(e, node) {
  e.preventDefault()
  e.stopPropagation()
  showNodeContextMenu(e.clientX, e.clientY, node)
}

function hideContextMenu() {
  contextMenuEl.style.display = 'none'
  contextMenuEl.innerHTML = ''
}

function createMenuItem(label, onClick, hasSubmenu) {
  const item = document.createElement('div')
  item.className = 'context-menu-item'
  item.textContent = label
  if (hasSubmenu) {
    const arrow = document.createElement('span')
    arrow.className = 'submenu-arrow'
    arrow.textContent = '▶'
    item.appendChild(arrow)
  }
  if (onClick) {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
      hideContextMenu()
    })
  }
  return item
}

function createSeparator() {
  const sep = document.createElement('div')
  sep.className = 'context-menu-separator'
  return sep
}

function createSubmenu(items) {
  const sub = document.createElement('div')
  sub.className = 'context-menu'
  items.forEach(({ label, onClick }) => {
    sub.appendChild(createMenuItem(label, onClick, false))
  })
  return sub
}

function showNodeContextMenu(x, y, node) {
  contextMenuEl.innerHTML = ''

  contextMenuEl.appendChild(createMenuItem(t('context.addChild'), () => {
    mindMap.execCommand('INSERT_CHILD_NODE')
  }))

  if (!node.isRoot) {
    contextMenuEl.appendChild(createMenuItem(t('context.addSibling'), () => {
      mindMap.execCommand('INSERT_NODE')
    }))
    contextMenuEl.appendChild(createMenuItem(t('context.addParent'), () => {
      mindMap.execCommand('INSERT_PARENT_NODE')
    }))
  }

  contextMenuEl.appendChild(createSeparator())

  const hasChildren = node.children && node.children.length > 0
  if (hasChildren) {
    const isExpanded = node.getData('expand') !== false
    contextMenuEl.appendChild(createMenuItem(isExpanded ? t('context.collapseChildren') : t('context.expandChildren'), () => {
      mindMap.execCommand('SET_NODE_EXPAND', node, !isExpanded)
    }))
  }

  contextMenuEl.appendChild(createMenuItem(t('context.moveUp'), () => {
    mindMap.execCommand('UP_NODE')
  }))
  contextMenuEl.appendChild(createMenuItem(t('context.moveDown'), () => {
    mindMap.execCommand('DOWN_NODE')
  }))

  if (!node.isRoot) {
    contextMenuEl.appendChild(createSeparator())
    contextMenuEl.appendChild(createMenuItem(t('context.deleteNode'), () => {
      mindMap.execCommand('REMOVE_NODE')
    }))
  }

  contextMenuEl.appendChild(createSeparator())

  contextMenuEl.appendChild(createMenuItem(t('context.insertFormula'), () => {
    showFormulaDialog((latex) => insertFormulaToNode(node, latex))
  }))

  contextMenuEl.appendChild(createMenuItem(t('context.addSummary'), () => {
    mindMap.execCommand('ADD_GENERALIZATION')
  }))

  const shapeItem = createMenuItem(t('context.nodeShape'), null, true)
  const shapeSubmenu = createSubmenu(
    getShapeOptions()
      .filter((opt) => opt.value)
      .map(({ value, label }) => ({
        label,
        onClick: () => mindMap.execCommand('SET_NODE_SHAPE', node, value),
      }))
  )
  shapeItem.appendChild(shapeSubmenu)
  contextMenuEl.appendChild(shapeItem)

  positionAndShowMenu(x, y)
}

function showCanvasContextMenu(x, y) {
  contextMenuEl.innerHTML = ''

  contextMenuEl.appendChild(createMenuItem(t('context.fitCanvas'), () => {
    mindMap.view.fit()
  }))

  contextMenuEl.appendChild(createSeparator())

  contextMenuEl.appendChild(createMenuItem(t('context.expandAll'), () => {
    mindMap.execCommand('EXPAND_ALL')
  }))

  contextMenuEl.appendChild(createMenuItem(t('context.collapseAll'), () => {
    collapseAllNodes()
  }))

  contextMenuEl.appendChild(createMenuItem(t('context.collapseToLevel1'), () => {
    mindMap.execCommand('UNEXPAND_TO_LEVEL', 1)
  }))

  contextMenuEl.appendChild(createSeparator())

  const layoutItem = createMenuItem(t('context.switchLayout'), null, true)
  const layoutSubmenu = createSubmenu(
    getLayoutOptions().map((opt) => ({
      label: opt.label,
      onClick: () => applyLayout(opt.value),
    }))
  )
  layoutItem.appendChild(layoutSubmenu)
  contextMenuEl.appendChild(layoutItem)

  const themeItem = createMenuItem(t('context.switchTheme'), null, true)
  const themeSubmenu = createSubmenu(
    getThemeGroups().flatMap((group) => group.themes).map((theme) => ({
      label: theme.label,
      onClick: () => applyTheme(theme.value),
    }))
  )
  themeItem.appendChild(themeSubmenu)
  contextMenuEl.appendChild(themeItem)

  const rainbowItem = createMenuItem(t('context.rainbowLines'), null, true)
  const rainbowSubmenu = createSubmenu([
    { label: t('rainbow.off'), onClick: () => selectRainbowPreset('close') },
    ...getRainbowLinePresets().map((preset) => ({
      label: preset.label,
      onClick: () => selectRainbowPreset(preset.id),
    })),
  ])
  rainbowItem.appendChild(rainbowSubmenu)
  contextMenuEl.appendChild(rainbowItem)

  contextMenuEl.appendChild(createSeparator())

  contextMenuEl.appendChild(createMenuItem(t('context.resetLayout'), () => {
    mindMap.execCommand('RESET_LAYOUT')
  }))

  positionAndShowMenu(x, y)
}

function positionAndShowMenu(x, y) {
  contextMenuEl.style.display = 'block'
  contextMenuEl.style.left = x + 'px'
  contextMenuEl.style.top = y + 'px'

  const rect = contextMenuEl.getBoundingClientRect()
  if (rect.right > window.innerWidth) {
    contextMenuEl.style.left = window.innerWidth - rect.width - 4 + 'px'
  }
  if (rect.bottom > window.innerHeight) {
    contextMenuEl.style.top = window.innerHeight - rect.height - 4 + 'px'
  }
}

document.addEventListener('click', hideContextMenu)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideContextMenu()
})
document.addEventListener('contextmenu', (e) => {
  if (!mindMap) return
  const container = $('mindMapContainer')
  if (container.contains(e.target)) {
    e.preventDefault()
    showCanvasContextMenu(e.clientX, e.clientY)
  }
})

// ===== Status Bar =====
function updateStatusBar() {
  if (!mindMap) return
  try {
    const data = mindMap.getData(false)
    const count = countNodes(data)
    const pct = Math.round(mindMap.view.scale * 100)
    updateStatusBarI18n(count, pct)
  } catch (e) {
    // not ready
  }
}

function countNodes(node) {
  if (!node) return 0
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  return count
}

function applyLanguage(language) {
  setLocale(language)
  applyDomI18n()
  renderThemeSelect()
  renderLayoutSelect()
  renderRainbowSelect()
  if (mindMap) {
    mindMap.updateConfig(getMindMapLocaleOptions())
    updateStatusBar()
  }
}

// ===== VS Code Messages =====
window.addEventListener('message', (event) => {
  const message = event.data
  switch (message.type) {
    case 'init':
      if (message.config?.language) applyLanguage(message.config.language)
      initMindMap(message.data, message.config)
      break
    case 'update': {
      const fullData = normalizeMindMapData(message.data)
      if (mindMap) {
        const incoming = JSON.stringify(buildDocumentSnapshot(fullData))
        if (incoming === lastSyncedJSON) break
        lastSyncedJSON = incoming
        mindMap.setFullData(fullData)
        applyRainbowLinesConfig(fullData.rainbowLinesConfig)
        setCurrentLayout(fullData.layout || 'logicalStructure')
        setCurrentTheme((fullData.theme && fullData.theme.template) || 'default')
        updateThemePanel()
        updateStatusBar()
        requestAnimationFrame(() => hydrateAllFormulaNodes())
      } else {
        initMindMap(fullData, message.config)
      }
      break
    }
    case 'themeChanged':
      // Could adapt mind map colors to VS Code theme
      break
    case 'languageChanged':
      applyLanguage(message.language)
      break
    case 'command':
      handleCommand(message.command)
      break
  }
})

function handleCommand(command) {
  if (!mindMap) return
  switch (command) {
    case 'mindMap.exportPng':
      handleExport('png')
      break
    case 'mindMap.exportSvg':
      handleExport('svg')
      break
    case 'mindMap.exportJson':
      handleExport('json')
      break
    case 'mindMap.fitCanvas':
      mindMap.view.fit()
      break
    case 'mindMap.zoomIn':
      mindMap.view.enlarge()
      break
    case 'mindMap.zoomOut':
      mindMap.view.narrow()
      break
    case 'mindMap.expandAll':
      mindMap.execCommand('EXPAND_ALL')
      break
    case 'mindMap.collapseAll':
      collapseAllNodes()
      break
    case 'mindMap.search':
      toggleSearch()
      break
  }
}

// ===== Window Resize =====
window.addEventListener('resize', () => {
  if (mindMap) {
    mindMap.resize()
  }
  if (toolbar.exportMenu.classList.contains('show')) {
    positionExportMenu()
  }
})

// ===== Flush on Save (Cmd+S / Ctrl+S) =====
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    if (hasPendingEdit) {
      flushEdit()
    }
  }
})

// ===== Init =====
toolbar.sidebarToggle.classList.add('active')
vscode.postMessage({ type: 'ready' })
