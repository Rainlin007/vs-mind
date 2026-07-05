import MindMap from 'simple-mind-map'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
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

registerThemes(MindMap)

MindMap.usePlugin(Drag)
  .usePlugin(Select)
  .usePlugin(KeyboardNavigation)
  .usePlugin(RichText)
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

function normalizeMindMapData(data) {
  if (isValidMindMapData(data)) {
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
      theme: data.theme || DEFAULT_MIND_MAP_DATA.theme,
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

function setCurrentLayout(value) {
  currentLayout = value
  toolbar.layoutMenu.querySelectorAll('.dropdown-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.layout === value)
  })
}

function setCurrentTheme(value) {
  currentTheme = value
  toolbar.themeMenu.querySelectorAll('.dropdown-item[data-theme]').forEach((item) => {
    item.classList.toggle('active', item.dataset.theme === value)
  })
}

function renderThemeMenu() {
  toolbar.themeMenu.innerHTML = ''
  for (const group of getThemeGroups()) {
    const label = document.createElement('div')
    label.className = 'dropdown-group-label'
    label.textContent = group.label
    toolbar.themeMenu.appendChild(label)

    for (const theme of group.themes) {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      item.dataset.theme = theme.value
      item.textContent = theme.label
      if (theme.value === currentTheme) item.classList.add('active')
      toolbar.themeMenu.appendChild(item)
    }
  }
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

function setRainbowLinesOpen(open) {
  rainbowLinesOpen = open
  if (toolbar.rainbowLines) {
    toolbar.rainbowLines.classList.toggle('active', open)
  }
}

function applyRainbowLinesConfig(config) {
  if (!mindMap) return
  const normalized = getRainbowLinesConfig({ rainbowLinesConfig: config })
  if (mindMap.rainbowLines) {
    mindMap.rainbowLines.updateRainLinesConfig(normalized)
  } else {
    mindMap.updateConfig({ rainbowLinesConfig: normalized })
  }
  setRainbowLinesOpen(normalized.open)
}

function toggleRainbowLines() {
  if (!mindMap || !mindMap.rainbowLines) return
  const { rainbowLinesConfig } = mindMap.opt
  applyRainbowLinesConfig({
    open: !rainbowLinesOpen,
    colorsList: rainbowLinesConfig?.colorsList || [],
  })
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
  rainbowLines: $('btn-rainbow-lines'),
  search: $('btn-search'),
  layoutBtn: $('btn-layout'),
  layoutMenu: $('layout-menu'),
  themeBtn: $('btn-theme'),
  themeMenu: $('theme-menu'),
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
const contextMenuEl = $('contextMenu')
const statusNodes = $('status-nodes')
const statusZoom = $('status-zoom')

// Side panel fields
const nodeText = $('node-text')
const nodeNote = $('node-note')
const nodeLink = $('node-link')
const nodeLinkTitle = $('node-link-title')
const nodeTagsEl = $('node-tags')
const nodeTagInput = $('node-tag-input')
const nodeShape = $('node-shape')
const nodeColor = $('node-color')
const nodeBgColor = $('node-bg-color')
const nodeFontSize = $('node-font-size')
const lineWidthInput = $('line-width')

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
        openRealtimeRenderOnNodeTextEdit: true,
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
    setRainbowLinesOpen(getRainbowLinesConfig(fullData).open)

    bindMindMapEvents()
    updateStatusBar()
    updateCanvasSettingsPanel()

    // Record the initial state so we don't trigger false dirty
    setTimeout(() => {
      if (mindMap) {
        lastSyncedJSON = JSON.stringify(buildDocumentSnapshot(getDocumentData()))
      }
    }, 100)
  }

  doInit()
}

function bindMindMapEvents() {
  mindMap.on('data_change', onDataChange)
  mindMap.on('view_data_change', onViewChange)
  mindMap.on('scale', onScaleChange)
  mindMap.on('node_active', onNodeActive)
  mindMap.on('node_contextmenu', onNodeContextMenu)
  mindMap.on('draw_click', hideContextMenu)
  mindMap.on('expand_btn_click', updateStatusBar)

  // Search events
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

function onNodeActive(node, activeNodeList) {
  activeNodes = activeNodeList || []
  updateSidePanel()
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

toolbar.rainbowLines.addEventListener('click', toggleRainbowLines)

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
  for (const menu of [toolbar.exportMenu, toolbar.layoutMenu, toolbar.themeMenu]) {
    if (menu !== except) menu.classList.remove('show')
  }
}

// Theme dropdown
toolbar.themeBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  const willShow = !toolbar.themeMenu.classList.contains('show')
  closeToolbarMenus(willShow ? toolbar.themeMenu : null)
  if (willShow) {
    renderThemeMenu()
    positionDropdownMenu(toolbar.themeMenu, toolbar.themeBtn)
  }
  toolbar.themeMenu.classList.toggle('show', willShow)
})

toolbar.themeMenu.addEventListener('click', (e) => {
  e.stopPropagation()
  const item = e.target.closest('.dropdown-item[data-theme]')
  if (!item) return
  applyTheme(item.dataset.theme)
  toolbar.themeMenu.classList.remove('show')
})

// Layout dropdown
toolbar.layoutBtn.addEventListener('click', (e) => {
  e.stopPropagation()
  const willShow = !toolbar.layoutMenu.classList.contains('show')
  closeToolbarMenus(willShow ? toolbar.layoutMenu : null)
  if (willShow) positionDropdownMenu(toolbar.layoutMenu, toolbar.layoutBtn)
  toolbar.layoutMenu.classList.toggle('show', willShow)
})

toolbar.layoutMenu.addEventListener('click', (e) => {
  e.stopPropagation()
  const item = e.target.closest('.dropdown-item')
  if (!item || !mindMap) return
  const layout = item.dataset.layout
  mindMap.setLayout(layout)
  setCurrentLayout(layout)
  syncDocumentFromMindMap()
  toolbar.layoutMenu.classList.remove('show')
})

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
toolbar.sidebarToggle.addEventListener('click', () => {
  sidePanel.classList.toggle('hidden')
  toolbar.sidebarToggle.classList.toggle('active', !sidePanel.classList.contains('hidden'))
})

$('btn-close-panel').addEventListener('click', () => {
  sidePanel.classList.add('hidden')
  toolbar.sidebarToggle.classList.remove('active')
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
function updateCanvasSettingsPanel() {
  if (!mindMap || !lineWidthInput) return
  lineWidthInput.value = mindMap.getThemeConfig('lineWidth')
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
  if (activeNodes.length !== 1) {
    nodeText.value = ''
    nodeNote.value = ''
    nodeLink.value = ''
    nodeLinkTitle.value = ''
    nodeTagsEl.innerHTML = ''
    nodeShape.value = ''
    return
  }

  const node = activeNodes[0]
  const data = node.getData()

  nodeText.value = data.text || ''
  nodeNote.value = data.note || ''
  nodeLink.value = data.hyperlink || ''
  nodeLinkTitle.value = data.hyperlinkTitle || ''
  nodeShape.value = data.shape || ''

  // Tags
  renderTags(data.tag || [])

  // Style
  const style = node.getStyle('color') || ''
  const bgStyle = node.getStyle('fillColor') || ''
  const fontSize = node.getStyle('fontSize') || 14
  if (style) nodeColor.value = style
  if (bgStyle) nodeBgColor.value = bgStyle
  nodeFontSize.value = fontSize
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

nodeText.addEventListener('input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    mindMap.execCommand('SET_NODE_TEXT', activeNodes[0], nodeText.value)
  }, 300)
})

nodeNote.addEventListener('input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    mindMap.execCommand('SET_NODE_NOTE', activeNodes[0], nodeNote.value)
  }, 300)
})

nodeLink.addEventListener('change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_HYPERLINK', activeNodes[0], nodeLink.value, nodeLinkTitle.value)
})

nodeLinkTitle.addEventListener('change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_HYPERLINK', activeNodes[0], nodeLink.value, nodeLinkTitle.value)
})

nodeTagInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return
  e.preventDefault()
  const tag = nodeTagInput.value.trim()
  if (!tag || !mindMap || activeNodes.length !== 1) return
  const current = activeNodes[0].getData().tag || []
  mindMap.execCommand('SET_NODE_TAG', activeNodes[0], [...current, tag])
  nodeTagInput.value = ''
  updateSidePanel()
})

nodeTagsEl.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.tag-remove')
  if (!removeBtn || !mindMap || activeNodes.length !== 1) return
  const index = parseInt(removeBtn.dataset.index)
  const current = activeNodes[0].getData().tag || []
  current.splice(index, 1)
  mindMap.execCommand('SET_NODE_TAG', activeNodes[0], current)
  updateSidePanel()
})

nodeShape.addEventListener('change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_SHAPE', activeNodes[0], nodeShape.value)
})

nodeColor.addEventListener('input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'color', nodeColor.value)
})

nodeBgColor.addEventListener('input', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'fillColor', nodeBgColor.value)
})

nodeFontSize.addEventListener('change', () => {
  if (!mindMap || activeNodes.length !== 1) return
  mindMap.execCommand('SET_NODE_STYLE', activeNodes[0], 'fontSize', parseInt(nodeFontSize.value))
})

lineWidthInput.addEventListener('change', () => {
  setLineWidth(lineWidthInput.value)
})

lineWidthInput.addEventListener('input', () => {
  clearTimeout(sidePanelDebounce)
  sidePanelDebounce = setTimeout(() => {
    setLineWidth(lineWidthInput.value)
  }, 300)
})

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
      onClick: () => {
        mindMap.setLayout(opt.value)
        setCurrentLayout(opt.value)
        syncDocumentFromMindMap()
      },
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

  contextMenuEl.appendChild(createMenuItem(t('context.rainbowLines'), () => {
    toggleRainbowLines()
  }))

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
  renderThemeMenu()
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
        updateCanvasSettingsPanel()
        updateStatusBar()
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
  if (toolbar.layoutMenu.classList.contains('show')) {
    positionDropdownMenu(toolbar.layoutMenu, toolbar.layoutBtn)
  }
  if (toolbar.themeMenu.classList.contains('show')) {
    positionDropdownMenu(toolbar.themeMenu, toolbar.themeBtn)
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
vscode.postMessage({ type: 'ready' })
