# Decorations

Decorations control how to draw or style content in editor extensions. If you want to change the editor's look and feel by adding, replacing, or styling elements, you'll likely use decorations.

**Prerequisites**:

- Basic understanding of [State fields](#state-fields)
- Basic understanding of [View plugins](#view-plugins)

**Reference**: [CodeMirror 6 Decorating the Document](https://codemirror.net/docs/guide/#decorating-the-document)

Without decorations, documents would render as plain text. Decorations allow you to change document display, such as highlighting text or adding custom HTML elements.

## Types of Decorations

- **Mark decorations** - Style existing elements
- **Widget decorations** - Insert elements in the document
- **Replace decorations** - Hide or replace document parts with another element
- **Line decorations** - Add styling to lines rather than the document itself

## Providing Decorations

Decorations are created inside editor extensions and _provided_ to the editor. You can provide decorations in two ways:

1. **Directly** using [state fields](#state-fields)
2. **Indirectly** using [view plugins](#view-plugins)

**Choosing Between State Fields and View Plugins:**

- Use a **view plugin** if you can determine decorations based on what's in the [Viewport](#viewport)
- Use a **state field** if you need to manage decorations outside the viewport
- Use a **state field** if changes could affect viewport content (e.g., adding line breaks)

If both approaches work, view plugins generally offer better performance.

**Example Scenario: Spell Checker**

- **State field approach**: Pass entire document to external spell checker, get errors list, map to decorations regardless of viewport
- **View plugin approach**: Only spellcheck visible viewport, continuously check as user scrolls (works with millions of lines)

## Decorations with State Fields

Both implementations below replace bullet list items with emoji. They share the same core logic:

1. Use `syntaxTree` to find list items
2. For every list item, replace leading hyphens (`-`) with a widget

**Defining a Widget:**

Widgets are custom HTML elements you can add to the editor. You can insert them at a specific position or replace content.

```typescript
import { EditorView, WidgetType } from "@codemirror/view";

export class EmojiWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement("span");
    div.innerText = "👉";
    return div;
  }
}
```

**Creating a Replace Decoration:**

```typescript
const decoration = Decoration.replace({
  widget: new EmojiWidget(),
});
```

**State Field Implementation:**

1. Define a state field with `DecorationSet` type
2. Add the `provide` property to the state field

```typescript
import { syntaxTree } from "@codemirror/language";
import {
  Extension,
  RangeSetBuilder,
  StateField,
  Transaction,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { EmojiWidget } from "emoji";

export const emojiListField = StateField.define<DecorationSet>({
  create(state): DecorationSet {
    return Decoration.none;
  },
  update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    syntaxTree(transaction.state).iterate({
      enter(node) {
        if (node.type.name.startsWith("list")) {
          // Position of the '-' or the '*'.
          const listCharFrom = node.from - 2;

          builder.add(
            listCharFrom,
            listCharFrom + 1,
            Decoration.replace({
              widget: new EmojiWidget(),
            }),
          );
        }
      },
    });

    return builder.finish();
  },
  provide(field: StateField<DecorationSet>): Extension {
    return EditorView.decorations.from(field);
  },
});
```

## Decorations with View Plugins

**View Plugin Implementation:**

1. Create a view plugin
2. Add a `DecorationSet` member property
3. Initialize decorations in `constructor()`
4. Rebuild decorations in `update()`

**Note**: Not all updates require rebuilding decorations. This example only rebuilds when the document or viewport changes.

```typescript
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { EmojiWidget } from "emoji";

class EmojiListPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() {}

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    for (let { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          if (node.type.name.startsWith("list")) {
            // Position of the '-' or the '*'.
            const listCharFrom = node.from - 2;

            builder.add(
              listCharFrom,
              listCharFrom + 1,
              Decoration.replace({
                widget: new EmojiWidget(),
              }),
            );
          }
        },
      });
    }

    return builder.finish();
  }
}

const pluginSpec: PluginSpec<EmojiListPlugin> = {
  decorations: (value: EmojiListPlugin) => value.decorations,
};

export const emojiListPlugin = ViewPlugin.fromClass(
  EmojiListPlugin,
  pluginSpec,
);
```

**Key Points:**

- `buildDecorations()` is a helper method that builds a complete decoration set based on the editor view
- The second argument to `ViewPlugin.fromClass()` is the `PluginSpec`, which specifies how the view plugin provides decorations
- `view.visibleRanges` limits which parts of the syntax tree to visit, improving performance

## Widget Example

The complete emoji widget implementation:

```typescript
import { EditorView, WidgetType } from "@codemirror/view";

export class EmojiWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement("span");
    div.innerText = "👉";
    return div;
  }
}
```
