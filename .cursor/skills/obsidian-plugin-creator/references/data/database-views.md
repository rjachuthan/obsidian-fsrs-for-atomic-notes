# Building Bases Views

## Bases Overview

Bases is a core plugin in Obsidian which displays dynamic views of your notes as tables, cards, lists, and more. Plugins can use the Obsidian API to create completely custom views of the data powering Bases.

**Prerequisites:**

- Git installed on your local machine
- A local development environment for Node.js
- A code editor, such as Visual Studio Code

**Warning:** When developing plugins, one mistake can lead to unintended changes to your vault. To prevent data loss, never develop plugins in your main vault. Always use a separate vault dedicated to plugin development.

## Creating a Basic View

Start with a view that statically displays "Hello World":

```typescript
export const ExampleViewType = "example-view";

export default class MyPlugin extends Plugin {
  async onload() {
    // Tell Obsidian about the new view type that this plugin provides.
    this.registerBasesView(ExampleViewType, {
      name: "Example",
      icon: "lucide-graduation-cap",
      factory: (controller, containerEl) => {
        new MyBasesView(controller, containerEl);
      },
    });
  }
}

export class MyBasesView extends BasesView {
  readonly type = ExampleViewType;
  private containerEl: HTMLElement;

  constructor(controller: QueryController, parentEl: HTMLElement) {
    super(controller);
    this.containerEl = parentEl.createDiv("bases-example-view-container");
  }

  // onDataUpdated is called by Obsidian whenever there is a configuration
  // or data change in the vault which may affect your view. For now,
  // simply draw "Hello World" to screen.
  public onDataUpdated(): void {
    this.containerEl.empty();
    this.containerEl.createDiv({ text: "Hello World" });
  }
}
```

Build your plugin, reload the app, and create a new Base file. Use the menu on the left of the toolbar, and select the right chevron next to the view in the list. From this menu, change the layout to your newly created "Example" view type.

## Adding Configuration Options

The menu where you changed the view layout can also contain additional configuration options for your view. Add an `options` property in the call to `registerBasesView`.

You can view the definition of `ViewOption` in your IDE to see the different controls available. Each control will create an entry in the view configuration menu, and user input will automatically be stored in the Bases configuration file.

```typescript
export default class MyPlugin extends Plugin {
  async onload() {
    // Tell Obsidian about the new view type that this plugin provides.
    this.registerBasesView(ExampleViewType, {
      name: "Example",
      icon: "lucide-graduation-cap",
      factory: (controller, containerEl) => {
        new MyBasesView(controller, containerEl);
      },
      options: () => [
        {
          // The type of option. 'text' is a text input.
          type: "text",
          // The name displayed in the settings menu.
          displayName: "Property separator",
          // The value saved to the view settings.
          key: "separator",
          // The default value for this option.
          default: " - ",
        },
        // ...
      ],
    });
  }
}
```

## Rendering Data

The final step in creating a new Bases view is to transform the data from properties into the format you want to display. Obsidian will call the `onDataUpdated` method on your view whenever there are changes to the data.

To keep this example simple, the code below clears the container and rerenders a list entry for every file provided in the dataset. However, it's important to keep in mind the best practices of web development. An unfiltered Base will provide an entry for every file in the vault, so your view should be able to handle thousands of entries, reuse DOM elements, and avoid rendering off screen where appropriate.

```typescript
// Add `implements HoverParent` to enable hovering over file links.
export class MyBasesView extends BasesView implements HoverParent {
  hoverPopover: HoverPopover | null;

  // ...

  public onDataUpdated(): void {
    const { app } = this;

    // Retrieve the user configured order set in the Properties menu.
    const order = this.config.getOrder();

    // Clear entries created by previous iterations. Remember, you should
    // instead attempt element reuse when possible.
    this.containerEl.empty();

    // The property separator configured by the ViewOptions above can be
    // retrieved from the view config. Be sure to set a default value.
    const propertySeparator = String(this.config.get("separator")) || " - ";

    // this.data contains both grouped and ungrouped versions of the data.
    // If it's appropriate for your view type, use the grouped form.
    for (const group of this.data.groupedData) {
      const groupEl = this.containerEl.createDiv("bases-list-group");
      const groupListEl = groupEl.createEl("ul", "bases-list-group-list");

      // Each entry in the group is a separate file in the vault matching
      // the Base filters. For list view, each entry is a separate line.
      for (const entry of group.entries) {
        groupListEl.createEl("li", "bases-list-entry", (el) => {
          let firstProp = true;
          for (const propertyName of order) {
            // Properties in the order can be parsed to determine what type
            // they are: formula, note, or file.
            const { type, name } = parsePropertyId(propertyName);

            // `entry.getValue` returns the evaluated result of the property
            // in the context of this entry.
            const value = entry.getValue(propertyName);

            // Skip rendering properties which have an empty value.
            // The list items for each file may have differing length.
            if (value.isEmpty()) continue;

            if (!firstProp) {
              el.createSpan({
                cls: "bases-list-separator",
                text: propertySeparator,
              });
            }
            firstProp = false;

            // If the `file.name` property is included in the order, render
            // it specially so that it links to that file.
            if (name === "name" && type === "file") {
              const fileName = String(entry.file.name);
              const linkEl = el.createEl("a", { text: fileName });
              linkEl.onClickEvent((evt) => {
                if (evt.button !== 0 && evt.button !== 1) return;
                evt.preventDefault();
                const path = entry.file.path;
                const modEvent = Keymap.isModEvent(evt);
                void app.workspace.openLinkText(path, "", modEvent);
              });

              linkEl.addEventListener("mouseover", (evt) => {
                app.workspace.trigger("hover-link", {
                  event: evt,
                  source: "bases",
                  hoverParent: this,
                  targetEl: linkEl,
                  linktext: entry.file.path,
                });
              });
            }
            // For all other properties, just display the value as text.
            // In your view you may also choose to use the `Value.renderTo`
            // API to better support photos, links, icons, etc.
            else {
              el.createSpan({
                cls: "bases-list-entry-property",
                text: value.toString(),
              });
            }
          }
        });
      }
    }
  }
}
```

Rebuild your plugin and reload the app. Your Base should now display a list item for every file in the vault!

**Additional Resources:**

- [BasesView](https://docs.obsidian.md/Reference/TypeScript+API/BasesView)
- [BasesViewConfig](https://docs.obsidian.md/Reference/TypeScript+API/BasesViewConfig)
- [BasesEntryGroup](https://docs.obsidian.md/Reference/TypeScript+API/BasesEntryGroup)
