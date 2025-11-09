let tool = 'brush';
let color = '#000000';
let size = 5;

document.addEventListener('DOMContentLoaded', () => {
  initializeToolbar();
  initializeKeyboardShortcuts();
  initializeHelpModal();
  initializeClearButton();
  updateColorPreview();
  updateSizePreview();
  updateCanvasCursor();
  
  // initial active tool
  document.getElementById('tool-brush')?.classList.add('active');
});

// Toolbar
function initializeToolbar() {
  // Tool selection
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTool = btn.dataset.tool;
      tool = selectedTool;
      
      // Update state
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update canvas cursor
      updateCanvasCursor();
    });
  });

  // Color picker
  const colorInput = document.getElementById('color');
  colorInput.addEventListener('change', (e) => {
    color = e.target.value;
    updateColorPreview();
    updateCanvasCursor();
  });

  // Color presets
  document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
      const presetColor = preset.dataset.color;
      color = presetColor;
      colorInput.value = presetColor;
      updateColorPreview();
      updateCanvasCursor();
      
      // Update active preset
      document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
    });
  });

  // Size slider
  const sizeSlider = document.getElementById('size');
  sizeSlider.addEventListener('input', (e) => {
    size = parseInt(e.target.value);
    updateSizePreview();
    updateCanvasCursor();
  });

  // Undo/Redo buttons
  document.getElementById('undo').addEventListener('click', () => {
    const stroke = window.undoLocal ? window.undoLocal() : null;
    if (stroke && window.socket) {
      window.socket.emit('undo');
    }
  });

  document.getElementById('redo').addEventListener('click', () => {
    const stroke = window.redoLocal ? window.redoLocal() : null;
    if (stroke && window.socket) {
      window.socket.emit('redo');
    }
  });
}

// Update color preview
function updateColorPreview() {
  const preview = document.getElementById('colorPreview');
  if (preview) {
    preview.style.background = color;
    preview.style.color = color;
  }

  document.querySelectorAll('.color-preset').forEach(preset => {
    if (preset.dataset.color === color) {
      preset.classList.add('active');
    } else {
      preset.classList.remove('active');
    }
  });
}

function updateSizePreview() {
  const preview = document.getElementById('sizePreview');
  const value = document.getElementById('sizeValue');
  
  if (preview) {
    const sizePx = Math.max(4, size);
    preview.style.setProperty('--size', `${sizePx}px`);
    preview.style.width = `${sizePx}px`;
    preview.style.height = `${sizePx}px`;
    preview.style.background = color;
    preview.style.borderRadius = '50%';
  }
  
  if (value) {
    value.textContent = size;
  }
}

let lastCursorSize = 0;
let lastCursorColor = '';
let lastCursorTool = '';

function updateCanvasCursor() {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  if (lastCursorSize === size && lastCursorColor === color && lastCursorTool === tool) {
    return;
  }
  
  lastCursorSize = size;
  lastCursorColor = color;
  lastCursorTool = tool;
  
  if (tool === 'eraser') {
    canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}"><circle cx="${size}" cy="${size}" r="${size}" fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.5)" stroke-width="1"/></svg>') ${size} ${size}, crosshair`;
  } else {
    canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}"><circle cx="${size}" cy="${size}" r="${size}" fill="${color}" opacity="0.5" stroke="white" stroke-width="1"/></svg>') ${size} ${size}, crosshair`;
  }
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // Tool shortcuts
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      document.getElementById('tool-brush')?.click();
    }
    
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      document.getElementById('tool-eraser')?.click();
    }

    // Undo/Redo
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const stroke = window.undoLocal ? window.undoLocal() : null;
        if (stroke && window.socket) {
          window.socket.emit('undo');
        }
      }
      
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        const stroke = window.redoLocal ? window.redoLocal() : null;
        if (stroke && window.socket) {
          window.socket.emit('redo');
        }
      }

      // Size adjustment
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const sizeSlider = document.getElementById('size');
        const newSize = Math.min(50, size + 2);
        size = newSize;
        sizeSlider.value = newSize;
        updateSizePreview();
        updateCanvasCursor();
      }
      
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const sizeSlider = document.getElementById('size');
        const newSize = Math.max(1, size - 2);
        size = newSize;
        sizeSlider.value = newSize;
        updateSizePreview();
        updateCanvasCursor();
      }
    }

    // Help modal
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleHelpModal();
    }
  });
}

// Help modal
function initializeHelpModal() {
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeBtn = document.getElementById('closeHelp');

  helpBtn?.addEventListener('click', () => toggleHelpModal());
  closeBtn?.addEventListener('click', () => toggleHelpModal());
  
  helpModal?.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      toggleHelpModal();
    }
  });
}

function toggleHelpModal() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    modal.classList.toggle('show');
  }
}

// Clear button
function initializeClearButton() {
  const clearBtn = document.getElementById('clear');
  clearBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
      if (window.clearCanvas) {
        window.clearCanvas();
      }
      // sync with server
      if (window.socket) {
        window.socket.emit('clear');
      }
    }
  });
}

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

window.tool = () => tool;
window.color = () => color;
window.size = () => size;
window.setTool = (t) => { tool = t; updateCanvasCursor(); };
window.setColor = (c) => { color = c; updateColorPreview(); updateCanvasCursor(); };
window.setSize = (s) => { size = s; updateSizePreview(); updateCanvasCursor(); };
window.showToast = showToast;