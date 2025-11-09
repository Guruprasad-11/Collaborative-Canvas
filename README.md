# Real-Time Collaborative Drawing Canvas

A **multi-user, real-time collaborative drawing application** built with **Vanilla JavaScript**, **HTML5 Canvas**, and **Node.js + Socket.io**.

## Features

- Drawing tools: Brush & Eraser
- Color and stroke width control
- Real-time synchronization across users
- Live user cursors and online user list
- Global Undo/Redo synchronized for all users
- Conflict resolution via server-authoritative state

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | HTML, CSS, Vanilla JS, Canvas API |
| Backend | Node.js, Express, Socket.io |
| Communication | WebSockets (Socket.io) |

## Setup Instructions

### Prerequisites
- Node.js v16 or later

### Steps to Run Locally
```bash
# Clone the repository
git clone https://github.com/Guruprasad-11/Collaborative-Canvas.git
cd Collaborative-Canvas

# Install dependencies
npm install

# Start the server
npm start
```

Now open **http://localhost:4000** in your browser.

To test multi-user collaboration:
- Open the app in **two tabs**.
- Draw in one — you’ll see it appear instantly in the other.

## Testing

- Test real-time drawing across multiple tabs
- Verify color and size changes sync for all
- Undo/Redo updates all connected clients
- Cursor position shows in other windows

## Known Limitations

- No persistent data storage (canvas resets on server restart)
- Undo/Redo applies globally, not per-user
- Eraser operates on pixel blending, not vector-based

## Time Spent

Approx. **3 days** (planning, coding, testing, documentation)
