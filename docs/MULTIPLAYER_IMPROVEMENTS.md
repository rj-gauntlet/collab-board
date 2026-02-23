# Multiplayer experience improvements (industry practices)

Suggestions to improve the collaborative whiteboard experience, aligned with how Figma, Miro, Google Docs, and similar products handle multiplayer.

---

## 1. Presence & awareness

### What you have today
- RTDB presence with cursor position (throttled); remote cursors with name labels; Users list with online/offline.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **Stable cursor colors per user** | Same user always has the same color across sessions; easier to recognize “who is where.” Store a color (or hash userId → color) in Firestore/RTDB and use it for cursor + Users list. | Low |
| **Selection awareness** | Others see what you have selected (e.g. highlight or outline on the elements you selected). Reduces “who’s editing what” confusion. Sync selected IDs in RTDB per user (e.g. `selection/{boardId}/{userId}`). | Medium |
| **“Viewing this element” or activity region** | Show a subtle indicator when someone is focused on a specific area (e.g. “Alex is viewing this area”). Can be a small viewport bounding box or “focused element” in presence. | Medium |
| **Typing / editing indicators** | When a user is editing text (sticky, text element, frame title), show “Alex is typing…” near that element or in the header. Sync `editingElementId` (and optional caret/selection) in RTDB. | Medium |

---

## 2. Follow mode & viewport sync

### What you have today
- Each user has an independent viewport (pan/zoom). No “follow” or shared view.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **“Follow [user]”** | Button in Users list or next to a cursor: “Follow Alex.” Your viewport pans/zooms to keep their cursor (or a chosen element) in view. Optional: “Stop following” when you pan/zoom yourself. | Medium |
| **“Go to user’s view” (one-shot)** | “Jump to where Alex is looking” — one-time sync of your viewport to match theirs (center + scale). Good for catch-up without continuous follow. | Low–Medium |
| **“Bring everyone here” (presenter)** | Optional: “Share my view” so others can one-shot jump to your current view. Useful for workshops and demos. | Medium |

---

## 3. Conflict resolution & data model

### What you have today
- Last-write-wins per element (CONCURRENCY.md). No offline persistence. No UI for conflicts.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **Firestore offline persistence** | Enable `enableIndexedDbPersistence` (client-only) so brief disconnects don’t drop state; reconnects are smoother and feel more reliable. | Low |
| **Optimistic updates + rollback** | You already have optimistic local state. Make failed writes (e.g. permission or network) revert local state and optionally show a small toast (“Couldn’t save; reverted”). | Low–Medium |
| **Clear “someone else edited this”** | When an element you’re editing is updated by someone else, show a non-blocking hint: “This was updated by Alex” and refresh the content (or offer “Keep mine” / “Take theirs” for critical fields). | Medium |
| **Operational transform (OT) or CRDTs** | For rich text or highly concurrent edits, consider OT/CRDT so concurrent edits merge instead of overwrite. Bigger lift; only if you need Google-Docs–style co-editing. | High |

---

## 4. Invites, sharing & access

### What you have today
- Link-based access (anyone with the URL can open the board). Users register on first visit. No explicit “invite” or “share” UI.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **Copy board link** | Prominent “Copy link” / “Share” in the header with a clear copy-to-clipboard action and optional short URL. | Low |
| **Share modal** | Modal: “Share this board” with link, optional “Invite by email” (e.g. send email with link or add to a pending-invites list). | Medium |
| **Roles (view / comment / edit)** | Optional: viewer (see only), commenter (see + maybe comments), editor (full edit). Store in Firestore (`boards/{boardId}/access` or per-user permissions) and enforce in security rules + UI. | Medium–High |
| **“Who has access”** | In the share modal, list users who have opened the board (from `boardUsers`) and optionally show “Last seen” or “Added by.” | Low–Medium |

---

## 5. Notifications & activity

### What you have today
- No in-app notifications or activity feed.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **“X joined the board”** | Short-lived toast or banner when a new user appears in presence: “Alex joined the board.” Use presence `onChildAdded` or compare previous vs current user set. | Low |
| **“X left” (optional)** | Optional toast when someone’s cursor goes stale / they leave. Softer than “joined”; can be omitted to reduce noise. | Low |
| **Activity list (optional)** | Sidebar or panel: “Alex added a sticky note,” “Jordan moved the frame.” Requires logging significant actions to Firestore or a separate activity collection and subscribing with limit(20). | Medium |

---

## 6. Performance & scale

### What you have today
- Cursor throttle (~25/sec visible, ~2/sec hidden); per-element Firestore docs; RTDB for presence and drags.

### Industry practices to add

| Improvement | Why it matters | Effort |
|-------------|----------------|--------|
| **Cursor in viewport only** | Only broadcast cursor when it’s inside the current viewport (or a margin). Cuts noise when the board is large and reduces RTDB traffic. | Low |
| **Batch presence heartbeat** | If you add more presence fields (selection, viewport, etc.), consider a single presence object per user with a single `updatedAt` and batch updates to avoid thundering herd. | Low |
| **Lazy load off-screen elements** | For very large boards, only subscribe to or render elements in/near the current viewport (with a buffer). Firestore range queries or RTDB indexing can support this. | High |

---

## 7. Quick wins (do first)

1. **Stable cursor colors** — Hash `userId` to a color; use in `RemoteCursors` and Users list.
2. **Copy board link** — Header button “Share” / “Copy link” with `navigator.clipboard.writeText(boardUrl)`.
3. **“X joined the board”** — On presence diff, show a toast when a new userId appears.
4. **Firestore offline persistence** — Call `enableIndexedDbPersistence(db)` once in a client-only path (e.g. in a `useEffect` in the app shell or board page).

---

## 8. References (industry behavior)

- **Figma**: Cursors with names and colors, selection highlights, “Follow” in the presence menu, viewport sync, “X is editing this” on components.
- **Miro**: Cursors, follow mode, “Bring to me” / “Go to user,” activity feed, share with roles.
- **Google Docs**: Presence list, cursor/selection awareness, “X is editing,” offline persistence, conflict UI (“Changes from others”).
- **Notion**: Presence, “X is viewing this page,” share modal with link and emails, “Updates” in the sidebar.

Implementing even a few items from sections 1, 2, and 4 will make the multiplayer experience feel much closer to these products.
