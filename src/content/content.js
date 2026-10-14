/**
 * YT to PDF - Content Script Entry Point
 * Injects controls into YouTube player, listens for shortcuts, and connects scanner & drawer.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__ytsnip_injected) return;
  window.__ytsnip_injected = true;

  let drawer = null;
  let scanner = null;
  let currentVideoId = null;

  let extensionSettings = {
    autoCopyClipboard: false,
    icons: {
      snap: true,
      clipboard: true,
      scan: true,
      deck: true
    }
  };

  let btnGroupEl = null;
  let snapBtnEl = null;
  let clipBtnEl = null;
  let scanBtnEl = null;
  let deckBtnEl = null;

  const ICONS = {
    camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
    clipboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    scan: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    deck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
  };

  function updatePlayerButtonsVisibility() {
    let group = btnGroupEl;
    if (!group || !group.isConnected) {
      group = document.querySelector('.ytsnip-btn-group');
      if (group) btnGroupEl = group;
    }
    if (!group) return;

    const icons = extensionSettings.icons || {};
    const showSnap = icons.snap !== false;
    const showClip = icons.clipboard !== false;
    const showScan = icons.scan !== false;
    const showDeck = icons.deck !== false;

    let snap = snapBtnEl;
    if (!snap || !snap.isConnected) snap = group.querySelector('.ytsnip-btn-snap');
    let clip = clipBtnEl;
    if (!clip || !clip.isConnected) clip = group.querySelector('.ytsnip-btn-clipboard');
    let scan = scanBtnEl;
    if (!scan || !scan.isConnected) scan = group.querySelector('.ytsnip-btn-scan');
    let deck = deckBtnEl;
    if (!deck || !deck.isConnected) deck = group.querySelector('.ytsnip-btn-deck');

    if (snap) {
      snap.classList.toggle('ytsnip-hidden', !showSnap);
      snap.style.setProperty('display', showSnap ? 'inline-flex' : 'none', 'important');
    }
    if (clip) {
      clip.classList.toggle('ytsnip-hidden', !showClip);
      clip.style.setProperty('display', showClip ? 'inline-flex' : 'none', 'important');
    }
    if (scan) {
      scan.classList.toggle('ytsnip-hidden', !showScan);
      scan.style.setProperty('display', showScan ? 'inline-flex' : 'none', 'important');
    }
    if (deck) {
      deck.classList.toggle('ytsnip-hidden', !showDeck);
      deck.style.setProperty('display', showDeck ? 'inline-flex' : 'none', 'important');
    }

    const anyVisible = showSnap || showClip || showScan || showDeck;
    group.classList.toggle('ytsnip-hidden', !anyVisible);
    group.style.setProperty('display', anyVisible ? 'inline-flex' : 'none', 'important');
  }

  async function loadExtensionSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    try {
      const res = await chrome.storage.local.get(['ytsnip_settings', 'ytsnip_auto_copy_clipboard']);
      if (res.ytsnip_settings) {
        extensionSettings = {
          ...extensionSettings,
          ...res.ytsnip_settings,
          icons: {
            ...extensionSettings.icons,
            ...(res.ytsnip_settings.icons || {})
          }
        };
      }
      if (typeof res.ytsnip_auto_copy_clipboard === 'boolean' && (!res.ytsnip_settings || res.ytsnip_settings.autoCopyClipboard === undefined)) {
        extensionSettings.autoCopyClipboard = res.ytsnip_auto_copy_clipboard;
      }
      updatePlayerButtonsVisibility();
    } catch (e) {
      console.warn('Could not load extension settings in content script:', e);
    }
  }

  function getVideoElement() {
    return document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function getVideoId() {
    // 1. URL search parameters (?v=...)
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v) return v;

    // 2. Shorts, Live, Embed paths (/shorts/ID, /live/ID, /embed/ID)
    const pathname = window.location.pathname || '';
    const match = pathname.match(/\/(shorts|live|embed)\/([a-zA-Z0-9_-]+)/);
    if (match && match[2]) return match[2];

    // 3. YouTube DOM attributes on player containers
    const flexy = document.querySelector('ytd-watch-flexy, ytd-watch-grid');
    if (flexy) {
      const domVid = flexy.getAttribute('video-id');
      if (domVid) return domVid;
    }

    return null;
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('h1.ytd-watch-metadata') || document.querySelector('h1.title');
    if (titleEl && titleEl.innerText.trim()) {
      return titleEl.innerText.trim();
    }
    return document.title.replace(/ - YouTube$/, '').trim() || 'YouTube Presentation';
  }

  function getVideoCurrentTime() {
    const video = getVideoElement();
    return video && !isNaN(video.currentTime) ? video.currentTime : 0;
  }

  function initApp() {
    if (!drawer) {
      drawer = new window.SlideDrawer();
      scanner = new window.SlideScanner.VideoScanner();

      drawer.setCallbacks({
        onStartScan: (options) => startAutoScan(options),
        onStopScan: () => stopAutoScan(),
        onSeekVideo: (time) => seekVideoTo(time),
        onGetCurrentTime: () => getVideoCurrentTime()
      });
    }

    loadExtensionSettings();
    handlePageChange();
  }

  function handlePageChange() {
    const vId = getVideoId();
    if (!vId) return;

    if (vId !== currentVideoId) {
      currentVideoId = vId;
      const title = getVideoTitle();
      drawer.loadForVideo(currentVideoId, title);
    }

    injectPlayerButtons();
  }

  function injectPlayerButtons() {
    const rightControls = document.querySelector('.ytp-right-controls');
    if (!rightControls) {
      // Retry in a moment if player hasn't loaded yet
      setTimeout(injectPlayerButtons, 800);
      return;
    }

    // Avoid duplicates
    if (rightControls.querySelector('.ytsnip-btn-group')) return;

    const group = document.createElement('div');
    group.className = 'ytsnip-btn-group';
    group.style.display = 'inline-flex';
    group.style.height = '100%';
    group.style.verticalAlign = 'top';

    // 1. Snap Slide Button
    const snapBtn = document.createElement('button');
    snapBtn.className = 'ytp-button ytsnip-yt-btn ytsnip-btn-snap';
    snapBtn.title = 'Snap Slide (Alt+S) - Add current frame to slide deck';
    snapBtn.innerHTML = ICONS.camera;
    snapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      captureCurrentFrame();
    });

    // 2. Screenshot to Clipboard Button
    const clipBtn = document.createElement('button');
    clipBtn.className = 'ytp-button ytsnip-yt-btn ytsnip-btn-clipboard';
    clipBtn.title = 'Copy Frame to Clipboard (Alt+C)';
    clipBtn.innerHTML = ICONS.clipboard;
    clipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyFrameToClipboard();
    });

    // 3. Auto-Scan Button
    const scanBtn = document.createElement('button');
    scanBtn.className = 'ytp-button ytsnip-yt-btn ytsnip-btn-scan';
    scanBtn.title = 'Auto-Scan Slides (Alt+A)';
    scanBtn.innerHTML = ICONS.scan;
    scanBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drawer) {
        drawer.open();
      }
    });

    // 4. Open Deck Drawer Button
    const deckBtn = document.createElement('button');
    deckBtn.className = 'ytp-button ytsnip-yt-btn ytsnip-btn-deck';
    deckBtn.title = 'Open Slide Deck (Alt+D)';
    deckBtn.innerHTML = `${ICONS.deck} <span class="ytsnip-yt-badge" style="display: ${drawer.slides.length > 0 ? 'inline-block' : 'none'}">${drawer.slides.length}</span>`;
    deckBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.toggle();
    });

    group.appendChild(snapBtn);
    group.appendChild(clipBtn);
    group.appendChild(scanBtn);
    group.appendChild(deckBtn);

    btnGroupEl = group;
    snapBtnEl = snapBtn;
    clipBtnEl = clipBtn;
    scanBtnEl = scanBtn;
    deckBtnEl = deckBtn;
    updatePlayerButtonsVisibility();

    // Insert at beginning of right controls
    rightControls.insertBefore(group, rightControls.firstChild);
  }

  async function captureCurrentFrame() {
    const video = getVideoElement();
    if (!video || isNaN(video.currentTime)) {
      if (drawer) drawer.showToast('Video not ready to capture');
      return;
    }

    // Auto-sync active video ID with drawer so snaps are always saved
    const vId = getVideoId();
    if (vId && drawer && (!drawer.videoId || drawer.videoId !== vId)) {
      drawer.videoId = vId;
      drawer.videoTitle = getVideoTitle();
    }

    try {
      const frame = window.SlideScanner.captureVideoFrame(video);
      const slideId = 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const currentTime = video.currentTime;
      const formattedTime = window.SlideScanner.formatTime(currentTime);

      const slide = {
        id: slideId,
        timestamp: currentTime,
        formattedTime,
        dataUrl: frame.dataUrl,
        width: frame.width,
        height: frame.height
      };

      const willAutoCopy = !!extensionSettings.autoCopyClipboard;
      drawer.addSlide(slide, !willAutoCopy);

      if (willAutoCopy) {
        let copied = false;
        try {
          if (window.SlideExporter && window.SlideExporter.copyVideoFrameToClipboard) {
            copied = await window.SlideExporter.copyVideoFrameToClipboard(video);
          }
        } catch (copyErr) {
          console.warn('Auto-copy frame to clipboard failed:', copyErr);
        }

        if (copied) {
          drawer.showToast(`Slide captured & copied to clipboard at ${formattedTime}! (Total: ${drawer.slides.length})`);
        } else {
          drawer.showToast(`Slide captured at ${formattedTime}! (Clipboard copy failed)`);
        }
      }
    } catch (err) {
      console.error('Frame capture failed:', err);
      drawer.showToast('Failed to capture frame: ' + err.message);
    }
  }

  async function copyFrameToClipboard() {
    const video = getVideoElement();
    if (!video || isNaN(video.currentTime)) {
      if (drawer) drawer.showToast('Video not ready', 1500, true);
      return;
    }

    try {
      const exporter = window.SlideExporter;
      if (!exporter || !exporter.copyVideoFrameToClipboard) {
        throw new Error('Exporter not ready');
      }

      const ok = await exporter.copyVideoFrameToClipboard(video);
      if (ok) {
        if (drawer) drawer.showToast('Copied to clipboard', 1500, true);
      } else {
        if (drawer) drawer.showToast('Failed to copy to clipboard', 2000, true);
      }
    } catch (err) {
      console.warn('Screenshot to clipboard failed:', err);
      if (drawer) drawer.showToast('Failed to copy to clipboard', 2000, true);
    }
  }

  function startAutoScan(options = {}) {
    const video = getVideoElement();
    if (!video) {
      drawer.showToast('Video player not found');
      return;
    }

    if (scanner.isScanning()) {
      drawer.showToast('Scan already in progress');
      return;
    }

    let startFrom = 0;
    if (options.startFrom === 'current') {
      startFrom = video.currentTime && !isNaN(video.currentTime) ? Math.max(0, video.currentTime) : 0;
    } else if (typeof options.startFrom === 'number' && !isNaN(options.startFrom)) {
      startFrom = Math.max(0, options.startFrom);
    }

    drawer.showScanBanner(true);
    drawer.open();

    scanner.startScan({
      videoElement: video,
      stepSeconds: options.stepSeconds || 2,
      sensitivity: options.sensitivity || drawer.sensitivity || 'medium',
      captureMode: options.captureMode || drawer.captureMode || 'final_only',
      startFrom,
      onProgress: (progress) => {
        drawer.updateScanProgress(progress);
      },
      onSlideFound: (slide, count) => {
        drawer.addSlide(slide, false);
      },
      onSlideUpdated: (slide, index) => {
        drawer.updateSlide(index, slide);
      },
      onComplete: (slides, wasCancelled) => {
        drawer.showScanBanner(false);
        if (wasCancelled) {
          drawer.showToast(`Scan stopped (${slides.length} slides saved)`);
        } else {
          drawer.showToast(`Scan complete! ${slides.length} slides extracted.`);
        }
      },
      onError: (err) => {
        drawer.showScanBanner(false);
        drawer.showToast(`Scan error: ${err.message}`);
      }
    });
  }

  function stopAutoScan() {
    if (scanner && scanner.isScanning()) {
      scanner.cancel();
    }
  }

  function seekVideoTo(timestamp) {
    const video = getVideoElement();
    if (video && !isNaN(timestamp)) {
      video.currentTime = timestamp;
    }
  }

  // Keyboard Shortcuts Listener
  window.addEventListener('keydown', (e) => {
    // Ignore if typing in an input/textarea
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    // Alt+S: Snap current frame
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      captureCurrentFrame();
    }

    // Alt+C: Copy current frame to clipboard
    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      copyFrameToClipboard();
    }

    // Alt+D: Toggle slide drawer
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (drawer) drawer.toggle();
    }

    // Alt+A: Open slide drawer for scan options
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (drawer) {
        drawer.open();
      }
    }
  });

  // YouTube SPA Navigation Listeners
  window.addEventListener('yt-navigate-finish', handlePageChange);
  window.addEventListener('spfdone', handlePageChange);
  window.addEventListener('popstate', handlePageChange);

  // Background message listener (for communication with popup)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'GET_STATUS') {
        const video = getVideoElement();
        const curTime = video && !isNaN(video.currentTime) ? video.currentTime : 0;
        const dur = video && !isNaN(video.duration) ? video.duration : 0;
        const formattedCur = (window.SlideScanner && window.SlideScanner.formatTime)
          ? window.SlideScanner.formatTime(curTime)
          : '00:00';

        sendResponse({
          hasVideo: !!video,
          videoId: getVideoId(),
          videoTitle: getVideoTitle(),
          currentTime: curTime,
          duration: dur,
          formattedCurrentTime: formattedCur,
          slidesCount: drawer ? drawer.slides.length : 0,
          selectedCount: drawer ? drawer.getSelectedSlides().length : 0,
          isScanning: scanner ? scanner.isScanning() : false
        });
      } else if (request.action === 'SNAP_SLIDE') {
        captureCurrentFrame();
        sendResponse({ success: true, count: drawer ? drawer.slides.length : 0 });
      } else if (request.action === 'COPY_FRAME') {
        copyFrameToClipboard();
        sendResponse({ success: true });
      } else if (request.action === 'START_SCAN') {
        startAutoScan(request.options || {});
        sendResponse({ success: true });
      } else if (request.action === 'STOP_SCAN') {
        stopAutoScan();
        sendResponse({ success: true });
      } else if (request.action === 'OPEN_DRAWER') {
        if (drawer) drawer.open();
        sendResponse({ success: true });
      } else if (request.action === 'EXPORT_DECK') {
        if (drawer) drawer.exportDeck(request.exportType || 'pptx');
        sendResponse({ success: true });
      }
      return true;
    });
  }

  // Storage change listener (for live reactive updates from settings tab)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      let needsVisibilityUpdate = false;
      if (changes.ytsnip_settings) {
        const val = changes.ytsnip_settings.newValue || {};
        extensionSettings = {
          ...extensionSettings,
          ...val,
          icons: {
            ...extensionSettings.icons,
            ...(val.icons || {})
          }
        };
        needsVisibilityUpdate = true;
      }
      if (changes.ytsnip_auto_copy_clipboard) {
        extensionSettings.autoCopyClipboard = !!changes.ytsnip_auto_copy_clipboard.newValue;
      }
      if (needsVisibilityUpdate) {
        updatePlayerButtonsVisibility();
      }
    });
  }


  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
