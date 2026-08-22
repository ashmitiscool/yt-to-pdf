/**
 * YT SlideSnip - Fast Video Scanner & Frame Grabber
 * Programmatically seeks through YouTube HTML5 <video> to extract presentation slides.
 */

(function (global) {
  'use strict';

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const totalSec = Math.floor(seconds);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /**
   * Captures a high-resolution frame from the video element.
   * @param {HTMLVideoElement} video
   * @param {Object} [cropRect] { x: 0..1, y: 0..1, width: 0..1, height: 0..1 }
   * @returns {{ dataUrl: string, width: number, height: number }}
   */
  function captureVideoFrame(video, cropRect = null) {
    if (!video || !video.videoWidth || !video.videoHeight) {
      throw new Error('Video element not ready or invalid dimensions');
    }

    const canvas = document.createElement('canvas');
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;

    if (cropRect && cropRect.width > 0 && cropRect.height > 0) {
      const sx = Math.floor(cropRect.x * vWidth);
      const sy = Math.floor(cropRect.y * vHeight);
      const sw = Math.floor(cropRect.width * vWidth);
      const sh = Math.floor(cropRect.height * vHeight);

      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, vWidth, vHeight);
    }

    // JPEG at 0.92 gives excellent presentation slide quality with compact memory size
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height
    };
  }

  class VideoScanner {
    constructor() {
      this._isScanning = false;
      this._isPaused = false;
      this._cancelRequested = false;
      this._savedState = null;
      this._capturedSlides = [];
      this._scanPromise = null;
    }

    isScanning() {
      return this._isScanning;
    }

    isPaused() {
      return this._isPaused;
    }

    pause() {
      this._isPaused = true;
    }

    resume() {
      this._isPaused = false;
    }

    cancel() {
      this._cancelRequested = true;
    }

    /**
     * Starts the auto-scan process on the video.
     */
    async startScan({
      videoElement,
      stepSeconds = 2,
      sensitivity = 'medium',
      cropRect = null,
      startFrom = 0,
      endAt = null,
      onProgress = () => {},
      onSlideFound = () => {},
      onComplete = () => {},
      onError = () => {}
    }) {
      if (this._isScanning) {
        throw new Error('Scanner is already active');
      }

      if (!videoElement || isNaN(videoElement.duration)) {
        throw new Error('Valid HTML5 video element with duration is required');
      }

      this._isScanning = true;
      this._isPaused = false;
      this._cancelRequested = false;
      this._capturedSlides = [];

      const video = videoElement;
      const totalDuration = endAt && endAt <= video.duration ? endAt : video.duration;
      const startTime = Math.max(0, startFrom);

      // Save initial player state to restore later
      this._savedState = {
        currentTime: video.currentTime,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        playbackRate: video.playbackRate
      };

      // Mute and pause live playback while scanning
      video.muted = true;
      if (!video.paused) {
        video.pause();
      }

      const detector = global.SlideDetector || (typeof window !== 'undefined' ? window.SlideDetector : null);
      if (!detector) {
        this._isScanning = false;
        throw new Error('SlideDetector module not found');
      }

      const startTimeMs = Date.now();
      let lastSlideFeatures = null;
      let lastSlideTime = -999;
      let currentTime = startTime;

      try {
        while (currentTime <= totalDuration && !this._cancelRequested) {
          // Check pause
          while (this._isPaused && !this._cancelRequested) {
            await new Promise((r) => setTimeout(r, 200));
          }
          if (this._cancelRequested) break;

          // Seek to time
          await this._seekVideo(video, currentTime);
          // Wait briefly for video decoder to paint frame
          await new Promise((r) => setTimeout(r, 80));

          // Extract frame features
          const currentFeatures = detector.extractFrameFeatures(video);

          let shouldCapture = false;

          if (this._capturedSlides.length === 0) {
            // First frame is always our initial slide
            shouldCapture = true;
          } else {
            const comparison = detector.isSlideTransition(lastSlideFeatures, currentFeatures, { sensitivity });
            // Require minimum 1 second spacing between detected slides
            if (comparison.isTransition && (currentTime - lastSlideTime >= 1.0)) {
              shouldCapture = true;
            }
          }

          if (shouldCapture) {
            const frame = captureVideoFrame(video, cropRect);
            const slideId = 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const slide = {
              id: slideId,
              timestamp: currentTime,
              formattedTime: formatTime(currentTime),
              dataUrl: frame.dataUrl,
              width: frame.width,
              height: frame.height
            };

            this._capturedSlides.push(slide);
            lastSlideFeatures = currentFeatures;
            lastSlideTime = currentTime;

            onSlideFound(slide, this._capturedSlides.length);
          }

          // Compute progress & ETA
          const scannedDuration = currentTime - startTime;
          const totalScanSpan = totalDuration - startTime;
          const percentage = totalScanSpan > 0 ? Math.min(100, (scannedDuration / totalScanSpan) * 100) : 100;

          const elapsedSec = (Date.now() - startTimeMs) / 1000;
          const speedRate = scannedDuration > 0 && elapsedSec > 0 ? scannedDuration / elapsedSec : 1;
          const remainingVideoSec = Math.max(0, totalDuration - currentTime);
          const etaSeconds = speedRate > 0 ? Math.round(remainingVideoSec / speedRate) : 0;

          onProgress({
            currentTime,
            totalDuration,
            percentage,
            slidesCount: this._capturedSlides.length,
            formattedCurrent: formatTime(currentTime),
            formattedTotal: formatTime(totalDuration),
            etaSeconds
          });

          // Next seek step
          currentTime += stepSeconds;
        }

        // Restore original video state
        this._restoreVideoState(video);

        this._isScanning = false;

        if (this._cancelRequested) {
          onComplete(this._capturedSlides, true /* cancelled */);
        } else {
          onComplete(this._capturedSlides, false);
        }

        return this._capturedSlides;
      } catch (err) {
        this._restoreVideoState(video);
        this._isScanning = false;
        onError(err);
        throw err;
      }
    }

    _seekVideo(video, time) {
      return new Promise((resolve) => {
        let isResolved = false;

        const onSeeked = () => {
          if (isResolved) return;
          isResolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };

        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = time;

        // Fallback safety timeout if seeked doesn't fire
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            video.removeEventListener('seeked', onSeeked);
            resolve();
          }
        }, 800);
      });
    }

    _restoreVideoState(video) {
      if (!this._savedState || !video) return;
      try {
        video.currentTime = this._savedState.currentTime;
        video.muted = this._savedState.muted;
        video.volume = this._savedState.volume;
        video.playbackRate = this._savedState.playbackRate;
        if (!this._savedState.paused) {
          video.play().catch(() => {});
        }
      } catch (e) {
        // Ignore restore errors
      }
      this._savedState = null;
    }
  }

  const SlideScanner = {
    formatTime,
    captureVideoFrame,
    VideoScanner
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideScanner;
  } else {
    global.SlideScanner = SlideScanner;
  }
})(typeof window !== 'undefined' ? window : globalThis);
