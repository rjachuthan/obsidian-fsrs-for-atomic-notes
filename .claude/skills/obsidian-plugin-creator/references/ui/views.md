# Views

Views determine how Obsidian displays content. You can create custom views for specialized content display.

## Creating Custom Views

Create a class that extends `ItemView`:

```typescript
import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.createEl("h4", { text: "Example view" });
  }

  async onClose() {
    // Nothing to clean up.
  }
}
```

Key methods:

- `getViewType()` - Returns a unique identifier for the view
- `getDisplayText()` - Returns a human-readable name
- `onOpen()` - Called when the view opens; builds the content
- `onClose()` - Called when closing; cleans up resources

## Registering Views

Register views when the plugin loads and activate them as needed:

```typescript
import { Plugin, WorkspaceLeaf } from "obsidian";
import { ExampleView, VIEW_TYPE_EXAMPLE } from "./view";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ExampleView(leaf));

    this.addRibbonIcon("dice", "Activate view", () => {
      this.activateView();
    });
  }

  async onunload() {}

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    workspace.revealLeaf(leaf);
  }
}
```

## Accessing View Instances

**Warning:** Never manage references to views in your plugin. Obsidian may call the view factory function multiple times. Use `getLeavesOfType()` to access view instances:

```typescript
this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE).forEach((leaf) => {
  if (leaf.view instanceof ExampleView) {
    // Access your view instance.
  }
});
```
