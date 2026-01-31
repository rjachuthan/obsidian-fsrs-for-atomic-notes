# Viewport

## Understanding the Viewport

The Obsidian editor supports [huge documents](https://codemirror.net/examples/million/) with millions of lines. This is possible because the editor only renders what's visible (plus a bit more).

The _viewport_ is a "window" that moves across the document, rendering only the content within the window and ignoring what's outside.

**Reference**: [CodeMirror 6 Viewport](https://codemirror.net/docs/guide/#viewport)

## Viewport Recomputation

The viewport becomes out-of-date and needs recomputation when:

- The user scrolls through the document
- The document itself changes

**To build extensions that depend on the viewport**: See [View plugins](#view-plugins)
