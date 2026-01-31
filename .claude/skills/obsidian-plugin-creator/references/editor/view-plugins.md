# View Plugins

## Overview

A view plugin is an editor extension that gives you access to the editor [Viewport](#viewport).

**Prerequisites**: Basic understanding of the [Viewport](#viewport)

**Reference**: [CodeMirror 6 Affecting the View](https://codemirror.net/docs/guide/#affecting-the-view)

**Important**: View plugins run _after_ the viewport has been recomputed. They can access the viewport but can't make changes that impact it (like inserting blocks or line breaks).

**Tip**: To make changes that impact vertical layout (blocks, line breaks), use a [state field](#state-fields).

## Creating View Plugins

Create a class implementing `PluginValue` and pass it to `ViewPlugin.fromClass()`:

```typescript
import {
  ViewUpdate,
  PluginValue,
  EditorView,
  ViewPlugin,
} from "@codemirror/view";

class ExamplePlugin implements PluginValue {
  constructor(view: EditorView) {
    // ...
  }

  update(update: ViewUpdate) {
    // ...
  }

  destroy() {
    // ...
  }
}

export const examplePlugin = ViewPlugin.fromClass(ExamplePlugin);
```

## Plugin Lifecycle

The three methods control the plugin lifecycle:

- `constructor()` - Initializes the plugin
- `update()` - Updates when something changes (user input, selection, etc.)
- `destroy()` - Cleans up after the plugin

**Debugging Updates:**

To understand what causes updates, add logging to the `update()` method:

```typescript
update(update: ViewUpdate) {
  console.log(update);
}
```

**Providing Decorations:**

View plugins can provide [Decorations](#decorations) to change how the document displays.
