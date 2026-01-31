# Context Menus

Create context menus using the `Menu` class.

## Creating Menus

```typescript
import { Menu, Notice, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Open menu", (event) => {
      const menu = new Menu();

      menu.addItem((item) =>
        item
          .setTitle("Copy")
          .setIcon("documents")
          .onClick(() => {
            new Notice("Copied");
          }),
      );

      menu.addItem((item) =>
        item
          .setTitle("Paste")
          .setIcon("paste")
          .onClick(() => {
            new Notice("Pasted");
          }),
      );

      menu.showAtMouseEvent(event);
    });
  }
}
```

`showAtMouseEvent()` opens the menu at the mouse cursor position.

**Tip:** Use `menu.showAtPosition({ x: 20, y: 20 })` for precise positioning relative to the window's top-left corner.

## File and Editor Menus

Add items to existing menus by subscribing to workspace events:

```typescript
import { Notice, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle("Print file path 👈")
            .setIcon("document")
            .onClick(async () => {
              new Notice(file.path);
            });
        });
      }),
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        menu.addItem((item) => {
          item
            .setTitle("Print file path 👈")
            .setIcon("document")
            .onClick(async () => {
              new Notice(view.file.path);
            });
        });
      }),
    );
  }
}
```
