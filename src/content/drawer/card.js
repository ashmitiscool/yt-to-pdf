/**
 * YT to PDF - Slide Card Component
 * Renders individual thumbnail card elements with drag-and-drop reordering,
 * export selection toggling, and slide action buttons.
 */

(function (global) {
  'use strict';

  const ICONS = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./icons.js')
    : (global.SlideDrawerIcons || {});

  function createSlideCard(slide, index, drawer, grid) {
    const isSelected = slide.selected !== false;
    const card = document.createElement('div');
    card.className = `ytsnip-card ${isSelected ? '' : 'ytsnip-card-deselected'}`;
    card.draggable = true;
    card.dataset.index = index;
    card.dataset.slideId = slide.id;
    card.title = 'Drag to rearrange | Click preview to zoom';

    card.innerHTML = `
      <div class="ytsnip-card-preview">
        <img class="ytsnip-card-img" src="${slide.dataUrl}" alt="Slide ${index + 1}" />
        <span class="ytsnip-card-index"><span class="ytsnip-grip-dots">⠿</span> #${index + 1}</span>
        <label class="ytsnip-card-select-toggle" title="${isSelected ? 'Deselect slide from export' : 'Select slide for export'}">
          <input type="checkbox" class="ytsnip-card-checkbox" ${isSelected ? 'checked' : ''} />
          <span class="ytsnip-checkbox-custom">
            ${ICONS.check || ''}
          </span>
        </label>
        <span class="ytsnip-card-time">${slide.formattedTime}</span>
      </div>
      <div class="ytsnip-card-actions">
        <button class="ytsnip-card-btn ytsnip-card-btn-jump" title="Jump to ${slide.formattedTime} in video">
          ${ICONS.play || ''}
        </button>
        <button class="ytsnip-card-btn ytsnip-card-btn-duplicate" title="Duplicate this slide">
          ${ICONS.duplicate || ''}
        </button>
        <button class="ytsnip-card-btn ytsnip-card-btn-copy" title="Copy slide image to clipboard">
          ${ICONS.copy || ''}
        </button>
        <button class="ytsnip-card-btn ytsnip-card-btn-delete" title="Delete slide">
          ${ICONS.trash || ''}
        </button>
      </div>
    `;

    // Selection Toggle Event
    const selectToggle = card.querySelector('.ytsnip-card-select-toggle');
    if (selectToggle) {
      selectToggle.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      const checkbox = selectToggle.querySelector('.ytsnip-card-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          drawer.toggleSlideSelection(slide.id);
        });
      }
    }

    // --- Drag and Drop Reordering ---
    card.addEventListener('dragstart', (e) => {
      if (e.target.closest('.ytsnip-card-btn') || e.target.closest('.ytsnip-card-select-toggle')) {
        e.preventDefault();
        return;
      }
      drawer._draggedIndex = index;
      card.classList.add('ytsnip-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      if (drawer._draggedIndex !== null && drawer._draggedIndex !== index) {
        card.classList.add('ytsnip-drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('ytsnip-drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('ytsnip-drag-over');
      const fromIndex = drawer._draggedIndex !== null
        ? drawer._draggedIndex
        : (e.dataTransfer ? parseInt(e.dataTransfer.getData('text/plain'), 10) : NaN);
      const toIndex = index;

      if (!isNaN(fromIndex) && fromIndex !== toIndex && fromIndex >= 0 && fromIndex < drawer.slides.length) {
        const [movedSlide] = drawer.slides.splice(fromIndex, 1);
        drawer.slides.splice(toIndex, 0, movedSlide);
        drawer._saveSlides();
        drawer._renderGrid();
        drawer.showToast(`Slide moved to #${toIndex + 1}`);
      }
      drawer._draggedIndex = null;
    });

    card.addEventListener('dragend', () => {
      drawer._draggedIndex = null;
      card.classList.remove('ytsnip-dragging');
      if (grid && grid.querySelectorAll) {
        grid.querySelectorAll('.ytsnip-card').forEach(c => {
          c.classList.remove('ytsnip-drag-over', 'ytsnip-dragging');
        });
      }
    });

    // Preview click -> lightbox zoom
    const preview = card.querySelector('.ytsnip-card-preview');
    if (preview) {
      preview.addEventListener('click', (e) => {
        if (e.target.closest('.ytsnip-card-select-toggle')) return;
        // Only open lightbox if not dragging
        if (!card.classList.contains('ytsnip-dragging')) {
          drawer._showLightbox(index);
        }
      });
    }

    // Jump button
    const jumpBtn = card.querySelector('.ytsnip-card-btn-jump');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentSlide = drawer.slides.find(s => s.id === slide.id) || slide;
        if (drawer.callbacks && drawer.callbacks.onSeekVideo) {
          drawer.callbacks.onSeekVideo(currentSlide.timestamp);
        }
        drawer.showToast(`Jumped to ${currentSlide.formattedTime}`);
      });
    }

    // Duplicate button
    const dupBtn = card.querySelector('.ytsnip-card-btn-duplicate');
    if (dupBtn) {
      dupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.duplicateSlide(slide.id);
      });
    }

    // Copy button
    const copyBtn = card.querySelector('.ytsnip-card-btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const exporter = global.SlideExporter || (typeof window !== 'undefined' ? window.SlideExporter : null);
        if (exporter && typeof exporter.copySlideToClipboard === 'function') {
          const currentSlide = drawer.slides.find(s => s.id === slide.id) || slide;
          const ok = await exporter.copySlideToClipboard(currentSlide.dataUrl);
          if (ok) drawer.showToast('Copied to clipboard', 1500, true);
          else drawer.showToast('Could not copy slide', 2000, true);
        }
      });
    }

    // Delete button
    const deleteBtn = card.querySelector('.ytsnip-card-btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.removeSlide(slide.id);
      });
    }

    return card;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = createSlideCard;
  } else {
    global.createSlideCard = createSlideCard;
  }
})(typeof window !== 'undefined' ? window : globalThis);
