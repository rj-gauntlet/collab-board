This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Whiteboard – Standalone text

**Create a text box**

1. Select the **Text** tool in the toolbar (or use the keyboard shortcut if set).
2. **Click once** on an empty area of the canvas where you want the text.
3. A placeholder box appears with “Double-click to edit”.

**Edit the text**

- **Option A:** **Click the placeholder once** (it gets an orange border), then **click it again** to open the editor.
- **Option B:** **Double-click the placeholder** to open the editor.
4. Type in the overlay; use **Enter** (without Shift) or **click outside** to save. Use **Escape** to cancel without saving.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

- **Unit tests (Jest):** `npm test` — runs tests in `src/**/__tests__/**/*.test.(ts|tsx)`.
- **Code coverage:** `npm run test:coverage` — runs Jest with coverage; report in `coverage/` (HTML in `coverage/lcov-report/index.html`).
- **E2E (Playwright):** `npm run test:e2e` — runs e2e tests in `e2e/`. Starts the dev server and uses Chromium.
- **E2E with HTML report:** `npm run test:e2e:coverage` — same as above but writes an HTML report to `playwright-report/` for inspecting runs.

**CollabBot PRD capabilities** are covered by `e2e/collab-bot-prd.spec.ts`: creation (sticky note, shape, frame), manipulation (move, update color, resize frame to fit), layout (grid, 2×3 grid, space evenly), complex templates (retrospective, SWOT), and delete. Each test creates a new board so it runs in CI without a fixed board ID.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
