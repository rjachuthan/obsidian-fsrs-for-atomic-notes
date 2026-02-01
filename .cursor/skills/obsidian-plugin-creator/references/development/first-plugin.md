# Building Your First Plugin

## Prerequisites

- [Git](https://git-scm.com/) installed on your local machine
- A local development environment for [Node.js](https://Node.js.org/en/about/)
- A code editor, such as [Visual Studio Code](https://code.visualstudio.com/)

**Important:** Always use a separate vault dedicated to plugin development. Never develop plugins in your main vault to prevent data loss.

## Setup Steps

1. **Create a development vault**: [Create an empty vault](https://help.obsidian.md/Getting+started/Create+a+vault#Create+empty+vault)

2. **Clone the sample plugin**:

```bash
cd path/to/vault
mkdir .obsidian/plugins
cd .obsidian/plugins
git clone https://github.com/obsidianmd/obsidian-sample-plugin.git
```

**Note:** The sample plugin repository is a GitHub template repository. You can [create your own repository from it](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template#creating-a-repository-from-a-template).

3. **Install dependencies**:

```bash
cd obsidian-sample-plugin
npm install
```

4. **Compile the source code**:

```bash
npm run dev
```

This command keeps running and rebuilds the plugin when you modify the source code.

## Enable the Plugin

1. In Obsidian, open **Settings**
2. In the side menu, select **Community plugins**
3. Select **Turn on community plugins**
4. Under **Installed plugins**, enable the **Sample Plugin** by toggling it on

## Customize the Plugin

1. Open `manifest.json` in your code editor
2. Change `id` to a unique identifier (e.g., `"hello-world"`)
3. Change `name` to a human-friendly name (e.g., `"Hello world"`)
4. Rename the plugin folder to match the plugin's `id`
5. **Restart Obsidian** to load the new changes

**Remember:** Restart Obsidian whenever you make changes to `manifest.json`.

## Add a Ribbon Icon

```typescript
import { Notice, Plugin } from "obsidian";

export default class HelloWorldPlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("dice", "Greet", () => {
      new Notice("Hello, world!");
    });
  }
}
```

After making changes, reload the plugin by using **Reload app without saving** in the Command palette.
