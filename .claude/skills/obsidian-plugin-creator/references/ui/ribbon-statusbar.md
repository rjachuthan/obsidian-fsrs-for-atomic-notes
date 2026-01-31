# Ribbon Actions and Status Bar

## Ribbon Actions

The ribbon is the left sidebar that hosts plugin actions.

Add an action to the ribbon:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Print to console", () => {
      console.log("Hello, you!");
    });
  }
}
```

**Note:** Users can remove ribbon icons or hide the ribbon entirely. Provide alternate access methods like commands. Don't add custom toggles for ribbon items.

## Status Bar

Create status bar items at the bottom of the application.

**Note:** Custom status bar items are **not** supported on Obsidian mobile.

Add a status bar item:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    const item = this.addStatusBarItem();
    item.createEl("span", { text: "Hello from the status bar 👋" });
  }
}
```

Add multiple items:

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    const fruits = this.addStatusBarItem();
    fruits.createEl("span", { text: "🍎" });
    fruits.createEl("span", { text: "🍌" });

    const veggies = this.addStatusBarItem();
    veggies.createEl("span", { text: "🥦" });
    veggies.createEl("span", { text: "🥬" });
  }
}
```

Obsidian adds gaps between status bar items by default. Group elements within one item for custom spacing control.
