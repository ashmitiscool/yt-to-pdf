# Changelog

All notable changes to the **YT to PDF** Chrome Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] - 2026-10-08

### Fixed
- **Lightbox Background Scroll Bleed**: Prevented background page and YouTube player scrolling while the slide deck preview lightbox is active. Automatically locks `document.body.style.overflow = 'hidden'` upon opening and cleanly restores the previous overflow style upon closing.
- **Scroll Chaining & Overscroll Containment**: Added CSS `overscroll-behavior: contain` and `scroll-behavior: auto !important` to `.ytsnip-lightbox` to isolate scroll events from the parent document.
- **Programmatic Scroll Interruption**: Fixed race conditions where user interactions (mouse wheel, click/mousedown, touch gestures) would conflict with smooth programmatic scrolling. User actions now immediately cancel programmatic scroll timers and flags.
- **Initial Lightbox Open Jump**: Eliminated delayed smooth scrolling animation artifacts on initial lightbox open by using instant (`smooth: false`) slide positioning.

### Performance
- **Silky 60fps Active Slide Tracking**: Replaced fixed 50ms `setTimeout` scroll debouncing with `requestAnimationFrame` (`scrollRafId`), eliminating frame drops and jitter during fast lightbox scrolling.
- **Layout Thrashing Elimination**: Optimized active slide detection by replacing repeated `getBoundingClientRect()` queries across all slide DOM elements with fast-path `offsetTop` and `offsetHeight` measurements.
- **Early Loop Break**: Implemented early termination in the slide proximity calculation loop, taking advantage of linear vertical slide ordering to avoid checking remaining off-screen slides.
- **Lifecycle Cleanup**: Ensured all pending animation frame callbacks and scroll timers are cancelled when the lightbox is dismissed or destroyed.

### Added
- **Automated Version Bumper CLI (`scripts/bump-version.js`)**:
  - Added `npm run bump` workflow supporting both interactive terminal prompts and direct CLI arguments (`patch`, `minor`, `major`, or custom SemVer strings).
  - Automatically synchronizes versions across `manifest.json`, `package.json`, `package-lock.json`, and the file tree in `ARCHITECTURE.md`.
  - Added support for `--no-package` flag and automated packaging via `scripts/package.js`.
- **Test Suite Expansion**:
  - Added Test 20 to `tests/drawer.test.js` validating body scroll isolation and style restoration.
  - Added unit test suite `tests/bump.test.js` verifying SemVer bump calculation logic and error handling across patch, minor, major, and custom inputs.
  - Enhanced mock DOM environment with proxy-based style setters and getters for unit testing.

### Maintenance
- Added `video/` directory to `.gitignore` to prevent local test recordings and video assets from polluting version control.

---

## [1.1.0] - 2026-09-29

### Added
- **Slide Deck Preview Lightbox with Zoom & Controls**:
  - Fullscreen/modal slide preview lightbox accessible from the slide deck drawer.
  - Smooth zoom controls with Zoom In, Zoom Out, and Reset Zoom (clamped between 0.5x and 3.0x).
  - Multi-touch pinch-to-zoom gestures and <kbd>Ctrl</kbd> + Mouse Wheel scaling.
  - Floating bottom navigation toolbar featuring slide counter, Previous / Next buttons, and direct slide number input.
  - Keyboard navigation shortcuts (<kbd>←</kbd> / <kbd>→</kbd> for slides, <kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd> for zoom, <kbd>Escape</kbd> to close).
- Added unit tests for lightbox rendering, zooming, panning, touch events, and keyboard controls (Tests 14–19 in `tests/drawer.test.js`).

---

## [1.0.2] - 2026-09-21

### Fixed
- **In-Place Slide Update Handlers**: Refined slide card state mutation handlers to preserve slide UUIDs and selection statuses during dynamic deck updates.
- **Timestamp Seeking & Clipboard Sync**: Fixed stale slide references in card action buttons, ensuring Jump to Timestamp and Copy Slide to Clipboard operate on current deck state.

---

## [1.0.1] - 2026-09-14

### Changed
- **Branding & Policy Compliance**: Updated extension identity to **YT to PDF** across all manifests, styles, and documentation.
- **Permissions Hardening**: Removed unused permissions (`contextMenus`) in compliance with Chrome Web Store least-privilege policies.

---

## [1.0.0] - 2026-08-23

### Added
- Initial production release of **YT to PDF**.
- **Automated Slide Scanner**: Background video scanning with dual-tier transition detection (dHash + block color variance).
- **Manual Frame Capture**: One-click slide capture via on-player controls or shortcut (<kbd>Alt</kbd> + <kbd>S</kbd>).
- **Slide Deck Drawer**: Side drawer to inspect, curate, select, and reorder captured slides.
- **Export Formats**: Multi-page PDF (`.pdf`), PowerPoint presentation (`.pptx`), and image archive (`.zip`).
- **Client-Side Processing**: 100% in-browser processing with zero external server dependencies.
