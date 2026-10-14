/**
 * YT to PDF - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('YT to PDF Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_OPTIONS') {
    try {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'openOptionsPage not available' });
      }
    } catch (err) {
      console.warn('Failed to open options page:', err);
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});


