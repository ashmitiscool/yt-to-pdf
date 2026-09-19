const assert = require('assert');
const SlideScanner = require('../src/content/scanner.js');
const SlideDetector = require('../src/content/detector.js');

// Setup global mock for SlideDetector as used in scanner.js
SlideDetector.extractFrameFeatures = () => ({
  dHash: '1111000011110000',
  blockData: new Uint8ClampedArray(16 * 9 * 4)
});
global.SlideDetector = SlideDetector;

console.log('=== Running SlideScanner Tests ===\n');

// Test 1: formatTime utility
{
  assert.strictEqual(SlideScanner.formatTime(0), '00:00', '0s should format to 00:00');
  assert.strictEqual(SlideScanner.formatTime(59), '00:59', '59s should format to 00:59');
  assert.strictEqual(SlideScanner.formatTime(65), '01:05', '65s should format to 01:05');
  assert.strictEqual(SlideScanner.formatTime(3665), '1:01:05', '3665s should format to 1:01:05');
  assert.strictEqual(SlideScanner.formatTime(-5), '00:00', 'Negative time should fallback to 00:00');
  assert.strictEqual(SlideScanner.formatTime(NaN), '00:00', 'NaN should fallback to 00:00');
  console.log('✔ Test 1 Passed: formatTime formats timestamps accurately');
}

// Mock Video Element Helper
function createMockVideo(duration = 300, initialTime = 0) {
  const listeners = {};
  return {
    duration,
    currentTime: initialTime,
    paused: false,
    muted: false,
    volume: 1,
    playbackRate: 1,
    videoWidth: 1280,
    videoHeight: 720,
    addEventListener(evt, handler) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    removeEventListener(evt, handler) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter(h => h !== handler);
    },
    dispatchEvent(evtName) {
      if (listeners[evtName]) {
        listeners[evtName].slice().forEach(h => h());
      }
    },
    pause() {
      this.paused = true;
    },
    async play() {
      this.paused = false;
    }
  };
}

// Mock capture frame helper to avoid real canvas drawing in pure node env
SlideScanner.VideoScanner.prototype._captureFrame = () => ({
  dataUrl: 'data:image/jpeg;base64,mockframe',
  width: 1280,
  height: 720
});

// Test 2: Scanner startScan starting from beginning (00:00)
(async () => {

  const scanner = new SlideScanner.VideoScanner();
  const mockVideo = createMockVideo(60, 10);
  const seekedPositions = [];

  // Override _seekVideo to track seek calls synchronously for testing
  scanner._seekVideo = async (video, time) => {
    seekedPositions.push(time);
    video.currentTime = time;
  };

  const progressUpdates = [];
  const slides = await scanner.startScan({
    videoElement: mockVideo,
    stepSeconds: 20,
    startFrom: 0,
    sensitivity: 'medium',
    onProgress: (p) => progressUpdates.push(p)
  });

  assert.strictEqual(seekedPositions[0], 0, 'First seek should be 0s when startFrom = 0');
  assert.strictEqual(progressUpdates[0].percentage, 0, 'Initial progress should be 0%');
  assert.strictEqual(progressUpdates[progressUpdates.length - 1].percentage, 100, 'Final progress should be 100%');
  assert.strictEqual(slides.length >= 1, true, 'At least one slide captured');
  console.log('✔ Test 2 Passed: Scan from beginning (startFrom = 0) seeks and reports progress correctly');

  // Test 3: Scanner startScan starting from a specific timestamp (e.g. 45s of 60s)
  {
    const scanner2 = new SlideScanner.VideoScanner();
    const mockVideo2 = createMockVideo(60, 45);
    const seekedPositions2 = [];

    scanner2._seekVideo = async (video, time) => {
      seekedPositions2.push(time);
      video.currentTime = time;
    };

    const progressUpdates2 = [];
    const slides2 = await scanner2.startScan({
      videoElement: mockVideo2,
      stepSeconds: 5,
      startFrom: 45,
      sensitivity: 'medium',
      onProgress: (p) => progressUpdates2.push(p)
    });

    assert.strictEqual(seekedPositions2[0], 45, 'First seek should be 45s when startFrom = 45');
    assert.strictEqual(seekedPositions2.includes(0), false, 'Should not seek to timestamps before 45s');
    assert.strictEqual(progressUpdates2[0].currentTime, 45, 'Initial progress current time should be 45s');
    assert.strictEqual(slides2[0].timestamp, 45, 'First slide timestamp should be 45s');
    console.log('✔ Test 3 Passed: Scan from specific timestamp (startFrom = 45) starts cleanly at specified point');
  }

  // Test 4: startScan gracefully handles startFrom beyond video duration
  {
    const scanner3 = new SlideScanner.VideoScanner();
    const mockVideo3 = createMockVideo(60, 50);
    const seekedPositions3 = [];

    scanner3._seekVideo = async (video, time) => {
      seekedPositions3.push(time);
      video.currentTime = time;
    };

    const slides3 = await scanner3.startScan({
      videoElement: mockVideo3,
      stepSeconds: 5,
      startFrom: 70, // Exceeds duration of 60s
      sensitivity: 'medium'
    });

    assert.strictEqual(seekedPositions3.length, 0, 'No seeks performed when startFrom exceeds video duration');
    assert.strictEqual(slides3.length, 0, 'No slides captured when startFrom exceeds duration');
    console.log('✔ Test 4 Passed: Scan handles out-of-bounds startFrom gracefully');
  }

  // Test 5: startScan with captureMode = 'final_only' replaces incremental slide steps in-place
  {
    const scanner4 = new SlideScanner.VideoScanner();
    const mockVideo4 = createMockVideo(30, 0);

    scanner4._seekVideo = async (video, time) => {
      video.currentTime = time;
    };

    // Override classifyTransition for mock frames
    // t=0 (Initial) -> MAJOR_TRANSITION
    // t=10 -> INCREMENTAL_UPDATE (bullet point added)
    // t=20 -> INCREMENTAL_UPDATE (bullet point 2 added)
    // t=30 -> MAJOR_TRANSITION (slide 2)
    SlideDetector.classifyTransition = (prev, curr) => {
      if (mockVideo4.currentTime === 10 || mockVideo4.currentTime === 20) {
        return { type: 'INCREMENTAL_UPDATE', isTransition: true };
      }
      return { type: 'MAJOR_TRANSITION', isTransition: true };
    };

    const updatedEvents = [];
    const foundEvents = [];

    const slides4 = await scanner4.startScan({
      videoElement: mockVideo4,
      stepSeconds: 10,
      startFrom: 0,
      captureMode: 'final_only',
      onSlideFound: (s) => foundEvents.push(s),
      onSlideUpdated: (s, idx) => updatedEvents.push({ slide: s, idx })
    });

    assert.strictEqual(foundEvents.length, 2, 'Should find initial slide and 1 major transition');
    assert.strictEqual(updatedEvents.length, 2, 'Should update incremental steps twice (at 10s and 20s)');
    assert.strictEqual(slides4.length, 2, 'Final deck should contain exactly 2 unique slides in final_only mode');
    assert.strictEqual(slides4[0].timestamp, 20, 'First slide timestamp should be updated to final complete step (20s)');
    assert.strictEqual(slides4[1].timestamp, 30, 'Second slide timestamp should be 30s');
    console.log('✔ Test 5 Passed: final_only mode replaces incremental steps in-place and preserves final state');
  }

  // Test 6: startScan with captureMode = 'all_steps' appends each incremental step
  {
    const scanner5 = new SlideScanner.VideoScanner();
    const mockVideo5 = createMockVideo(30, 0);

    scanner5._seekVideo = async (video, time) => {
      video.currentTime = time;
    };

    SlideDetector.classifyTransition = (prev, curr) => {
      if (mockVideo5.currentTime === 10 || mockVideo5.currentTime === 20) {
        return { type: 'INCREMENTAL_UPDATE', isTransition: true };
      }
      return { type: 'MAJOR_TRANSITION', isTransition: true };
    };

    const foundEvents5 = [];

    const slides5 = await scanner5.startScan({
      videoElement: mockVideo5,
      stepSeconds: 10,
      startFrom: 0,
      captureMode: 'all_steps',
      onSlideFound: (s) => foundEvents5.push(s)
    });

    assert.strictEqual(foundEvents5.length, 4, 'Should capture all 4 steps in all_steps mode');
    assert.strictEqual(slides5.length, 4, 'Final deck should contain 4 slides in all_steps mode');
    console.log('✔ Test 6 Passed: all_steps mode preserves every intermediate bullet step');
  }

  console.log('\n✅ All Scanner tests passed successfully!');
})().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
