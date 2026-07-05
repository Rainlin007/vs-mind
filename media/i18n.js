const MESSAGES = {
  en: {
    defaultRootTopic: 'Central Topic',
    node: {
      secondLevel: 'Sub Topic',
      branchTopic: 'Branch Topic',
    },
    toolbar: {
      undo: 'Undo (Ctrl+Z)',
      redo: 'Redo (Ctrl+Y)',
      addChild: 'Add Child Node (Tab)',
      addSibling: 'Add Sibling Node (Enter)',
      delete: 'Delete Node (Delete)',
      painter: 'Format Painter',
      rainbowLines: 'Rainbow Lines',
      search: 'Search (Ctrl+F)',
      layout: 'Layout',
      theme: 'Theme',
      zoomOut: 'Zoom Out',
      zoomIn: 'Zoom In',
      fit: 'Fit Canvas',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      export: 'Export',
      sidebar: 'Properties Panel',
    },
    theme: {
      defaultGroup: 'Default',
      default: 'Default',
      lightGroup: 'Light Themes',
      darkGroup: 'Dark Themes',
    },
    rainbow: {
      off: 'Off',
      colors1: 'Warm',
      colors2: 'Bright',
      colors3: 'Ocean',
      colors4: 'Soft',
      colors5: 'Sunset',
      colors6: 'Forest',
    },
    layout: {
      logicalStructure: 'Logical',
      logicalStructureLeft: 'Logical (L)',
      mindMap: 'Mind Map',
      organizationStructure: 'Org Chart',
      catalogOrganization: 'Catalog',
      timeline: 'Timeline',
      fishbone: 'Fishbone',
    },
    panel: {
      tabNode: 'Node',
      tabTheme: 'Theme',
      noNodeSelected: 'Select a node to edit its properties',
      themeSettings: 'Canvas',
      themeTemplate: 'Theme',
      layout: 'Layout',
      rainbowLines: 'Rainbow Lines',
      canvasSettings: 'Canvas',
      lineWidth: 'Line Width',
      canvasBackground: 'Background',
      text: 'Text',
      note: 'Note',
      comment: 'Comment',
      hyperlink: 'Hyperlink',
      linkTitle: 'Link Title',
      tags: 'Tags',
      shape: 'Shape',
      style: 'Style',
      fontColor: 'Font Color',
      backgroundColor: 'Background',
      fontSize: 'Font Size',
      reset: 'Reset to Default',
      resetNodeHint: 'Clears custom styles, note, link, tags, and comment for the selected node',
      resetThemeHint: 'Restores canvas background, line width, and rainbow lines to theme defaults',
      textPlaceholder: 'Double-click node to edit, or edit here ($...$ for formula)',
      notePlaceholder: 'Add a note...',
      commentPlaceholder: 'Not shown on the map — for your notes or AI',
      linkTitlePlaceholder: 'Link title',
      tagPlaceholder: 'Type a tag and press Enter',
    },
    shape: {
      default: 'Default',
      rectangle: 'Rectangle',
      roundedRectangle: 'Rounded Rectangle',
      diamond: 'Diamond',
      ellipse: 'Ellipse',
      circle: 'Circle',
      parallelogram: 'Parallelogram',
      octagonalRectangle: 'Octagonal Rectangle',
    },
    search: {
      placeholder: 'Search nodes...',
      replacePlaceholder: 'Replace with...',
      prev: 'Previous',
      next: 'Next',
      close: 'Close',
      replace: 'Replace',
      replaceAll: 'All',
      results: '{count} results',
    },
    status: {
      nodes: 'Nodes: {count}',
      zoom: 'Zoom: {percent}%',
      shortcuts: 'Click: Select | Dbl-click: Edit | Delete: Remove | $...$: Formula',
    },
    formula: {
      dialogTitle: 'Insert Formula',
      dialogHint: 'LaTeX syntax, e.g. e=mc^2 or \\frac{a}{b}. Type $...$ in the side panel text field.',
      insert: 'Insert',
      cancel: 'Cancel',
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strike: 'Strikethrough',
      toolbar: 'Formula',
    },
    context: {
      addChild: 'Add Child Node',
      addSibling: 'Add Sibling Node',
      addParent: 'Add Parent Node',
      collapseChildren: 'Collapse Children',
      expandChildren: 'Expand Children',
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      deleteNode: 'Delete Node',
      insertFormula: 'Insert Formula',
      addSummary: 'Add Summary',
      nodeShape: 'Node Shape',
      fitCanvas: 'Fit Canvas',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      collapseToLevel1: 'Collapse to Level 1',
      switchLayout: 'Switch Layout',
      switchTheme: 'Switch Theme',
      resetLayout: 'Reset Layout',
      rainbowLines: 'Rainbow Lines',
    },
    error: {
      initFailed: 'Failed to initialize mind map: {message}',
      pngExportFailed: 'PNG export failed: {message}',
      svgExportFailed: 'SVG export failed: {message}',
    },
  },
  'zh-cn': {
    defaultRootTopic: '中心主题',
    node: {
      secondLevel: '二级节点',
      branchTopic: '分支主题',
    },
    toolbar: {
      undo: '撤销 (Ctrl+Z)',
      redo: '重做 (Ctrl+Y)',
      addChild: '添加子节点 (Tab)',
      addSibling: '添加同级节点 (Enter)',
      delete: '删除节点 (Delete)',
      painter: '格式刷',
      rainbowLines: '彩虹线条',
      search: '搜索 (Ctrl+F)',
      layout: '布局',
      theme: '主题',
      zoomOut: '缩小',
      zoomIn: '放大',
      fit: '适应画布',
      expandAll: '展开全部',
      collapseAll: '收起全部',
      export: '导出',
      sidebar: '属性面板',
    },
    theme: {
      defaultGroup: '默认',
      default: '默认',
      lightGroup: '浅色主题',
      darkGroup: '深色主题',
    },
    rainbow: {
      off: '关闭',
      colors1: '暖色',
      colors2: '明亮',
      colors3: '海洋',
      colors4: '柔和',
      colors5: '日落',
      colors6: '森林',
    },
    layout: {
      logicalStructure: '逻辑结构图',
      logicalStructureLeft: '逻辑结构图(左)',
      mindMap: '思维导图',
      organizationStructure: '组织结构图',
      catalogOrganization: '目录组织图',
      timeline: '时间轴',
      fishbone: '鱼骨图',
    },
    panel: {
      tabNode: '节点',
      tabTheme: '主题',
      noNodeSelected: '选中一个节点后可编辑其属性',
      themeSettings: '画布',
      themeTemplate: '主题',
      layout: '布局',
      rainbowLines: '彩虹线条',
      canvasSettings: '画布',
      lineWidth: '连线粗细',
      canvasBackground: '背景色',
      text: '文本',
      note: '备注',
      comment: '节点注释',
      hyperlink: '超链接',
      linkTitle: '链接标题',
      tags: '标签',
      shape: '形状',
      style: '样式',
      fontColor: '字体颜色',
      backgroundColor: '背景',
      fontSize: '字体',
      reset: '恢复默认',
      resetNodeHint: '清除当前节点的自定义样式、备注、链接、标签和注释',
      resetThemeHint: '将画布背景、连线粗细和彩虹线条恢复为主题默认值',
      textPlaceholder: '双击节点编辑，或在此输入（$...$ 为公式）',
      notePlaceholder: '添加备注...',
      commentPlaceholder: '不在导图显示，可自用或供 AI 阅读',
      linkTitlePlaceholder: '链接标题',
      tagPlaceholder: '输入标签，回车添加',
    },
    shape: {
      default: '默认',
      rectangle: '矩形',
      roundedRectangle: '圆角矩形',
      diamond: '菱形',
      ellipse: '椭圆',
      circle: '圆形',
      parallelogram: '平行四边形',
      octagonalRectangle: '八角矩形',
    },
    search: {
      placeholder: '搜索节点...',
      replacePlaceholder: '替换为...',
      prev: '上一个',
      next: '下一个',
      close: '关闭',
      replace: '替换',
      replaceAll: '全部',
      results: '{count} 结果',
    },
    status: {
      nodes: '节点: {count}',
      zoom: '缩放: {percent}%',
      shortcuts: '单击: 选中 | 双击: 编辑 | Delete: 删除 | $...$: 公式',
    },
    formula: {
      dialogTitle: '插入公式',
      dialogHint: 'LaTeX 语法，如 e=mc^2 或 \\frac{a}{b}。在侧栏文本框输入 $...$ 即可。',
      insert: '插入',
      cancel: '取消',
      bold: '粗体',
      italic: '斜体',
      underline: '下划线',
      strike: '删除线',
      toolbar: '公式',
    },
    context: {
      addChild: '添加子节点',
      addSibling: '添加同级节点',
      addParent: '添加父节点',
      collapseChildren: '收起子节点',
      expandChildren: '展开子节点',
      moveUp: '上移节点',
      moveDown: '下移节点',
      deleteNode: '删除节点',
      insertFormula: '插入公式',
      addSummary: '添加概要',
      nodeShape: '节点形状',
      fitCanvas: '适应画布',
      expandAll: '展开全部',
      collapseAll: '收起全部',
      collapseToLevel1: '收起到一级',
      switchLayout: '切换布局',
      switchTheme: '切换主题',
      resetLayout: '重置布局',
      rainbowLines: '彩虹线条',
    },
    error: {
      initFailed: '思维导图初始化失败: {message}',
      pngExportFailed: 'PNG 导出失败: {message}',
      svgExportFailed: 'SVG 导出失败: {message}',
    },
  },
}

let locale = 'en'

export function setLocale(language) {
  const normalized = String(language || 'en').toLowerCase()
  locale = normalized.startsWith('zh') ? 'zh-cn' : 'en'
}

export function getLocale() {
  return locale
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export function t(key, vars = {}) {
  const template =
    getNestedValue(MESSAGES[locale], key) ??
    getNestedValue(MESSAGES.en, key) ??
    key
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
}

const LAYOUT_VALUES = [
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'organizationStructure',
  'catalogOrganization',
  'timeline',
  'fishbone',
]

export function getMindMapLocaleOptions() {
  return {
    defaultInsertSecondLevelNodeText: t('node.secondLevel'),
    defaultInsertBelowSecondLevelNodeText: t('node.branchTopic'),
  }
}

export function getLayoutOptions() {
  return LAYOUT_VALUES.map((value) => ({
    value,
    label: t(`layout.${value}`),
  }))
}

const SHAPE_VALUES = [
  '',
  'rectangle',
  'roundedRectangle',
  'diamond',
  'ellipse',
  'circle',
  'parallelogram',
  'octagonalRectangle',
]

export function getShapeOptions() {
  return SHAPE_VALUES.map((value) => ({
    value,
    label: value ? t(`shape.${value}`) : t('shape.default'),
  }))
}

export function applyDomI18n() {
  document.documentElement.lang = locale === 'zh-cn' ? 'zh-CN' : 'en'

  const titles = {
    'btn-undo': 'toolbar.undo',
    'btn-redo': 'toolbar.redo',
    'btn-add-child': 'toolbar.addChild',
    'btn-add-sibling': 'toolbar.addSibling',
    'btn-delete': 'toolbar.delete',
    'btn-painter': 'toolbar.painter',
    'btn-search': 'toolbar.search',
    'btn-zoom-out': 'toolbar.zoomOut',
    'btn-zoom-in': 'toolbar.zoomIn',
    'btn-fit': 'toolbar.fit',
    'btn-expand-all': 'toolbar.expandAll',
    'btn-collapse-all': 'toolbar.collapseAll',
    'btn-export': 'toolbar.export',
    'btn-sidebar-toggle': 'toolbar.sidebar',
    'btn-search-prev': 'search.prev',
    'btn-search-next': 'search.next',
    'btn-search-close': 'search.close',
    'btn-replace': 'search.replace',
    'btn-replace-all': 'search.replaceAll',
  }

  const formulaTitle = document.getElementById('formula-dialog-title')
  if (formulaTitle) formulaTitle.textContent = t('formula.dialogTitle')
  const formulaHint = document.getElementById('formula-dialog-hint')
  if (formulaHint) formulaHint.textContent = t('formula.dialogHint')
  const formulaConfirm = document.getElementById('formula-confirm')
  if (formulaConfirm) formulaConfirm.textContent = t('formula.insert')
  const formulaCancel = document.getElementById('formula-cancel')
  if (formulaCancel) formulaCancel.textContent = t('formula.cancel')

  for (const [id, key] of Object.entries(titles)) {
    const el = document.getElementById(id)
    if (el) el.title = t(key)
  }

  const resetNodeButton = document.getElementById('btn-reset-node')
  if (resetNodeButton) resetNodeButton.title = t('panel.resetNodeHint')
  const resetThemeButton = document.getElementById('btn-reset-theme')
  if (resetThemeButton) resetThemeButton.title = t('panel.resetThemeHint')

  const labels = {
    'panel-tab-node': 'panel.tabNode',
    'panel-tab-theme': 'panel.tabTheme',
    'node-panel-empty': 'panel.noNodeSelected',
    'label-theme-settings': 'panel.themeSettings',
    'label-theme-template': 'panel.themeTemplate',
    'label-layout': 'panel.layout',
    'label-rainbow-lines': 'panel.rainbowLines',
    'label-line-width': 'panel.lineWidth',
    'label-canvas-bg-color': 'panel.canvasBackground',
    'label-node-text': 'panel.text',
    'label-node-note': 'panel.note',
    'label-node-comment': 'panel.comment',
    'label-node-link': 'panel.hyperlink',
    'label-node-tags': 'panel.tags',
    'label-node-shape': 'panel.shape',
    'label-node-style': 'panel.style',
    'label-node-color': 'panel.fontColor',
    'label-node-bg-color': 'panel.backgroundColor',
    'label-node-font-size': 'panel.fontSize',
    'btn-reset-node': 'panel.reset',
    'btn-reset-theme': 'panel.reset',
  }

  for (const [id, key] of Object.entries(labels)) {
    const el = document.getElementById(id)
    if (el) el.textContent = t(key)
  }

  const placeholders = {
    'node-text': 'panel.textPlaceholder',
    'node-note': 'panel.notePlaceholder',
    'node-comment': 'panel.commentPlaceholder',
    'node-link-title': 'panel.linkTitlePlaceholder',
    'node-tag-input': 'panel.tagPlaceholder',
    'search-input': 'search.placeholder',
    'replace-input': 'search.replacePlaceholder',
  }

  for (const [id, key] of Object.entries(placeholders)) {
    const el = document.getElementById(id)
    if (el) el.placeholder = t(key)
  }

  const shapeSelect = document.getElementById('node-shape')
  if (shapeSelect) {
    getShapeOptions().forEach(({ value, label }) => {
      const option = shapeSelect.querySelector(`option[value="${value}"]`)
      if (option) option.textContent = label
    })
  }

  const shortcuts = document.querySelector('.status-shortcuts')
  if (shortcuts) shortcuts.textContent = t('status.shortcuts')

  updateStatusBarI18n()
}

export function updateStatusBarI18n(nodeCount, zoomPercent) {
  const statusNodes = document.getElementById('status-nodes')
  const statusZoom = document.getElementById('status-zoom')
  if (statusNodes && nodeCount !== undefined) {
    statusNodes.textContent = t('status.nodes', { count: nodeCount })
  }
  if (statusZoom && zoomPercent !== undefined) {
    statusZoom.textContent = t('status.zoom', { percent: zoomPercent })
  }
}
