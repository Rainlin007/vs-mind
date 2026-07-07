# Changelog

All notable changes to **VS Mind** are documented in this file.

## [1.0.17] - 2026-07-07

### Added
- Theme side panel: **Line Style** dropdown (straight, curve, direct) with layout-aware options

## [1.0.16] - 2026-07-07

### Added
- Eight curated preset themes replace the long built-in theme list; default theme is **clayLight**

### Changed
- Simplify Theme side panel: theme and layout dropdowns only; whole-map look comes from presets
- Stop persisting `theme.config` overrides in `.smm` files
- Default new maps use 5% background pattern opacity

### Fixed
- Sync inline text-edit box with node size while typing (fork patch: faster debounce and layout sync)

## [1.0.11] - 2026-07-05

### Added
- Split side panel into **Node** and **Theme** tabs with reset-to-default actions
- Theme tab: theme/layout dropdowns, canvas background, line width, and rainbow line presets
- Node style opacity sliders for font color and node background

### Changed
- Move theme, layout, and rainbow line controls from the toolbar into the Theme side panel
- Show effective theme colors in the node panel (supports `rgb`, `rgba`, and `transparent`)

### Fixed
- Fix side panel init failure when i18n referenced missing reset button elements
- Fix canvas background turning black when loading files with invalid `backgroundColor`

## [1.0.10] - 2026-07-05

### Fixed
- Fix inline text-edit box distortion and disappearing theme border on empty nodes; empty nodes now render as a slim cursor-like line (via a local `simple-mind-map` fork included as a submodule)

## [1.0.7] - 2026-07-05

### Added
- Add side-panel node comment field (`data.comment`) that stays off the canvas

### Changed
- Document SMM `comment` field in the format spec
- Use version-agnostic VSIX install instructions in README

## [1.0.6] - 2026-07-05

### Fixed
- Improve drag-and-drop drop-target preview responsiveness during node reordering

## [1.0.5] - 2026-07-05

### Changed
- Update Marketplace listing with real editor screenshot and README copy

## [1.0.4] - 2026-07-05

### Fixed
- Fix extension icon distortion by center-cropping to square before resize

### Changed
- Remove AI-generated README screenshot (did not match the real editor UI)
- Add real editor screenshot to README
- Highlight drag-and-drop editing and native VS Code-like experience in README

## [1.0.3] - 2026-07-05

### Changed
- Remove workspace / Git diff messaging from user-facing copy

## [1.0.2] - 2026-07-05

### Changed
- Refine marketplace copy; credit simple-mind-map in Acknowledgments only

## [1.0.1] - 2026-07-05

### Added
- Marketplace icon and README screenshots
- Improved marketplace listing copy (English & Chinese)

## [1.0.0] - 2026-07-05

### Added
- Visual mind map editor for VS Code
- 50+ built-in themes and rainbow line styles
- Multiple layouts: logical structure, mind map, org chart, timeline, fishbone, and more
- Toolbar and context menu for nodes and canvas
- Split view: edit JSON source beside the visual editor with live sync
- Export to PNG, SVG, and JSON
- Bilingual UI (English / 简体中文)
- Format painter, search & replace, undo/redo
- Canvas line width control via theme overrides
