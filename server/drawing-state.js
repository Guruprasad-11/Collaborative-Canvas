export function createDrawingState(roomId) {
  const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];
  const users = {};
  let colorIndex = 0;

  const state = {
    strokes: [],
    undone: []
  };

  return {
    roomId,
    addUser(id, color) {
      users[id] = { id, color };
    },
    removeUser(id) {
      delete users[id];
    },
    getUserList() {
      return Object.values(users);
    },
    assignColor(id) {
      const color = colors[colorIndex % colors.length];
      colorIndex++;
      return color;
    },
    addStroke(stroke) {
      // Ensure stroke has an ID if not present
      if (!stroke.id) {
        stroke.id = `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      state.strokes.push(stroke);
      state.undone = [];
    },
    getStrokes() {
      return state.strokes;
    },
    undo() {
      if (state.strokes.length === 0) return null;
      const stroke = state.strokes.pop();
      state.undone.push(stroke);
      return stroke;
    },
    redo() {
      if (state.undone.length === 0) return null;
      const stroke = state.undone.pop();
      state.strokes.push(stroke);
      return stroke;
    },
    clear() {
      state.strokes = [];
      state.undone = [];
      return true;
    }
  };
}
