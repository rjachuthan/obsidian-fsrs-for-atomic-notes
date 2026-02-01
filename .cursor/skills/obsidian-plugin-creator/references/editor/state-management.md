# State Management

This section introduces state management for editor extensions, distilled from the [CodeMirror 6 documentation on State and Updates](https://codemirror.net/docs/guide/#state-and-updates).

## Immutable State History

In most applications, updating state by assigning a new value loses the old value forever:

```typescript
let note = "";
note = "Heading";
note = "# Heading";
note = "## Heading"; // How to undo this?
```

To support undo/redo, applications like Obsidian keep a history of all changes. To undo, you go back to a point before the change was made.

| State | Value      |
| ----- | ---------- |
| 0     |            |
| 1     | Heading    |
| 2     | # Heading  |
| 3     | ## Heading |

In TypeScript:

```typescript
const changes: ChangeSpec[] = [];

changes.push({ from: 0, insert: "Heading" });
changes.push({ from: 0, insert: "# " });
changes.push({ from: 0, insert: "#" });
```

## Transactions

A _transaction_ groups state changes that happen together. For example, surrounding selected text with quotes:

1. Insert `"` at the start of the selection
2. Insert `"` at the end of the selection

Without grouping, users would need to undo twice. With transactions, they appear as one change.

State can be considered a _history of transactions_, where each transaction may contain one or more state changes.

## Dispatching Changes

To add (dispatch) a transaction to the editor view:

```typescript
view.dispatch({
  changes: [
    { from: selectionStart, insert: `"` },
    { from: selectionEnd, insert: `"` },
  ],
});
```
