import { getDefaultRootTopic } from './i18n'

export const DEFAULT_THEME_CONFIG = {
  lineWidth: 3,
  generalizationLineWidth: 3,
  lineStyle: 'curve',
  paddingX: 28,
  paddingY: 12,
}

export const DEFAULT_RAINBOW_LINES_CONFIG = {
  open: true,
  colorsList: [
    'rgb(255, 229, 142)',
    'rgb(254, 158, 41)',
    'rgb(248, 119, 44)',
    'rgb(232, 82, 80)',
    'rgb(182, 66, 98)',
    'rgb(99, 54, 99)',
    'rgb(65, 40, 82)',
  ],
}

export const DEFAULT_MIND_MAP_DATA = {
  layout: 'logicalStructure',
  root: {
    data: { text: getDefaultRootTopic(), expand: true },
    children: [] as unknown[],
  },
  theme: { template: 'earthYellow', config: { ...DEFAULT_THEME_CONFIG } },
  rainbowLinesConfig: { ...DEFAULT_RAINBOW_LINES_CONFIG },
  backgroundPattern: 'grid',
  bgPatternColor: '#808080',
  bgPatternOpacity: 10,
}
