# Product Requirements Document: CollabBoard MVP

## Core Objective
A high-performance, real-time collaborative whiteboard with AI-assisted brainstorming capabilities, optimized for the Firebase Blaze plan.

## Hard Gate Requirements
- Infinite board with pan (drag) and zoom (scroll).
- Sticky notes: Double-click to edit, draggable.
- Drawing: 60fps Pen tool with real-time stroke sync.
- Shapes: Click to add shape to canvas, ability to resize them
- Real-time Sync: <100ms latency for cursors and elements.
- Presence: Name labels on cursors and "Online Now" indicator.
- Auth: Firebase Anonymous Authentication.
- AI: "Magic" button to cluster notes into themes using GPT-4o-mini.

## Constraints
- Zero-cost scaling: Use RTDB for ephemeral data (cursors/active drags) and Firestore for persistence.
- Tech Stack: Next.js 15, React 19, Konva, Firebase, Vercel AI SDK.