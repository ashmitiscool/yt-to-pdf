/**
 * YT SlideSnip - Exporter Engine
 * Compiles extracted slide decks into PowerPoint (.pptx), PDF (.pdf), and ZIP archives.
 */

(function (global) {
  'use strict';

  function sanitizeFilename(name) {
    return (name || 'presentation_slides')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 80);
  }

  function dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /**
   * Exports slides array to a PowerPoint (.pptx) file.
   * @param {Array<{dataUrl: string, timestamp: number, formattedTime: string}>} slides
   * @param {string} title
   * @returns {Promise<void>}
   */
  async function exportToPPTX(slides, title = 'YouTube Presentation') {
    if (!slides || slides.length === 0) {
      throw new Error('No slides to export');
    }

    const PptxGen = global.PptxGenJS || (typeof window !== 'undefined' ? window.PptxGenJS : null);
    if (!PptxGen) {
      throw new Error('PptxGenJS library not loaded');
    }

    const pptx = new PptxGen();
    pptx.title = title;
    pptx.layout = 'LAYOUT_16x9';

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const slide = pptx.addSlide();
      
      // Add full bleed slide image
      slide.addImage({
        data: s.dataUrl,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });

      // Add timestamp note for presenter
      slide.addNotes(`Slide captured from video at ${s.formattedTime || '00:00'}`);
    }

    const cleanTitle = sanitizeFilename(title);
    const filename = `${cleanTitle}_slides.pptx`;
    await pptx.writeFile({ fileName: filename });
  }

  /**
   * Exports slides array to a PDF document.
   * @param {Array<{dataUrl: string, timestamp: number, formattedTime: string, width?: number, height?: number}>} slides
   * @param {string} title
   * @returns {Promise<void>}
   */
  async function exportToPDF(slides, title = 'YouTube Presentation') {
    if (!slides || slides.length === 0) {
      throw new Error('No slides to export');
    }

    const jsPDFClass = (global.jspdf && global.jspdf.jsPDF) || (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFClass) {
      throw new Error('jsPDF library not loaded');
    }

    // Default to standard 16:9 widescreen PDF dimensions (in mm: 297mm x 167.06mm or landscape A4)
    const pdf = new jsPDFClass({
      orientation: 'landscape',
      unit: 'mm',
      format: [297, 167.06]
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (i > 0) {
        pdf.addPage([pageWidth, pageHeight], 'landscape');
      }

      pdf.addImage(s.dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    const cleanTitle = sanitizeFilename(title);
    const filename = `${cleanTitle}_slides.pdf`;
    pdf.save(filename);
  }

  /**
   * Exports slides array to a ZIP containing all images.
   * @param {Array<{dataUrl: string, timestamp: number, formattedTime: string}>} slides
   * @param {string} title
   * @returns {Promise<void>}
   */
  async function exportToZIP(slides, title = 'YouTube Presentation') {
    if (!slides || slides.length === 0) {
      throw new Error('No slides to export');
    }

    const JSZipClass = global.JSZip || (typeof window !== 'undefined' ? window.JSZip : null);
    if (!JSZipClass) {
      throw new Error('JSZip library not loaded');
    }

    const zip = new JSZipClass();
    const cleanTitle = sanitizeFilename(title);
    const folder = zip.folder(cleanTitle);

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const base64Data = s.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      const timeStr = (s.formattedTime || '00-00').replace(/:/g, '-');
      const filename = `slide_${String(i + 1).padStart(2, '0')}_[${timeStr}].jpg`;
      folder.file(filename, base64Data, { base64: true });
    }

    const content = await zip.generateAsync({ type: 'blob' });
    triggerDownload(content, `${cleanTitle}_slides.zip`);
  }

  /**
   * Copies a single slide image to the system clipboard (for OneNote / Notion paste).
   * @param {string} dataUrl
   * @returns {Promise<boolean>}
   */
  async function copySlideToClipboard(dataUrl) {
    try {
      // Need PNG blob for standard clipboard API
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create PNG blob');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch (err) {
      console.warn('Direct clipboard copy failed:', err);
      // Fallback: copy as dataURL text if binary clipboard item is restricted
      try {
        await navigator.clipboard.writeText(dataUrl);
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  /**
   * Opens the browser print dialog with formatted slide deck pages.
   * @param {Array<{dataUrl: string, timestamp: number, formattedTime: string}>} slides
   * @param {string} title
   * @returns {Promise<void>}
   */
  async function printSlides(slides, title = 'YouTube Presentation') {
    if (!slides || slides.length === 0) {
      throw new Error('No slides to print');
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const cleanTitle = sanitizeFilename(title);

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cleanTitle} - Slides</title>
        <style>
          @page {
            size: landscape;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: #ffffff;
            color: #000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          }
          .print-slide-page {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
            padding: 8mm;
            position: relative;
          }
          .print-slide-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-slide-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 4px;
          }
          .print-slide-footer {
            position: absolute;
            bottom: 4mm;
            right: 8mm;
            font-size: 10px;
            color: #888888;
          }
        </style>
      </head>
      <body>
        ${slides.map((s, idx) => `
          <div class="print-slide-page">
            <img class="print-slide-img" src="${s.dataUrl}" alt="Slide ${idx + 1}" />
            <div class="print-slide-footer">Slide ${idx + 1} (${s.formattedTime || '00:00'})</div>
          </div>
        `).join('')}
      </body>
      </html>
    `);
    doc.close();

    // Wait for all slide images in iframe to finish loading
    const images = doc.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    await Promise.all(promises);

    // Let the renderer finish painting
    await new Promise(r => setTimeout(r, 200));

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Clean up iframe
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 15000);
  }

  const SlideExporter = {
    sanitizeFilename,
    exportToPPTX,
    exportToPDF,
    exportToZIP,
    printSlides,
    copySlideToClipboard
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideExporter;
  } else {
    global.SlideExporter = SlideExporter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
