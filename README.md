# 📄 YT to PDF - YouTube Slides to PDF & PPT Converter

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20%2F%20Closed--Source-red.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-YT_to_PDF-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/manifest-v3)

**YT to PDF** is a lightweight, privacy-focused Chrome Extension that extracts presentation slides directly from YouTube videos and converts them into **PDF documents**, **PowerPoint (`.pptx`) presentations**, or **high-resolution image archives** with a single click.

Whether you're studying online university lectures, watching tech conferences, or following webinars, **YT to PDF** captures crisp slide notes automatically without manual screenshots.

---

## ✨ Key Features

- ⚡ **Automated Slide Scanner**: Fast-scans the entire YouTube video in seconds, capturing every unique slide and slide transition automatically.
- 📸 **1-Click Manual Snapshot**: Snap the current video frame into your deck at any moment using the on-player camera button or keyboard shortcut (<kbd>Alt</kbd> + <kbd>S</kbd>).
- 🎯 **Smart Transition Detection**: Powered by a 64-bit Difference Hashing (`dHash`) and Block Color Variance algorithm that captures genuine slide changes while filtering out mouse cursor movements, laser pointers, and webcam jitter.
- 🗂️ **Interactive Slide Deck Manager**:
  - Grid preview of all captured slides with exact video timestamps.
  - One-click jump to the timestamp in the YouTube video.
  - Copy slide image to clipboard for instant pasting into OneNote, Notion, Google Docs, or Word.
  - Reorder, delete duplicates, or remove unwanted frames with ease.
- 🚀 **Versatile Export Options**:
  - **PDF Document (`.pdf`)**: High-resolution, multi-page vector-ready study document.
  - **PowerPoint (`.pptx`)**: Clean 16:9 widescreen presentation deck ready to present or edit.
  - **Image Archive (`.zip`)**: Numbered, organized JPEG / PNG files.
  - **Direct Print**: Print-friendly layout right from your browser.
- 🔒 **100% Client-Side & Privacy First**: Runs entirely locally in your browser. No external servers, no tracking, and no video data ever leaves your computer.

---

## 📦 Installation

### Method 1: Chrome Web Store (Recommended)

1. Open Google Chrome and go to the **[Chrome Web Store](https://chromewebstore.google.com/)**.
2. Search for **"YT to PDF"**.
3. Click **Add to Chrome**.
4. Pin **YT to PDF** to your Chrome toolbar for quick access!

---

### Method 2: Local / Developer Setup (Evaluation Only)

If you are evaluating the codebase locally or running tests for portfolio / demonstration review:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ashmitiscool/yt-to-pdf.git
   cd yt-to-pdf
   ```

2. **Install testing dependencies (optional)**:
   ```bash
   npm install
   ```

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** using the toggle switch in the top-right corner.
   - Click the **Load unpacked** button.
   - Select the project folder.

4. The **YT to PDF** extension icon will now appear in your browser.

---

## 🚀 How to Use

1. **Open any YouTube video** containing slides, a lecture, or a presentation.
2. Look for the **YT to PDF** action buttons directly embedded in the YouTube video player control bar:
   - 📸 **Snap Slide** (`Alt+S`) — Captures the current slide frame instantly.
   - ⚡ **Auto-Scan** (`Alt+A`) — Automatically scans the video from start to end and extracts all slides.
   - 📑 **Slide Deck** (`Alt+D`) — Opens the slide management drawer with live slide count.
3. Review and curate your extracted slides in the **Slide Deck** drawer.
4. Click **PDF** or **PowerPoint** to download your complete slide deck!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>S</kbd> | **Snap Slide** | Captures the active video frame into your deck |
| <kbd>Alt</kbd> + <kbd>A</kbd> | **Auto-Scan** | Starts or stops automated slide detection |
| <kbd>Alt</kbd> + <kbd>D</kbd> | **Toggle Drawer** | Opens or closes the slide deck manager |

---

## 🛠️ Tech Stack & Architecture

- **Platform**: Chrome Extensions Manifest V3 (Vanilla JS, HTML5 Canvas, CSS3)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) (in-browser PDF rendering)
- **PowerPoint Generation**: [PptxGenJS](https://github.com/gitbrent/PptxGenJS) (16:9 presentation layout)
- **Image Archiving**: [JSZip](https://github.com/Stuk/jszip) (zip packaging)
- **Computer Vision Algorithm**: 64-bit perceptual difference hashing (`dHash`) with luminance normalization and block-level variance analysis.

---

## 🧪 Testing

To run the algorithmic unit tests for slide transition detection:

```bash
npm test
```

---

## 🔐 Permissions & Privacy

YT to PDF is built with strict user privacy and minimum permission standards:

- `*://*.youtube.com/*`: Required solely to inject the slide capture overlay and access the video frame on YouTube watch pages.
- `storage`: Saves extracted slide decks locally in your browser storage so you don't lose your progress across tabs.

**Zero broad permissions:** Does not request `tabs`, `activeTab`, `downloads`, or `scripting`. All PDF, PowerPoint, and image exports are generated 100% locally in your browser without contacting external servers.

**No analytics, no cookies, no cloud servers, and zero data collection.**

---

## 📄 License & Copyright

**Copyright © 2026 Ashmit Verma. All Rights Reserved.**

This software is **proprietary and closed-source**. The source code is made publicly available for portfolio, demonstration, and educational review purposes only.

- **No Unauthorized Distribution**: Unauthorized copying, modification, reverse engineering, redistribution, sublicensing, or commercial deployment of this software, in whole or in part, is strictly prohibited.
- **Contributions**: As a closed-source product, external pull requests and public contributions are not accepted.

For questions, permissions, or inquiries, please contact the author directly.



