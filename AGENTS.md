# AGENTS.md - Eva Copilot Workspace

## Context
This directory contains the source code for **Eva Copilot**, a Chrome Extension.

## Tech Stack
- **Runtime**: Bun
- **Build**: Vite 7 + CRXJS
- **UI**: React + Shadcn/ui + TailwindCSS
- **State**: TanStack Query (React Query)
- **Manifest**: V3 (Side Panel)

## Documentation & Best Practices
Please refer to `docs/React_Chrome_KB.md` for architectural patterns, specifically:
- Multi-entry build configuration.
- Content script injection strategies (Iframe vs Shadow DOM).
- HMR handling.

When implementing new features (e.g., Content Scripts, Background logic), consult the Knowledge Base first.
