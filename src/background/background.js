/**
 * YT to PDF - Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('YT to PDF Extension installed.');

  // Create context menus for quick access
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'ytsnip-snap',
      title: '📸 Snap Slide to Deck (Alt+S)',
      contexts: ['page', 'video'],
      documentUrlPatterns: ['*://*.youtube.com/watch*']
    });

    chrome.contextMenus.create({
      id: 'ytsnip-scan',
      title: '⚡ Auto-Scan Presentation Slides (Alt+A)',
      contexts: ['page', 'video'],
      documentUrlPatterns: ['*://*.youtube.com/watch*']
    });

    chrome.contextMenus.create({
      id: 'ytsnip-drawer',
      title: '📑 Open Slide Deck Drawer (Alt+D)',
      contexts: ['page', 'video'],
      documentUrlPatterns: ['*://*.youtube.com/watch*']
    });
  }
});

if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === 'ytsnip-snap') {
      chrome.tabs.sendMessage(tab.id, { action: 'SNAP_SLIDE' });
    } else if (info.menuItemId === 'ytsnip-scan') {
      chrome.tabs.sendMessage(tab.id, { action: 'START_SCAN' });
    } else if (info.menuItemId === 'ytsnip-drawer') {
      chrome.tabs.sendMessage(tab.id, { action: 'OPEN_DRAWER' });
    }
  });
}
