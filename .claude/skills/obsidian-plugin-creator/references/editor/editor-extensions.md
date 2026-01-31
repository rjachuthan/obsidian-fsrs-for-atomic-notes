# Editor Extensions

## What are Editor Extensions

Obsidian uses CodeMirror 6 (CM6) to power the Markdown editor. CM6 has its own plugin system called _extensions_. An Obsidian _editor extension_ is equivalent to a _CodeMirror 6 extension_.

At its core, CM6 has a minimal feature set. Features you'd expect from a modern editor are available as extensions that you can pick and choose. While Obsidian includes many extensions out-of-the-box, you can register your own.

**Note**: The API for building editor extensions is unconventional and requires understanding its architecture. For detailed information, refer to the [CodeMirror 6 documentation](https://codemirror.net/docs/).

## When to Use Editor Extensions

Consider whether you really need an editor extension:

- **For Reading view Markdown to HTML conversion**: Use a [Markdown post processor](#markdown-post-processing)
- **For changing Live Preview appearance**: Build an editor extension

## Registering Extensions

Register editor extensions in your plugin's `onload` method:

```typescript
onload() {
  this.registerEditorExtension([examplePlugin, exampleField]);
}
```

CM6 supports several extension types. The most common are:

- [View plugins](#view-plugins)
- [State fields](#state-fields)
