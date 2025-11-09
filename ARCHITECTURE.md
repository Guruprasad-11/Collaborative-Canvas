#  Architecture

## Data Flow Diagram

```
+--------------------------------------------------------------+
|                      Collaborative Canvas                    |
|--------------------------------------------------------------|
|                                                              |
|   +-------------------+          +-------------------+       |
|   |    Client Side    |          |    Server Side    |       |
|   |-------------------|          |-------------------|       |
|   |  - User Actions   |          |  - Socket.io      |       |
|   |  - Canvas Logic   | <------> |  - Room Manager   |       |
|   |  - WebSocket I/O  |          |  - Drawing State  |       |
|   +-------------------+          +-------------------+       |
|                                                              |
|        (Real-time Sync via WebSocket Communication)          |
+--------------------------------------------------------------+
```

```
         ┌──────────────────────────────────────────┐
         │                CLIENT SIDE               │
         └──────────────────────────────────────────┘
                              │
                              │ 1. User interacts (Draw / Erase / Undo / Redo)
                              ▼
                  ┌───────────────────────┐
                  │ Canvas & JS Logic     │
                  │ (Captures events)     │
                  └───────────┬───────────┘
                              │ 2. Emits WebSocket events
                              ▼
                  ┌────────────────────────┐
                  │ Socket.io Client       │
                  └────────────┬───────────┘
                               │ 3. Sends 'draw', 'undo', 'redo', 'cursor_move'
   ───────────────────────────────────────────────────────────────
         WebSocket Network (Real-time Bidirectional Data)
   ───────────────────────────────────────────────────────────────
                              |
                              ▼
                  ┌───────────────────────┐
                  │    Socket.io Server   │
                  └───────────┬───────────┘
                              │ 4. Receives and validates events
                              ▼
                  ┌───────────────────────┐
                  │ Room Manager &        │
                  │ Drawing State         │
                  │ (strokes[], undone[]) │
                  └───────────┬───────────┘
                              │ 5. Updates global state
                              ▼
                  ┌───────────────────────┐
                  │ Broadcast to Clients  │
                  └───────────┬───────────┘
                              │ 6. Sends updates to all users
                              ▼
                  ┌────────────────────────┐
                  │ Canvas & JS Logic      │
                  │ (Renders updates)      │
                  └────────────────────────┘
```
## WebSocket Protocol

| Event | Direction | Payload | Description |
|--------|------------|----------|--------------|
| `init` | Server → Client | `{ strokes[], users[], myColor }` | Initial sync on connection |
| `draw` | Client ↔ Server | `{ id, points[], color, size, tool }` | Draw stroke updates |
| `undo` | Client → Server | - | Request global undo |
| `redo` | Client → Server | - | Request global redo |
| `cursor_move` | Client → Server | `{x, y, color}` | Live cursor tracking |
| `user_list` | Server → Client | `[ {id, color} ]` | Active users in room |

## Undo/Redo Strategy

- The server maintains two stacks per room:
  - `strokes[]`: committed strokes
  - `undone[]`: recently undone strokes
- On `undo`, server pops from `strokes` → pushes to `undone`
- On `redo`, server pops from `undone` → pushes to `strokes`
- Server then broadcasts state update to all connected clients

This ensures **global consistency** and prevents race conditions.

## Performance Design

- Mouse move events are throttled via small stroke batching.
- Only new points are transmitted, not full stroke lists.
- Canvas redraw is incremental; full redraw only occurs on undo/redo.

## Conflict Resolution

- Server is **authoritative** — clients don’t redraw independently.
- Strokes are timestamped and ordered by arrival.
- New strokes clear the redo stack.