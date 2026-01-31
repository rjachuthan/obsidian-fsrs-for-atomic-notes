---
name: obsidian-plugin-creator
description: Guide for creating and developing Obsidian plugins with TypeScript. Use when the user wants to (1) create a new Obsidian plugin, (2) add features to an existing plugin, (3) work with Obsidian's TypeScript API including UI components, editor extensions, commands, views, or settings, (4) integrate React or Svelte into a plugin, (5) optimize plugin performance, (6) handle mobile compatibility, or (7) prepare a plugin for release and submission to the community plugins directory.
---

# Obsidian Plugin Creator

Create and develop Obsidian plugins using TypeScript and the Obsidian API.

## Project Overview

- **Target**: Obsidian Community Plugin (TypeScript → bundled JavaScript)
- **Entry point**: `main.ts` compiled to `main.js` and loaded by Obsidian
- **Required release artifacts**: `main.js`, `manifest.json`, and optional `styles.css`
- **Package manager**: npm (required for sample plugin)
- **Bundler**: esbuild (required for sample plugin - alternatives like Rollup or webpack acceptable if they bundle all external dependencies into `main.js`)
- **Node.js**: Use current LTS (Node 18+ recommended)

## Critical Coding Principles

**IMPORTANT: Keep `main.ts` minimal and focused**
- `main.ts` should ONLY handle plugin lifecycle (onload, onunload, registering commands)
- Delegate ALL feature logic to separate modules
- If `main.ts` exceeds ~50-100 lines, you're doing it wrong

**File organization rules:**
- **Split large files**: If any file exceeds ~200-300 lines, break it into smaller, focused modules
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility
- **Organize code into folders**: Group related functionality (commands/, ui/, utils/)

## Recommended File Structure

```
src/
  main.ts           # Plugin entry point (lifecycle ONLY, keep minimal)
  settings.ts       # Settings interface and defaults
  commands/         # Command implementations
    index.ts        # Command registration
    command1.ts     # Individual command logic
    command2.ts
  ui/              # UI components, modals, views
    modal.ts
    view.ts
  utils/           # Utility functions, helpers
    helpers.ts
    constants.ts
  types.ts         # TypeScript interfaces and types
```

## Core Development Workflow

1. **Organize code properly**: Keep `main.ts` minimal, split functionality across separate modules
2. **Build**:
   - Development watch: `npm run dev`
   - Production build: `npm run build`
3. **Reload plugin** in Obsidian (cannot be done through code editor):
   - Use Command Palette → "Reload app without saving"
   - Or toggle plugin off/on in Settings → Community plugins
   - Or install [Hot-Reload plugin](https://github.com/pjeby/hot-reload) for automatic reloading

## Common Tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```typescript
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```typescript
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```typescript
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```typescript
this.addCommand({
  id: "your-command-id",  // Use stable IDs - don't rename once released
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```typescript
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  // Make changes to settings...
  await this.saveData(this.settings);
}
```

### Register listeners safely

```typescript
// Always use register* helpers for proper cleanup
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Common Plugin Capabilities

### Adding UI Elements

```typescript
// Ribbon icon
this.addRibbonIcon("dice", "Click me", () => {
  new Notice("Hello!");
});

// Command
this.addCommand({
  id: "my-command",
  name: "My Command",
  callback: () => {
    new Notice("Command executed!");
  },
});

// Status bar item
const statusBar = this.addStatusBarItem();
statusBar.setText("Status");

// Settings tab
this.addSettingTab(new MySettingTab(this.app, this));
```

For comprehensive UI patterns, see:

- Commands: [ui/commands.md](references/ui/commands.md)
- Modals: [ui/modals.md](references/ui/modals.md)
- Views: [ui/views.md](references/ui/views.md)
- Settings: [ui/settings.md](references/ui/settings.md)
- Icons: [ui/icons.md](references/ui/icons.md)

### Working with Files

```typescript
// Read file
const file = this.app.vault.getAbstractFileByPath("note.md");
if (file instanceof TFile) {
  const content = await this.app.vault.read(file);
}

// Create file
await this.app.vault.create("new-note.md", "Content");

// Modify file
await this.app.vault.modify(file, "New content");
```

For detailed vault operations, see [data/vault-operations.md](references/data/vault-operations.md).

### Editor Extensions

For advanced editor features, see:

- Editor basics: [editor/editor-basics.md](references/editor/editor-basics.md)
- Decorations: [editor/decorations.md](references/editor/decorations.md)
- State management: [editor/state-management.md](references/editor/state-management.md)
- View plugins: [editor/view-plugins.md](references/editor/view-plugins.md)

### Events

```typescript
// Register event listener
this.registerEvent(
  this.app.vault.on("modify", (file) => {
    console.log("File modified:", file.path);
  }),
);
```

## Security, Privacy, and Compliance

Follow Obsidian's Developer Policies and Plugin Guidelines:

- **Default to local/offline operation**: Only make network requests when essential to the feature
- **No hidden telemetry**: If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings
- **Never execute remote code**: Don't fetch and eval scripts, or auto-update plugin code outside of normal releases
- **Minimize scope**: Read/write only what's necessary inside the vault. Do not access files outside the vault
- **Clearly disclose external services**: Document any data sent and risks
- **Respect user privacy**: Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented
- **Avoid deceptive patterns**: No ads or spammy notifications
- **Clean up properly**: Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely

## Performance Best Practices

- **Keep startup light**: Defer heavy work until needed
- **Avoid long-running tasks during `onload`**: Use lazy initialization
- **Batch disk access**: Avoid excessive vault scans
- **Debounce/throttle expensive operations**: Especially in response to file system events
- **Be mindful of memory**: Especially on mobile devices

## UX & Copy Guidelines

For UI text, commands, and settings:

- **Use sentence case** for headings, buttons, and titles
- **Use clear, action-oriented imperatives** in step-by-step copy
- **Use bold to indicate literal UI labels**: Prefer "select" for interactions
- **Use arrow notation for navigation**: Settings → Community plugins
- **Keep in-app strings short, consistent, and free of jargon**

## Mobile Compatibility

- **Test on iOS and Android** where feasible
- **Set `isDesktopOnly` accordingly** if using desktop-only APIs
- **Avoid Node/Electron APIs** if you want mobile compatibility
- **Be mindful of memory and storage constraints**
- **Don't assume desktop-only behavior** unless `isDesktopOnly` is `true`

## Manifest Rules (`manifest.json`)

Must include:
- `id` (plugin ID; for local dev it should match the folder name)
- `name`
- `version` (Semantic Versioning `x.y.z`)
- `minAppVersion`
- `description`
- `isDesktopOnly` (boolean)
- Optional: `author`, `authorUrl`, `fundingUrl` (string or map)

**Important rules:**
- **Never change `id` after release** - treat it as stable API
- Keep `minAppVersion` accurate when using newer APIs
- Canonical requirements: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Versioning & Releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version` (no leading `v`)
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets
- After initial release, follow the process to add/update your plugin in the community catalog

## Quick Start Setup

For new plugins:

1. Clone the sample plugin template:

```bash
cd path/to/vault/.obsidian/plugins
git clone https://github.com/obsidianmd/obsidian-sample-plugin.git your-plugin-name
cd your-plugin-name
npm install
```

2. Update `manifest.json` with your plugin's `id`, `name`, and `description`

3. Start development server:

```bash
npm run dev
```

4. Enable the plugin in Obsidian (Settings → Community plugins → Turn on community plugins → Enable your plugin)

**Important:** Always use a separate development vault, never your main vault.

## Testing & Linting

### Manual Testing

To manually test your plugin:

1. Copy `main.js`, `manifest.json`, and `styles.css` (if any) to:
   ```
   <Vault>/.obsidian/plugins/<plugin-id>/
   ```
2. Reload Obsidian and enable the plugin in Settings → Community plugins

### Linting

To use eslint for code quality:

```bash
# Install eslint globally
npm install -g eslint

# Analyze a single file
eslint main.ts

# Analyze all files in a folder
eslint ./src/
```

eslint will create a report with suggestions for code improvement by file and line number.

## Reference Documentation

Load these references as needed for detailed information:

### Getting Started

- [First plugin setup](references/development/first-plugin.md) - Prerequisites, setup, customization
- [Development workflow](references/development/development-workflow.md) - Plugin reloading, hot-reload
- [Plugin anatomy](references/development/plugin-anatomy.md) - Plugin class, lifecycle, console debugging
- [Mobile development](references/development/mobile-development.md) - Emulation, debugging, platform detection
- [Performance optimization](references/development/performance-optimization.md) - Production builds, onload optimization

### User Interface

- [Commands](references/ui/commands.md) - Basic, conditional, editor commands, hot keys
- [Modals](references/ui/modals.md) - Basic, input, suggest, fuzzy suggest modals
- [Views](references/ui/views.md) - Creating, registering, accessing views
- [Settings](references/ui/settings.md) - Setup, interface, defaults, all setting types
- [Workspace](references/ui/workspace.md) - Structure, leaves, splits, linked views
- [HTML elements](references/ui/html-elements.md) - Creating elements, CSS styling
- [Icons](references/ui/icons.md) - Built-in icons, custom icons, design guidelines
- [Context menus](references/ui/context-menus.md) - Menu creation, file/editor menus
- [Ribbon and status bar](references/ui/ribbon-statusbar.md) - Ribbon actions, status bar items
- [RTL support](references/ui/rtl-support.md) - RTL interface, content direction, CSS

### Editor

- [Editor basics](references/editor/editor-basics.md) - Editor class, accessing, text manipulation
- [Editor extensions](references/editor/editor-extensions.md) - What they are, when to use, registration
- [State management](references/editor/state-management.md) - Immutable state, transactions, dispatching
- [State fields](references/editor/state-fields.md) - Overview, effects, defining, dispatching
- [View plugins](references/editor/view-plugins.md) - Creating, lifecycle
- [Viewport](references/editor/viewport.md) - Understanding, recomputation
- [Decorations](references/editor/decorations.md) - Types, providing, state fields vs view plugins, widgets
- [Editor communication](references/editor/editor-communication.md) - Accessing CodeMirror, view plugin instances
- [Markdown post-processing](references/editor/markdown-post-processing.md) - Post processors, code block processors

### Data & Storage

- [Events](references/data/events.md) - Subscribing, intervals, dates/time
- [Vault operations](references/data/vault-operations.md) - Listing, reading, writing, modifying, deleting
- [Database views](references/data/database-views.md) - Overview, creating, configuration, rendering
- [Deferred views](references/data/deferred-views.md) - Understanding, checking instances, revealing
- [Storing secrets](references/data/storing-secrets.md) - SecretStorage API, SecretComponent, retrieval

### Framework Integration

- [React integration](references/frameworks/react-integration.md) - React setup, components, context, hooks
- [Svelte integration](references/frameworks/svelte-integration.md) - Svelte setup, components, mounting

### Advanced

- [Pop-out windows](references/advanced/pop-out-windows.md) - Window globals, cross-window APIs

### Releasing Your Plugin

- [Plugin guidelines](references/release/plugin-guidelines.md) - Policies, UI guidelines, code guidelines
- [Submission requirements](references/release/submission-requirements.md) - fundingUrl, minAppVersion, descriptions, IDs
- [Beta testing](references/release/beta-testing.md) - BRAT usage
- [GitHub Actions](references/release/github-actions.md) - Setup, creating releases
- [Submission process](references/release/submission-process.md) - Prerequisites, files, repository, review

## Agent Guidelines

**DO:**
- Keep `main.ts` minimal and focused on lifecycle only
- Split large files into smaller, focused modules (200-300 lines max per file)
- Organize code into folders (commands/, ui/, utils/)
- Add commands with stable IDs (don't rename once released)
- Provide defaults and validation in settings
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals
- Use `this.register*` helpers for everything that needs cleanup
- Use TypeScript with `"strict": true`
- Prefer `async/await` over promise chains
- Handle errors gracefully
- Bundle everything into `main.js` (no unbundled runtime deps)

**DON'T:**
- Put feature logic in `main.ts` - delegate to separate modules
- Create files with hundreds of lines - split them up
- Introduce network calls without obvious user-facing reason and documentation
- Ship features that require cloud services without clear disclosure and explicit opt-in
- Store or transmit vault contents unless essential and consented
- Commit build artifacts (`node_modules/`, `main.js`, generated files) to version control
- Use large dependencies - prefer browser-compatible packages
- Assume desktop-only behavior unless `isDesktopOnly` is `true`

## Troubleshooting

- **Plugin doesn't load after build**: Ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`
- **Build issues**: If `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code
- **Commands not appearing**: Verify `addCommand` runs after `onload` and IDs are unique
- **Settings not persisting**: Ensure `loadData`/`saveData` are awaited and you re-render the UI after changes
- **Mobile-only issues**: Confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust

## External Resources

- [Official API Documentation](https://docs.obsidian.md/Reference/TypeScript+API/)
- [Sample Plugin Repository](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Developer Policies](https://docs.obsidian.md/Developer+policies)
- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Style Guide](https://help.obsidian.md/style-guide)
- [Community Forum](https://forum.obsidian.md/)
