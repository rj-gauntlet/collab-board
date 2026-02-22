# CollabBoard — 3–5 Minute Presentation Script

**Approximate length:** ~4 minutes at a relaxed speaking pace.  
**Use the [SHOW] / [DEMO] cues to switch to the app and demonstrate.**

---

## 1. Introduction — Who It’s For & What Problem It Solves (0:00–0:45)

Hi. I’m going to show you **CollabBoard**.

**[SHOW: Home page or board list if already signed in]**

**Who it’s for:** Teams that run remote or hybrid workshops, sprint planning, or brainstorming.

**The problem:** It’s hard to keep everyone on the same page when ideas live in different docs and screens. Setting up boards and templates by hand is slow and breaks flow.

**What CollabBoard does:** It’s a real-time collaborative whiteboard. Everyone works on the same canvas, and you can use plain English to create and arrange content with an AI assistant — so you spend less time clicking and more time thinking. I’ll show you the board, collaboration, and the AI in action.

---

## 2. Getting Started & Your Boards (0:35–1:05)

**[SHOW: Home page]**

You sign in with Google. Once you’re in, the home page shows **Your boards** — boards you’ve created. You can create a new board with the “New board” button; it opens in a new tab.

**[DEMO: Create a new board or open an existing one]**

Each board has a name in the header that anyone with the link can edit. If someone else renames the board, that name updates for everyone, including in “Your boards” for the person who created it.

---

## 3. The Canvas (1:05–2:15)

**[SHOW: Board with toolbar and canvas]**

The main view is a Figma-style canvas. On the left you have the **toolbar**: Select, Sticky Note, shapes like rectangle and circle, Text, Frame, and Connector.

**[DEMO: Add a sticky note, then a frame]**

You can drag elements around, resize them with the transformer when selected, and double-click to edit text or frame titles. Connectors link elements and stay attached when you move them; you can choose arrow style, dashed lines, and add labels.

**[DEMO: Draw a connector between two elements, or show an existing one]**

Pan and zoom with the mouse: scroll to pan, Ctrl+scroll to zoom. The zoom controls in the bottom-right let you fit the whole board on screen. There’s a grid overlay and snap-to-grid if you want alignment. You get **undo and redo** — up to 50 steps — and you can export the board as a PNG from the header.

**[Optional: Quick multi-select, copy/paste, or delete to show editing]**

---

## 4. Real-Time Collaboration (2:15–2:45)

**[SHOW: Same board in two windows/browsers, or mention it]**

CollabBoard is built for collaboration. When someone else is on the same board, you see their **cursor** with their name. If they drag a sticky note or shape, you see it move in real time. All elements are stored in the cloud, so everyone stays in sync. You don’t need to refresh; changes appear as they happen.

---

## 5. CollabBot — AI Board Control (2:45–4:00)

**[SHOW: Open CollabBot panel from the toolbar]**

The standout feature is **CollabBot** — an AI assistant that controls the board from natural language.

**[DEMO: One or two of the following]**

You can say things like:

- *“Add three sticky notes: Idea A, Idea B, Idea C.”*
- *“Create a flowchart.”* — CollabBot adds a frame, steps, and arrows.
- *“Create a SWOT analysis.”* — You get a 2×2 grid with Strengths, Weaknesses, Opportunities, and Threats.
- *“Create a user journey map with five stages.”* — It sets up stages and connectors.
- *“Arrange these notes in a grid”* or *“Create a 4×4 grid of sticky notes.”*
- *“Move the pink note to the right”* or *“Clear the board.”*

**[DEMO: Say one instruction and show the result]**

CollabBot uses the current board state to understand “the pink note” or “the frame called Sprint Planning,” and it can run several steps in one go — for example, create a template and then adjust it. So you can brainstorm in plain English instead of clicking through the toolbar every time.

---

## 6. Smart Cluster (4:00–4:15)

**[Optional: Show Cluster button]**

There’s also **Smart Cluster**. Select a set of sticky notes and click **Cluster**. The AI groups them into a few themes and shows you labels and summaries. It’s useful for turning a wall of ideas into clear categories.

---

## 7. Wrap-Up (4:15–4:35)

**[SHOW: Full board or home]**

CollabBoard is built with **Next.js**, **Firebase** for auth and real-time data, and **Konva** for the canvas. The AI side uses the **Vercel AI SDK** and **GPT-4o-mini** for CollabBot and Smart Cluster.

In short: it’s a collaborative whiteboard with real-time sync, rich editing, and AI that lets you create and arrange content by just asking. Thanks for watching; I’m happy to take questions.

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
| Smart Cluster      | Select several notes → Cluster → show themes. |
| Export             | Header → Export → show PNG. |
| Undo / redo        | Make a change, Ctrl+Z, Ctrl+Y. |

---

*Adjust timing by shortening the canvas section or expanding CollabBot examples. Keep CollabBot as the main “wow” moment.*
