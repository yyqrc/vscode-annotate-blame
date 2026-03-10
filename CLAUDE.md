# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-recompile on change)
npm run watch

# Lint
npm run lint

# Run tests (compiles + lints first)
npm run test

# Build VSIX package for distribution
npm install -g @vscode/vsce
vsce package
```

To debug the extension in VS Code, press F5 after running `npm run compile` (uses `.vscode/launch.json` config).

## Architecture

This is a VS Code extension that displays Git/SVN blame annotations in the editor gutter, similar to JetBrains IDEs.

### Source Files

- [src/extension.ts](src/extension.ts) — Main entry point. Handles plugin lifecycle (`activate`/`deactivate`), command registration, event listeners, and all VS Code decoration/UI logic.
- [src/git.ts](src/git.ts) — Git-specific logic: runs `git blame --incremental`, parses output, fetches commit diffs and file status.
- [src/svn.ts](src/svn.ts) — SVN-specific logic and VCS type detection. Exports `detectVcsType()` which is the single entry point for determining whether a file is under Git or SVN.

### Key Data Flow

1. User triggers a blame command → `extension.ts` calls `detectVcsType(filePath)` from `svn.ts`
2. If SVN: calls `getSvnBlames()` → parses `svn blame --xml` output
3. If Git: calls `getBlames()` → parses `git blame --incremental` output
4. Both return `Blame[]` — a per-line array with `{ commit, author, timestamp, summary, commited }`
5. `buildDecorationOptions()` converts `Blame[]` into VS Code `DecorationOptions[][]` (two arrays: text annotations + heatmap color bars)
6. Decorations are applied via `editor.setDecorations()` and hover tooltips via `vscode.languages.registerHoverProvider()`

### State Management

Two module-level Maps in `extension.ts` track all state:
- `fileBlameStates: Map<string, boolean>` — whether blame is currently shown for a document URI
- `fileDecorations: Map<string, {...}>` — cached decoration types, options, blames, and hover provider per document URI

### VCS Detection Priority

`detectVcsType()` in `svn.ts` runs Git and SVN checks in parallel, but **SVN takes priority** if both are detected (a file can be in a directory that has both `.git` and `.svn`).

### Heatmap Colors

Commit colors are computed by `getCommitColor()` in `extension.ts`: hue is derived from commit hash, saturation decays exponentially based on commit age (recent commits = vivid, old commits = muted).

### Real-time Updates

`updateDecorationsOnChange()` handles live editing: it tracks added/deleted/modified lines via `resolveChange()` and updates the `blames[]` array in-place without re-running git/svn commands. On save, a full refresh is triggered.
