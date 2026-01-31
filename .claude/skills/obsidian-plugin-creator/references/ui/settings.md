# Settings

Settings allow users to configure your plugin.

## Basic Settings Setup

Settings persist even after Obsidian closes. Here's a complete example:

```typescript
import { Plugin } from "obsidian";
import { ExampleSettingTab } from "./settings";

interface ExamplePluginSettings {
  sampleValue: string;
}

const DEFAULT_SETTINGS: Partial<ExamplePluginSettings> = {
  sampleValue: "Lorem ipsum",
};

export default class ExamplePlugin extends Plugin {
  settings: ExamplePluginSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new ExampleSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

## Settings Interface

Define your settings structure with an interface:

```typescript
interface ExamplePluginSettings {
  sampleValue: string;
}

export default class ExamplePlugin extends Plugin {
  settings: ExamplePluginSettings;
  // ...
}
```

## Default Values

Provide default values for settings:

```typescript
const DEFAULT_SETTINGS: Partial<ExamplePluginSettings> = {
  sampleValue: "Lorem ipsum",
};
```

The `Partial<Type>` TypeScript utility makes all properties optional, enabling type checking while allowing partial defaults.

**Note on Nested Properties:** `Object.assign()` creates shallow copies. For settings with nested properties, implement deep copying to avoid unintended mutations.

## Settings Tab

Create a settings tab by extending `PluginSettingTab`:

```typescript
import ExamplePlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class ExampleSettingTab extends PluginSettingTab {
  plugin: ExamplePlugin;

  constructor(app: App, plugin: ExamplePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Default value").addText((text) =>
      text
        .setPlaceholder("Lorem ipsum")
        .setValue(this.plugin.settings.sampleValue)
        .onChange(async (value) => {
          this.plugin.settings.sampleValue = value;
          await this.plugin.saveSettings();
        }),
    );
  }
}
```

## Setting Types

### Section Headings

Organize settings into sections:

```typescript
new Setting(containerEl).setName("Defaults").setHeading();
```

**Best Practice:** General settings should be at the top without a heading. Avoid repeating "settings" in headings.

### Text Input

```typescript
new Setting(containerEl)
  .setName("Text input")
  .setDesc("Sample description")
  .addText((text) =>
    text
      .setPlaceholder("Lorem ipsum")
      .setValue(this.plugin.settings.sampleValue)
      .onChange(async (value) => {
        // ...
      }),
  );
```

### Textarea

```typescript
new Setting(containerEl).setName("Textarea").addTextArea((text) => {
  // ...
});
```

### Search with Suggestions

Use `AbstractInputSuggest` for searchable lists:

```typescript
new Setting(containerEl).setName("Search").addSearch((search) => {
  search
    .setValue(this.plugin.settings.icon)
    .setPlaceholder("Search for an icon")
    .onChange(async (value) => {
      this.plugin.settings.icon = value;
      await this.plugin.saveSettings();
    });
  new IconSuggest(this.plugin.app, search.inputEl);
});
```

### Date Format

Use `MomentFormatComponent` for date formatting (uses moment.js):

```typescript
const dateDesc = document.createDocumentFragment();
dateDesc.appendText("For a list of all available tokens, see the ");
dateDesc.createEl("a", {
  text: "format reference",
  attr: {
    href: "https://momentjs.com/docs/#/displaying/format/",
    target: "_blank",
  },
});
dateDesc.createEl("br");
dateDesc.appendText("Your current syntax looks like this: ");
const dateSampleEl = dateDesc.createEl("b", "u-pop");

new Setting(containerEl)
  .setName("Date format")
  .setDesc(dateDesc)
  .addMomentFormat((momentFormat) =>
    momentFormat
      .setValue(this.plugin.settings.dateFormat)
      .setSampleEl(dateSampleEl)
      .setDefaultFormat("MMMM dd, yyyy")
      .onChange(async (value) => {
        this.plugin.settings.dateFormat = value;
        await this.plugin.saveSettings();
      }),
  );
```

### Button

```typescript
new Setting(containerEl)
  .setName("Button")
  .setDesc("With extra button")
  .addButton((button) =>
    button.setButtonText("Click me!").onClick(() => {
      new Notice("This is a notice!");
    }),
  );
```

You can add multiple buttons to the same setting:

```typescript
new Setting(containerEl)
  .setName("Button")
  .setDesc("With extra button")
  .addButton((button) =>
    button.setButtonText("Click me!").onClick(() => {
      // ...
    }),
  )
  .addExtraButton((button) =>
    button.setIcon("gear").onClick(() => {
      // ...
    }),
  );
```

### Toggle

```typescript
new Setting(containerEl).setName("Toggle").addToggle((toggle) =>
  toggle.setValue(this.plugin.settings.localServer).onChange(async (value) => {
    this.plugin.settings.localServer = value;
    await this.plugin.saveSettings();
    this.display();
  }),
);
```

### Dropdown

```typescript
new Setting(containerEl).setName("Dropdown").addDropdown((dropdown) =>
  dropdown
    .addOption("1", "Option 1")
    .addOption("2", "Option 2")
    .addOption("3", "Option 3")
    .setValue(this.plugin.settings.mySetting)
    .onChange(async (value) => {
      this.plugin.settings.mySetting = value;
      await this.plugin.saveSettings();
    }),
);
```

### Slider

```typescript
new Setting(containerEl)
  .setName("Slider")
  .setDesc("with tooltip")
  .addSlider((slider) => slider.setDynamicTooltip());
```

### Progress Bar

```typescript
new Setting(containerEl)
  .setName("Progress bar")
  .setDesc("It's 50% done")
  .addProgressBar((bar) => bar.setValue(50));
```

### Color Picker

```typescript
new Setting(containerEl)
  .setName("Color picker")
  .addColorPicker((color) => color.setValue("#FFFFFF"));
```
