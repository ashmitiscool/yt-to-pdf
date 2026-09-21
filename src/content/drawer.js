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

  const DB_NAME = 'YTSnipDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'decks';
  const MAX_LRU_DECKS = 15; // Retain up to 15 active video decks in storage

  const DeckStorage = {
    _dbPromise: null,

    _openDB() {
      if (typeof indexedDB === 'undefined') {
        return Promise.resolve(null);
      }
      if (this._dbPromise) return this._dbPromise;

      this._dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
          };

          request.onsuccess = (event) => {
            resolve(event.target.result);
          };

          request.onerror = (event) => {
            console.warn('IndexedDB open error:', event.target ? event.target.error : event);
            resolve(null);
          };
        } catch (err) {
          console.warn('IndexedDB initialization error:', err);
          resolve(null);
        }
      });

      return this._dbPromise;
    },

    async getDeck(videoId) {
      if (!videoId) return null;
      const db = await this._openDB();
      if (!db) {
        return this._getFallback(videoId);
      }

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.get(videoId);

          request.onsuccess = () => {
            const result = request.result;
            if (result && Array.isArray(result.slides)) {
              resolve(result.slides);
            } else {
              this._getFallback(videoId).then(resolve);
            }
          };

          request.onerror = () => {
            this._getFallback(videoId).then(resolve);
          };
        } catch (err) {
          this._getFallback(videoId).then(resolve);
        }
      });
    },

    async saveDeck(videoId, videoTitle, slides) {
      if (!videoId) return;
      const db = await this._openDB();
      if (!db) {
        return this._saveFallback(videoId, slides);
      }

      const record = {
        videoId,
        videoTitle: videoTitle || '',
        updatedAt: Date.now(),
        slides: slides || []
      };

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(record);

          tx.oncomplete = () => {
            this._pruneLRU(db, MAX_LRU_DECKS).catch(() => {});
            resolve(true);
          };

          tx.onerror = async (event) => {
            console.warn('IndexedDB save error, attempting LRU purge and retry:', event.target ? event.target.error : event);
            await this._pruneLRU(db, Math.max(3, Math.floor(MAX_LRU_DECKS / 2)));
            try {
              const retryTx = db.transaction(STORE_NAME, 'readwrite');
              retryTx.objectStore(STORE_NAME).put(record);
              retryTx.oncomplete = () => resolve(true);
              retryTx.onerror = () => {
                this._saveFallback(videoId, slides).then(resolve);
              };
            } catch (retryErr) {
              this._saveFallback(videoId, slides).then(resolve);
            }
          };
        } catch (err) {
          this._saveFallback(videoId, slides).then(resolve);
        }
      });
    },

    async deleteDeck(videoId) {
      if (!videoId) return;
      const db = await this._openDB();
      if (db) {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(videoId);
        } catch (e) {}
      }
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([`ytsnip_deck_${videoId}`]).catch(() => {});
      }
    },

    async _pruneLRU(db, maxAllowed) {
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const index = store.index('updatedAt');
          const countReq = store.count();

          countReq.onsuccess = () => {
            const count = countReq.result;
            if (count <= maxAllowed) {
              resolve();
              return;
            }

            const excess = count - maxAllowed;
            let deleted = 0;
            // Iterate ascending by updatedAt to delete oldest records
            const cursorReq = index.openCursor();
            cursorReq.onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor && deleted < excess) {
                store.delete(cursor.primaryKey);
                deleted++;
                cursor.continue();
              } else {
                resolve();
              }
            };
            cursorReq.onerror = () => resolve();
          };

          countReq.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    },

    async _getFallback(videoId) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const res = await chrome.storage.local.get([`ytsnip_deck_${videoId}`]);
          return res[`ytsnip_deck_${videoId}`] || null;
        } catch (e) {
          return null;
        }
      }
      return null;
    },

    async _saveFallback(videoId, slides) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          await chrome.storage.local.set({ [`ytsnip_deck_${videoId}`]: slides });
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  };

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
              ${ICONS.scan} Scan All (0:00)
            </button>
            <button class="ytsnip-scan-btn ytsnip-scan-btn-secondary" id="ytsnip-scan-current-btn" title="Scan slides starting from current video timestamp">
              ${ICONS.play} <span id="ytsnip-scan-current-text">From Current (00:00)</span>
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
            <span style="color: #777;" id="ytsnip-footer-info">0 of 0 slides selected</span>
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

      this.slides.forEach((slide, index) => {
        const isSelected = slide.selected !== false;
        const card = document.createElement('div');
        card.className = `ytsnip-card ${isSelected ? '' : 'ytsnip-card-deselected'}`;
        card.draggable = true;
        card.dataset.index = index;
        card.dataset.slideId = slide.id;
        card.title = 'Drag to rearrange | Click preview to zoom';

        card.innerHTML = `
          <div class="ytsnip-card-preview">
            <img class="ytsnip-card-img" src="${slide.dataUrl}" alt="Slide ${index + 1}" />
            <span class="ytsnip-card-index"><span class="ytsnip-grip-dots">⠿</span> #${index + 1}</span>
            <label class="ytsnip-card-select-toggle" title="${isSelected ? 'Deselect slide from export' : 'Select slide for export'}">
              <input type="checkbox" class="ytsnip-card-checkbox" ${isSelected ? 'checked' : ''} />
              <span class="ytsnip-checkbox-custom">
                ${ICONS.check}
              </span>
            </label>
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

        // Selection Toggle Event
        const selectToggle = card.querySelector('.ytsnip-card-select-toggle');
        if (selectToggle) {
          selectToggle.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          const checkbox = selectToggle.querySelector('.ytsnip-card-checkbox');
          if (checkbox) {
            checkbox.addEventListener('change', (e) => {
              e.stopPropagation();
              this.toggleSlideSelection(slide.id);
            });
          }
        }

        // --- Drag and Drop Reordering ---
        card.addEventListener('dragstart', (e) => {
          if (e.target.closest('.ytsnip-card-btn') || e.target.closest('.ytsnip-card-select-toggle')) {
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
          if (grid) {
            grid.querySelectorAll('.ytsnip-card').forEach(c => {
              c.classList.remove('ytsnip-drag-over', 'ytsnip-dragging');
            });
          }
        });

        // Preview click -> lightbox zoom
        const preview = card.querySelector('.ytsnip-card-preview');
        if (preview) {
          preview.addEventListener('click', (e) => {
            if (e.target.closest('.ytsnip-card-select-toggle')) return;
            // Only open lightbox if not dragging
            if (!card.classList.contains('ytsnip-dragging')) {
              this._showLightbox(index);
            }
          });
        }

        // Jump button
        const jumpBtn = card.querySelector('.ytsnip-card-btn-jump');
        if (jumpBtn) {
          jumpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentSlide = this.slides.find(s => s.id === slide.id) || slide;
            this.callbacks.onSeekVideo(currentSlide.timestamp);
            this.showToast(`Jumped to ${currentSlide.formattedTime}`);
          });
        }

        // Duplicate button
        const dupBtn = card.querySelector('.ytsnip-card-btn-duplicate');
        if (dupBtn) {
          dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.duplicateSlide(slide.id);
          });
        }

        // Copy button
        const copyBtn = card.querySelector('.ytsnip-card-btn-copy');
        if (copyBtn) {
          copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const exporter = global.SlideExporter || (typeof window !== 'undefined' ? window.SlideExporter : null);
            if (exporter) {
              const currentSlide = this.slides.find(s => s.id === slide.id) || slide;
              const ok = await exporter.copySlideToClipboard(currentSlide.dataUrl);
              if (ok) this.showToast('Copied to clipboard', 1500, true);
              else this.showToast('Could not copy slide', 2000, true);
            }
          });
        }

        // Delete button
        const deleteBtn = card.querySelector('.ytsnip-card-btn-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeSlide(slide.id);
          });
        }

        if (grid) grid.appendChild(card);
      });
    }

    _showLightbox(startIndex = 0) {
      if (typeof document === 'undefined') return;

      let targetIndex = 0;
      if (typeof startIndex === 'number') {
        targetIndex = Math.max(0, Math.min(startIndex, this.slides.length - 1));
      } else if (typeof startIndex === 'string') {
        const found = this.slides.findIndex(s => s.dataUrl === startIndex || s.id === startIndex);
        if (found !== -1) targetIndex = found;
      }

      const box = document.createElement('div');
      box.className = 'ytsnip-lightbox';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ytsnip-lightbox-close';
      closeBtn.setAttribute('title', 'Close Preview (Esc)');
      closeBtn.innerHTML = ICONS.close;
      box.appendChild(closeBtn);

      const slidesToRender = this.slides.length > 0
        ? this.slides
        : (typeof startIndex === 'string' ? [{ dataUrl: startIndex }] : []);

      slidesToRender.forEach((slide, idx) => {
        const img = document.createElement('img');
        img.className = 'ytsnip-lightbox-img';
        img.src = slide.dataUrl;
        img.alt = `Slide ${idx + 1}`;
        img.dataset.slideIndex = idx;
        box.appendChild(img);
      });

      const closeLightbox = () => {
        document.removeEventListener('keydown', onKeyDown);
        if (box.parentNode) {
          box.parentNode.removeChild(box);
        }
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          closeLightbox();
        }
      };

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
      });

      box.addEventListener('click', (e) => {
        if (e.target === box) {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', onKeyDown);
      document.body.appendChild(box);

      const targetImg = box.querySelector(`img[data-slide-index="${targetIndex}"]`);
      if (targetImg) {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (typeof targetImg.scrollIntoView === 'function') {
              targetImg.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
          });
        } else if (typeof targetImg.scrollIntoView === 'function') {
          targetImg.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
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
