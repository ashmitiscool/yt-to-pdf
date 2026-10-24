/**
 * YT to PDF - Slide Lightbox & Continuous Preview
 * Provides full-screen, Google Drive / PDF Viewer style preview of presentation slides
 * with continuous vertical scrolling, floating toolbar, touch/pinch/wheel zoom,
 * and high-performance asynchronous scroll tracking.
 */

(function (global) {
  'use strict';

  const ICONS = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./icons.js')
    : (global.SlideDrawerIcons || {});

  const SlideLightbox = {
    show(slides = [], startIndex = 0) {
      if (typeof document === 'undefined') return;

      let targetIndex = 0;
      if (typeof startIndex === 'number') {
        targetIndex = Math.max(0, Math.min(startIndex, slides.length - 1));
      } else if (typeof startIndex === 'string') {
        const found = slides.findIndex(s => s.dataUrl === startIndex || s.id === startIndex);
        if (found !== -1) targetIndex = found;
      }

      const slidesToRender = slides.length > 0
        ? slides
        : (typeof startIndex === 'string' ? [{ dataUrl: startIndex }] : []);
      const totalPages = Math.max(1, slidesToRender.length);

      const prevBodyOverflow = (typeof document !== 'undefined' && document.body) ? document.body.style.overflow : '';
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'hidden';
      }

      const box = document.createElement('div');
      box.className = 'ytsnip-lightbox';

      // Floating toolbar (Google Drive / PDF Viewer style)
      const toolbar = document.createElement('div');
      toolbar.className = 'ytsnip-lightbox-toolbar';
      toolbar.innerHTML = `
        <div class="ytsnip-lightbox-nav">
          <button class="ytsnip-lightbox-btn ytsnip-lightbox-prev-btn" title="Previous Slide (Left Arrow / Up Arrow)">
            ${ICONS.prev || ''}
          </button>
          <div class="ytsnip-lightbox-page-indicator">
            <input type="text" class="ytsnip-lightbox-page-input" value="${targetIndex + 1}" aria-label="Current slide number" />
            <span class="ytsnip-lightbox-page-total">/ ${totalPages}</span>
          </div>
          <button class="ytsnip-lightbox-btn ytsnip-lightbox-next-btn" title="Next Slide (Right Arrow / Down Arrow)">
            ${ICONS.next || ''}
          </button>
        </div>
        <div class="ytsnip-lightbox-divider"></div>
        <div class="ytsnip-lightbox-zoom-controls">
          <button class="ytsnip-lightbox-btn ytsnip-lightbox-zoom-out" title="Zoom Out (-)">
            ${ICONS.zoomOut || ''}
          </button>
          <button class="ytsnip-lightbox-btn ytsnip-lightbox-zoom-label" title="Reset Zoom to 100% (0)">
            100%
          </button>
          <button class="ytsnip-lightbox-btn ytsnip-lightbox-zoom-in" title="Zoom In (+)">
            ${ICONS.zoomIn || ''}
          </button>
        </div>
        <div class="ytsnip-lightbox-divider"></div>
        <button class="ytsnip-lightbox-btn ytsnip-lightbox-close-btn" title="Close Preview (Esc)">
          ${ICONS.close || ''}
        </button>
      `;
      box.appendChild(toolbar);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ytsnip-lightbox-close';
      closeBtn.setAttribute('title', 'Close Preview (Esc)');
      closeBtn.innerHTML = ICONS.close || '';
      box.appendChild(closeBtn);

      const wrapper = document.createElement('div');
      wrapper.className = 'ytsnip-lightbox-slides-wrapper';

      slidesToRender.forEach((slide, idx) => {
        const img = document.createElement('img');
        img.className = 'ytsnip-lightbox-img';
        img.src = slide.dataUrl;
        img.alt = `Slide ${idx + 1}`;
        img.dataset.slideIndex = idx;
        wrapper.appendChild(img);
      });
      box.appendChild(wrapper);

      const prevBtn = toolbar.querySelector('.ytsnip-lightbox-prev-btn');
      const nextBtn = toolbar.querySelector('.ytsnip-lightbox-next-btn');
      const pageInput = toolbar.querySelector('.ytsnip-lightbox-page-input');
      const zoomOutBtn = toolbar.querySelector('.ytsnip-lightbox-zoom-out');
      const zoomInBtn = toolbar.querySelector('.ytsnip-lightbox-zoom-in');
      const zoomLabel = toolbar.querySelector('.ytsnip-lightbox-zoom-label');
      const toolbarCloseBtn = toolbar.querySelector('.ytsnip-lightbox-close-btn');

      let currentSlideIndex = targetIndex;
      let scale = 1.0;
      let isProgrammaticScroll = false;
      let programmaticScrollTimer = null;

      const updateNavButtons = () => {
        if (prevBtn) prevBtn.disabled = currentSlideIndex <= 0;
        if (nextBtn) nextBtn.disabled = currentSlideIndex >= totalPages - 1;
      };
      updateNavButtons();

      const setZoom = (newScale) => {
        scale = Math.max(0.25, Math.min(4.0, Math.round(newScale * 100) / 100));
        if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
        if (zoomOutBtn) zoomOutBtn.disabled = scale <= 0.25;
        if (zoomInBtn) zoomInBtn.disabled = scale >= 4.0;
        if (box.style && typeof box.style.setProperty === 'function') {
          box.style.setProperty('--ytsnip-zoom', String(scale));
        }
        const imgs = box.querySelectorAll ? box.querySelectorAll('.ytsnip-lightbox-img') : wrapper.children;
        if (imgs) {
          for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i];
            if (img && img.style) {
              img.style.width = `calc(min(92vw, 1200px) * ${scale})`;
            }
          }
        }

        // Keep the active slide centered in view so zoom out/in doesn't drift
        const activeImg = box.querySelector ? box.querySelector(`img[data-slide-index="${currentSlideIndex}"]`) : null;
        if (activeImg && typeof activeImg.scrollIntoView === 'function') {
          activeImg.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      };

      const goToSlide = (idx, smooth = true) => {
        const clamped = Math.max(0, Math.min(idx, totalPages - 1));
        currentSlideIndex = clamped;
        if (pageInput) pageInput.value = String(clamped + 1);
        updateNavButtons();

        const targetImg = box.querySelector ? box.querySelector(`img[data-slide-index="${clamped}"]`) : null;
        if (targetImg) {
          if (smooth) {
            isProgrammaticScroll = true;
            if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
            programmaticScrollTimer = setTimeout(() => {
              isProgrammaticScroll = false;
            }, 600);
          } else {
            isProgrammaticScroll = false;
            if (programmaticScrollTimer) {
              clearTimeout(programmaticScrollTimer);
              programmaticScrollTimer = null;
            }
          }

          if (typeof targetImg.scrollIntoView === 'function') {
            targetImg.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
          }
        }
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          goToSlide(currentSlideIndex - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          goToSlide(currentSlideIndex + 1);
        });
      }
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setZoom(scale + 0.25);
        });
      }
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          setZoom(scale - 0.25);
        });
      }
      if (zoomLabel) {
        zoomLabel.addEventListener('click', (e) => {
          e.stopPropagation();
          setZoom(1.0);
        });
      }
      if (pageInput) {
        pageInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const val = parseInt(pageInput.value, 10);
            if (!isNaN(val)) goToSlide(val - 1);
          }
        });
        pageInput.addEventListener('change', () => {
          const val = parseInt(pageInput.value, 10);
          if (!isNaN(val)) goToSlide(val - 1);
          else pageInput.value = String(currentSlideIndex + 1);
        });
        pageInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      const cancelProgrammaticScroll = () => {
        if (isProgrammaticScroll || programmaticScrollTimer) {
          isProgrammaticScroll = false;
          if (programmaticScrollTimer) {
            clearTimeout(programmaticScrollTimer);
            programmaticScrollTimer = null;
          }
        }
      };

      const onWheel = (e) => {
        cancelProgrammaticScroll();
        if (e.ctrlKey || e.metaKey) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoom(scale + zoomDelta);
        }
      };
      box.addEventListener('wheel', onWheel, { passive: false });
      box.addEventListener('mousedown', cancelProgrammaticScroll);

      let initialTouchDist = null;
      let initialTouchScale = 1.0;
      const onTouchStart = (e) => {
        cancelProgrammaticScroll();
        if (e.touches && e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          initialTouchDist = Math.hypot(dx, dy);
          initialTouchScale = scale;
        }
      };
      const onTouchMove = (e) => {
        if (e.touches && e.touches.length === 2 && initialTouchDist) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.hypot(dx, dy);
          const factor = currentDist / initialTouchDist;
          setZoom(initialTouchScale * factor);
        }
      };
      const onTouchEnd = (e) => {
        if (!e.touches || e.touches.length < 2) {
          initialTouchDist = null;
        }
      };
      box.addEventListener('touchstart', onTouchStart, { passive: true });
      box.addEventListener('touchmove', onTouchMove, { passive: false });
      box.addEventListener('touchend', onTouchEnd, { passive: true });

      let scrollRafId = null;
      const onScroll = () => {
        if (isProgrammaticScroll) return;

        if (scrollRafId) return;
        const reqAnimFrame = typeof window !== 'undefined' && window.requestAnimationFrame
          ? window.requestAnimationFrame
          : (cb) => setTimeout(cb, 16);

        scrollRafId = reqAnimFrame(() => {
          scrollRafId = null;
          if (isProgrammaticScroll || !box || !box.parentNode) return;
          const imgs = box.querySelectorAll ? box.querySelectorAll('.ytsnip-lightbox-img') : wrapper.children;
          if (!imgs || imgs.length === 0) return;

          let closestIdx = currentSlideIndex;
          let minDistance = Infinity;

          const hasOffsetTop = typeof imgs[0].offsetTop === 'number' && !isNaN(imgs[0].offsetTop) && imgs[0].offsetHeight > 0;
          if (hasOffsetTop && typeof box.scrollTop === 'number') {
            const centerY = box.scrollTop + box.clientHeight / 2;
            for (let i = 0; i < imgs.length; i++) {
              const img = imgs[i];
              const imgCenterY = img.offsetTop + img.offsetHeight / 2;
              const dist = Math.abs(imgCenterY - centerY);
              if (dist < minDistance) {
                minDistance = dist;
                const idxVal = img.dataset && img.dataset.slideIndex !== undefined
                  ? parseInt(img.dataset.slideIndex, 10)
                  : i;
                closestIdx = idxVal;
              } else if (dist > minDistance && i > closestIdx) {
                break;
              }
            }
          } else if (typeof box.getBoundingClientRect === 'function') {
            const boxRect = box.getBoundingClientRect();
            const boxCenterY = boxRect.top + boxRect.height / 2;
            for (let i = 0; i < imgs.length; i++) {
              const img = imgs[i];
              if (img && typeof img.getBoundingClientRect === 'function') {
                const rect = img.getBoundingClientRect();
                const imgCenterY = rect.top + rect.height / 2;
                const dist = Math.abs(imgCenterY - boxCenterY);
                if (dist < minDistance) {
                  minDistance = dist;
                  const idxVal = img.dataset && img.dataset.slideIndex !== undefined
                    ? parseInt(img.dataset.slideIndex, 10)
                    : i;
                  closestIdx = idxVal;
                }
              }
            }
          }

          if (!isNaN(closestIdx) && closestIdx !== currentSlideIndex) {
            currentSlideIndex = closestIdx;
            if (pageInput && typeof document !== 'undefined' && document.activeElement !== pageInput) {
              pageInput.value = String(currentSlideIndex + 1);
            }
            updateNavButtons();
          }
        });
      };
      box.addEventListener('scroll', onScroll, { passive: true });

      const closeLightbox = () => {
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.overflow = prevBodyOverflow;
        }
        if (scrollRafId) {
          const cancelAnimFrame = typeof window !== 'undefined' && window.cancelAnimationFrame
            ? window.cancelAnimationFrame
            : clearTimeout;
          cancelAnimFrame(scrollRafId);
          scrollRafId = null;
        }
        if (programmaticScrollTimer) {
          clearTimeout(programmaticScrollTimer);
          programmaticScrollTimer = null;
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('keydown', onKeyDown);
        }
        box.removeEventListener('wheel', onWheel);
        box.removeEventListener('scroll', onScroll);
        box.removeEventListener('touchstart', onTouchStart);
        box.removeEventListener('touchmove', onTouchMove);
        box.removeEventListener('touchend', onTouchEnd);
        if (box.parentNode) {
          box.parentNode.removeChild(box);
        }
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          closeLightbox();
        } else if (e.key === '+' || e.key === '=' || (e.ctrlKey && (e.key === '+' || e.key === '='))) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setZoom(scale + 0.25);
        } else if (e.key === '-' || e.key === '_' || (e.ctrlKey && e.key === '-')) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setZoom(scale - 0.25);
        } else if (e.key === '0' || (e.ctrlKey && e.key === '0')) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          setZoom(1.0);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
          if (typeof document !== 'undefined' && document.activeElement !== pageInput) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            goToSlide(currentSlideIndex - 1);
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
          if (typeof document !== 'undefined' && document.activeElement !== pageInput) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            goToSlide(currentSlideIndex + 1);
          }
        } else if (e.key === 'Home') {
          if (typeof document !== 'undefined' && document.activeElement !== pageInput) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            goToSlide(0);
          }
        } else if (e.key === 'End') {
          if (typeof document !== 'undefined' && document.activeElement !== pageInput) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            goToSlide(totalPages - 1);
          }
        }
      };

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeLightbox();
        });
      }
      if (toolbarCloseBtn) {
        toolbarCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeLightbox();
        });
      }

      box.addEventListener('click', (e) => {
        if (e.target === box || e.target === wrapper) {
          closeLightbox();
        }
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(box);
      }

      goToSlide(targetIndex, false);
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlideLightbox;
  } else {
    global.SlideLightbox = SlideLightbox;
  }
})(typeof window !== 'undefined' ? window : globalThis);
