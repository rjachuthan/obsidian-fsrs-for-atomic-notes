# HTML Elements

Several components expose container elements (HTMLElement objects) for creating custom interfaces.

## Creating Elements

Access container elements:

```typescript
import { App, PluginSettingTab } from "obsidian";

class ExampleSettingTab extends PluginSettingTab {
  plugin: ExamplePlugin;

  constructor(app: App, plugin: ExamplePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    // ...
  }
}
```

Use `createEl()` to create elements:

```typescript
containerEl.createEl("h1", { text: "Heading 1" });
```

Create nested elements:

```typescript
const book = containerEl.createEl("div");
book.createEl("div", { text: "How to Take Smart Notes" });
book.createEl("small", { text: "Sönke Ahrens" });
```

## CSS Styling

Add a `styles.css` file in your plugin root directory:

```css
.book {
  border: 1px solid var(--background-modifier-border);
  padding: 10px;
}

.book__title {
  font-weight: 600;
}

.book__author {
  color: var(--text-muted);
}
```

**Tip:** Use CSS variables like `--background-modifier-border` and `--text-muted` for theme compatibility.

Apply styles with the `cls` property:

```typescript
const book = containerEl.createEl("div", { cls: "book" });
book.createEl("div", { text: "How to Take Smart Notes", cls: "book__title" });
book.createEl("small", { text: "Sönke Ahrens", cls: "book__author" });
```

Toggle classes dynamically:

```typescript
element.toggleClass("danger", status === "error");
```
