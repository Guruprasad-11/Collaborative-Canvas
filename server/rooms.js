import { createDrawingState } from './drawing-state.js';

export function createRoomManager(io) {
  const rooms = new Map();

  function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createDrawingState(roomId));
    }
    return rooms.get(roomId);
  }

  function joinRoom(roomId, socket) {
    const room = getOrCreateRoom(roomId);
    const userColor = room.assignColor(socket.id);
    socket.join(roomId);
    room.addUser(socket.id, userColor);
    socket.emit('init', { strokes: room.getStrokes(), users: room.getUserList(), myColor: userColor });
    return room;
  }

  return { joinRoom };
}
