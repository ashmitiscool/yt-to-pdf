/**
 * YT to PDF - Interactive Slide Deck Drawer UI
 * Orchestrator coordinating drawer DOM, options ribbon, scan banner,
 * card grid gallery, lightbox preview, and document export pipeline.
 */

(function (global) {
  'use strict';

  const ICONS = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./drawer/icons.js')
    : (global.SlideDrawerIcons || {});

  const DeckStorage = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./drawer/storage.js')
    : (global.SlideDeckStorage || {});

  const SlideLightbox = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./drawer/lightbox.js')
    : (global.SlideLightbox || {});

  const createSlideCard = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./drawer/card.js')
    : (global.createSlideCard || null);

  class SlideDrawer {
    constructor() {
      this.slides = [];
      this.videoId = null;
      this.videoTitle = 'YouTube Presentation';
      this.isOpen = false;
      this.sensitivity = 'medium';
      this.captureMode = 'final_only';
      this.scanInterval = 2;
      this.currentVideoTime = 0;
      this._loadGeneration = 0;
      this._draggedIndex = null;

      this.callbacks = {
        onStartScan: () => {},
        onStopScan: () => {},
        onSeekVideo: (time) => {},
        onGetCurrentTime: () => 0
      };

      if (typeof document !== 'undefined') {
        this._buildDOM();
      }
    }

    setCallbacks({ onStartScan, onStopScan, onSeekVideo, onGetCurrentTime }) {
      if (onStartScan) this.callbacks.onStartScan = onStartScan;
      if (onStopScan) this.callbacks.onStopScan = onStopScan;
      if (onSeekVideo) this.callbacks.onSeekVideo = onSeekVideo;
      if (onGetCurrentTime) this.callbacks.onGetCurrentTime = onGetCurrentTime;
    }

    _buildDOM() {
      // Backdrop
      this.backdropEl = document.createElement('div');
      this.backdropEl.className = 'ytsnip-drawer-backdrop';
      this.backdropEl.addEventListener('click', () => this.close());

      // Drawer container
      this.drawerEl = document.createElement('div');
      this.drawerEl.className = 'ytsnip-drawer';
      this.drawerEl.innerHTML = `
        <div class="ytsnip-header">
          <div class="ytsnip-title-group">
            <span class="ytsnip-logo-icon">${ICONS.deck || ''}</span>
            <h3 class="ytsnip-title">Slide Deck</h3>
            <span class="ytsnip-count-badge" id="ytsnip-badge">0 slides</span>
          </div>
          <div class="ytsnip-header-actions">
            <button class="ytsnip-icon-btn" id="ytsnip-settings-btn" title="Extension Settings">
              ${ICONS.settings || ''}
            </button>
            <button class="ytsnip-close-btn" id="ytsnip-close-btn" title="Close Drawer">
              ${ICONS.close || ''}
            </button>
          </div>
        </div>

        <div class="ytsnip-scan-banner" id="ytsnip-scan-banner" style="display: none;">
          <div class="ytsnip-scan-banner-header">
            <span id="ytsnip-scan-status">Scanning presentation...</span>
            <span id="ytsnip-scan-eta">ETA: Calculating...</span>
          </div>
          <div class="ytsnip-progress-track">
            <div class="ytsnip-progress-fill" id="ytsnip-progress-fill"></div>
          </div>
          <div class="ytsnip-scan-controls">
            <span id="ytsnip-scan-time">00:00 / 00:00</span>
            <button class="ytsnip-scan-btn ytsnip-scan-btn-danger" id="ytsnip-cancel-scan-btn">
              Stop Scan
            </button>
          </div>
        </div>

        <div class="ytsnip-options-ribbon">
          <div class="ytsnip-options-row">
            <div class="ytsnip-option-group">
              <span>Sensitivity:</span>
              <select class="ytsnip-select" id="ytsnip-sensitivity-select">
                <option value="high">High (Subtle changes)</option>
                <option value="medium" selected>Balanced (Standard)</option>
                <option value="low">Low (Major slides only)</option>
              </select>
            </div>
            <div class="ytsnip-option-group">
              <span>Mode:</span>
              <select class="ytsnip-select" id="ytsnip-mode-select" title="Final Slides replaces earlier frames with the completed slide">
                <option value="final_only" selected>Final Slides (Clean)</option>
                <option value="all_steps">All Steps (Incremental)</option>
              </select>
            </div>
          </div>
          <div class="ytsnip-scan-actions" id="ytsnip-scan-actions">
            <button class="ytsnip-scan-btn ytsnip-scan-btn-primary" id="ytsnip-scan-all-btn" title="Scan entire video from 0:00">
              ${ICONS.scan || ''} Scan All (0:00)
            </button>
            <button class="ytsnip-scan-btn ytsnip-scan-btn-secondary" id="ytsnip-scan-current-btn" title="Scan slides starting from current video timestamp">
              ${ICONS.play || ''} <span id="ytsnip-scan-current-text">From Current (00:00)</span>
            </button>
          </div>
        </div>

        <div class="ytsnip-selection-ribbon" id="ytsnip-selection-ribbon" style="display: none;">
          <div class="ytsnip-selection-info">
            <span id="ytsnip-selection-count">0 of 0 selected</span>
          </div>
          <div class="ytsnip-selection-actions">
            <button class="ytsnip-btn-pill" id="ytsnip-select-all-btn" title="Select all slides for export">Select All</button>
            <button class="ytsnip-btn-pill" id="ytsnip-deselect-all-btn" title="Deselect all slides">Deselect All</button>
          </div>
        </div>

        <div class="ytsnip-body" id="ytsnip-body">
          <div class="ytsnip-empty-state" id="ytsnip-empty-state">
            <div class="ytsnip-empty-icon">${ICONS.deck || ''}</div>
            <p><strong>No slides in deck yet</strong></p>
            <p style="font-size: 12px; margin: 0;">Click <strong>Auto-Scan</strong> above to extract all slides, or press <strong>Alt+S</strong> (or the camera button on the player) to snap slides manually.</p>
          </div>
          <div class="ytsnip-slides-grid" id="ytsnip-grid" style="display: none;"></div>
        </div>

        <div class="ytsnip-footer">
          <div class="ytsnip-export-row">
            <button class="ytsnip-export-btn ytsnip-export-pptx" id="ytsnip-export-pptx">
              ${ICONS.pptx || ''} PowerPoint (.pptx)
            </button>
            <button class="ytsnip-export-btn ytsnip-export-pdf" id="ytsnip-export-pdf">
              ${ICONS.pdf || ''} PDF Document
            </button>
          </div>
          <div class="ytsnip-export-row">
            <button class="ytsnip-export-btn ytsnip-export-print" id="ytsnip-export-print">
              ${ICONS.print || ''} Print Slides
            </button>
            <button class="ytsnip-export-btn ytsnip-export-zip" id="ytsnip-export-zip">
              ${ICONS.zip || ''} Images (.zip)
            </button>
          </div>
          <div class="ytsnip-footer-secondary">
            <span style="color: #777;" id="ytsnip-footer-info">0 of 0 slides selected</span>
            <button class="ytsnip-btn-link" id="ytsnip-clear-btn">Clear Deck</button>
          </div>
        </div>
      `;

      // Toast notification element
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'ytsnip-toast';
      this.toastEl.innerHTML = `<span class="ytsnip-toast-icon">${ICONS.check || ''}</span> <span id="ytsnip-toast-text">Slide Captured!</span>`;

      document.body.appendChild(this.backdropEl);
      document.body.appendChild(this.drawerEl);
      document.body.appendChild(this.toastEl);

      this._bindEvents();
    }

    _bindEvents() {
      const closeBtn = this.drawerEl.querySelector('#ytsnip-close-btn');
      closeBtn.addEventListener('click', () => this.close());

      const settingsBtn = this.drawerEl.querySelector('#ytsnip-settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          try {
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
              this.showToast('Extension was reloaded. Please refresh the page.', 3000);
              return;
            }
            chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' }, (res) => {
              if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                console.warn('Could not open options page:', chrome.runtime.lastError);
                this.showToast('Could not open settings. Please refresh the page.', 2500);
              }
            });
          } catch (err) {
            console.warn('Extension context invalidated:', err);
            this.showToast('Extension was reloaded. Please refresh the page.', 3000);
          }
        });
      }

      const scanAllBtn = this.drawerEl.querySelector('#ytsnip-scan-all-btn');
      if (scanAllBtn) {
        scanAllBtn.addEventListener('click', () => {
          this.callbacks.onStartScan({
            sensitivity: this.sensitivity,
            captureMode: this.captureMode,
            stepSeconds: this.scanInterval,
            startFrom: 0
          });
        });
      }

      const scanCurrentBtn = this.drawerEl.querySelector('#ytsnip-scan-current-btn');
      if (scanCurrentBtn) {
        scanCurrentBtn.addEventListener('click', () => {
          const currentTime = this.callbacks.onGetCurrentTime ? this.callbacks.onGetCurrentTime() : (this.currentVideoTime || 0);
          this.callbacks.onStartScan({
            sensitivity: this.sensitivity,
            captureMode: this.captureMode,
            stepSeconds: this.scanInterval,
            startFrom: currentTime
          });
        });
      }

      const cancelScanBtn = this.drawerEl.querySelector('#ytsnip-cancel-scan-btn');
      cancelScanBtn.addEventListener('click', () => {
        this.callbacks.onStopScan();
      });

      const sensitivitySelect = this.drawerEl.querySelector('#ytsnip-sensitivity-select');
      sensitivitySelect.addEventListener('change', (e) => {
        this.sensitivity = e.target.value;
      });

      const modeSelect = this.drawerEl.querySelector('#ytsnip-mode-select');
      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
          this.captureMode = e.target.value;
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ytsnip_capture_mode: this.captureMode });
          }
        });
      }

      const selectAllBtn = this.drawerEl.querySelector('#ytsnip-select-all-btn');
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => this.selectAll());
      }

      const deselectAllBtn = this.drawerEl.querySelector('#ytsnip-deselect-all-btn');
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => this.deselectAll());
      }

      const exportPptxBtn = this.drawerEl.querySelector('#ytsnip-export-pptx');
      exportPptxBtn.addEventListener('click', () => this.exportDeck('pptx'));

      const exportPdfBtn = this.drawerEl.querySelector('#ytsnip-export-pdf');
      exportPdfBtn.addEventListener('click', () => this.exportDeck('pdf'));

      const exportPrintBtn = this.drawerEl.querySelector('#ytsnip-export-print');
      exportPrintBtn.addEventListener('click', () => this.exportDeck('print'));

      const exportZipBtn = this.drawerEl.querySelector('#ytsnip-export-zip');
      exportZipBtn.addEventListener('click', () => this.exportDeck('zip'));

      const clearBtn = this.drawerEl.querySelector('#ytsnip-clear-btn');
      clearBtn.addEventListener('click', () => {
        if (this.slides.length === 0) return;
        if (confirm(`Remove all ${this.slides.length} slides from this deck?`)) {
          this.clearAll();
        }
      });
    }

    updateCurrentVideoTime(time) {
      if (typeof time === 'number' && !isNaN(time)) {
        this.currentVideoTime = Math.max(0, time);
        const textEl = this.drawerEl ? this.drawerEl.querySelector('#ytsnip-scan-current-text') : null;
        if (textEl) {
          const formatted = (global.SlideScanner && global.SlideScanner.formatTime)
            ? global.SlideScanner.formatTime(this.currentVideoTime)
            : `${Math.floor(this.currentVideoTime)}s`;
          textEl.textContent = `From Current (${formatted})`;
        }
      }
    }

    open() {
      this.isOpen = true;
      if (this.callbacks.onGetCurrentTime) {
        try {
          const curTime = this.callbacks.onGetCurrentTime();
          this.updateCurrentVideoTime(curTime);
        } catch (e) {}
      }
      if (this.backdropEl) this.backdropEl.classList.add('ytsnip-open');
      if (this.drawerEl) this.drawerEl.classList.add('ytsnip-open');
    }

    close() {
      this.isOpen = false;
      if (this.backdropEl) this.backdropEl.classList.remove('ytsnip-open');
      if (this.drawerEl) this.drawerEl.classList.remove('ytsnip-open');
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    showToast(message, duration = 2200, isSubtle = false) {
      if (!this.toastEl) return;
      const textEl = this.toastEl.querySelector('#ytsnip-toast-text');
      if (textEl) textEl.textContent = message;
      if (isSubtle) {
        this.toastEl.classList.add('ytsnip-toast-subtle');
      } else {
        this.toastEl.classList.remove('ytsnip-toast-subtle');
      }
      this.toastEl.classList.add('ytsnip-toast-visible');

      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        if (this.toastEl) {
          this.toastEl.classList.remove('ytsnip-toast-visible');
          this.toastEl.classList.remove('ytsnip-toast-subtle');
        }
      }, duration);
    }

    async loadForVideo(videoId, videoTitle = '') {
      const currentGen = ++this._loadGeneration;
      const isDifferentVideo = this.videoId !== videoId;
      this.videoId = videoId;
      this.videoTitle = videoTitle || (typeof document !== 'undefined' ? document.title.replace(/ - YouTube$/, '') : '') || 'YouTube Presentation';

      if (isDifferentVideo) {
        this.slides = [];
      }

      if (!videoId) return;

      try {
        const stored = await DeckStorage.getDeck(videoId);

        // Discard stale load if user navigated away or newer load was dispatched
        if (this._loadGeneration !== currentGen || this.videoId !== videoId) {
          return;
        }

        const storedSlides = (stored && Array.isArray(stored)) ? stored.map(s => ({
          ...s,
          selected: s.selected !== false
        })) : [];

        // Preserve and merge any freshly snapped slides added while loadForVideo was in-flight
        if (this.slides.length > 0) {
          const existingIds = new Set(storedSlides.map(s => s.id));
          const inFlightSnaps = this.slides.filter(s => !existingIds.has(s.id));
          const merged = [...storedSlides];
          for (const fresh of inFlightSnaps) {
            const idx = merged.findIndex(s => Math.abs(s.timestamp - fresh.timestamp) < 1.0);
            if (idx !== -1) {
              merged[idx] = fresh;
            } else {
              merged.push(fresh);
            }
          }
          merged.sort((a, b) => a.timestamp - b.timestamp);
          this.slides = merged;
          this._saveSlides();
        } else {
          this.slides = storedSlides;
        }

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get(['ytsnip_capture_mode']);
          if (res && res.ytsnip_capture_mode) {
            this.captureMode = res.ytsnip_capture_mode;
            const modeSelect = this.drawerEl ? this.drawerEl.querySelector('#ytsnip-mode-select') : null;
            if (modeSelect) modeSelect.value = this.captureMode;
          }
        }
      } catch (err) {
        console.warn('Could not load stored slides:', err);
      }

      this._renderGrid();
    }

    async _saveSlides() {
      if (!this.videoId) return;
      try {
        await DeckStorage.saveDeck(this.videoId, this.videoTitle, this.slides);
      } catch (err) {
        console.warn('Could not save slides to storage:', err);
      }
    }

    getSelectedSlides() {
      return this.slides.filter(s => s.selected !== false);
    }

    toggleSlideSelection(slideId) {
      const slide = this.slides.find(s => s.id === slideId);
      if (slide) {
        slide.selected = slide.selected === false ? true : false;
        this._saveSlides();
        this._renderGrid();
      }
    }

    selectAll() {
      if (this.slides.length === 0) return;
      this.slides.forEach(s => { s.selected = true; });
      this._saveSlides();
      this._renderGrid();
      this.showToast('All slides selected');
    }

    deselectAll() {
      if (this.slides.length === 0) return;
      this.slides.forEach(s => { s.selected = false; });
      this._saveSlides();
      this._renderGrid();
      this.showToast('All slides deselected');
    }

    addSlide(slide, notify = true) {
      const slideItem = {
        ...slide,
        selected: slide.selected !== false
      };

      // Check if already in deck at very close timestamp (<1s)
      const existingIdx = this.slides.findIndex(s => Math.abs(s.timestamp - slideItem.timestamp) < 1.0);
      if (existingIdx !== -1) {
        this.slides[existingIdx] = slideItem;
      } else {
        this.slides.push(slideItem);
        // Keep sorted by timestamp
        this.slides.sort((a, b) => a.timestamp - b.timestamp);
      }

      this._saveSlides();
      this._renderGrid();

      if (notify) {
        this.showToast(`Slide captured at ${slideItem.formattedTime}! (Total: ${this.slides.length})`);
      }
    }

    updateSlide(index, slide) {
      if (typeof index !== 'number' || index < 0 || index >= this.slides.length) {
        return;
      }
      const existing = this.slides[index];
      Object.assign(existing, slide, {
        id: existing.id,
        selected: existing.selected !== false
      });
      this._saveSlides();

      // Update DOM card directly without full re-render
      if (typeof document !== 'undefined' && this.drawerEl) {
        const card = this.drawerEl.querySelector(`.ytsnip-card[data-slide-id="${existing.id}"]`);
        if (card) {
          const img = card.querySelector('.ytsnip-card-img');
          const time = card.querySelector('.ytsnip-card-time');
          const jumpBtn = card.querySelector('.ytsnip-card-btn-jump');
          if (img && slide.dataUrl) img.src = slide.dataUrl;
          if (time && slide.formattedTime) time.textContent = slide.formattedTime;
          if (jumpBtn && slide.formattedTime) jumpBtn.title = `Jump to ${slide.formattedTime} in video`;
        }
      }
    }

    removeSlide(slideId) {
      this.slides = this.slides.filter(s => s.id !== slideId);
      this._saveSlides();
      this._renderGrid();
    }

    duplicateSlide(slideId) {
      const index = this.slides.findIndex(s => s.id === slideId);
      if (index === -1) return;
      const original = this.slides[index];
      const clone = {
        ...original,
        id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: original.timestamp + 0.001,
        selected: original.selected !== false
      };
      // Insert immediately after the duplicated slide
      this.slides.splice(index + 1, 0, clone);
      this._saveSlides();
      this._renderGrid();
      this.showToast(`Slide #${index + 1} duplicated!`);
    }

    clearAll() {
      const vid = this.videoId;
      this.slides = [];
      if (vid) {
        DeckStorage.deleteDeck(vid).catch(() => {});
      }
      this._renderGrid();
      this.showToast('Slide deck cleared');
    }

    showScanBanner(show = true) {
      const banner = this.drawerEl.querySelector('#ytsnip-scan-banner');
      const scanActions = this.drawerEl.querySelector('#ytsnip-scan-actions');
      if (show) {
        if (banner) banner.style.display = 'flex';
        if (scanActions) scanActions.style.display = 'none';
      } else {
        if (banner) banner.style.display = 'none';
        if (scanActions) scanActions.style.display = 'flex';
      }
    }

    updateScanProgress({ percentage, formattedCurrent, formattedTotal, etaSeconds, slidesCount }) {
      const progressFill = this.drawerEl.querySelector('#ytsnip-progress-fill');
      const scanStatus = this.drawerEl.querySelector('#ytsnip-scan-status');
      const scanEta = this.drawerEl.querySelector('#ytsnip-scan-eta');
      const scanTime = this.drawerEl.querySelector('#ytsnip-scan-time');

      if (progressFill) progressFill.style.width = `${Math.min(100, percentage)}%`;
      if (scanStatus) scanStatus.textContent = `Scanning: ${slidesCount} slides found (${Math.round(percentage)}%)`;
      if (scanEta) scanEta.textContent = etaSeconds > 0 ? `ETA: ~${etaSeconds}s` : 'Finishing...';
      if (scanTime) scanTime.textContent = `${formattedCurrent} / ${formattedTotal}`;
    }

    _renderGrid() {
      if (typeof document === 'undefined' || !this.drawerEl) return;

      const grid = this.drawerEl.querySelector('#ytsnip-grid');
      const empty = this.drawerEl.querySelector('#ytsnip-empty-state');
      const badge = this.drawerEl.querySelector('#ytsnip-badge');
      const footerInfo = this.drawerEl.querySelector('#ytsnip-footer-info');
      const selectionRibbon = this.drawerEl.querySelector('#ytsnip-selection-ribbon');
      const selectionCountEl = this.drawerEl.querySelector('#ytsnip-selection-count');
      const exportBtns = this.drawerEl.querySelectorAll('.ytsnip-export-btn');

      const selectedSlides = this.getSelectedSlides();
      const selectedCount = selectedSlides.length;
      const totalCount = this.slides.length;

      // Update badge count in YouTube player controls if available
      const ytBadge = document.querySelector('.ytsnip-yt-badge');
      if (ytBadge) {
        ytBadge.textContent = totalCount;
        ytBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
      }

      if (badge) badge.textContent = `${totalCount} slide${totalCount === 1 ? '' : 's'}`;
      if (footerInfo) footerInfo.textContent = `${selectedCount} of ${totalCount} slide${totalCount === 1 ? '' : 's'} selected`;

      if (selectionRibbon) {
        selectionRibbon.style.display = totalCount > 0 ? 'flex' : 'none';
      }
      if (selectionCountEl) {
        selectionCountEl.textContent = `${selectedCount} of ${totalCount} selected`;
      }

      if (exportBtns) {
        exportBtns.forEach(btn => {
          btn.disabled = selectedCount === 0;
        });
      }

      if (totalCount === 0) {
        if (empty) empty.style.display = 'flex';
        if (grid) {
          grid.style.display = 'none';
          grid.innerHTML = '';
        }
        return;
      }

      if (empty) empty.style.display = 'none';
      if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = '';
      }

      if (createSlideCard) {
        this.slides.forEach((slide, index) => {
          const card = createSlideCard(slide, index, this, grid);
          if (grid && card) {
            grid.appendChild(card);
          }
        });
      }
    }

    _showLightbox(startIndex = 0) {
      if (SlideLightbox && typeof SlideLightbox.show === 'function') {
        SlideLightbox.show(this.slides, startIndex);
      }
    }

    async exportDeck(type) {
      if (this.slides.length === 0) {
        this.showToast('No slides in deck! Capture or scan first.');
        return;
      }

      const selectedSlides = this.getSelectedSlides();
      if (selectedSlides.length === 0) {
        this.showToast('No slides selected! Select at least one slide to export.');
        return;
      }

      const exporter = global.SlideExporter || (typeof window !== 'undefined' ? window.SlideExporter : null);
      if (!exporter) {
        this.showToast('Exporter module not loaded');
        return;
      }

      const title = this.videoTitle || 'YouTube Presentation';
      const slideCountText = `${selectedSlides.length} slide${selectedSlides.length === 1 ? '' : 's'}`;
      this.showToast(`Generating ${type.toUpperCase()} (${slideCountText})... Please wait.`);

      try {
        if (type === 'pptx') {
          await exporter.exportToPPTX(selectedSlides, title);
        } else if (type === 'pdf') {
          await exporter.exportToPDF(selectedSlides, title);
        } else if (type === 'print') {
          await exporter.printSlides(selectedSlides, title);
        } else if (type === 'zip') {
          await exporter.exportToZIP(selectedSlides, title);
        }
        if (type !== 'print') {
          this.showToast(`${type.toUpperCase()} exported successfully! (${slideCountText})`);
        }
      } catch (err) {
        console.error('Export error:', err);
        this.showToast(`Export failed: ${err.message}`);
      }
    }
  }

  SlideDrawer.DeckStorage = DeckStorage;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideDrawer;
  } else {
    global.SlideDrawer = SlideDrawer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
