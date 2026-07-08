# Change Log

All notable changes to the "vs-mind" extension will be documented in this file.

## [2.0.0] - Unreleased

### Changed
- New vs-mind codebase on MindElixir — direct replacement of legacy implementation, no migration.
- MindElixir dependency: npm-managed, build-time vendoring to `media/` (5.13.0).
- Fix MindElixir API usage (`RIGHT` instead of `RIGHTT`, remove deprecated `nodeMenu`).
- Default mind map data format: `arrows` instead of legacy `linkData`.
- Use official MindElixir TypeScript types in webview code.

### Technical
- Add `scripts/vendor-mind-elixir.js` with `postinstall` hook.
- Stop tracking generated `media/MindElixir.*` in git.
- Development branch: `next` (replaces legacy vs-mind when merged).

## [0.2.1] - 2026-01-06
### Bug Fixes
- Fix #15: Restore selection after save.

## [0.2.0] - 2026-01-04
### Refactor
- Refactored codebase to Clean Architecture.
- Migrated Webview communication to TypeScript.

### Technical & Chore
- Fixed GitHub Actions errors.
- Added documentation for Antigravity rules.

## [0.1.6] - 2026-01-04
### Technical & Chore
- Update packaging workflow.

## [0.1.5] - 2026-01-04
### Technical & Chore
- Version bump for verification.

## [0.1.4] - 2026-01-04
### Technical & Chore
- Version bump for verification.

## [0.1.3] - 2026-01-04
### Technical & Chore
- Fixed packaging workflow to properly append version number to the VSIX filename.

## [0.1.2] - 2026-01-04
### Technical & Chore
- Fixed packaging workflow to exclude dependencies (`--no-dependencies`).

## [0.1.0] - 2026-01-03
### Features
- Initial release of VS Code Mind Map.
- Basic mind map editing features (add, delete, edit nodes).
- Image paste support.
- MindElixir integration.
- Automatically initialize empty `.mm` or `.mindmap` files with a root node.

### Technical & Chore
- **CI/CD**: Added GitHub Actions workflows for packaging and testing.
- **Dev Container**: Configured environment with xvfb for UI testing.
- **Maintenance**: Resolved npm deprecation warnings and fixed lint issues.
