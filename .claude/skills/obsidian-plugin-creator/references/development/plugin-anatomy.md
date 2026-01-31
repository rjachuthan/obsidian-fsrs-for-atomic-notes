# Plugin Anatomy

The [Plugin](https://docs.obsidian.md/Reference/TypeScript+API/Plugin) class defines the lifecycle of a plugin and exposes the operations available to all plugins:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    // Configure resources needed by the plugin.
  }
  async onunload() {
    // Release any resources configured by the plugin.
  }
}
```

## Lifecycle Methods

- **`onload()`** - Runs whenever the user starts using the plugin in Obsidian. This is where you'll configure most of the plugin's capabilities.
- **`onunload()`** - Runs when the plugin is disabled. Any resources that your plugin is using must be released here to avoid affecting Obsidian's performance after the plugin has been disabled.

## Console Debugging

To view the console:

1. Toggle the Developer Tools by pressing Ctrl+Shift+I (Windows/Linux) or Cmd-Option-I (macOS)
2. Click on the Console tab in the Developer Tools window

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    console.log("loading plugin");
  }
  async onunload() {
    console.log("unloading plugin");
  }
}
```
