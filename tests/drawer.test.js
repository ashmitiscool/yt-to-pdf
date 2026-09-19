const assert = require('assert');
const SlideDrawer = require('../src/content/drawer.js');

console.log('=== Running SlideDrawer Selection Tests ===\n');

// Mock chrome storage
let storageData = {};
global.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        const res = {};
        for (const k of keys) {
          if (storageData[k]) res[k] = storageData[k];
        }
        return res;
      },
      set: async (items) => {
        Object.assign(storageData, items);
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

  console.log('\n✅ All Drawer Selection tests passed successfully!');
})();
