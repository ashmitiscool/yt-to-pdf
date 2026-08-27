/**
 * YT to PDF - Interactive Slide Deck Drawer UI
 */

(function (global) {
  'use strict';

  const ICONS = {
    camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
    scan: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    deck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    duplicate: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    play: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    pptx: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    pdf: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
    print: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
    zip: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`
  };

  class SlideDrawer {
    constructor() {
      this.slides = [];
      this.videoId = null;
      this.videoTitle = 'YouTube Presentation';
      this.isOpen = false;
      this.sensitivity = 'medium';
      this.scanInterval = 2;

      this.callbacks = {
        onStartScan: () => {},
        onStopScan: () => {},
        onSeekVideo: (time) => {}
      };

      this._buildDOM();
    }

    setCallbacks({ onStartScan, onStopScan, onSeekVideo }) {
      if (onStartScan) this.callbacks.onStartScan = onStartScan;
      if (onStopScan) this.callbacks.onStopScan = onStopScan;
      if (onSeekVideo) this.callbacks.onSeekVideo = onSeekVideo;
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
            <span class="ytsnip-logo-icon">${ICONS.deck}</span>
            <h3 class="ytsnip-title">Slide Deck</h3>
            <span class="ytsnip-count-badge" id="ytsnip-badge">0 slides</span>
          </div>
          <button class="ytsnip-close-btn" id="ytsnip-close-btn" title="Close Drawer">
            ${ICONS.close}
          </button>
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
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>Sensitivity:</span>
            <select class="ytsnip-select" id="ytsnip-sensitivity-select">
              <option value="high">High (Subtle changes)</option>
              <option value="medium" selected>Balanced (Standard)</option>
              <option value="low">Low (Major slides only)</option>
            </select>
          </div>
          <button class="ytsnip-scan-btn ytsnip-scan-btn-primary" id="ytsnip-start-scan-btn">
            ${ICONS.scan} Auto-Scan Video
          </button>
        </div>

        <div class="ytsnip-body" id="ytsnip-body">
          <div class="ytsnip-empty-state" id="ytsnip-empty-state">
            <div class="ytsnip-empty-icon">${ICONS.deck}</div>
            <p><strong>No slides in deck yet</strong></p>
            <p style="font-size: 12px; margin: 0;">Click <strong>Auto-Scan</strong> above to extract all slides, or press <strong>Alt+S</strong> (or the camera button on the player) to snap slides manually.</p>
          </div>
          <div class="ytsnip-slides-grid" id="ytsnip-grid" style="display: none;"></div>
        </div>

        <div class="ytsnip-footer">
          <div class="ytsnip-export-row">
            <button class="ytsnip-export-btn ytsnip-export-pptx" id="ytsnip-export-pptx">
              ${ICONS.pptx} PowerPoint (.pptx)
            </button>
            <button class="ytsnip-export-btn ytsnip-export-pdf" id="ytsnip-export-pdf">
              ${ICONS.pdf} PDF Document
            </button>
          </div>
          <div class="ytsnip-export-row">
            <button class="ytsnip-export-btn ytsnip-export-print" id="ytsnip-export-print">
              ${ICONS.print} Print Slides
            </button>
            <button class="ytsnip-export-btn ytsnip-export-zip" id="ytsnip-export-zip">
              ${ICONS.zip} Images (.zip)
            </button>
          </div>
          <div class="ytsnip-footer-secondary">
            <span style="color: #777;" id="ytsnip-footer-info">0 slides ready</span>
            <button class="ytsnip-btn-link" id="ytsnip-clear-btn">Clear Deck</button>
          </div>
        </div>
      `;

      // Toast notification element
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'ytsnip-toast';
      this.toastEl.innerHTML = `<span class="ytsnip-toast-icon">${ICONS.check}</span> <span id="ytsnip-toast-text">Slide Captured!</span>`;

      document.body.appendChild(this.backdropEl);
      document.body.appendChild(this.drawerEl);
      document.body.appendChild(this.toastEl);

      this._bindEvents();
    }

    _bindEvents() {
      const closeBtn = this.drawerEl.querySelector('#ytsnip-close-btn');
      closeBtn.addEventListener('click', () => this.close());

      const startScanBtn = this.drawerEl.querySelector('#ytsnip-start-scan-btn');
      startScanBtn.addEventListener('click', () => {
        this.callbacks.onStartScan({
          sensitivity: this.sensitivity,
          stepSeconds: this.scanInterval
        });
      });

      const cancelScanBtn = this.drawerEl.querySelector('#ytsnip-cancel-scan-btn');
      cancelScanBtn.addEventListener('click', () => {
        this.callbacks.onStopScan();
      });

      const sensitivitySelect = this.drawerEl.querySelector('#ytsnip-sensitivity-select');
      sensitivitySelect.addEventListener('change', (e) => {
        this.sensitivity = e.target.value;
      });

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

    open() {
      this.isOpen = true;
      this.backdropEl.classList.add('ytsnip-open');
      this.drawerEl.classList.add('ytsnip-open');
    }

    close() {
      this.isOpen = false;
      this.backdropEl.classList.remove('ytsnip-open');
      this.drawerEl.classList.remove('ytsnip-open');
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    showToast(message, duration = 2200) {
      const textEl = this.toastEl.querySelector('#ytsnip-toast-text');
      if (textEl) textEl.textContent = message;
      this.toastEl.classList.add('ytsnip-toast-visible');

      if (this._toastTimer) clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('ytsnip-toast-visible');
      }, duration);
    }

    async loadForVideo(videoId, videoTitle = '') {
      this.videoId = videoId;
      this.videoTitle = videoTitle || document.title.replace(/ - YouTube$/, '') || 'YouTube Presentation';
      this.slides = [];

      if (!videoId) return;

      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get([`ytsnip_deck_${videoId}`]);
          const stored = res[`ytsnip_deck_${videoId}`];
          if (stored && Array.isArray(stored)) {
            this.slides = stored;
          }
        }
      } catch (err) {
        console.warn('Could not load stored slides:', err);
      }

      this._renderGrid();
    }

    _saveSlides() {
      if (!this.videoId) return;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            [`ytsnip_deck_${this.videoId}`]: this.slides
          });
        }
      } catch (err) {
        console.warn('Could not save slides to local storage:', err);
      }
    }

    addSlide(slide, notify = true) {
      // Check if already in deck at very close timestamp (<1s)
      const existingIdx = this.slides.findIndex(s => Math.abs(s.timestamp - slide.timestamp) < 1.0);
      if (existingIdx !== -1) {
        this.slides[existingIdx] = slide;
      } else {
        this.slides.push(slide);
        // Keep sorted by timestamp
        this.slides.sort((a, b) => a.timestamp - b.timestamp);
      }

      this._saveSlides();
      this._renderGrid();

      if (notify) {
        this.showToast(`Slide captured at ${slide.formattedTime}! (Total: ${this.slides.length})`);
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
        timestamp: original.timestamp + 0.001
      };
      // Insert immediately after the duplicated slide
      this.slides.splice(index + 1, 0, clone);
      this._saveSlides();
      this._renderGrid();
      this.showToast(`Slide #${index + 1} duplicated!`);
    }

    clearAll() {
      this.slides = [];
      this._saveSlides();
      this._renderGrid();
      this.showToast('Slide deck cleared');
    }

    showScanBanner(show = true) {
      const banner = this.drawerEl.querySelector('#ytsnip-scan-banner');
      const startBtn = this.drawerEl.querySelector('#ytsnip-start-scan-btn');
      if (show) {
        banner.style.display = 'flex';
        startBtn.style.display = 'none';
      } else {
        banner.style.display = 'none';
        startBtn.style.display = 'inline-flex';
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
      const grid = this.drawerEl.querySelector('#ytsnip-grid');
      const empty = this.drawerEl.querySelector('#ytsnip-empty-state');
      const badge = this.drawerEl.querySelector('#ytsnip-badge');
      const footerInfo = this.drawerEl.querySelector('#ytsnip-footer-info');

      // Update badge count in YouTube player controls if available
      const ytBadge = document.querySelector('.ytsnip-yt-badge');
      if (ytBadge) {
        ytBadge.textContent = this.slides.length;
        ytBadge.style.display = this.slides.length > 0 ? 'inline-block' : 'none';
      }

      badge.textContent = `${this.slides.length} slide${this.slides.length === 1 ? '' : 's'}`;
      footerInfo.textContent = `${this.slides.length} slide${this.slides.length === 1 ? '' : 's'} ready`;

      if (this.slides.length === 0) {
        empty.style.display = 'flex';
        grid.style.display = 'none';
        grid.innerHTML = '';
        return;
      }

      empty.style.display = 'none';
      grid.style.display = 'grid';
      grid.innerHTML = '';

      this.slides.forEach((slide, index) => {
        const card = document.createElement('div');
        card.className = 'ytsnip-card';
        card.draggable = true;
        card.dataset.index = index;
        card.title = 'Drag to rearrange | Click preview to zoom';

        card.innerHTML = `
          <div class="ytsnip-card-preview">
            <img class="ytsnip-card-img" src="${slide.dataUrl}" alt="Slide ${index + 1}" />
            <span class="ytsnip-card-index"><span class="ytsnip-grip-dots">⠿</span> #${index + 1}</span>
            <span class="ytsnip-card-time">${slide.formattedTime}</span>
          </div>
          <div class="ytsnip-card-actions">
            <button class="ytsnip-card-btn ytsnip-card-btn-jump" title="Jump to ${slide.formattedTime} in video">
              ${ICONS.play}
            </button>
            <button class="ytsnip-card-btn ytsnip-card-btn-duplicate" title="Duplicate this slide">
              ${ICONS.duplicate}
            </button>
            <button class="ytsnip-card-btn ytsnip-card-btn-copy" title="Copy slide image to clipboard">
              ${ICONS.copy}
            </button>
            <button class="ytsnip-card-btn ytsnip-card-btn-delete" title="Delete slide">
              ${ICONS.trash}
            </button>
          </div>
        `;

        // --- Drag and Drop Reordering ---
        card.addEventListener('dragstart', (e) => {
          if (e.target.closest('.ytsnip-card-btn')) {
            e.preventDefault();
            return;
          }
          this._draggedIndex = index;
          card.classList.add('ytsnip-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (this._draggedIndex !== null && this._draggedIndex !== index) {
            card.classList.add('ytsnip-drag-over');
          }
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('ytsnip-drag-over');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('ytsnip-drag-over');
          const fromIndex = this._draggedIndex !== null ? this._draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
          const toIndex = index;

          if (!isNaN(fromIndex) && fromIndex !== toIndex && fromIndex >= 0 && fromIndex < this.slides.length) {
            const [movedSlide] = this.slides.splice(fromIndex, 1);
            this.slides.splice(toIndex, 0, movedSlide);
            this._saveSlides();
            this._renderGrid();
            this.showToast(`Slide moved to #${toIndex + 1}`);
          }
          this._draggedIndex = null;
        });

        card.addEventListener('dragend', () => {
          this._draggedIndex = null;
          card.classList.remove('ytsnip-dragging');
          grid.querySelectorAll('.ytsnip-card').forEach(c => {
            c.classList.remove('ytsnip-drag-over', 'ytsnip-dragging');
          });
        });

        // Preview click -> lightbox zoom
        const preview = card.querySelector('.ytsnip-card-preview');
        preview.addEventListener('click', (e) => {
          // Only open lightbox if not dragging
          if (!card.classList.contains('ytsnip-dragging')) {
            this._showLightbox(slide.dataUrl);
          }
        });

        // Jump button
        const jumpBtn = card.querySelector('.ytsnip-card-btn-jump');
        jumpBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.callbacks.onSeekVideo(slide.timestamp);
          this.showToast(`Jumped to ${slide.formattedTime}`);
        });

        // Duplicate button
        const dupBtn = card.querySelector('.ytsnip-card-btn-duplicate');
        dupBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.duplicateSlide(slide.id);
        });

        // Copy button
        const copyBtn = card.querySelector('.ytsnip-card-btn-copy');
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const exporter = global.SlideExporter || window.SlideExporter;
          if (exporter) {
            const ok = await exporter.copySlideToClipboard(slide.dataUrl);
            if (ok) this.showToast('Slide copied to clipboard!');
            else this.showToast('Could not copy slide');
          }
        });

        // Delete button
        const deleteBtn = card.querySelector('.ytsnip-card-btn-delete');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeSlide(slide.id);
        });

        grid.appendChild(card);
      });
    }

    _showLightbox(dataUrl) {
      const box = document.createElement('div');
      box.className = 'ytsnip-lightbox';
      box.innerHTML = `<img src="${dataUrl}" alt="Zoomed Slide" />`;
      box.addEventListener('click', () => {
        document.body.removeChild(box);
      });
      document.body.appendChild(box);
    }

    async exportDeck(type) {
      if (this.slides.length === 0) {
        this.showToast('No slides to export! Capture or scan first.');
        return;
      }

      const exporter = global.SlideExporter || window.SlideExporter;
      if (!exporter) {
        this.showToast('Exporter module not loaded');
        return;
      }

      const title = this.videoTitle || 'YouTube Presentation';
      this.showToast(`Generating ${type.toUpperCase()}... Please wait.`);

      try {
        if (type === 'pptx') {
          await exporter.exportToPPTX(this.slides, title);
        } else if (type === 'pdf') {
          await exporter.exportToPDF(this.slides, title);
        } else if (type === 'print') {
          await exporter.printSlides(this.slides, title);
        } else if (type === 'zip') {
          await exporter.exportToZIP(this.slides, title);
        }
        if (type !== 'print') {
          this.showToast(`${type.toUpperCase()} exported successfully!`);
        }
      } catch (err) {
        console.error('Export error:', err);
        this.showToast(`Export failed: ${err.message}`);
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideDrawer;
  } else {
    global.SlideDrawer = SlideDrawer;
  }
})(typeof window !== 'undefined' ? window : globalThis);
