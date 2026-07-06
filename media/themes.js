import { getLocale, t } from './i18n.js'
import { presetThemes } from './presetThemes.js'

let registered = false

export function registerThemes(MindMap) {
  if (registered) return
  for (const item of presetThemes) {
    MindMap.defineTheme(item.value, item.config || {})
  }
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
  const labelFor = (item) =>
    locale === 'zh-cn' ? item.name : humanizeThemeValue(item.value)

  const toEntry = (item) => ({ value: item.value, label: labelFor(item) })

  const lightThemes = presetThemes.filter((item) => !item.dark).map(toEntry)
  const darkThemes = presetThemes.filter((item) => item.dark).map(toEntry)

  const groups = []
  if (lightThemes.length) {
    groups.push({ id: 'light', label: t('theme.lightGroup'), themes: lightThemes })
  }
  if (darkThemes.length) {
    groups.push({ id: 'dark', label: t('theme.darkGroup'), themes: darkThemes })
  }
  return groups
}

export function getAllThemeValues() {
  return presetThemes.map((item) => item.value)
}
