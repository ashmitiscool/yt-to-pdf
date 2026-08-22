/**
 * YT SlideSnip - Content Script Entry Point
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

  const ICONS = {
    camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
    scan: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    deck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`
  };

  function getVideoElement() {
    return document.querySelector('video.html5-main-video') || document.querySelector('video');
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('v');
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('h1.ytd-watch-metadata') || document.querySelector('h1.title');
    if (titleEl && titleEl.innerText.trim()) {
      return titleEl.innerText.trim();
    }
    return document.title.replace(/ - YouTube$/, '').trim() || 'YouTube Presentation';
  }

  function initApp() {
    if (!drawer) {
      drawer = new window.SlideDrawer();
      scanner = new window.SlideScanner.VideoScanner();

      drawer.setCallbacks({
        onStartScan: (options) => startAutoScan(options),
        onStopScan: () => stopAutoScan(),
        onSeekVideo: (time) => seekVideoTo(time)
      });
    }

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
    snapBtn.className = 'ytp-button ytsnip-yt-btn';
    snapBtn.title = 'Snap Slide (Alt+S) - Add current frame to slide deck';
    snapBtn.innerHTML = ICONS.camera;
    snapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      captureCurrentFrame();
    });

    // 2. Auto-Scan Button
    const scanBtn = document.createElement('button');
    scanBtn.className = 'ytp-button ytsnip-yt-btn';
    scanBtn.title = 'Auto-Scan All Slides (Alt+A)';
    scanBtn.innerHTML = ICONS.scan;
    scanBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.open();
      startAutoScan();
    });

    // 3. Open Deck Drawer Button
    const deckBtn = document.createElement('button');
    deckBtn.className = 'ytp-button ytsnip-yt-btn';
    deckBtn.title = 'Open Slide Deck (Alt+D)';
    deckBtn.innerHTML = `${ICONS.deck} <span class="ytsnip-yt-badge" style="display: ${drawer.slides.length > 0 ? 'inline-block' : 'none'}">${drawer.slides.length}</span>`;
    deckBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      drawer.toggle();
    });

    group.appendChild(snapBtn);
    group.appendChild(scanBtn);
    group.appendChild(deckBtn);

    // Insert at beginning of right controls
    rightControls.insertBefore(group, rightControls.firstChild);
  }

  function captureCurrentFrame() {
    const video = getVideoElement();
    if (!video || isNaN(video.currentTime)) {
      drawer.showToast('Video not ready to capture');
      return;
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

      drawer.addSlide(slide, true);
    } catch (err) {
      console.error('Frame capture failed:', err);
      drawer.showToast('Failed to capture frame: ' + err.message);
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

    drawer.showScanBanner(true);
    drawer.open();

    scanner.startScan({
      videoElement: video,
      stepSeconds: options.stepSeconds || 3,
      sensitivity: options.sensitivity || drawer.sensitivity || 'medium',
      onProgress: (progress) => {
        drawer.updateScanProgress(progress);
      },
      onSlideFound: (slide, count) => {
        drawer.addSlide(slide, false);
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

    // Alt+D: Toggle slide drawer
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (drawer) drawer.toggle();
    }

    // Alt+A: Start auto-scan
    if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (drawer) {
        drawer.open();
        startAutoScan();
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
        sendResponse({
          hasVideo: !!video,
          videoId: getVideoId(),
          videoTitle: getVideoTitle(),
          slidesCount: drawer ? drawer.slides.length : 0,
          isScanning: scanner ? scanner.isScanning() : false
        });
      } else if (request.action === 'SNAP_SLIDE') {
        captureCurrentFrame();
        sendResponse({ success: true, count: drawer ? drawer.slides.length : 0 });
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

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
