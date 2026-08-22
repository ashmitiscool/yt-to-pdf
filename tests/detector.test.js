const assert = require('assert');
const SlideDetector = require('../src/content/detector.js');

function createSyntheticFrame(width, height, fillPatternFn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = fillPatternFn(x, y, width, height);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a !== undefined ? a : 255;
    }
  }
  return { data, width, height };
}

console.log('=== Running SlideDetector Tests ===\n');

// Test 1: Identical frames should have 0 distance
{
  const frameA = createSyntheticFrame(160, 90, (x, y) => [240, 240, 240]);
  const frameB = createSyntheticFrame(160, 90, (x, y) => [240, 240, 240]);

  const featA = SlideDetector.extractFrameFeatures(frameA);
  const featB = SlideDetector.extractFrameFeatures(frameB);

  const res = SlideDetector.isSlideTransition(featA, featB);
  assert.strictEqual(res.hamming, 0, 'Identical frames must have 0 hamming distance');
  assert.strictEqual(res.blockDiff, 0, 'Identical frames must have 0% block difference');
  assert.strictEqual(res.isTransition, false, 'Identical frames must not trigger transition');
  console.log('✔ Test 1 Passed: Identical frames produce zero difference');
}

// Test 2: Moving cursor (small 10x10 mouse pointer on 1920x1080 slide)
{
  // Slide 1: White slide with blue header and black text
  const baseSlide = (x, y, w, h) => {
    if (y < h * 0.2) return [30, 100, 200]; // Blue header
    if (y > h * 0.4 && y < h * 0.45 && x > w * 0.1 && x < w * 0.6) return [20, 20, 20]; // Text
    return [250, 250, 250]; // White background
  };

  const frameWithCursor1 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    // Cursor at (100, 100)
    if (x >= 100 && x <= 106 && y >= 100 && y <= 106) return [0, 0, 0];
    return baseSlide(x, y, w, h);
  });

  const frameWithCursor2 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    // Cursor moved to (220, 140)
    if (x >= 220 && x <= 226 && y >= 140 && y <= 146) return [0, 0, 0];
    return baseSlide(x, y, w, h);
  });

  const feat1 = SlideDetector.extractFrameFeatures(frameWithCursor1);
  const feat2 = SlideDetector.extractFrameFeatures(frameWithCursor2);

  const res = SlideDetector.isSlideTransition(feat1, feat2, { sensitivity: 'medium' });
  console.log(`  Cursor motion test: Hamming=${res.hamming}, BlockDiff=${res.blockDiff.toFixed(2)}%, isTransition=${res.isTransition}`);
  assert.strictEqual(res.isTransition, false, 'Moving mouse cursor must NOT trigger a slide transition');
  console.log('✔ Test 2 Passed: Mouse cursor movement correctly filtered out');
}

// Test 3: Laser pointer / small webcam jitter
{
  const baseSlide = (x, y, w, h) => {
    if (y < h * 0.2) return [40, 40, 60];
    return [245, 245, 245];
  };

  const frame1 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    // Small red laser dot at (150, 80)
    if (Math.hypot(x - 150, y - 80) < 4) return [255, 0, 0];
    return baseSlide(x, y, w, h);
  });

  const frame2 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    // Laser moved to (160, 95)
    if (Math.hypot(x - 160, y - 95) < 4) return [255, 0, 0];
    return baseSlide(x, y, w, h);
  });

  const feat1 = SlideDetector.extractFrameFeatures(frame1);
  const feat2 = SlideDetector.extractFrameFeatures(frame2);

  const res = SlideDetector.isSlideTransition(feat1, feat2);
  console.log(`  Laser pointer test: Hamming=${res.hamming}, BlockDiff=${res.blockDiff.toFixed(2)}%, isTransition=${res.isTransition}`);
  assert.strictEqual(res.isTransition, false, 'Laser pointer must NOT trigger a slide transition');
  console.log('✔ Test 3 Passed: Laser pointer correctly filtered out');
}

// Test 4: Genuine Slide Transition (New slide topic & layout change)
{
  // Slide 1: Dark theme slide
  const slide1 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.25) return [20, 20, 30]; // Dark header
    return [35, 40, 50]; // Dark background
  });

  // Slide 2: Light theme slide with diagrams
  const slide2 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.2) return [200, 50, 50]; // Red header
    if (x > w * 0.5) return [220, 230, 240]; // Split diagram
    return [255, 255, 255]; // White background
  });

  const feat1 = SlideDetector.extractFrameFeatures(slide1);
  const feat2 = SlideDetector.extractFrameFeatures(slide2);

  const res = SlideDetector.isSlideTransition(feat1, feat2);
  console.log(`  Slide change test: Hamming=${res.hamming}, BlockDiff=${res.blockDiff.toFixed(2)}%, isTransition=${res.isTransition}`);
  assert.strictEqual(res.isTransition, true, 'Genuine slide transition must be detected');
  console.log('✔ Test 4 Passed: Slide transition correctly detected');
}

// Test 5: Slide content addition (new bullet point / diagram appearing on white slide)
{
  const slideWithoutBullet = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.2) return [20, 120, 80];
    // Line 1
    if (y >= 50 && y <= 65 && x >= 40 && x <= 260) return [40, 40, 40];
    return [255, 255, 255];
  });

  const slideWithNewMajorSection = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.2) return [20, 120, 80];
    // Line 1
    if (y >= 50 && y <= 65 && x >= 40 && x <= 260) return [40, 40, 40];
    // Major new diagram box added taking 30% of slide area
    if (y >= 80 && y <= 160 && x >= 40 && x <= 280) return [70, 90, 140];
    return [255, 255, 255];
  });

  const feat1 = SlideDetector.extractFrameFeatures(slideWithoutBullet);
  const feat2 = SlideDetector.extractFrameFeatures(slideWithNewMajorSection);

  const res = SlideDetector.isSlideTransition(feat1, feat2);
  console.log(`  New section test: Hamming=${res.hamming}, BlockDiff=${res.blockDiff.toFixed(2)}%, isTransition=${res.isTransition}`);
  assert.strictEqual(res.isTransition, true, 'Major content addition must be detected as transition');
  console.log('✔ Test 5 Passed: Major content addition detected');
}

// Test 6: Subtle slide change on same white presentation template (e.g., text/equations step)
{
  const slidePage1 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.15) return [20, 50, 120]; // Header
    // 2 bullet points
    if (y >= 40 && y <= 50 && x >= 30 && x <= 220) return [30, 30, 30];
    if (y >= 65 && y <= 75 && x >= 30 && x <= 200) return [30, 30, 30];
    return [255, 255, 255]; // White background
  });

  const slidePage2 = createSyntheticFrame(320, 180, (x, y, w, h) => {
    if (y < h * 0.15) return [20, 50, 120]; // Header
    // New equation line and table on slide page 2
    if (y >= 40 && y <= 50 && x >= 30 && x <= 260) return [30, 30, 30];
    if (y >= 65 && y <= 75 && x >= 30 && x <= 280) return [30, 30, 30];
    if (y >= 90 && y <= 100 && x >= 30 && x <= 240) return [30, 30, 30];
    if (y >= 115 && y <= 145 && x >= 30 && x <= 200) return [200, 220, 240];
    return [255, 255, 255];
  });

  const feat1 = SlideDetector.extractFrameFeatures(slidePage1);
  const feat2 = SlideDetector.extractFrameFeatures(slidePage2);

  const res = SlideDetector.isSlideTransition(feat1, feat2, { sensitivity: 'medium' });
  console.log(`  Subtle slide page test: Hamming=${res.hamming}, BlockDiff=${res.blockDiff.toFixed(2)}%, ChangedBlocks=${res.changedBlocksCount}, isTransition=${res.isTransition}`);
  assert.strictEqual(res.isTransition, true, 'Subtle slide transition on same template must be detected');
  console.log('✔ Test 6 Passed: Subtle slide transition reliably detected');
}

console.log('\n✅ All Detector tests passed successfully!');

