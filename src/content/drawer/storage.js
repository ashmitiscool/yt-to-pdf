/**
 * YT to PDF - Slide Deck Storage Engine
 * Manages presentation deck persistence via IndexedDB with LRU pruning
 * and graceful fallback to chrome.storage.local.
 */

(function (global) {
  'use strict';

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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeckStorage;
  } else {
    global.SlideDeckStorage = DeckStorage;
  }
})(typeof window !== 'undefined' ? window : globalThis);
