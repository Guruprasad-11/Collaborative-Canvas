// drawing surface
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// inital drawing state
let drawing = false;
let strokes = [];
let undone = [];
let currentStroke = null;
let strokeIdCounter = 0;
let redrawScheduled = false;

// Resize canvas to match window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redrawAll();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial setup

// Mouse-based drawing
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Touch-based drawing (mobile/tablet support)
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

// Converts touch events to mouse events
function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;

  const mouseEvent = new MouseEvent(
    e.type === 'touchstart' ? 'mousedown'
      : e.type === 'touchmove' ? 'mousemove'
      : 'mouseup',
    { clientX: touch.clientX, clientY: touch.clientY }
  );

  if (e.type === 'touchstart') startDrawing(mouseEvent);
  else if (e.type === 'touchmove') draw(mouseEvent);
}

// Draw
function startDrawing(e) {
  drawing = true;
  canvas.classList.add('drawing');

  // Get tool, color, and size
  const tool = window.tool?.() || 'brush';
  const color = window.color?.() || '#000000';
  const size = window.size?.() || 5;

  const start = { x: e.clientX, y: e.clientY };

  currentStroke = {
    id: `stroke-${Date.now()}-${++strokeIdCounter}`,
    points: [start],
    color,
    size,
    tool,
    timestamp: Date.now()
  };
  strokes.push(currentStroke);

  // Draw initial point immediately
  drawPoint(start, color, size, tool);

  // Notify other users where our cursor is
  window.socket?.emit('cursor_move', { x: e.clientX, y: e.clientY, color });
}

// draw
function draw(e) {
  if (!drawing || !currentStroke) return;

  const tool = window.tool?.() || 'brush';
  const color = window.color?.() || '#000000';
  const size = window.size?.() || 5;

  const point = { x: e.clientX, y: e.clientY };
  const lastPoint = currentStroke.points.at(-1);

  const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
  if (distance < 2 && currentStroke.points.length > 1) return;

  currentStroke.points.push(point);
  Object.assign(currentStroke, { color, size, tool });

  drawLine(lastPoint, point, color, size, tool);

  window.socket?.emit('cursor_move', { x: e.clientX, y: e.clientY, color });

  if (currentStroke.points.length % 3 === 0 || currentStroke.points.length === 2) {
    window.socket?.emit('draw', currentStroke);
  }
}

function stopDrawing() {
  if (!drawing) return;

  drawing = false;
  canvas.classList.remove('drawing');

  if (currentStroke) {
    window.socket?.emit('draw', currentStroke);
  }

  currentStroke = null;
  undone = [];
}

function drawPoint(point, color, size, tool) {
  ctx.save();
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = tool === 'eraser' ? '#0a0e27' : color;
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// drawLine() - draws a line segment between two points
function drawLine(from, to, color, size, tool) {
  ctx.save();
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = tool === 'eraser' ? '#0a0e27' : color;
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawStroke(stroke, clear = false) {
  if (clear) ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!stroke?.points?.length) return;

  const isEraser = stroke.tool === 'eraser';
  ctx.save();
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.lineWidth = stroke.size;
  ctx.strokeStyle = isEraser ? '#0a0e27' : stroke.color;
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
  ctx.beginPath();

  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  ctx.restore();
}

function redrawAll() {
  if (redrawScheduled) return;
  redrawScheduled = true;

  requestAnimationFrame(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) drawStroke(stroke);
    redrawScheduled = false;
  });
}

window.initCanvas = (data) => {
  strokes = data.strokes || [];
  if (data.myColor && window.setColor) window.setColor(data.myColor);
  redrawAll();
  window.showToast?.('Connected to canvas', 'success');
};

window.drawRemoteStroke = (stroke) => {
  if (!stroke?.points?.length) return;
  stroke.id ??= `stroke-${Date.now()}-${++strokeIdCounter}`;
  strokes.push(stroke);
  drawStroke(stroke);
};

window.undoLocal = () => {
  if (strokes.length === 0) return null;
  const stroke = strokes.pop();
  undone.push(stroke);
  redrawAll();
  return stroke;
};

window.redoLocal = () => {
  if (undone.length === 0) return null;
  const stroke = undone.pop();
  strokes.push(stroke);
  drawStroke(stroke);
  return stroke;
};

// Undo past changes
window.handleUndo = (stroke) => {
  if (!stroke?.id) return;
  const index = strokes.findIndex(s => s.id === stroke.id);
  if (index !== -1) {
    undone.push(strokes.splice(index, 1)[0]);
    redrawAll();
  }
};

// Redo past changes
window.handleRedo = (stroke) => {
  if (!stroke?.id) return;
  const index = undone.findIndex(s => s.id === stroke.id);
  if (index !== -1) {
    const restored = undone.splice(index, 1)[0];
    strokes.push(restored);
    drawStroke(restored);
  }
};

// Clear all
window.clearCanvas = () => {
  strokes = [];
  undone = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};
