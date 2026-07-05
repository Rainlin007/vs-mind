import { t } from './i18n.js'

// Presets from upstream simple-mind-map (web/src/config/constant.js)
export const RAINBOW_LINE_PRESETS = [
  {
    id: 'colors1',
    list: [
      'rgb(255, 213, 73)',
      'rgb(255, 136, 126)',
      'rgb(107, 225, 141)',
      'rgb(151, 171, 255)',
      'rgb(129, 220, 242)',
      'rgb(255, 163, 125)',
      'rgb(152, 132, 234)',
    ],
  },
  {
    id: 'colors2',
    list: [
      'rgb(248, 93, 93)',
      'rgb(255, 151, 84)',
      'rgb(255, 214, 69)',
      'rgb(73, 205, 140)',
      'rgb(64, 192, 255)',
      'rgb(84, 110, 214)',
      'rgb(164, 93, 220)',
    ],
  },
  {
    id: 'colors3',
    list: [
      'rgb(140, 240, 231)',
      'rgb(74, 210, 255)',
      'rgb(65, 168, 243)',
      'rgb(49, 128, 205)',
      'rgb(188, 226, 132)',
      'rgb(113, 215, 123)',
      'rgb(120, 191, 109)',
    ],
  },
  {
    id: 'colors4',
    list: [
      'rgb(169, 98, 99)',
      'rgb(245, 125, 123)',
      'rgb(254, 183, 168)',
      'rgb(251, 218, 171)',
      'rgb(138, 163, 181)',
      'rgb(131, 127, 161)',
      'rgb(84, 83, 140)',
    ],
  },
  {
    id: 'colors5',
    list: [
      'rgb(255, 229, 142)',
      'rgb(254, 158, 41)',
      'rgb(248, 119, 44)',
      'rgb(232, 82, 80)',
      'rgb(182, 66, 98)',
      'rgb(99, 54, 99)',
      'rgb(65, 40, 82)',
    ],
  },
  {
    id: 'colors6',
    list: [
      'rgb(171, 227, 209)',
      'rgb(107, 201, 196)',
      'rgb(55, 170, 169)',
      'rgb(18, 135, 131)',
      'rgb(74, 139, 166)',
      'rgb(75, 105, 150)',
      'rgb(57, 75, 133)',
    ],
  },
]

export function colorsListEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  return a.every((color, index) => color === b[index])
}

export function getRainbowLinePresets() {
  return RAINBOW_LINE_PRESETS.map((preset) => ({
    ...preset,
    label: t(`rainbow.${preset.id}`),
  }))
}

export function getRainbowPresetById(id) {
  return RAINBOW_LINE_PRESETS.find((preset) => preset.id === id) || null
}

export function resolveRainbowPresetId(config = {}) {
  if (!config.open) return 'close'
  const colorsList = Array.isArray(config.colorsList) ? config.colorsList : []
  if (colorsList.length === 0) return 'colors1'
  const matched = RAINBOW_LINE_PRESETS.find((preset) =>
    colorsListEqual(preset.list, colorsList)
  )
  return matched ? matched.id : 'custom'
}

export function buildRainbowLinesConfig(presetId) {
  if (presetId === 'close') {
    return { open: false, colorsList: [] }
  }
  const preset = getRainbowPresetById(presetId)
  if (!preset) {
    return { open: false, colorsList: [] }
  }
  return { open: true, colorsList: [...preset.list] }
}
