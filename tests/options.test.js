const assert = require('assert');

console.log('=== Running Extension Settings & Options Tests ===\n');

// Mock chrome.storage.local
const mockStorage = {};
const mockListeners = [];

global.chrome = {
  storage: {
    local: {
      get: (keys) => {
        return new Promise((resolve) => {
          const res = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((k) => {
            if (mockStorage[k] !== undefined) {
              res[k] = JSON.parse(JSON.stringify(mockStorage[k]));
            }
          });
          resolve(res);
        });
      },
      set: (obj) => {
        return new Promise((resolve) => {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { oldValue: mockStorage[k], newValue: v };
            mockStorage[k] = JSON.parse(JSON.stringify(v));
          }
          mockListeners.forEach((fn) => fn(changes, 'local'));
          resolve();
        });
      }
    },
    onChanged: {
      addListener: (fn) => {
        mockListeners.push(fn);
      }
    }
  }
};

const DEFAULT_SETTINGS = {
  autoCopyClipboard: false,
  icons: {
    snap: true,
    clipboard: true,
    scan: true,
    deck: true
  },
  captureMode: 'final_only',
  sensitivity: 'medium'
};

function resolveSettings(stored = {}, legacy = {}) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...stored,
    icons: {
      ...DEFAULT_SETTINGS.icons,
      ...(stored.icons || {})
    }
  };

  if (typeof legacy.ytsnip_auto_copy_clipboard === 'boolean' && stored.autoCopyClipboard === undefined) {
    merged.autoCopyClipboard = legacy.ytsnip_auto_copy_clipboard;
  }
  if (legacy.ytsnip_capture_mode && stored.captureMode === undefined) {
    merged.captureMode = legacy.ytsnip_capture_mode;
  }

  return merged;
}

function computeButtonDisplay(icons = {}) {
  const showSnap = icons.snap !== false;
  const showClip = icons.clipboard !== false;
  const showScan = icons.scan !== false;
  const showDeck = icons.deck !== false;

  return {
    snap: showSnap ? 'inline-flex' : 'none',
    clipboard: showClip ? 'inline-flex' : 'none',
    scan: showScan ? 'inline-flex' : 'none',
    deck: showDeck ? 'inline-flex' : 'none',
    group: (showSnap || showClip || showScan || showDeck) ? 'inline-flex' : 'none'
  };
}

(async () => {
  // Test 1: Factory default settings structure
  {
    const settings = resolveSettings({});
    assert.strictEqual(settings.autoCopyClipboard, false, 'autoCopyClipboard should be false by default');
    assert.strictEqual(settings.icons.snap, true, 'Snap icon should be true by default');
    assert.strictEqual(settings.icons.clipboard, true, 'Clipboard icon should be true by default');
    assert.strictEqual(settings.icons.scan, true, 'Scan icon should be true by default');
    assert.strictEqual(settings.icons.deck, true, 'Deck icon should be true by default');
    assert.strictEqual(settings.captureMode, 'final_only', 'Default capture mode should be final_only');
    assert.strictEqual(settings.sensitivity, 'medium', 'Default sensitivity should be medium');
    console.log('✔ Test 1 Passed: Factory default settings resolve correctly');
  }

  // Test 2: Storage persistence and roundtrip
  {
    const newSettings = {
      autoCopyClipboard: true,
      icons: {
        snap: true,
        clipboard: false,
        scan: false,
        deck: true
      },
      captureMode: 'all_steps',
      sensitivity: 'high'
    };

    await chrome.storage.local.set({ ytsnip_settings: newSettings });
    const stored = await chrome.storage.local.get(['ytsnip_settings']);
    const resolved = resolveSettings(stored.ytsnip_settings);

    assert.strictEqual(resolved.autoCopyClipboard, true, 'autoCopyClipboard should be saved as true');
    assert.strictEqual(resolved.icons.clipboard, false, 'clipboard icon should be saved as false');
    assert.strictEqual(resolved.icons.scan, false, 'scan icon should be saved as false');
    assert.strictEqual(resolved.icons.deck, true, 'deck icon should remain true');
    assert.strictEqual(resolved.captureMode, 'all_steps', 'captureMode should be all_steps');
    console.log('✔ Test 2 Passed: Storage persistence and roundtrip operate cleanly');
  }

  // Test 3: Legacy keys migration
  {
    delete mockStorage['ytsnip_settings'];
    mockStorage['ytsnip_auto_copy_clipboard'] = true;
    mockStorage['ytsnip_capture_mode'] = 'all_steps';

    const res = await chrome.storage.local.get(['ytsnip_settings', 'ytsnip_auto_copy_clipboard', 'ytsnip_capture_mode']);
    const migrated = resolveSettings(res.ytsnip_settings, {
      ytsnip_auto_copy_clipboard: res.ytsnip_auto_copy_clipboard,
      ytsnip_capture_mode: res.ytsnip_capture_mode
    });

    assert.strictEqual(migrated.autoCopyClipboard, true, 'Legacy auto-copy boolean should be migrated');
    assert.strictEqual(migrated.captureMode, 'all_steps', 'Legacy captureMode string should be migrated');
    assert.strictEqual(migrated.icons.snap, true, 'Default icons should be preserved during migration');
    console.log('✔ Test 3 Passed: Legacy storage keys migrate correctly');
  }

  // Test 4: Partial icon configuration handles missing fields gracefully
  {
    const partial = {
      icons: {
        clipboard: false
      }
    };
    const resolved = resolveSettings(partial);
    assert.strictEqual(resolved.icons.clipboard, false, 'Explicitly false icon should be false');
    assert.strictEqual(resolved.icons.snap, true, 'Omitted icons should default to true');
    assert.strictEqual(resolved.icons.scan, true, 'Omitted icons should default to true');
    assert.strictEqual(resolved.icons.deck, true, 'Omitted icons should default to true');
    console.log('✔ Test 4 Passed: Partial icon configurations preserve missing defaults');
  }

  // Test 5: Player button visibility calculations
  {
    // Case A: All visible
    const dispA = computeButtonDisplay({ snap: true, clipboard: true, scan: true, deck: true });
    assert.strictEqual(dispA.snap, 'inline-flex');
    assert.strictEqual(dispA.clipboard, 'inline-flex');
    assert.strictEqual(dispA.scan, 'inline-flex');
    assert.strictEqual(dispA.deck, 'inline-flex');
    assert.strictEqual(dispA.group, 'inline-flex');

    // Case B: Selective icons hidden
    const dispB = computeButtonDisplay({ snap: true, clipboard: false, scan: false, deck: true });
    assert.strictEqual(dispB.snap, 'inline-flex');
    assert.strictEqual(dispB.clipboard, 'none');
    assert.strictEqual(dispB.scan, 'none');
    assert.strictEqual(dispB.deck, 'inline-flex');
    assert.strictEqual(dispB.group, 'inline-flex');

    // Case C: All icons hidden
    const dispC = computeButtonDisplay({ snap: false, clipboard: false, scan: false, deck: false });
    assert.strictEqual(dispC.snap, 'none');
    assert.strictEqual(dispC.clipboard, 'none');
    assert.strictEqual(dispC.scan, 'none');
    assert.strictEqual(dispC.deck, 'none');
    assert.strictEqual(dispC.group, 'none', 'Parent button group should hide when all icons are disabled');

    console.log('✔ Test 5 Passed: Button display styles calculated correctly for all visibility states');
  }

  // Test 6: Storage change event notification
  {
    let triggered = false;
    let receivedChanges = null;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.ytsnip_settings) {
        triggered = true;
        receivedChanges = changes.ytsnip_settings.newValue;
      }
    });

    await chrome.storage.local.set({
      ytsnip_settings: {
        autoCopyClipboard: true,
        icons: { snap: false, clipboard: false, scan: false, deck: false }
      }
    });

    assert.strictEqual(triggered, true, 'onChanged listener should be notified');
    assert.strictEqual(receivedChanges.autoCopyClipboard, true);
    assert.strictEqual(receivedChanges.icons.snap, false);
    console.log('✔ Test 6 Passed: Storage onChanged listener fires and delivers updated values');
  }

  // Test 7: DOM class toggling and display style override
  {
    class MockElement {
      constructor(className = '') {
        this.classList = {
          _classes: new Set(className ? className.split(' ') : []),
          toggle: (cls, force) => {
            if (force) this.classList._classes.add(cls);
            else this.classList._classes.delete(cls);
            return this.classList._classes.has(cls);
          },
          contains: (cls) => this.classList._classes.has(cls)
        };
        this.style = {
          display: 'inline-flex',
          setProperty: (prop, val, priority) => {
            this.style[prop] = val;
            this.style._priority = priority;
          }
        };
      }
    }

    const snapEl = new MockElement('ytp-button ytsnip-yt-btn ytsnip-btn-snap');
    const showSnap = false;
    snapEl.classList.toggle('ytsnip-hidden', !showSnap);
    snapEl.style.setProperty('display', showSnap ? 'inline-flex' : 'none', 'important');

    assert.strictEqual(snapEl.classList.contains('ytsnip-hidden'), true, 'Element should have ytsnip-hidden class when hidden');
    assert.strictEqual(snapEl.style.display, 'none');
    assert.strictEqual(snapEl.style._priority, 'important');

    snapEl.classList.toggle('ytsnip-hidden', false);
    snapEl.style.setProperty('display', 'inline-flex', 'important');
    assert.strictEqual(snapEl.classList.contains('ytsnip-hidden'), false);
    assert.strictEqual(snapEl.style.display, 'inline-flex');

    console.log('✔ Test 7 Passed: DOM element ytsnip-hidden class toggles and sets display with !important priority');
  }

  console.log('\n✅ All Extension Settings & Options tests passed successfully!');
})();
