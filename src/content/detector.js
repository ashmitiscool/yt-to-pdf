/**
 * YT SlideSnip - Detector Engine
 * High-performance frame hashing, perceptual difference, and slide transition detection.
 * Designed to filter out cursor movements, laser pointers, and video noise.
 */

(function (global) {
  'use strict';

  /**
   * Converts RGB to Grayscale Luminance
   */
  function rgbToGray(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /**
   * Computes a 64-bit Difference Hash (dHash) from image data or canvas.
   * Uses a 9x8 sample grid to detect structural gradients.
   * @param {ImageData|HTMLCanvasElement|HTMLVideoElement|{data: Uint8ClampedArray, width: number, height: number}} source
   * @returns {string} 64-character binary string ('0' and '1')
   */
  function computeDHash(source) {
    let sampleData;

    if (typeof document !== 'undefined' && (source instanceof HTMLCanvasElement || (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement))) {
      const canvas = document.createElement('canvas');
      canvas.width = 9;
      canvas.height = 8;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, 9, 8);
      sampleData = ctx.getImageData(0, 0, 9, 8).data;
    } else if (source && source.data && source.width === 9 && source.height === 8) {
      sampleData = source.data;
    } else if (source && source.data) {
      // Downsample manually if source is an arbitrary ImageData
      sampleData = downsampleImageData(source, 9, 8);
    } else {
      throw new Error('Invalid source for computeDHash');
    }

    // Build 64-bit hash
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const idxLeft = (row * 9 + col) * 4;
        const idxRight = (row * 9 + (col + 1)) * 4;

        const leftLum = rgbToGray(sampleData[idxLeft], sampleData[idxLeft + 1], sampleData[idxLeft + 2]);
        const rightLum = rgbToGray(sampleData[idxRight], sampleData[idxRight + 1], sampleData[idxRight + 2]);

        hash += leftLum > rightLum ? '1' : '0';
      }
    }

    return hash;
  }

  /**
   * Computes Hamming Distance between two binary hash strings.
   * @param {string} hash1
   * @param {string} hash2
   * @returns {number} Number of differing bits (0 to 64)
   */
  function hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
      return 64;
    }
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  /**
   * Downsamples arbitrary ImageData to a specific target width & height.
   */
  function downsampleImageData(srcImageData, targetW, targetH) {
    const srcData = srcImageData.data;
    const srcW = srcImageData.width;
    const srcH = srcImageData.height;
    const targetData = new Uint8ClampedArray(targetW * targetH * 4);

    const xRatio = srcW / targetW;
    const yRatio = srcH / targetH;

    for (let ty = 0; ty < targetH; ty++) {
      const sy = Math.min(Math.floor(ty * yRatio), srcH - 1);
      for (let tx = 0; tx < targetW; tx++) {
        const sx = Math.min(Math.floor(tx * xRatio), srcW - 1);
        const srcIdx = (sy * srcW + sx) * 4;
        const targetIdx = (ty * targetW + tx) * 4;

        targetData[targetIdx] = srcData[srcIdx];
        targetData[targetIdx + 1] = srcData[srcIdx + 1];
        targetData[targetIdx + 2] = srcData[srcIdx + 2];
        targetData[targetIdx + 3] = srcData[srcIdx + 3];
      }
    }

    return targetData;
  }

  /**
   * Computes a 16x9 block color grid and compares block variance.
   * @param {Uint8ClampedArray} sampleA 16x9x4 RGBA
   * @param {Uint8ClampedArray} sampleB 16x9x4 RGBA
   * @returns {number} Percentage difference (0 to 100)
   */
  function computeBlockDifference(sampleA, sampleB) {
    if (!sampleA || !sampleB || sampleA.length !== sampleB.length) return 100;

    let totalDiff = 0;
    const totalPixels = sampleA.length / 4;

    for (let i = 0; i < sampleA.length; i += 4) {
      const rDiff = Math.abs(sampleA[i] - sampleB[i]);
      const gDiff = Math.abs(sampleA[i + 1] - sampleB[i + 1]);
      const bDiff = Math.abs(sampleA[i + 2] - sampleB[i + 2]);

      totalDiff += (rDiff + gDiff + bDiff) / (3 * 255);
    }

    return (totalDiff / totalPixels) * 100;
  }

  /**
   * Samples a frame for both dHash and 16x9 color blocks.
   */
  function extractFrameFeatures(source) {
    let blockData;
    let dHashStr;

    if (typeof document !== 'undefined' && (source instanceof HTMLCanvasElement || (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement))) {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 9;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, 16, 9);
      blockData = ctx.getImageData(0, 0, 16, 9).data;
      dHashStr = computeDHash(source);
    } else if (source && source.data) {
      blockData = downsampleImageData(source, 16, 9);
      dHashStr = computeDHash(source);
    } else {
      throw new Error('Invalid source for extractFrameFeatures');
    }

    return {
      dHash: dHashStr,
      blockData: blockData
    };
  }

  /**
   * Determines if the current frame represents a genuine slide transition.
   * 
   * Sensitivity presets:
   * - 'high' (more sensitive, captures subtle diagram steps): hammingThreshold = 4, blockDiffThreshold = 5%
   * - 'medium' (balanced, default): hammingThreshold = 6, blockDiffThreshold = 8%
   * - 'low' (strict, only major slide changes): hammingThreshold = 9, blockDiffThreshold = 12%
   *
   * @param {Object} prevFeatures Output of extractFrameFeatures
   * @param {Object} currFeatures Output of extractFrameFeatures
   * @param {Object} [options]
   * @returns {{isTransition: boolean, hamming: number, blockDiff: number}}
   */
  function isSlideTransition(prevFeatures, currFeatures, options = {}) {
    if (!prevFeatures || !currFeatures) {
      return { isTransition: true, hamming: 64, blockDiff: 100 };
    }

    const sensitivity = options.sensitivity || 'medium';
    let hammingThreshold = 6;
    let blockDiffThreshold = 8.0;

    if (sensitivity === 'high') {
      hammingThreshold = 4;
      blockDiffThreshold = 5.0;
    } else if (sensitivity === 'low') {
      hammingThreshold = 9;
      blockDiffThreshold = 12.0;
    } else if (typeof options.customThreshold === 'number') {
      blockDiffThreshold = options.customThreshold;
      hammingThreshold = Math.max(3, Math.round(blockDiffThreshold * 0.75));
    }

    const hamming = hammingDistance(prevFeatures.dHash, currFeatures.dHash);
    const blockDiff = computeBlockDifference(prevFeatures.blockData, currFeatures.blockData);

    // If both dHash and block difference exceed thresholds, or block difference is substantial
    const isTransition = (hamming >= hammingThreshold && blockDiff >= (blockDiffThreshold * 0.7)) || (blockDiff >= blockDiffThreshold);

    return {
      isTransition,
      hamming,
      blockDiff
    };
  }

  const SlideDetector = {
    rgbToGray,
    computeDHash,
    hammingDistance,
    downsampleImageData,
    computeBlockDifference,
    extractFrameFeatures,
    isSlideTransition
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideDetector;
  } else {
    global.SlideDetector = SlideDetector;
  }
})(typeof window !== 'undefined' ? window : globalThis);
