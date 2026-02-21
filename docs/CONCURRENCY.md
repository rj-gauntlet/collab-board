# Concurrency and multi-user support

## Summary

**Yes. The application is designed to support up to 10 (and more) simultaneous users on a board.**

## Architecture

- **Firestore** – Board data is stored per element: `boards/{boardId}/elements/{elementId}`. Each client subscribes with `onSnapshot` to typed queries (notes, shapes, frames, connectors, text, lines). Writes are per-document (one element per write). No single-document hotspot.
- **Realtime Database (RTDB)** – Used for low-latency, ephemeral data:
  - **Presence/cursors**: `presence/{boardId}/{userId}` – each user writes their own path; cursor updates are throttled (~25/sec when tab visible, ~2/sec when hidden).
  - **Dragging**: `dragging/{boardId}/{userId}` – active drag state per user.
  - **Remote notes/shapes** during drag (optional preview).
- **CollabBot (AI)** – Stateless API route; each request is independent. No in-memory state shared across users.

## Limits (Firebase)

- **RTDB**: 100 simultaneous connections (Spark), 200,000 (Blaze). 10 users = 10 connections.
- **Firestore**: No low connection limit that would affect 10 users; scales to many concurrent listeners and writers.

## Caveats

1. **Last-write-wins** – If two users edit the same element at once (e.g. same sticky note text), one write overwrites the other. For typical use (different elements or sequential edits), this is fine.
2. **No offline persistence** – Firestore offline persistence is not enabled. Brief network blips can cause listeners to reconnect and re-fetch. Enabling `enableIndexedDbPersistence` in a client-only path would improve resilience.
3. **Board state size** – CollabBot receives a capped board state (e.g. last 80 elements) to keep prompts small; full board remains in Firestore and is visible to all clients.

## Recommendations for 10+ users

- Use **Blaze** if you expect many boards or higher concurrency (RTDB connection headroom).
- Consider enabling **Firestore persistence** on the client for smoother reconnects.
- Monitor Firestore/RTDB usage in the Firebase console if you scale beyond a few dozen concurrent users per board.
