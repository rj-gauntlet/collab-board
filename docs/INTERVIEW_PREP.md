# CollabBoard — Video Interview Prep

Short, honest answers you can adapt in your own words. Practice saying them out loud once or twice.

---

## 1. Explain your project architecture

**Suggested answer:**

"CollabBoard is a real-time collaborative whiteboard with an AI assistant. The architecture is:

- **Frontend:** Next.js 16 with App Router and React 19, TypeScript. The canvas is **Konva** (HTML5 Canvas) so we get pan, zoom, and lots of shapes without a heavy design-tool codebase.
- **Data:** **Firestore** for persistent data—all board elements (stickies, shapes, frames, connectors, text) live in `boards/{boardId}/elements`. **Firebase Realtime Database** is used only for ephemeral stuff: live cursors and in-progress drag positions so collaboration feels instant.
- **AI:** A **Next.js API route** calls **GPT-4o-mini** via the **Vercel AI SDK**. The model gets the current board state and a list of tools (create note, move elements, create flowchart, etc.). It returns tool calls; the **frontend** runs those tools against the canvas and Firestore, so the board updates in real time.
- **Hosting:** Firebase App Hosting for the Next app, so we get SSR and a single deployment pipeline.

So in one sentence: React + Konva for the canvas, Firestore for persistence, RTDB for live collaboration, and an AI agent that turns natural language into tool calls that the frontend executes."

---

## 2. What did you learn?

**Suggested answer:**

- **Real-time sync:** How to separate *persistent* state (Firestore) from *ephemeral* state (RTDB) and merge them in the UI—e.g. local overrides during drag so your cursor doesn’t fight with incoming remote updates.
- **AI as a controller:** The agent doesn’t “run” the board; it outputs *tool calls*. Learning to design small, well-scoped tools and a clear system prompt so the model picks the right one and fills in arguments (e.g. coordinates, colors) was a big takeaway.
- **Canvas UX:** Things like elevation (shadows for frames vs stickies), hover and selection feedback, and a subtle canvas texture (e.g. hexagonal lines) so the board doesn’t feel flat. Also handling browser zoom and device pixel ratio so the canvas stays sharp.
- **Iterating from feedback:** Taking reviewer comments (e.g. “canvas feels flat”, “CollabBot feels like a dev console”) and turning them into a concrete plan—hierarchy, suggested prompts, chat bubbles—then implementing and refining."

---

## 3. What were the challenges you faced and how did you resolve them?

**Suggested answer:**

- **Challenge: Keeping collaboration in sync without conflicts.** When one user drags a sticky and another user’s view updates from RTDB, we had to avoid overwriting the active drag. **Resolution:** We keep a *local override* map for the current user’s in-progress drags and only apply remote updates when there’s no local override for that element. We also track the currently dragged element so we don’t clear that override until the drag ends and Firestore has been updated.
- **Challenge: AI creating content in the right place.** Early on, “create a frame with 5 stickies inside” could produce overlapping or misaligned notes. **Resolution:** We tightened the system prompt with explicit layout rules: grid math (e.g. 160×120 notes, 24px spacing, 20px padding), formulas for frame size, and example coordinates. We also added a “See hierarchy” suggestion so reviewers could test that flow easily.
- **Challenge: TypeScript and the AI SDK.** The SDK’s message parts use strict types (e.g. `ToolInvocation` with `state`). Our type predicate for “tool-invocation” parts was too narrow and broke the Cloud build. **Resolution:** We dropped the strict predicate and used a filter plus a safe cast when reading `toolName`, so we stay compatible with the SDK’s types without asserting a shape the SDK doesn’t guarantee.
- **Challenge: Making the canvas feel intentional, not flat.** **Resolution:** We added a clear elevation system (stronger shadow on frames, softer on stickies), consistent corner radii, hover “lift,” and a very subtle CSS texture (hexagonal lines) so the canvas has depth and the hierarchy is obvious."

---

## 4. Anything you can do in the future to improve the quality of your app?

**Suggested answer:**

- **Auto-fit AI output:** After CollabBot creates content, automatically pan/zoom to fit the new content so users don’t have to hunt for it. We have `fitToContent` on the canvas; we’d call it after tool execution (with a short delay for Firestore to propagate).
- **Offline / conflict resolution:** Right now we assume a live connection. Adding offline support or last-write-wins with clearer conflict handling would improve robustness.
- **Accessibility:** Keyboard navigation for tools and elements, focus management for the CollabBot panel, and better screen-reader support for the canvas (e.g. live regions when the AI creates or moves items).
- **Testing:** More E2E coverage for the AI flow (send a prompt, assert elements appear) and unit tests for layout math and sync logic.
- **Performance:** Virtualize or cull off-screen elements on very large boards so we don’t render hundreds of Konva nodes when only a small area is visible."

---

## 5. If you had more time, what would you do differently?

**Suggested answer:**

- **Start with a clearer UX spec for the canvas.** We got hierarchy and polish in after feedback. If I’d defined elevation, hover, and texture earlier, we’d have had a more consistent visual language from the start.
- **Design the AI tools and prompts in one pass.** We iterated on “frame + notes inside” several times (counts, spacing, grid math). A single design pass for layout rules and prompt examples would have saved rework.
- **Invest in E2E tests earlier.** Especially for the agent (e.g. “create a flowchart” and check nodes/connectors exist). That would have caught type and layout issues before the Cloud build.
- **Document architecture and runbooks sooner.** Having the PRD and the AI Board Agent readme helped a lot; I’d do that from day one so onboarding (or an interviewer) can follow the flow quickly."

---

## 6. How did you overcome this problem?

*Use this when they ask “how did you overcome [a specific problem]?” — pick the one that matches what they asked about, or use the structure for another example.*

**Sync / collaboration:**  
"We had to make sure my drag didn’t get overwritten by someone else’s update. We introduced a local override map: while I’m dragging, we keep my element’s position in that map and skip applying remote updates for that id. When I release, we persist to Firestore and then clear the override so the next remote state is applied. That way we get smooth collaboration without fighting cursors."

**AI layout / “frame with notes”:**  
"The model was creating the right number of stickies but with bad positions. We didn’t change the frontend logic much; we fixed it in the prompt. We wrote explicit formulas for frame size and note positions—e.g. 48px spacing, content area below the title bar—and gave a concrete example for ‘5 inside, 3 outside.’ Once the model had that recipe, it produced correctly spaced grids."

**Build / types:**  
"The Cloud build failed on a type predicate in the chat component. The AI SDK’s tool-invocation type is stricter than what we’d assumed. Instead of asserting a custom shape, we filtered for tool-invocation parts and then used a minimal cast when reading the tool name, so we stay compatible with the SDK and the build passes."

---

## 7. Extra questions that might come up

**Why Konva instead of SVG or a design library?**  
"Konva gives us a single canvas, good performance for many shapes, and built-in support for drag, transform, and hit detection. SVG would mean managing a big DOM tree; a full design SDK would be more than we needed. Konva fit the ‘whiteboard with many elements’ use case and stayed within our scope."

**How does the AI actually change the board?**  
"The AI never touches the database. It returns *tool calls*—name plus arguments. Our API streams that back; the frontend parses the tool invocations and calls methods on the canvas ref—like `createNotesFromAI` or `moveElementsByAgent`. Those methods update React state and write to Firestore, so the board and the database stay in sync. The model is just deciding *what* to call; our code does the *how*."

**How do you handle real-time collaboration?**  
"Firestore is the source of truth for elements. We listen to the board’s element collections and merge that with optimistic updates when the current user creates or edits something. For cursors and live drags we use Realtime Database so we don’t spam Firestore with high-frequency updates. The UI merges persisted data, local overrides for active drags, and remote drag/cursor data so everyone sees smooth, up-to-date state."

**What would you add next if you had another sprint?**  
"Auto-fit view after AI actions so new content is immediately visible. Then I’d add one or two more canvas hierarchy tweaks from our improvement plan—e.g. frame title bar hierarchy or connector styling—and tighten E2E tests around the AI flows so we don’t regress layout or tool execution."

**What’s the hardest part of the codebase?**  
"The whiteboard canvas component is large because it owns all the layers, refs, and merge logic for persisted + remote + optimistic state. If I did it again, I’d split ‘state merging’ into a hook or small module so the main component focuses on layout and event handling."

---

## Quick reference

| Topic        | One-liner |
|-------------|-----------|
| Architecture | Next.js + Konva canvas; Firestore for elements, RTDB for cursors/drags; AI returns tool calls, frontend runs them. |
| What you learned | Real-time sync patterns, AI-as-controller (tools + prompts), canvas UX (elevation, texture), acting on feedback. |
| Main challenges | Sync conflicts (local overrides), AI layout (prompt + grid math), SDK types (predicate → filter + cast), flat canvas (hierarchy + texture). |
| Future improvements | Auto-fit after AI, offline/conflicts, a11y, E2E and performance. |
| Do differently | Earlier UX/hierarchy spec, one pass on AI tools/prompts, E2E and docs from the start. |

Good luck with the interview.
