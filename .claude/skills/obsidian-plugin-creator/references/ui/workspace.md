# Workspace

The workspace is the configuration of visible content within the application window, implemented as a tree data structure.

## Workspace Structure

The workspace consists of:

- **Workspace items** - Nodes in the tree
- **Parent items** - Can contain children (splits and tabs)
- **Leaf items** - Cannot contain children

### Parent Types

**Splits** - Lay out children vertically or horizontally
**Tabs** - Display one child at a time, hiding others

The workspace has three special split items:

- **Left split** - Left sidebar
- **Right split** - Right sidebar
- **Root split** - Main content area

### Leaf Types

A leaf is a window that displays content. The leaf type determines how content is displayed and corresponds to a specific view (e.g., `graph` for the graph view).

## Working with Leaves

Access the workspace through the `App` object:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Print leaf types", () => {
      this.app.workspace.iterateAllLeaves((leaf) => {
        console.log(leaf.getViewState().type);
      });
    });
  }
}
```

## Adding and Removing Leaves

### Adding Leaves

- **Root split:** `getLeaf(true)`
- **Left sidebar:** `getLeftLeaf()`
- **Right sidebar:** `getRightLeaf()`
- **Specific split:** `createLeafInParent()`

**Important:** Leaves persist even after the plugin is disabled unless explicitly removed. Plugins are responsible for cleanup.

### Removing Leaves

Remove a specific leaf:

```typescript
leaf.detach();
```

Remove all leaves of a certain type:

```typescript
this.app.workspace.detachLeavesOfType(VIEW_TYPE);
```

## Linked Views

Create linked views by assigning leaves to the same group:

```typescript
leaves.forEach((leaf) => leaf.setGroup("group1"));
```
