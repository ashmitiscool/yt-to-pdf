# 🎓 YT SlideSnip - YouTube to PPT & PDF Chrome Extension

**YT SlideSnip** extracts presentation slides directly from YouTube videos and exports them into PowerPoint (`.pptx`), PDF documents (`.pdf`), or high-resolution image ZIPs with a single click.

---

## ✨ Features

- 📸 **1-Click Manual Snapshot**: Add the current slide to your deck anytime using the on-player camera button or `Alt+S`.
- ⚡ **Auto-Scan Entire Presentation**: Rapidly scans the entire YouTube video in seconds, extracting every slide transition automatically.
- 🎯 **Smart Transition Detection**: Uses a 64-bit Difference Hashing (dHash) & Block Color Variance algorithm that ignores mouse cursor movements, laser pointers, and webcam jitter (<5% difference).
- 📋 **Interactive Slide Deck Manager**:
  - Thumbnail preview grid with timestamps.
  - One-click jump to the exact video timestamp.
  - Quick copy to clipboard (`Ctrl+V` into OneNote / Notion / Docs).
  - Delete duplicate or unwanted slides.
- 🚀 **1-Click Export Formats**:
  - **PowerPoint (.pptx)**: Clean 16:9 widescreen presentation deck.
  - **PDF Document (.pdf)**: High-resolution multi-page document.
  - **Images (.zip)**: Numbered crisp JPEGs/PNGs.
- 🔒 **100% Client-Side & Private**: Runs entirely in your browser. No external servers or API keys required.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Alt</kbd> + <kbd>S</kbd> | **Snap Current Slide** into deck |
| <kbd>Alt</kbd> + <kbd>A</kbd> | **Start Auto-Scan** for all slides |
| <kbd>Alt</kbd> + <kbd>D</kbd> | **Open / Close Slide Deck Drawer** |

---

## 📦 How to Install & Load in Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in the URL bar.
3. Turn on **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select this project folder:
   ```
   C:\Users\ashmi\Coding\Projects\yt_to_ppt
   ```
6. The **YT SlideSnip** extension is now installed and active!

---

## 🚀 How to Use

1. Open any YouTube lecture or slideshow video (e.g., `https://www.youtube.com/watch?v=...`).
2. You will see three new buttons added to the YouTube bottom control bar:
   - 📸 **Snap Slide**
   - ⚡ **Auto-Scan**
   - 📑 **Slide Deck** (with live slide count badge)
3. Either click **Auto-Scan** to let the extension scan the entire lecture, or press `Alt+S` whenever a new slide appears.
4. Open the Slide Deck drawer, review your slides, and click **PowerPoint (.pptx)** or **PDF Document** to download your notes.

---

## 🧪 Testing

To run the algorithmic unit tests:
```bash
npm test
```
