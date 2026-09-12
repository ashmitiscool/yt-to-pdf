const assert = require('assert');
const SlideExporter = require('../src/content/exporter.js');

console.log('=== Running SlideExporter Tests ===\n');

// Test 1: SlideExporter exposes copyVideoFrameToClipboard and copySlideToClipboard
{
  assert.strictEqual(typeof SlideExporter.copyVideoFrameToClipboard, 'function', 'copyVideoFrameToClipboard must be a function');
  assert.strictEqual(typeof SlideExporter.copySlideToClipboard, 'function', 'copySlideToClipboard must be a function');
  console.log('✔ Test 1 Passed: Exporter methods are properly defined and exported');
}

(async () => {
  // Test 2: copyVideoFrameToClipboard rejects if video is missing or invalid
  await assert.rejects(
    async () => { await SlideExporter.copyVideoFrameToClipboard(null); },
    /Video element not ready/
  );

  await assert.rejects(
    async () => { await SlideExporter.copyVideoFrameToClipboard({ videoWidth: 0, videoHeight: 0 }); },
    /Video element not ready/
  );
  console.log('✔ Test 2 Passed: Invalid video element input is safely rejected');
  let clipboardWritten = false;
  let canvasDrawn = false;

  // Mock global document & navigator for Node test environment
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: (video, x, y, w, h) => {
              canvasDrawn = true;
            }
          }),
          toBlob: (cb, mime) => {
            cb({ type: mime, size: 1234 });
          },
          toDataURL: () => 'data:image/png;base64,mock'
        };
      }
      return {};
    }
  };

  global.ClipboardItem = class ClipboardItem {
    constructor(data) {
      this.data = data;
    }
  };

  Object.defineProperty(global, 'navigator', {
    value: {
      clipboard: {
        write: async (items) => {
          clipboardWritten = true;
          assert.ok(items[0].data['image/png'], 'ClipboardItem must contain image/png');
        },
        writeText: async (text) => {}
      }
    },
    configurable: true,
    writable: true
  });

  const mockVideo = { videoWidth: 1920, videoHeight: 1080 };
  const ok = await SlideExporter.copyVideoFrameToClipboard(mockVideo);

  assert.strictEqual(ok, true, 'copyVideoFrameToClipboard should return true on success');
  assert.strictEqual(canvasDrawn, true, 'Frame must be drawn onto canvas');
  assert.strictEqual(clipboardWritten, true, 'PNG Blob must be written to navigator.clipboard');
  console.log('✔ Test 3 Passed: Video frame drawn and written to clipboard as PNG');

  // Test 4: Graceful fallback to writeText if write fails
  let fallbackTextWritten = false;
  global.navigator.clipboard.write = async () => {
    throw new Error('Clipboard permissions denied');
  };
  global.navigator.clipboard.writeText = async (text) => {
    fallbackTextWritten = true;
    assert.strictEqual(text, 'data:image/png;base64,mock');
  };

  const fallbackOk = await SlideExporter.copyVideoFrameToClipboard(mockVideo);
  assert.strictEqual(fallbackOk, true, 'Fallback should return true if writeText succeeds');
  assert.strictEqual(fallbackTextWritten, true, 'writeText must be called as fallback');
  console.log('✔ Test 4 Passed: Fallback to writeText functions as expected');

  console.log('\n✅ All Exporter tests passed successfully!');
})();
