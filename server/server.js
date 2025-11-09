import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createRoomManager } from './rooms.js';

const app = express();
app.use(cors());
app.use(express.static('client')); // serve frontend
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const rooms = createRoomManager(io);

io.on('connection', (socket) => {
  const roomId = 'lobby';
  const room = rooms.joinRoom(roomId, socket);

  // Broadcast new user
  io.to(roomId).emit('user_list', room.getUserList());

  // Drawing events
  socket.on('draw', (stroke) => {
    room.addStroke(stroke);
    socket.broadcast.to(roomId).emit('draw', stroke);
  });

  socket.on('undo', () => {
    const undone = room.undo();
    if (undone) io.to(roomId).emit('undo', undone);
  });

  socket.on('redo', () => {
    const redone = room.redo();
    if (redone) io.to(roomId).emit('redo', redone);
  });

  socket.on('clear', () => {
    room.clear();
    io.to(roomId).emit('clear');
  });

  socket.on('cursor_move', (data) => {
    socket.broadcast.to(roomId).emit('cursor_move', { id: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    room.removeUser(socket.id);
    io.to(roomId).emit('user_list', room.getUserList());
    io.to(roomId).emit('user_disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
