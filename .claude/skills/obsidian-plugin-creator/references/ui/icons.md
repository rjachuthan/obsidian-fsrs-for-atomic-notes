# Icons

Choose from built-in icons or add custom ones.

## Using Built-in Icons

Browse available icons at [lucide.dev](https://lucide.dev/) (icons up to v0.446.0 are supported).

Use `setIcon()` to add icons to HTML elements:

```typescript
import { Plugin, setIcon } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    const item = this.addStatusBarItem();
    setIcon(item, "info");
  }
}
```

Change icon size with the `--icon-size` CSS variable:

```css
div {
  --icon-size: var(--icon-size-m);
}
```

## Custom Icons

Add custom icons with `addIcon()`:

```typescript
import { addIcon, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    addIcon("circle", `<circle cx="50" cy="50" r="50" fill="currentColor" />`);

    this.addRibbonIcon("circle", "Click me", () => {
      console.log("Hello, you!");
    });
  }
}
```

`addIcon` parameters:

1. **Name** - Unique identifier for the icon
2. **SVG content** - Without the surrounding `<svg>` tag

**Note:** Icons must fit within a `0 0 100 100` view box.

## Icon Design Guidelines

Follow [Lucide's guidelines](https://lucide.dev/guide/design/icon-design-guide):

- Design on a 24×24 pixel canvas
- Include at least 1 pixel padding
- Use 2-pixel stroke width
- Use round joins and caps
- Use centered strokes
- Apply 2-pixel border radius to shapes
- Maintain 2-pixel spacing between elements

Lucide provides [templates and guides](https://github.com/lucide-icons/lucide/blob/main/CONTRIBUTING.md) for Illustrator, Figma, and Inkscape.
