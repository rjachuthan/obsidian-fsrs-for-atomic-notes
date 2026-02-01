# Storing Secrets

## Why Use SecretStorage

SecretStorage provides a secure way to store and manage sensitive data like API keys and tokens in Obsidian plugins. Instead of storing secrets directly in your plugin's `data.json` file, SecretStorage offers a centralized key-value store that allows users to share secrets across multiple plugins.

When plugins store secrets directly in `data.json`, several problems arise:

- **Security:** Secrets are stored in plaintext alongside other plugin data.
- **Duplication:** Users must copy the same API key into every plugin that needs it.
- **Maintenance:** If a token changes, users must update every plugin manually.

SecretStorage addresses these issues by providing a central store for secrets. Users save each secret with a name, and any plugin can reference it by that name.

**Prerequisites:** This guide assumes you're familiar with creating plugin settings in Obsidian. If you haven't already, read the Settings documentation to understand how to create a settings tab and save plugin configuration.

## Setting Up SecretComponent

Start with a typical plugin settings setup. The `mySetting` property will store the _name_ of a secret, not the secret value itself.

```typescript
import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
  mySetting: string;
}
```

Replace the standard text input with a `SecretComponent`. Import `SecretComponent` from `obsidian` and use the `addComponent` method on your `Setting`:

```typescript
import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import MyPlugin from "./main";

export class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Select a secret from SecretStorage")
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.mySetting)
          .onChange((value) => {
            this.plugin.settings.mySetting = value;
            this.plugin.saveSettings();
          }),
      );
  }
}
```

The `SecretComponent` presents users with an interface to select from existing secrets or create a new one. When saved, your plugin settings contain the _name_ of the secret, not the actual secret value.

## Retrieving Secrets

When your plugin needs the actual secret value, use the `SecretStorage` API:

```typescript
const secret = app.secretStorage.get(this.settings.mySetting);
if (secret) {
  // secret value might be null
}
```

This retrieves the secret value associated with the name stored in your settings. The actual secret is stored in local storage, keyed to the specific vault.

**Complete Example:**

```typescript
import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
  mySetting: string;
}

export class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Select a secret from SecretStorage")
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.mySetting)
          .onChange((value) => {
            this.plugin.settings.mySetting = value;
            this.plugin.saveSettings();
          }),
      );
  }
}
```

**Why `addComponent` instead of having its own method like `addText`?**

Unlike other setting components, `SecretComponent` requires the `App` instance in its constructor to access the SecretStorage API. The standard `addText`, `addToggle`, and similar methods don't pass `App` to their callbacks. The `Setting#addComponent` method gives you full control over component instantiation, allowing you to pass the required `App` reference.
