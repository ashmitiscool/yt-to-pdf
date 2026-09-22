const assert = require('assert');
const SlideDrawer = require('../src/content/drawer.js');

console.log('=== Running SlideDrawer Selection Tests ===\n');

// Mock IndexedDB
const idbStores = {
  decks: { data: new Map() }
};

global.indexedDB = {
  open: (dbName, version) => {
    const db = {
      objectStoreNames: {
        contains: (name) => !!idbStores[name]
      },
      createObjectStore: (name) => {
        if (!idbStores[name]) idbStores[name] = { data: new Map() };
        return {
          createIndex: () => {}
        };
      },
      transaction: (storeNames, mode) => {
        const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
        const store = idbStores[storeName] || (idbStores[storeName] = { data: new Map() });
        const tx = {
          oncomplete: null,
          onerror: null,
          objectStore: () => ({
            get: (key) => {
              const req = { onsuccess: null, onerror: null, result: store.data.get(key) || null };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 1);
              return req;
            },
            put: (record) => {
              store.data.set(record.videoId, record);
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess({ target: req });
                if (tx.oncomplete) tx.oncomplete();
              }, 1);
              return req;
            },
            delete: (key) => {
              store.data.delete(key);
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess({ target: req });
                if (tx.oncomplete) tx.oncomplete();
              }, 1);
              return req;
            },
            count: () => {
              const req = { onsuccess: null, onerror: null, result: store.data.size };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess({ target: req });
              }, 1);
              return req;
            },
            index: () => ({
              openCursor: () => {
                const sorted = Array.from(store.data.values()).sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
                let idx = 0;
                const req = { onsuccess: null, onerror: null };
                const advance = () => {
                  if (idx < sorted.length) {
                    const item = sorted[idx];
                    const cursor = {
                      primaryKey: item.videoId,
                      value: item,
                      continue: () => {
                        idx++;
                        advance();
                      }
                    };
                    req.result = cursor;
                    setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 1);
                  } else {
                    req.result = null;
                    setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 1);
                  }
                };
                setTimeout(advance, 1);
                return req;
              }
            })
          })
        };
        return tx;
      }
    };

    const req = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: db
    };

    setTimeout(() => {
      if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 1);

    return req;
  }
};

// Mock chrome storage
let storageData = {};
global.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        if (!keys) return { ...storageData };
        const keyList = Array.isArray(keys) ? keys : [keys];
        const res = {};
        for (const k of keyList) {
          if (storageData[k] !== undefined) res[k] = storageData[k];
        }
        return res;
      },
      set: async (items) => {
        Object.assign(storageData, items);
      },
      remove: async (keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) {
          delete storageData[k];
        }
      }
    }
  }
};

(async () => {
  const drawer = new SlideDrawer();
  drawer.videoId = 'test_video_123';

  // Test 1: New slides are selected by default
  const slide1 = { id: 's1', timestamp: 10, formattedTime: '00:10', dataUrl: 'data:image/jpeg;base64,aaa' };
  const slide2 = { id: 's2', timestamp: 20, formattedTime: '00:20', dataUrl: 'data:image/jpeg;base64,bbb' };
  const slide3 = { id: 's3', timestamp: 30, formattedTime: '00:30', dataUrl: 'data:image/jpeg;base64,ccc' };

  drawer.addSlide(slide1, false);
  drawer.addSlide(slide2, false);
  drawer.addSlide(slide3, false);

  assert.strictEqual(drawer.slides.length, 3, 'Drawer should contain 3 slides');
  assert.strictEqual(drawer.slides[0].selected, true, 'Slide 1 should be selected by default');
  assert.strictEqual(drawer.slides[1].selected, true, 'Slide 2 should be selected by default');
  assert.strictEqual(drawer.slides[2].selected, true, 'Slide 3 should be selected by default');
  assert.strictEqual(drawer.getSelectedSlides().length, 3, 'All 3 slides should be in getSelectedSlides()');
  console.log('✔ Test 1 Passed: Newly added slides are selected by default');

  // Test 2: toggleSlideSelection toggles individual slide selection
  drawer.toggleSlideSelection('s2');
  assert.strictEqual(drawer.slides[1].selected, false, 'Slide 2 should now be deselected');
  assert.strictEqual(drawer.getSelectedSlides().length, 2, 'getSelectedSlides() should return 2 slides');
  assert.deepStrictEqual(drawer.getSelectedSlides().map(s => s.id), ['s1', 's3'], 'Selected slides should be s1 and s3');

  drawer.toggleSlideSelection('s2');
  assert.strictEqual(drawer.slides[1].selected, true, 'Slide 2 should now be re-selected');
  assert.strictEqual(drawer.getSelectedSlides().length, 3, 'getSelectedSlides() should return all 3 slides');
  console.log('✔ Test 2 Passed: Individual slide selection toggling works as expected');

  // Test 3: deselectAll deselects all slides
  drawer.deselectAll();
  assert.strictEqual(drawer.getSelectedSlides().length, 0, 'No slides should be selected after deselectAll()');
  assert.strictEqual(drawer.slides.every(s => s.selected === false), true, 'Every slide should have selected === false');
  console.log('✔ Test 3 Passed: deselectAll() deselects all slides in deck');

  // Test 4: selectAll selects all slides
  drawer.selectAll();
  assert.strictEqual(drawer.getSelectedSlides().length, 3, 'All 3 slides should be selected after selectAll()');
  assert.strictEqual(drawer.slides.every(s => s.selected === true), true, 'Every slide should have selected === true');
  console.log('✔ Test 4 Passed: selectAll() selects all slides in deck');

  // Test 5: Selective export only passes selected slides
  drawer.toggleSlideSelection('s1'); // s1 deselected, s2 & s3 selected
  let exportedSlidesPassed = null;
  global.SlideExporter = {
    exportToPPTX: async (slides, title) => {
      exportedSlidesPassed = slides;
    }
  };

  await drawer.exportDeck('pptx');
  assert.strictEqual(exportedSlidesPassed.length, 2, 'Only 2 selected slides should be sent to exportToPPTX');
  assert.deepStrictEqual(exportedSlidesPassed.map(s => s.id), ['s2', 's3'], 'Exported slides should match selected subset');
  console.log('✔ Test 5 Passed: exportDeck passes only selected subset of slides to exporter');

  // Test 6: Zero selected slides halts export with feedback
  drawer.deselectAll();
  let toastMsg = '';
  drawer.showToast = (msg) => { toastMsg = msg; };
  exportedSlidesPassed = null;

  await drawer.exportDeck('pptx');
  assert.strictEqual(exportedSlidesPassed, null, 'Exporter should not be called when 0 slides are selected');
  assert.ok(toastMsg.includes('No slides selected'), 'Feedback toast should indicate no slides selected');
  console.log('✔ Test 6 Passed: Export is safely aborted when 0 slides are selected');

  // Test 7: updateSlide updates slide in-place without altering deck length or ID
  {
    drawer.selectAll();
    const originalSlideCount = drawer.slides.length;
    const originalId = drawer.slides[1].id;

    drawer.updateSlide(1, {
      timestamp: 25,
      formattedTime: '00:25',
      dataUrl: 'data:image/jpeg;base64,updated_bbb'
    });

    assert.strictEqual(drawer.slides.length, originalSlideCount, 'Deck length must not change after updateSlide');
    assert.strictEqual(drawer.slides[1].id, originalId, 'Slide ID must remain unchanged after updateSlide');
    assert.strictEqual(drawer.slides[1].timestamp, 25, 'Timestamp must be updated to 25s');
    assert.strictEqual(drawer.slides[1].formattedTime, '00:25', 'Formatted time must be updated to 00:25');
    assert.strictEqual(drawer.slides[1].dataUrl, 'data:image/jpeg;base64,updated_bbb', 'DataURL must be updated');
    assert.strictEqual(drawer.slides[1].selected, true, 'Selection state must be preserved');
    console.log('✔ Test 7 Passed: updateSlide updates slide properties in place while preserving ID and selection');
  }

  // Test 8: updateSlide handles invalid index safely
  {
    drawer.updateSlide(-1, { timestamp: 99 });
    drawer.updateSlide(999, { timestamp: 99 });
    assert.strictEqual(drawer.slides.length, 3, 'Invalid indices must not corrupt slide deck');
    console.log('✔ Test 8 Passed: updateSlide safely ignores out-of-bounds indices');
  }

  // Test 9: loadForVideo race condition: snap slide while loadForVideo is in flight
  {
    const raceDrawer = new SlideDrawer();
    storageData['ytsnip_deck_race_vid'] = [
      { id: 'stored_s1', timestamp: 5, formattedTime: '00:05', dataUrl: 'data:stored1', selected: true }
    ];

    // Start loadForVideo (async)
    const loadPromise = raceDrawer.loadForVideo('race_vid', 'Race Test');

    // User snaps slide immediately before storage get finishes
    raceDrawer.addSlide({
      id: 'fresh_snap_1',
      timestamp: 15,
      formattedTime: '00:15',
      dataUrl: 'data:fresh1'
    }, false);

    await loadPromise;

    // The fresh snap must NOT be destroyed by the storage load
    const freshSnapExists = raceDrawer.slides.some(s => s.id === 'fresh_snap_1');
    const storedSnapExists = raceDrawer.slides.some(s => s.id === 'stored_s1');
    assert.ok(freshSnapExists, 'Freshly snapped slide must be preserved when added during loadForVideo');
    assert.ok(storedSnapExists, 'Stored slide must also be present');
    assert.strictEqual(raceDrawer.slides.length, 2, 'Deck should contain both stored and freshly snapped slide');
    console.log('✔ Test 9 Passed: Freshly snapped slide is preserved when added during loadForVideo');
  }

  // Test 10: Stale loadForVideo generation counter prevents overwriting newer video deck
  {
    const navDrawer = new SlideDrawer();
    storageData['ytsnip_deck_slow_vid'] = [
      { id: 'slow_s1', timestamp: 1, formattedTime: '00:01', dataUrl: 'data:slow', selected: true }
    ];
    storageData['ytsnip_deck_fast_vid'] = [
      { id: 'fast_s1', timestamp: 2, formattedTime: '00:02', dataUrl: 'data:fast', selected: true }
    ];

    // Simulate slow load followed immediately by navigation to fast_vid
    const slowLoad = navDrawer.loadForVideo('slow_vid', 'Slow Video');
    const fastLoad = navDrawer.loadForVideo('fast_vid', 'Fast Video');

    await Promise.all([slowLoad, fastLoad]);

    assert.strictEqual(navDrawer.videoId, 'fast_vid', 'Current video ID should be fast_vid');
    assert.strictEqual(navDrawer.slides[0].id, 'fast_s1', 'Deck should contain fast_vid slides, not slow_vid');
    console.log('✔ Test 10 Passed: Stale loadForVideo does not overwrite newer video deck');
  }

  // Test 11: Multi-video deck persistence (two videos retain their slides concurrently)
  {
    const drawer1 = new SlideDrawer();
    const drawer2 = new SlideDrawer();

    await drawer1.loadForVideo('vid_alpha', 'Video Alpha');
    drawer1.addSlide({ id: 'a1', timestamp: 10, formattedTime: '00:10', dataUrl: 'data:a1' }, false);
    await drawer1._saveSlides();

    await drawer2.loadForVideo('vid_beta', 'Video Beta');
    drawer2.addSlide({ id: 'b1', timestamp: 20, formattedTime: '00:20', dataUrl: 'data:b1' }, false);
    await drawer2._saveSlides();

    // Reload Video Alpha in a new drawer instance (simulating refresh)
    const reloadedAlpha = new SlideDrawer();
    await reloadedAlpha.loadForVideo('vid_alpha', 'Video Alpha');

    assert.strictEqual(reloadedAlpha.slides.length, 1, 'Video Alpha should retain its slide');
    assert.strictEqual(reloadedAlpha.slides[0].id, 'a1', 'Video Alpha slide ID should be a1');

    // Reload Video Beta
    const reloadedBeta = new SlideDrawer();
    await reloadedBeta.loadForVideo('vid_beta', 'Video Beta');

    assert.strictEqual(reloadedBeta.slides.length, 1, 'Video Beta should retain its slide');
    assert.strictEqual(reloadedBeta.slides[0].id, 'b1', 'Video Beta slide ID should be b1');
    console.log('✔ Test 11 Passed: Multiple video decks persist concurrently across tabs/refreshes');
  }

  // Test 12: LRU eviction prunes oldest deck when exceeding MAX_LRU_DECKS (15)
  {
    const db = await SlideDrawer.DeckStorage._openDB();
    const storeMap = idbStores.decks.data;
    storeMap.clear();

    // Insert 16 decks with sequential timestamps
    for (let i = 1; i <= 16; i++) {
      await SlideDrawer.DeckStorage.saveDeck(`lru_vid_${i}`, `Video ${i}`, [
        { id: `s_${i}`, timestamp: i, formattedTime: `00:${i}`, dataUrl: `data:${i}` }
      ]);
      // Artificially space updatedAt timestamps
      const item = storeMap.get(`lru_vid_${i}`);
      if (item) item.updatedAt = 1000 + i;
    }

    // Force prune to 15
    await SlideDrawer.DeckStorage._pruneLRU(db, 15);

    assert.strictEqual(storeMap.size, 15, 'Storage should contain exactly 15 decks after LRU pruning');
    assert.strictEqual(storeMap.has('lru_vid_1'), false, 'Oldest deck (lru_vid_1) must be evicted');
    assert.strictEqual(storeMap.has('lru_vid_16'), true, 'Newest deck (lru_vid_16) must be retained');
    assert.strictEqual(storeMap.has('lru_vid_2'), true, 'Second oldest deck (lru_vid_2) must be retained');
    console.log('✔ Test 12 Passed: LRU eviction successfully evicts oldest deck');
  }

  // Test 13: clearAll cleanly removes active deck from storage
  {
    const clearDrawer = new SlideDrawer();
    await SlideDrawer.DeckStorage.saveDeck('to_clear', 'To Clear', [
      { id: 'c1', timestamp: 1, formattedTime: '00:01', dataUrl: 'data:c1', selected: true }
    ]);
    await clearDrawer.loadForVideo('to_clear', 'To Clear');
    assert.strictEqual(clearDrawer.slides.length, 1);

    clearDrawer.clearAll();
    assert.strictEqual(clearDrawer.slides.length, 0, 'Slides array should be empty after clearAll');
    
    // Check in storage
    const stored = await SlideDrawer.DeckStorage.getDeck('to_clear');
    assert.ok(!stored || stored.length === 0, 'Storage key must be deleted/cleared on clearAll');
    console.log('✔ Test 13 Passed: clearAll cleans storage');
  }

  // Test 14: _showLightbox builds full deck scrollable image list, floating toolbar, and scrolls to target index
  {
    const previewDrawer = new SlideDrawer();
    previewDrawer.slides = [
      { id: 's1', timestamp: 10, formattedTime: '00:10', dataUrl: 'data:img1' },
      { id: 's2', timestamp: 20, formattedTime: '00:20', dataUrl: 'data:img2' },
      { id: 's3', timestamp: 30, formattedTime: '00:30', dataUrl: 'data:img3' }
    ];

    let scrolledTarget = null;
    const eventListeners = {};

    function createMockElement(tag) {
      let innerHtmlVal = '';
      const el = {
        tagName: (tag || 'DIV').toUpperCase(),
        className: '',
        children: [],
        parentNode: null,
        dataset: {},
        attributes: {},
        style: {
          _styles: {},
          setProperty(k, v) { this._styles[k] = v; },
          getPropertyValue(k) { return this._styles[k]; }
        },
        classList: {
          _classes: new Set(),
          add(...cls) { cls.forEach(c => this._classes.add(c)); },
          remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
          contains(c) { return this._classes.has(c) || el.className.split(/\s+/).includes(c); }
        },
        setAttribute(k, v) { this.attributes[k] = v; },
        getAttribute(k) { return this.attributes[k]; },
        appendChild(child) {
          if (child.parentNode) child.parentNode.removeChild(child);
          this.children.push(child);
          child.parentNode = this;
          return child;
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) this.children.splice(idx, 1);
          child.parentNode = null;
          return child;
        },
        listeners: {},
        addEventListener(evt, handler) {
          if (!this.listeners[evt]) this.listeners[evt] = [];
          this.listeners[evt].push(handler);
        },
        removeEventListener(evt, handler) {
          if (this.listeners[evt]) {
            this.listeners[evt] = this.listeners[evt].filter(h => h !== handler);
          }
        },
        dispatchEvent(evt) {
          const handlers = this.listeners[evt.type] || [];
          handlers.forEach(h => h(evt));
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: 800, height: 600, bottom: 600, right: 800 };
        },
        scrollIntoView(opts) {
          scrolledTarget = this;
        }
      };

      function matchSelector(node, selector) {
        if (selector.startsWith('.')) {
          const c = selector.slice(1);
          return node.className.split(/\s+/).includes(c) || (node.classList && node.classList.contains(c));
        }
        if (selector.startsWith('#')) {
          return node.id === selector.slice(1);
        }
        if (selector.startsWith('img[data-slide-index="')) {
          const match = selector.match(/data-slide-index="(\d+)"/);
          const idx = parseInt(match[1], 10);
          return node.tagName === 'IMG' && parseInt(node.dataset.slideIndex, 10) === idx;
        }
        if (selector.toLowerCase() === node.tagName.toLowerCase()) {
          return true;
        }
        return false;
      }

      function findRecursive(node, selector) {
        for (const child of node.children) {
          if (matchSelector(child, selector)) return child;
          const found = findRecursive(child, selector);
          if (found) return found;
        }
        return null;
      }

      function findAllRecursive(node, selector, results = []) {
        for (const child of node.children) {
          if (matchSelector(child, selector)) results.push(child);
          findAllRecursive(child, selector, results);
        }
        return results;
      }

      el.querySelector = (sel) => findRecursive(el, sel);
      el.querySelectorAll = (sel) => findAllRecursive(el, sel);

      function parseHTMLToNodes(html) {
        const root = createMockElement('root');
        const stack = [root];
        const tagRegex = /<(\/)?([a-z0-9-]+)([^>]*)>|([^<]+)/gi;
        let match;
        while ((match = tagRegex.exec(html)) !== null) {
          const isClosing = !!match[1];
          const tagName = match[2];
          const rawAttrs = match[3] || '';
          const text = match[4];

          if (text) {
            const trimmed = text.trim();
            if (trimmed && stack.length > 1) {
              const top = stack[stack.length - 1];
              top.textContent = (top.textContent || '') + trimmed;
            }
            continue;
          }

          if (['svg', 'path', 'circle', 'line', 'polyline', 'polygon', 'rect'].includes(tagName.toLowerCase())) {
            continue;
          }

          if (isClosing) {
            if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
              stack.pop();
            }
          } else {
            const isSelfClosing = rawAttrs.trim().endsWith('/') || ['input', 'img', 'hr', 'br'].includes(tagName.toLowerCase());
            const child = createMockElement(tagName);
            const cMatch = rawAttrs.match(/class="([^"]+)"/i);
            if (cMatch) child.className = cMatch[1];
            const vMatch = rawAttrs.match(/value="([^"]+)"/i);
            if (vMatch) child.value = vMatch[1];
            const tMatch = rawAttrs.match(/title="([^"]+)"/i);
            if (tMatch) child.setAttribute('title', tMatch[1]);
            const sMatch = rawAttrs.match(/data-slide-index="([^"]+)"/i);
            if (sMatch) child.dataset.slideIndex = sMatch[1];
            const srcMatch = rawAttrs.match(/src="([^"]+)"/i);
            if (srcMatch) child.src = srcMatch[1];

            stack[stack.length - 1].appendChild(child);
            if (!isSelfClosing) {
              stack.push(child);
            }
          }
        }
        return root.children;
      }

      Object.defineProperty(el, 'innerHTML', {
        get() { return innerHtmlVal; },
        set(html) {
          innerHtmlVal = html;
          el.children = [];
          const nodes = parseHTMLToNodes(html);
          nodes.forEach(n => el.appendChild(n));
        }
      });

      return el;
    }

    global.document = {
      createElement: createMockElement,
      body: createMockElement('body'),
      addEventListener: (evt, handler) => {
        if (!eventListeners[evt]) eventListeners[evt] = [];
        eventListeners[evt].push(handler);
      },
      removeEventListener: (evt, handler) => {
        if (eventListeners[evt]) {
          eventListeners[evt] = eventListeners[evt].filter(h => h !== handler);
        }
      }
    };

    // Open lightbox starting at index 2 (slide 3)
    previewDrawer._showLightbox(2);

    const lightbox = global.document.body.querySelector('.ytsnip-lightbox');
    assert.ok(lightbox, 'Lightbox element must be appended to body');

    const toolbar = lightbox.querySelector('.ytsnip-lightbox-toolbar');
    assert.ok(toolbar, 'Floating toolbar must be rendered inside lightbox');

    const images = lightbox.querySelectorAll('.ytsnip-lightbox-img');
    assert.strictEqual(images.length, 3, 'All 3 slide images should be rendered in lightbox');
    assert.strictEqual(images[0].src, 'data:img1');
    assert.strictEqual(images[2].src, 'data:img3');
    assert.strictEqual(images[2].dataset.slideIndex, 2);

    assert.strictEqual(scrolledTarget, images[2], 'Target slide (index 2) must be scrolled into view');

    // Test close via Escape key
    assert.ok(eventListeners['keydown'].length > 0, 'Keydown listener should be registered');
    const escEvent = { key: 'Escape', preventDefault: () => {} };
    eventListeners['keydown'][0](escEvent);

    assert.strictEqual(global.document.body.children.includes(lightbox), false, 'Lightbox should be removed on Escape key');
    assert.strictEqual(eventListeners['keydown'].length, 0, 'Keydown listener should be cleaned up on close');

    // Test close via close button click
    previewDrawer._showLightbox(1);
    const newLightbox = global.document.body.querySelector('.ytsnip-lightbox');
    const closeBtn = newLightbox.querySelector('.ytsnip-lightbox-close');
    assert.ok(closeBtn, 'Close button should be present in lightbox');

    let stopPropagated = false;
    closeBtn.dispatchEvent({ type: 'click', stopPropagation: () => { stopPropagated = true; } });
    assert.strictEqual(global.document.body.children.includes(newLightbox), false, 'Lightbox should be removed on close button click');

    // Test close via backdrop click
    previewDrawer._showLightbox(0);
    const backdropLightbox = global.document.body.querySelector('.ytsnip-lightbox');
    backdropLightbox.dispatchEvent({ type: 'click', target: backdropLightbox });
    assert.strictEqual(global.document.body.children.includes(backdropLightbox), false, 'Lightbox should be removed on clicking backdrop');

    console.log('✔ Test 14 Passed: _showLightbox renders all slides, floating toolbar, and handles all dismissal methods');

    // Test 15: Zoom controls (In, Out, Label reset) and clamp bounds (0.25 to 4.0)
    previewDrawer._showLightbox(0);
    const zoomLightbox = global.document.body.querySelector('.ytsnip-lightbox');
    const zoomInBtn = zoomLightbox.querySelector('.ytsnip-lightbox-zoom-in');
    const zoomOutBtn = zoomLightbox.querySelector('.ytsnip-lightbox-zoom-out');
    const zoomLabel = zoomLightbox.querySelector('.ytsnip-lightbox-zoom-label');

    assert.ok(zoomInBtn && zoomOutBtn && zoomLabel, 'Zoom controls must exist in toolbar');
    assert.strictEqual(zoomLabel.textContent, '100%', 'Initial zoom should be 100%');

    // Click Zoom In
    zoomInBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(zoomLabel.textContent, '125%', 'Zoom In should increase zoom to 125%');

    zoomInBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(zoomLabel.textContent, '150%', 'Zoom In should increase zoom to 150%');

    // Click Zoom Out
    zoomOutBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(zoomLabel.textContent, '125%', 'Zoom Out should decrease zoom to 125%');

    // Click Zoom Label -> Reset to 100%
    zoomLabel.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(zoomLabel.textContent, '100%', 'Clicking zoom label resets zoom to 100%');

    // Zoom out past min bound (0.25 / 25%)
    for (let i = 0; i < 10; i++) {
      zoomOutBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    }
    assert.strictEqual(zoomLabel.textContent, '25%', 'Zoom should clamp at min bound of 25%');
    assert.strictEqual(zoomOutBtn.disabled, true, 'Zoom out button should be disabled at min bound');

    // Zoom in past max bound (4.0 / 400%)
    for (let i = 0; i < 20; i++) {
      zoomInBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    }
    assert.strictEqual(zoomLabel.textContent, '400%', 'Zoom should clamp at max bound of 400%');
    assert.strictEqual(zoomInBtn.disabled, true, 'Zoom in button should be disabled at max bound');
    console.log('✔ Test 15 Passed: Zoom In, Out, Reset, and min/max clamp bounds operate correctly');

    // Test 16: Mouse wheel zooming with ctrlKey: true
    zoomLabel.dispatchEvent({ type: 'click', stopPropagation: () => {} }); // Reset to 100%
    assert.strictEqual(zoomLabel.textContent, '100%');

    let preventedDefault = false;
    zoomLightbox.dispatchEvent({
      type: 'wheel',
      ctrlKey: true,
      deltaY: -100, // Wheel up -> zoom in
      preventDefault: () => { preventedDefault = true; }
    });
    assert.strictEqual(preventedDefault, true, 'ctrlKey wheel should prevent browser zoom');
    assert.strictEqual(zoomLabel.textContent, '110%', 'Wheel up with ctrlKey should zoom in to 110%');

    zoomLightbox.dispatchEvent({
      type: 'wheel',
      ctrlKey: true,
      deltaY: 100, // Wheel down -> zoom out
      preventDefault: () => {}
    });
    assert.strictEqual(zoomLabel.textContent, '100%', 'Wheel down with ctrlKey should zoom back to 100%');

    // Normal wheel scroll (ctrlKey = false) should not alter zoom
    zoomLightbox.dispatchEvent({
      type: 'wheel',
      ctrlKey: false,
      deltaY: -100,
      preventDefault: () => {}
    });
    assert.strictEqual(zoomLabel.textContent, '100%', 'Normal wheel without ctrlKey should not alter zoom level');
    console.log('✔ Test 16 Passed: Ctrl+Wheel / Pinch adjusts zoom level smoothly while normal wheel preserves scroll');

    // Test 17: Touch pinch zoom gestures
    zoomLightbox.dispatchEvent({
      type: 'touchstart',
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 } // initial distance: 100
      ]
    });
    zoomLightbox.dispatchEvent({
      type: 'touchmove',
      touches: [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 } // new distance: 200 (2x spread)
      ],
      preventDefault: () => {}
    });
    assert.strictEqual(zoomLabel.textContent, '200%', '2x touch spread should double zoom to 200%');

    zoomLightbox.dispatchEvent({ type: 'touchend', touches: [] });
    console.log('✔ Test 17 Passed: Multi-touch pinch gestures scale slide preview smoothly');

    // Test 18: Page navigation (Prev/Next buttons, page input)
    const prevBtn = zoomLightbox.querySelector('.ytsnip-lightbox-prev-btn');
    const nextBtn = zoomLightbox.querySelector('.ytsnip-lightbox-next-btn');
    const pageInput = zoomLightbox.querySelector('.ytsnip-lightbox-page-input');
    const currentImages = zoomLightbox.querySelectorAll('.ytsnip-lightbox-img');

    assert.ok(prevBtn && nextBtn && pageInput, 'Page navigation controls must exist in toolbar');

    // Starts at index 0 (Slide 1)
    assert.strictEqual(prevBtn.disabled, true, 'Prev button should be disabled on first slide');
    assert.strictEqual(nextBtn.disabled, false, 'Next button should be enabled');
    assert.strictEqual(pageInput.value, '1', 'Page input should show 1 on first slide');

    // Next button click
    nextBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(pageInput.value, '2', 'Page input should advance to 2');
    assert.strictEqual(prevBtn.disabled, false, 'Prev button should be enabled on slide 2');
    assert.strictEqual(scrolledTarget, currentImages[1], 'Slide 2 must be scrolled into view');

    // Next button click -> slide 3 (last)
    nextBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(pageInput.value, '3', 'Page input should advance to 3');
    assert.strictEqual(nextBtn.disabled, true, 'Next button should be disabled on last slide');
    assert.strictEqual(scrolledTarget, currentImages[2], 'Slide 3 must be scrolled into view');

    // Prev button click -> slide 2
    prevBtn.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert.strictEqual(pageInput.value, '2', 'Prev button should return to slide 2');
    assert.strictEqual(scrolledTarget, currentImages[1]);

    // Page input direct change -> slide 1
    pageInput.value = '1';
    pageInput.dispatchEvent({ type: 'change' });
    assert.strictEqual(scrolledTarget, currentImages[0], 'Changing page input should jump directly to slide 1');
    console.log('✔ Test 18 Passed: Prev/Next buttons and direct page number input navigate slides');

    // Test 19: Keyboard navigation shortcuts (+, -, 0, Arrow keys, Home, End)
    zoomLabel.dispatchEvent({ type: 'click', stopPropagation: () => {} }); // Reset to 100%
    assert.strictEqual(zoomLabel.textContent, '100%');

    const keyHandler = eventListeners['keydown'][0];

    // Zoom shortcuts
    keyHandler({ key: '+', preventDefault: () => {} });
    assert.strictEqual(zoomLabel.textContent, '125%', 'Plus key should zoom in');

    keyHandler({ key: '-', preventDefault: () => {} });
    assert.strictEqual(zoomLabel.textContent, '100%', 'Minus key should zoom out');

    keyHandler({ key: '0', preventDefault: () => {} });
    assert.strictEqual(zoomLabel.textContent, '100%', 'Zero key should reset zoom');

    // Arrow navigation
    keyHandler({ key: 'ArrowDown', preventDefault: () => {} });
    assert.strictEqual(pageInput.value, '2', 'ArrowDown should navigate to next slide');

    keyHandler({ key: 'ArrowUp', preventDefault: () => {} });
    assert.strictEqual(pageInput.value, '1', 'ArrowUp should navigate to previous slide');

    keyHandler({ key: 'End', preventDefault: () => {} });
    assert.strictEqual(pageInput.value, '3', 'End key should navigate to last slide');

    keyHandler({ key: 'Home', preventDefault: () => {} });
    assert.strictEqual(pageInput.value, '1', 'Home key should navigate to first slide');

    console.log('✔ Test 19 Passed: Keyboard shortcuts navigate slides and control zoom');

    // Cleanup global document
    delete global.document;
  }

  console.log('\n✅ All Drawer Selection & Lightbox Zoom tests passed successfully!');
})();
