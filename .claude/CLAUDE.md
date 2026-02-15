# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian FSRS for Atomic Notes - A spaced repetition plugin for Obsidian using the FSRS (Free Spaced Repetition Scheduler) algorithm. The key differentiator is **zero note pollution**: all scheduling data is stored externally in plugin data, never modifying the user's notes.

**Current State**: Early development (sample plugin template). See `docs/PRD.md` for full requirements and `docs/Phases/` for development milestones.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Development build with watch mode
npm run build        # Production build (TypeScript check + esbuild)
npm run lint         # Run ESLint
```

## Testing

Manual testing only (copy built files to vault):
```bash
# Copy main.js, manifest.json, styles.css to:
# <Vault>/.obsidian/plugins/obsidian-fsrs-atomic/
```

## Architecture

### Target Module Structure (from PRD)

```
src/
├── main.ts                 # Plugin lifecycle only (~50 lines)
├── types.ts                # All TypeScript interfaces
├── constants.ts            # Default values, constants
├── fsrs/                   # FSRS algorithm wrapper (ts-fsrs)
│   ├── scheduler.ts        # Scheduling logic
│   ├── card-manager.ts     # Card CRUD operations
│   └── review-processor.ts # Process ratings
├── queues/                 # Queue management
│   ├── queue-manager.ts    # Queue CRUD
│   └── note-resolver.ts    # Resolve notes from criteria
├── criteria/               # Note selection system
│   ├── folder-criterion.ts # Folder-based selection
│   ├── tag-criterion.ts    # Tag-based selection
│   └── exclusion-criteria/ # Exclusion implementations
├── review/                 # Review session management
│   ├── session-manager.ts  # Review session state
│   └── undo-manager.ts     # Undo functionality
├── ui/                     # UI components
│   ├── sidebar/            # Review sidebar
│   ├── dashboard/          # Analytics modal
│   └── settings/           # Settings tab
├── data/                   # Data persistence
│   └── data-store.ts       # Central data management
└── commands/               # Command registration
```

### Core Principle: Note Purity

All spaced repetition data lives in `.obsidian/plugins/obsidian-fsrs-atomic/data.json`. Notes contain only knowledge content - no plugin-specific frontmatter or syntax.

### Key Dependencies

- `ts-fsrs`: FSRS v6 algorithm implementation (to be added)
- `obsidian`: Obsidian Plugin API

## Development Guidelines

### Code Organization

- Keep `main.ts` minimal - lifecycle only, delegate to modules
- Split files at ~200-300 lines into focused modules
- Use `this.register*` helpers for all listeners/intervals (auto-cleanup on unload)

### Obsidian Plugin Patterns

```typescript
// Register cleanup automatically
this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {}));
this.registerDomEvent(window, "resize", () => {});
this.registerInterval(window.setInterval(() => {}, 1000));

// Persist settings
await this.saveData(this.settings);
const data = await this.loadData();

// Get note metadata
const cache = this.app.metadataCache.getFileCache(file);
```

### Commit Convention

Use Conventional Commits format:
```
<type>[optional scope]: <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
```

Examples:
```
feat: add FSRS scheduling for atomic notes
fix: correct due date calculation for new cards
refactor(plugin): extract review logic into service
```

## Releases

**CRITICAL**: Obsidian plugins require three files in every GitHub release:
1. `main.js` - Compiled plugin code
2. `manifest.json` - Plugin metadata
3. `styles.css` - Plugin styles (even if empty)

**Tag naming**: Release tags MUST exactly match the version in `manifest.json` (no `v` prefix).

### Creating a Release

1. Update version in both `manifest.json` and `versions.json`
2. Run the release script:
   ```bash
   ./scripts/create-release.sh
   ```

The script will:
- Verify working directory is clean
- Run lint and build
- Verify all three required files exist
- Create and push a tag (matching manifest.json version exactly)
- GitHub Actions will automatically create the release with all three files

### Manual Release (if needed)

```bash
# 1. Update manifest.json and versions.json
# 2. Build
npm run build

# 3. Create tag (NO 'v' prefix - must match manifest.json)
VERSION=$(node -p "require('./manifest.json').version")
git tag "$VERSION"
git push origin "$VERSION"
```

## Key Files

- `docs/PRD.md` - Full product requirements document
- `docs/Phases/` - Development phase breakdown with milestones
- `AGENTS.md` - Obsidian plugin development guidelines
- `manifest.json` - Plugin metadata (update version here)
- `versions.json` - Version → minAppVersion mapping
- `scripts/create-release.sh` - Automated release script
