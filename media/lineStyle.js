import { t } from './i18n.js'

export const SUPPORT_LINE_STYLE_LAYOUTS = {
  curve: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'verticalTimeline',
    'organizationStructure',
  ],
  direct: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'organizationStructure',
    'verticalTimeline',
  ],
}

export const SUPPORT_LINE_RADIUS_LAYOUTS = [
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'verticalTimeline',
]

export function getLineStyleOptions() {
  return [
    { value: 'straight', label: t('lineStyle.straight') },
    { value: 'curve', label: t('lineStyle.curve') },
    { value: 'direct', label: t('lineStyle.direct') },
  ]
}

export function getLineStylesForLayout(layout) {
  return getLineStyleOptions().filter((item) => {
    const supported = SUPPORT_LINE_STYLE_LAYOUTS[item.value]
    return !supported || supported.includes(layout)
  })
}

export function isLineRadiusSupported(layout, lineStyle) {
  return lineStyle === 'straight' && SUPPORT_LINE_RADIUS_LAYOUTS.includes(layout)
}

export function normalizeLineStyleForLayout(layout, lineStyle) {
  const options = getLineStylesForLayout(layout)
  if (options.some((item) => item.value === lineStyle)) return lineStyle
  return options[0]?.value || 'straight'
}
