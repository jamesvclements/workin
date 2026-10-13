# Building with Workin

Read `SKILL.md`, `references/ux.md`, and `ui/README.md` before building a host or demo.

- Import `ui/index.js` and `ui/styles.css`. These are the canonical UI, not inspiration for a rewrite.
- Preserve the UX contract, including no page heading/footer, agent-controlled presentation, native icon colors, original thread motion, and source-card stack gestures without a visible pager.
- Wire local persistence and the user's existing connections around the UI. Save full evidence and cached media before deriving display data. View changes read local data and never refetch providers.
- Keep all personal records, credentials, connector responses, cached media, preferences, and machine-specific settings outside this repository. Use only fictional, deliberately authored examples here.
- Keep the example on the same renderer as a real journal. Demo explanations belong in documentation, not on the page.
- Do not add a test suite. Verify changes manually in the browser, including the actual interactions and narrow screens.
- Only redesign the appearance or interactions when the user explicitly requests it.
