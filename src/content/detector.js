/**
 * YT to PDF - Detector Engine
 * High-performance frame hashing, perceptual difference, and slide transition detection.
 * Designed to capture subtle slide changes (new text, bullet points, diagrams)
 * while filtering out small cursor movements, laser pointers, and video noise.
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
   * Analyzes block-level color variance across a 16x9 grid (144 blocks).
   * Calculates overall average difference, maximum single-block difference,
   * and count of actively changed blocks.
   *
   * @param {Uint8ClampedArray} sampleA 16x9x4 RGBA
   * @param {Uint8ClampedArray} sampleB 16x9x4 RGBA
   * @returns {{ avgDiff: number, maxBlockDiff: number, changedBlocksCount: number }}
   */
  function analyzeBlockDifference(sampleA, sampleB) {
    if (!sampleA || !sampleB || sampleA.length !== sampleB.length) {
      return { avgDiff: 100, maxBlockDiff: 100, changedBlocksCount: 144 };
    }

    let totalDiff = 0;
    let maxBlockDiff = 0;
    let changedBlocksCount = 0;
    const totalBlocks = sampleA.length / 4; // 144 blocks

    for (let i = 0; i < sampleA.length; i += 4) {
      const rDiff = Math.abs(sampleA[i] - sampleB[i]);
      const gDiff = Math.abs(sampleA[i + 1] - sampleB[i + 1]);
      const bDiff = Math.abs(sampleA[i + 2] - sampleB[i + 2]);

      const blockPercent = ((rDiff + gDiff + bDiff) / (3 * 255)) * 100;
      totalDiff += blockPercent;

      if (blockPercent > maxBlockDiff) {
        maxBlockDiff = blockPercent;
      }

      // If a block changes by more than 2.5%, count it as an active changed region
      if (blockPercent >= 2.5) {
        changedBlocksCount++;
      }
    }

    const avgDiff = totalDiff / totalBlocks;

    return {
      avgDiff,
      maxBlockDiff,
      changedBlocksCount
    };
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
   * - 'high' (Very responsive to subtle notes/text steps):
   *     avgDiff >= 1.2% OR (hamming >= 2 && changedBlocksCount >= 2) OR changedBlocksCount >= 3
   * - 'medium' (Balanced, default for lectures & study presentations):
   *     avgDiff >= 2.0% OR (hamming >= 3 && changedBlocksCount >= 2) OR changedBlocksCount >= 4
   * - 'low' (Strict, only major slide template changes):
   *     avgDiff >= 5.0% OR (hamming >= 6 && changedBlocksCount >= 6)
   *
   * @param {Object} prevFeatures Output of extractFrameFeatures
   * @param {Object} currFeatures Output of extractFrameFeatures
   * @param {Object} [options]
   * @returns {{isTransition: boolean, hamming: number, blockDiff: number, changedBlocksCount: number}}
   */
  function isSlideTransition(prevFeatures, currFeatures, options = {}) {
    if (!prevFeatures || !currFeatures) {
      return { isTransition: true, hamming: 64, blockDiff: 100, changedBlocksCount: 144 };
    }

    const sensitivity = options.sensitivity || 'medium';
    const hamming = hammingDistance(prevFeatures.dHash, currFeatures.dHash);
    const blockAnalysis = analyzeBlockDifference(prevFeatures.blockData, currFeatures.blockData);
    const { avgDiff, changedBlocksCount } = blockAnalysis;

    let isTransition = false;

    if (sensitivity === 'high') {
      // High sensitivity: catches single line bullet additions, small diagrams
      if (avgDiff >= 1.2 || (hamming >= 2 && changedBlocksCount >= 2) || changedBlocksCount >= 3) {
        isTransition = true;
      }
    } else if (sensitivity === 'low') {
      // Low sensitivity: only major visual redesigns
      if (avgDiff >= 4.5 || (hamming >= 6 && changedBlocksCount >= 6) || changedBlocksCount >= 10) {
        isTransition = true;
      }
    } else {
      // Balanced (Medium - Default): catches all standard slide and text changes while ignoring mouse cursors
      if (avgDiff >= 2.0 || (hamming >= 3 && changedBlocksCount >= 2) || (hamming >= 2 && avgDiff >= 1.5) || changedBlocksCount >= 4) {
        isTransition = true;
      }
    }

    // Safety filter: If only 1 single block changed and total difference is tiny (<0.8%), it's a cursor / noise
    if (changedBlocksCount <= 1 && avgDiff < 0.8 && hamming <= 1) {
      isTransition = false;
    }

    return {
      isTransition,
      hamming,
      blockDiff: avgDiff,
      changedBlocksCount
    };
  }

  const SlideDetector = {
    rgbToGray,
    computeDHash,
    hammingDistance,
    downsampleImageData,
    analyzeBlockDifference,
    computeBlockDifference: (a, b) => analyzeBlockDifference(a, b).avgDiff,
    extractFrameFeatures,
    isSlideTransition
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideDetector;
  } else {
    global.SlideDetector = SlideDetector;
  }
})(typeof window !== 'undefined' ? window : globalThis);
