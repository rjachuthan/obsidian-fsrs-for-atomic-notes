# Commands

Commands are actions that users can invoke from the Command Palette or via keyboard shortcuts.

## Basic Commands

Register commands in your plugin's `onload()` method using `addCommand()`:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "print-greeting-to-console",
      name: "Print greeting to console",
      callback: () => {
        console.log("Hey, you!");
      },
    });
  }
}
```

## Conditional Commands

Use `checkCallback()` for commands that only run under certain conditions. The callback runs twice:

1. First with `checking: true` - to determine if the command can run
2. Second with `checking: false` - to perform the action

```typescript
this.addCommand({
  id: "example-command",
  name: "Example command",
  checkCallback: (checking: boolean) => {
    const value = getRequiredValue();

    if (value) {
      if (!checking) {
        doCommand(value);
      }
      return true;
    }

    return false;
  },
});
```

## Editor Commands

Use `editorCallback()` for commands that need access to the active editor:

```typescript
this.addCommand({
  id: "example-command",
  name: "Example command",
  editorCallback: (editor: Editor, view: MarkdownView) => {
    const sel = editor.getSelection();
    console.log(`You have selected: ${sel}`);
  },
});
```

**Note:** Editor commands only appear in the Command Palette when an active editor is available.

For conditional editor commands, use `editorCheckCallback()`:

```typescript
this.addCommand({
  id: "example-command",
  name: "Example command",
  editorCheckCallback: (
    checking: boolean,
    editor: Editor,
    view: MarkdownView,
  ) => {
    const value = getRequiredValue();

    if (value) {
      if (!checking) {
        doCommand(value);
      }
      return true;
    }

    return false;
  },
});
```

## Hot Keys

You can provide default keyboard shortcuts for commands:

```typescript
this.addCommand({
  id: "example-command",
  name: "Example command",
  hotkeys: [{ modifiers: ["Mod", "Shift"], key: "a" }],
  callback: () => {
    console.log("Hey, you!");
  },
});
```

**Warning:** Avoid setting default hot keys for public plugins as they're likely to conflict with other plugins or user configurations.

**Note:** The `Mod` key is a special modifier that becomes `Ctrl` on Windows/Linux and `Cmd` on macOS.
