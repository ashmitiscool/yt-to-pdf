const assert = require('assert');
const SlideDrawer = require('../src/content/drawer.js');

console.log('=== Running SlideDrawer Selection Tests ===\n');

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

  // Test 11: Single active deck pruning (saving for active video removes old video decks)
  {
    const pruneDrawer = new SlideDrawer();
    storageData['ytsnip_deck_old_vid1'] = [{ id: 'old1', timestamp: 1, formattedTime: '00:01', dataUrl: 'data:old1' }];
    storageData['ytsnip_deck_old_vid2'] = [{ id: 'old2', timestamp: 2, formattedTime: '00:02', dataUrl: 'data:old2' }];
    storageData['ytsnip_capture_mode'] = 'final_only';

    pruneDrawer.videoId = 'active_vid';
    pruneDrawer.slides = [
      { id: 'act1', timestamp: 10, formattedTime: '00:10', dataUrl: 'data:act1', selected: true }
    ];

    await pruneDrawer._saveSlides();

    assert.ok(storageData['ytsnip_deck_active_vid'], 'Active video deck must be stored in chrome.storage.local');
    assert.strictEqual(storageData['ytsnip_deck_old_vid1'], undefined, 'Old video 1 deck must be pruned');
    assert.strictEqual(storageData['ytsnip_deck_old_vid2'], undefined, 'Old video 2 deck must be pruned');
    assert.strictEqual(storageData['ytsnip_capture_mode'], 'final_only', 'Non-deck settings like capture_mode must be preserved');
    console.log('✔ Test 11 Passed: Saving active video deck prunes old video decks');
  }

  // Test 12: clearAll removes active deck key from storage
  {
    const clearDrawer = new SlideDrawer();
    storageData['ytsnip_deck_to_clear'] = [
      { id: 'c1', timestamp: 1, formattedTime: '00:01', dataUrl: 'data:c1', selected: true }
    ];
    await clearDrawer.loadForVideo('to_clear', 'To Clear');
    assert.strictEqual(clearDrawer.slides.length, 1);

    clearDrawer.clearAll();
    assert.strictEqual(clearDrawer.slides.length, 0, 'Slides array should be empty after clearAll');
    
    // Check in storage
    const stored = storageData['ytsnip_deck_to_clear'];
    assert.ok(!stored || stored.length === 0, 'Storage key must be deleted/cleared on clearAll');
    console.log('✔ Test 12 Passed: clearAll cleans storage key');
  }

  console.log('\n✅ All Drawer Selection tests passed successfully!');
})();
