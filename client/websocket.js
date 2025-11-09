const socket = io();

let connectionStatus = 'connecting';
let myUserId = null;
let myColor = null;

// Connection status management
function updateConnectionStatus(status) {
  connectionStatus = status;
  const statusEl = document.getElementById('connectionStatus');
  if (!statusEl) return;
  
  statusEl.className = `connection-status ${status}`;
  const textEl = statusEl.querySelector('.status-text');
  
  switch(status) {
    case 'connected':
      textEl.textContent = 'Connected';
      break;
    case 'disconnected':
      textEl.textContent = 'Disconnected';
      break;
    case 'connecting':
      textEl.textContent = 'Connecting...';
      break;
  }
}

// Socket event handlers
socket.on('connect', () => {
  updateConnectionStatus('connected');
  if (window.showToast) {
    window.showToast('Connected to server', 'success', 2000);
  }
});

socket.on('disconnect', () => {
  updateConnectionStatus('disconnected');
  if (window.showToast) {
    window.showToast('Disconnected from server', 'error', 3000);
  }
});

socket.on('connect_error', () => {
  updateConnectionStatus('disconnected');
  if (window.showToast) {
    window.showToast('Connection error', 'error', 3000);
  }
});

socket.on('init', (data) => {
  myUserId = socket.id;
  myColor = data.myColor;
  
  if (window.initCanvas) {
    window.initCanvas(data);
  }
  
  if (window.setColor && data.myColor) {
    window.setColor(data.myColor);
    // Update color input
    const colorInput = document.getElementById('color');
    if (colorInput) {
      colorInput.value = data.myColor;
    }
    // Update active preset
    document.querySelectorAll('.color-preset').forEach(preset => {
      if (preset.dataset.color === data.myColor) {
        preset.classList.add('active');
      }
    });
  }
  
  updateConnectionStatus('connected');
});

socket.on('draw', (stroke) => {
  if (window.drawRemoteStroke) {
    window.drawRemoteStroke(stroke);
  }
});

socket.on('undo', (stroke) => {
  if (window.handleUndo) {
    window.handleUndo(stroke);
  }
});

socket.on('redo', (stroke) => {
  if (window.handleRedo) {
    window.handleRedo(stroke);
  }
});

socket.on('clear', () => {
  if (window.clearCanvas) {
    window.clearCanvas();
  }
  if (window.showToast) {
    window.showToast('Canvas cleared', 'info');
  }
});

socket.on('user_list', (users) => {
  updateUserList(users);
});

socket.on('cursor_move', ({ id, x, y, color }) => {
  // Don't show own cursor
  if (id === myUserId) return;
  
  updateRemoteCursor(id, x, y, color);
});

// User list management
function updateUserList(users) {
  const list = document.getElementById('userList');
  const count = document.getElementById('userCount');
  
  if (!list) return;
  
  list.innerHTML = '';
  
  if (count) {
    count.textContent = users.length;
  }
  
  users.forEach((user) => {
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.id = `user-${user.id}`;

    const initial = user.id.charAt(0).toUpperCase();
    
    userItem.innerHTML = `
      <div class="user-avatar" style="background: ${user.color}; border-color: ${user.color};">
        ${initial}
      </div>
      <div class="user-info">
        <div class="user-name">User ${user.id.slice(0, 6)}</div>
        <div class="user-id">${user.id.slice(0, 8)}...</div>
      </div>
      <div class="user-status"></div>
    `;
    
    list.appendChild(userItem);
  });
}

// Remote cursor management
const remoteCursors = new Map();

function updateRemoteCursor(id, x, y, color) {
  let cursor = remoteCursors.get(id);
  
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'remote-cursor';
    cursor.id = `cursor-${id}`;
    
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.style.background = color;
    dot.style.borderColor = color;
    
    const label = document.createElement('div');
    label.className = 'cursor-label';
    label.textContent = `User ${id.slice(0, 4)}`;
    label.style.background = color;
    
    cursor.appendChild(dot);
    cursor.appendChild(label);
    document.body.appendChild(cursor);
    
    remoteCursors.set(id, cursor);
  }
  
  // Smooth cursor movement
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  
  // Update color if changed
  const dot = cursor.querySelector('.cursor-dot');
  const label = cursor.querySelector('.cursor-label');
  if (dot) {
    dot.style.background = color;
    dot.style.borderColor = color;
  }
  if (label) {
    label.style.background = color;
  }
  
  // Remove cursor after inactivity
  clearTimeout(cursor.timeout);
  cursor.timeout = setTimeout(() => {
    if (cursor && cursor.parentNode) {
      cursor.parentNode.removeChild(cursor);
      remoteCursors.delete(id);
    }
  }, 2000);
}

// Clean up cursors on disconnect
socket.on('user_disconnected', (userId) => {
  const cursor = remoteCursors.get(userId);
  if (cursor && cursor.parentNode) {
    cursor.parentNode.removeChild(cursor);
    remoteCursors.delete(userId);
  }
  
  const userItem = document.getElementById(`user-${userId}`);
  if (userItem && userItem.parentNode) {
    userItem.parentNode.removeChild(userItem);
  }
});

// Expose socket globally
window.socket = socket;
window.myUserId = () => myUserId;
window.myColor = () => myColor;