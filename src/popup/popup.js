/**
 * YT SlideSnip - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusPill = document.getElementById('status-pill');
  const videoTitle = document.getElementById('video-title');
  const videoSubtitle = document.getElementById('video-subtitle');
  const statSlideCount = document.getElementById('stat-slide-count');
  const statScanStatus = document.getElementById('stat-scan-status');

  const btnSnap = document.getElementById('btn-snap');
  const btnAutoScan = document.getElementById('btn-autoscan');
  const btnDrawer = document.getElementById('btn-drawer');
  const btnExportPptx = document.getElementById('btn-export-pptx');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnExportPrint = document.getElementById('btn-export-print');
  const btnExportZip = document.getElementById('btn-export-zip');

  let activeTab = null;

  async function getActiveTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    }
    return null;
  }

  async function sendMessageToTab(message) {
    if (!activeTab || !activeTab.id) return null;
    try {
      return await chrome.tabs.sendMessage(activeTab.id, message);
    } catch (err) {
      console.warn('Could not communicate with tab:', err);
      return null;
    }
  }

  async function updateStatus() {
    activeTab = await getActiveTab();

    if (!activeTab || !activeTab.url || !activeTab.url.includes('youtube.com/watch')) {
      statusPill.className = 'status-pill status-offline';
      statusPill.textContent = 'Not YouTube';
      videoTitle.textContent = 'No YouTube Video Open';
      videoSubtitle.textContent = 'Open a YouTube video to use YT to PDF';
      btnSnap.disabled = true;
      btnAutoScan.disabled = true;
      btnDrawer.disabled = true;
      btnExportPptx.disabled = true;
      btnExportPdf.disabled = true;
      btnExportPrint.disabled = true;
      btnExportZip.disabled = true;
      return;
    }

    const res = await sendMessageToTab({ action: 'GET_STATUS' });

    if (res && res.hasVideo) {
      statusPill.className = 'status-pill status-ready';
      statusPill.textContent = 'Connected';
      videoTitle.textContent = res.videoTitle || 'YouTube Video';
      videoSubtitle.textContent = `ID: ${res.videoId || 'Active'}`;
      statSlideCount.textContent = res.slidesCount || 0;
      statScanStatus.textContent = res.isScanning ? 'Scanning...' : 'Idle';

      btnSnap.disabled = false;
      btnAutoScan.disabled = false;
      btnDrawer.disabled = false;
      btnExportPptx.disabled = res.slidesCount === 0;
      btnExportPdf.disabled = res.slidesCount === 0;
      btnExportPrint.disabled = res.slidesCount === 0;
      btnExportZip.disabled = res.slidesCount === 0;
    } else {
      statusPill.className = 'status-pill status-offline';
      statusPill.textContent = 'Connecting...';
      videoTitle.textContent = activeTab.title || 'YouTube';
      videoSubtitle.textContent = 'Refresh the page if buttons do not appear';
    }
  }

  // Snap button
  btnSnap.addEventListener('click', async () => {
    const res = await sendMessageToTab({ action: 'SNAP_SLIDE' });
    if (res && res.success) {
      statSlideCount.textContent = res.count;
      btnExportPptx.disabled = res.count === 0;
      btnExportPdf.disabled = res.count === 0;
      btnExportPrint.disabled = res.count === 0;
      btnExportZip.disabled = res.count === 0;
    }
  });

  // Auto scan button
  btnAutoScan.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'START_SCAN' });
    window.close(); // Close popup so user sees on-page scanner
  });

  // Drawer button
  btnDrawer.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'OPEN_DRAWER' });
    window.close();
  });

  // Export PPTX
  btnExportPptx.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'EXPORT_DECK', exportType: 'pptx' });
  });

  // Export PDF
  btnExportPdf.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'EXPORT_DECK', exportType: 'pdf' });
  });

  // Print Slides
  btnExportPrint.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'EXPORT_DECK', exportType: 'print' });
    window.close();
  });

  // Export ZIP
  btnExportZip.addEventListener('click', async () => {
    await sendMessageToTab({ action: 'EXPORT_DECK', exportType: 'zip' });
  });

  await updateStatus();
});
