import Themes from 'simple-mind-map-plugin-themes'
import themeList from 'simple-mind-map-plugin-themes/themeList.js'
import { getLocale, t } from './i18n.js'

let registered = false

export function registerThemes(MindMap) {
  if (registered) return
  Themes.init(MindMap)
  registered = true
}

function humanizeThemeValue(value) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}

export function getThemeGroups() {
  const locale = getLocale()
  const labelFor = (value, name) => (locale === 'zh-cn' ? name : humanizeThemeValue(value))

  return [
    {
      id: 'default',
      label: t('theme.defaultGroup'),
      themes: [{ value: 'default', label: t('theme.default') }],
    },
    {
      id: 'light',
      label: t('theme.lightGroup'),
      themes: themeList
        .filter((item) => !item.dark)
        .map((item) => ({
          value: item.value,
          label: labelFor(item.value, item.name),
        })),
    },
    {
      id: 'dark',
      label: t('theme.darkGroup'),
      themes: themeList
        .filter((item) => item.dark)
        .map((item) => ({
          value: item.value,
          label: labelFor(item.value, item.name),
        })),
    },
  ]
}

export function getAllThemeValues() {
  return ['default', ...themeList.map((item) => item.value)]
}
