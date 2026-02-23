# CollabBoard — Video Presentation Script

**Approximate length:** Up to 6 minutes at a relaxed speaking pace.  
**Use the [SHOW] / [DEMO] cues to switch to the app and demonstrate.**

---

## 1. Introduction — Who It’s For & What Problem It Solves (0:00–0:50)

Hi. I’m going to show you **CollabBoard**.

**[SHOW: Home page or board list if already signed in]**

**Who it’s for:** Teams that run remote or hybrid workshops, sprint planning, or brainstorming.

**The problem:** It’s hard to keep everyone on the same page when ideas live in different docs and screens. Setting up boards and templates by hand is slow and breaks flow.

**What CollabBoard does:** It’s a real-time collaborative whiteboard. Everyone works on the same canvas, and you can use plain English to create and arrange content with an AI assistant — so you spend less time clicking and more time thinking. I’ll show you the board, collaboration, and the AI in action.

---

## 2. Getting Started & Your Boards (0:50–1:20)

**[SHOW: Home page]**

You sign in with Google. Once you’re in, the home page shows **Your boards** — boards you’ve created. You can create a new board with the “New board” button; it opens in a new tab.

**[DEMO: Create a new board or open an existing one]**

Each board has a name in the header that anyone with the link can edit. If someone else renames the board, that name updates for everyone, including in “Your boards” for the person who created it.

---

## 3. The Canvas (1:20–2:35)

**[SHOW: Board with toolbar and canvas]**

The main view is a Figma-style canvas. On the left you have the **toolbar**: Select, Sticky Note, shapes like rectangle and circle, Text, Frame, and Connector.

**[DEMO: Add a sticky note, then a frame]**

You can drag elements around, resize them with the transformer when selected, and double-click to edit text or frame titles. Connectors link elements and stay attached when you move them; you can choose arrow style, dashed lines, and add labels.

**[DEMO: Draw a connector between two elements, or show an existing one]**

Pan and zoom with the mouse: scroll to zoom, drag to pan. The zoom controls in the bottom-right let you fit the whole board on screen. There’s a grid overlay and snap-to-grid if you want alignment. You get **undo and redo** — up to 50 steps.

**Export** is in the toolbar: one click downloads a PNG of the **entire board** — every element, not just what’s on screen — and the file is named after the board so it’s easy to find later.

**[Optional: Quick multi-select, copy/paste, or delete to show editing]**

---

## 4. Real-Time Collaboration (2:35–3:10)

**[SHOW: Same board in two windows/browsers, or mention it]**

CollabBoard is built for collaboration. When someone else is on the same board, you see their **cursor** with their name. If they drag a sticky note, shape, or frame, you see it move in real time — and when they drop it, it stays where they put it on your screen too; no jump-back. All elements are stored in the cloud, so everyone stays in sync. You don’t need to refresh; changes appear as they happen.

---

## 5. CollabBot — AI Board Control (3:10–4:45)

**[SHOW: Open CollabBot panel from the bottom-right]**

The standout feature is **CollabBot** — an AI assistant that controls the board from natural language.

**[DEMO: One or two of the following]**

You can say things like:

- *“Add three sticky notes: Idea A, Idea B, Idea C.”*
- *“Create a flowchart.”* — CollabBot adds a frame, steps, and arrows.
- *“Create a SWOT analysis.”* — You get four frames: Strengths, Weaknesses, Opportunities, and Threats.
- *“Create a user journey map with five stages.”* — It sets up stages and connectors.
- *“Arrange these notes in a grid”* or *“Create a 4×4 grid of sticky notes.”*
- *“Move the pink note to the right”* or *“Clear the board.”*

**[DEMO: Say one instruction and show the result; optionally ask “What’s on the board?” to show the concise list]**

CollabBot uses the current board state to understand “the pink note” or “the frame called Sprint Planning.” You can ask *“What’s on the board?”* and get a clear, readable list — one item per line, with color names instead of codes. The chat remembers what it’s already done, so if you close and reopen the panel, it won’t re-run the last command. You can brainstorm in plain English instead of clicking through the toolbar every time.

---

## 6. Smart Cluster (4:45–5:05)

**[Optional: Show Cluster button]**

There’s also **Smart Cluster**. Select a set of sticky notes and click **Cluster**. The AI groups them into themes and shows you labels and summaries. It’s useful for turning a wall of ideas into clear categories.

---

## 7. Wrap-Up (5:05–5:50)

**[SHOW: Full board or home]**

CollabBoard is built with **Next.js**, **Firebase** for auth and real-time data, and **Konva** for the canvas. The AI side uses the **Vercel AI SDK** and **GPT-4o-mini** for CollabBot and Smart Cluster.

In short: it’s a collaborative whiteboard with real-time sync, smooth collaboration — including frame drags — rich editing, full-board export, and AI that lets you create and arrange content by just asking. Thanks for watching; I’m happy to take questions.

---

## Quick reference — what to demo (pick 2–3)

| Feature            | What to do / say |
|--------------------|------------------|
| Sticky notes       | Add one, type text, change color (right-click or context). |
| Frames             | Add frame, double-click title to rename. |
| Connectors         | Connector tool → click two elements; show style bar. |
| Templates          | “Create a flowchart” or “Create a SWOT analysis.” |
| Grid / layout      | “Create a 4×4 grid of sticky notes” or “Arrange these in a grid.” |
| Clear / delete     | “Clear the board” or select and delete. |
| CollabBot polish   | “What’s on the board?” (concise list); close/reopen panel (no re-run). |
| Smart Cluster      | Select several notes → Cluster → show themes. |
| Export             | Toolbar → Export → full board PNG, filename = board name. |
| Undo / redo        | Make a change, Ctrl+Z, Ctrl+Y. |
| Collaboration      | Two browsers: drag frame/note, show no jump on the other client. |

---

*Keep CollabBot as the main “wow” moment. Use the extra time to demo one more CollabBot command or a quick two-browser collaboration moment if you have it set up.*
