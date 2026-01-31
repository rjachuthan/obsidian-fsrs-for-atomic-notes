# Editor Basics

## Editor Class

The `Editor` class exposes operations for reading and manipulating an active Markdown document in edit mode. It serves as an abstraction layer between CodeMirror 6 and CodeMirror 5 (legacy editor), ensuring plugins work across both platforms.

**Note**: Obsidian uses CodeMirror as the underlying text editor. The `Editor` class bridges features between CM6 and CM5. By using `Editor` instead of directly accessing the CodeMirror instance, you ensure cross-platform compatibility.

## Accessing the Editor

**In Commands:**

Use the `editorCallback` for editor commands:

```typescript
this.addCommand({
  id: "example-command",
  name: "Example Command",
  editorCallback: (editor: Editor) => {
    // Access editor here
  },
});
```

**From Active View:**

```typescript
const view = this.app.workspace.getActiveViewOfType(MarkdownView);

// Make sure the user is editing a Markdown file.
if (view) {
  const cursor = view.editor.getCursor();
  // ...
}
```

## Basic Text Manipulation

**Inserting Text at Cursor:**

The `replaceRange()` method replaces text between two cursor positions. With one position, it inserts text at that location.

```typescript
import { Editor, moment, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "insert-todays-date",
      name: "Insert today's date",
      editorCallback: (editor: Editor) => {
        editor.replaceRange(moment().format("YYYY-MM-DD"), editor.getCursor());
      },
    });
  }
}
```

**Modifying Selected Text:**

Use `replaceSelection()` to replace the current selection:

```typescript
import { Editor, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "convert-to-uppercase",
      name: "Convert to uppercase",
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        editor.replaceSelection(selection.toUpperCase());
      },
    });
  }
}
```
