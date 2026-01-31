# Communicating with Editor Extensions

Once you've built an editor extension, you may want to communicate with it from outside the editor (e.g., through a command or ribbon action).

## Accessing CodeMirror from Obsidian

You can access the CodeMirror 6 editor from a `MarkdownView`. Since the Obsidian API doesn't expose the editor type, use `@ts-expect-error` to tell TypeScript to trust it's there:

```typescript
import { EditorView } from "@codemirror/view";

// @ts-expect-error, not typed
const editorView = view.editor.cm as EditorView;
```

## Accessing View Plugin Instances

Access the view plugin instance from the `EditorView.plugin()` method:

```typescript
this.addCommand({
  id: "example-editor-command",
  name: "Example editor command",
  editorCallback: (editor, view) => {
    // @ts-expect-error, not typed
    const editorView = view.editor.cm as EditorView;

    const plugin = editorView.plugin(examplePlugin);

    if (plugin) {
      plugin.addPointerToSelection(editorView);
    }
  },
});
```

## Dispatching Effects from Commands

You can dispatch changes and state effects directly on the editor view:

```typescript
this.addCommand({
  id: "example-editor-command",
  name: "Example editor command",
  editorCallback: (editor, view) => {
    // @ts-expect-error, not typed
    const editorView = view.editor.cm as EditorView;

    editorView.dispatch({
      effects: [
        // ...
      ],
    });
  },
});
```
