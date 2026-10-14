/**
 * YT to PDF - Extension Settings Controller
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    autoCopyClipboard: false,
    icons: {
      snap: true,
      clipboard: true,
      scan: true,
      deck: true
    },
    captureMode: 'final_only',
    sensitivity: 'medium'
  };

  // DOM Elements
  const toggleAutoCopy = document.getElementById('toggle-auto-copy');
  const toggleIconSnap = document.getElementById('toggle-icon-snap');
  const toggleIconClipboard = document.getElementById('toggle-icon-clipboard');
  const toggleIconScan = document.getElementById('toggle-icon-scan');
  const toggleIconDeck = document.getElementById('toggle-icon-deck');
  const selectCaptureMode = document.getElementById('select-capture-mode');
  const selectSensitivity = document.getElementById('select-sensitivity');
  const btnReset = document.getElementById('btn-reset');
  const saveStatus = document.getElementById('save-status');
  const saveStatusText = document.getElementById('save-status-text');

  let currentSettings = { ...DEFAULT_SETTINGS };
  let saveTimer = null;

  /**
   * Retrieves settings from chrome.storage.local with defaults and legacy migration.
   */
  async function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      console.warn('chrome.storage.local is not available');
      applySettingsToUI(DEFAULT_SETTINGS);
      return;
    }

    try {
      const res = await chrome.storage.local.get([
        'ytsnip_settings',
        'ytsnip_auto_copy_clipboard',
        'ytsnip_capture_mode'
      ]);

      const stored = res.ytsnip_settings || {};
      const merged = {
        ...DEFAULT_SETTINGS,
        ...stored,
        icons: {
          ...DEFAULT_SETTINGS.icons,
          ...(stored.icons || {})
        }
      };

      // Legacy key backward compatibility
      if (typeof res.ytsnip_auto_copy_clipboard === 'boolean' && stored.autoCopyClipboard === undefined) {
        merged.autoCopyClipboard = res.ytsnip_auto_copy_clipboard;
      }
      if (res.ytsnip_capture_mode && stored.captureMode === undefined) {
        merged.captureMode = res.ytsnip_capture_mode;
      }

      currentSettings = merged;
      applySettingsToUI(currentSettings);
    } catch (err) {
      console.error('Failed to load settings from storage:', err);
      applySettingsToUI(DEFAULT_SETTINGS);
    }
  }

  /**
   * Updates UI form controls with settings values.
   */
  function applySettingsToUI(settings) {
    if (toggleAutoCopy) toggleAutoCopy.checked = !!settings.autoCopyClipboard;
    if (toggleIconSnap) toggleIconSnap.checked = settings.icons ? settings.icons.snap !== false : true;
    if (toggleIconClipboard) toggleIconClipboard.checked = settings.icons ? settings.icons.clipboard !== false : true;
    if (toggleIconScan) toggleIconScan.checked = settings.icons ? settings.icons.scan !== false : true;
    if (toggleIconDeck) toggleIconDeck.checked = settings.icons ? settings.icons.deck !== false : true;
    if (selectCaptureMode) selectCaptureMode.value = settings.captureMode || 'final_only';
    if (selectSensitivity) selectSensitivity.value = settings.sensitivity || 'medium';
  }

  /**
   * Reads current form state into a settings object.
   */
  function readSettingsFromUI() {
    return {
      autoCopyClipboard: toggleAutoCopy ? toggleAutoCopy.checked : false,
      icons: {
        snap: toggleIconSnap ? toggleIconSnap.checked : true,
        clipboard: toggleIconClipboard ? toggleIconClipboard.checked : true,
        scan: toggleIconScan ? toggleIconScan.checked : true,
        deck: toggleIconDeck ? toggleIconDeck.checked : true
      },
      captureMode: selectCaptureMode ? selectCaptureMode.value : 'final_only',
      sensitivity: selectSensitivity ? selectSensitivity.value : 'medium'
    };
  }

  /**
   * Persists settings to chrome.storage.local.
   */
  async function persistSettings() {
    currentSettings = readSettingsFromUI();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({
          ytsnip_settings: currentSettings,
          ytsnip_auto_copy_clipboard: currentSettings.autoCopyClipboard,
          ytsnip_capture_mode: currentSettings.captureMode
        });
        showSavedFeedback();
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
  }

  /**
   * Shows a visual indicator that settings were saved.
   */
  function showSavedFeedback() {
    if (!saveStatus || !saveStatusText) return;

    saveStatusText.textContent = 'Settings saved';
    saveStatus.style.opacity = '1';

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveStatusText.textContent = 'Settings synced';
    }, 1800);
  }

  /**
   * Resets settings back to factory defaults.
   */
  async function resetToDefaults() {
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    applySettingsToUI(currentSettings);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({
          ytsnip_settings: currentSettings,
          ytsnip_auto_copy_clipboard: currentSettings.autoCopyClipboard,
          ytsnip_capture_mode: currentSettings.captureMode
        });
        showSavedFeedback();
      } catch (err) {
        console.error('Failed to reset settings:', err);
      }
    }
  }

  // Event Listeners
  function bindEvents() {
    const inputs = [
      toggleAutoCopy,
      toggleIconSnap,
      toggleIconClipboard,
      toggleIconScan,
      toggleIconDeck,
      selectCaptureMode,
      selectSensitivity
    ];

    inputs.forEach((input) => {
      if (input) {
        input.addEventListener('change', () => {
          persistSettings();
        });
      }
    });

    // Clicking anywhere on an icon row toggles the checkbox
    document.querySelectorAll('.icon-toggle-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const input = row.querySelector('input[type="checkbox"]');
        if (input) {
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    // Clicking anywhere on a setting row toggles the checkbox
    document.querySelectorAll('.setting-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        const input = row.querySelector('input[type="checkbox"]');
        if (input) {
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetToDefaults();
      });
    }
  }

  // Init
  function init() {
    bindEvents();
    loadSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
