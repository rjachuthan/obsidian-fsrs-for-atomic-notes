# Plugin Guidelines

This page lists common review comments plugin authors get when submitting their plugin. While the guidelines on this page are recommendations, depending on their severity, we may still require you to address any violations.

## Policies for Plugin Developers

Make sure that you've read our [Developer policies](https://docs.obsidian.md/Developer+policies) as well as the [Submission requirements for plugins](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins).

### Avoid Global App Object

Avoid using the global app object, `app` (or `window.app`). Instead, use the reference provided by your plugin instance, `this.app`.

The global app object is intended for debugging purposes and might be removed in the future.

### Avoid Unnecessary Logging

Please avoid unnecessary logging. In its default configuration, the developer console should only show error messages, debug messages should not be shown.

### Organize Code into Folders

If your plugin uses more than one `.ts` file, consider organizing them into folders to make it easier to review and maintain.

### Rename Sample Plugin Classes

The sample plugin contains placeholder names for common classes, such as `MyPlugin`, `MyPluginSettings`, and `SampleSettingTab`. Rename these to reflect the name of your plugin.

### Mobile Compatibility

The Node.js API, and the Electron API aren't available on mobile devices. Any calls to these libraries made by your plugin or its dependencies can cause your plugin to crash.

### Regular Expression Lookbehind

Lookbehind in regular expressions is only supported on iOS 16.4 and above, and some iPhone and iPad users may still use earlier versions. To implement a fallback for iOS users, either refer to [Platform-specific features](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development#Platform-specific%20features), or use a JavaScript library to detect specific browser versions.

Refer to [Can I Use](https://caniuse.com/js-regexp-lookbehind) for more information and exact version statistics. Look for "Safari on iOS".

## User Interface Guidelines

This section lists guidelines for formatting text in the user interface, such as settings, commands, and buttons.

The example below from **Settings → Appearance** demonstrates the guidelines for text in the user interface:

1. [General settings are at the top and don't have a heading](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Only%20use%20headings%20under%20settings%20if%20you%20have%20more%20than%20one%20section.).
2. [Section headings don't have "settings" in the heading text](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Avoid%20"settings"%20in%20settings%20headings).
3. [Use Sentence case in UI](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Use%20Sentence%20case%20in%20UI).

For more information on writing and formatting text for Obsidian, refer to our [Style guide](https://help.obsidian.md/Contributing+to+Obsidian/Style+guide).

### Only Use Headings Under Settings If You Have More Than One Section

Avoid adding a top-level heading in the settings tab, such as "General", "Settings", or the name of your plugin.

If you have more than one section under settings, and one contains general settings, keep them at the top without adding a heading.

For example, look at the settings under **Settings → Appearance**.

### Avoid "Settings" in Settings Headings

In the settings tab, you can add headings to organize settings. Avoid including the word "settings" to these headings. Since everything under the settings tab is settings, repeating it for every heading becomes redundant.

- Prefer "Advanced" over "Advanced settings".
- Prefer "Templates" over "Settings for templates".

### Use Sentence Case in UI

Any text in UI elements should be using [Sentence case](https://en.wiktionary.org/wiki/sentence_case) instead of [Title Case](https://en.wikipedia.org/wiki/Title_case), where only the first word in a sentence, and proper nouns, should be capitalized.

- Prefer "Template folder location" over "Template Folder Location".
- Prefer "Create new note" over "Create New Note".

### Use `setHeading` Instead of HTML Heading Elements

Using the heading elements from HTML will result in inconsistent styling between different plugins. Instead you should prefer the following:

```typescript
new Setting(containerEl).setName("your heading title").setHeading();
```

### Avoid `innerHTML`, `outerHTML` and `insertAdjacentHTML`

Building DOM elements from user-defined input, using `innerHTML`, `outerHTML` and `insertAdjacentHTML` can pose a security risk.

The following example builds a DOM element using a string that contains user input, `${name}`. `name` can contain other DOM elements, such as `<script>alert()</script>`, and can allow a potential attacker to execute arbitrary code on the user's computer.

```typescript
function showName(name: string) {
  let containerElement = document.querySelector(".my-container");
  // DON'T DO THIS
  containerElement.innerHTML = `<div class="my-class"><b>Your name is: </b>${name}</div>`;
}
```

Instead, use the DOM API or the Obsidian helper functions, such as `createEl()`, `createDiv()` and `createSpan()` to build the DOM element programmatically. For more information, refer to [HTML elements](https://docs.obsidian.md/Plugins/User+interface/HTML+elements).

To cleanup a HTML elements contents use `el.empty();`

## Code Guidelines

### Clean Up Resources on Unload

Any resources created by the plugin, such as event listeners, must be destroyed or released when the plugin unloads.

When possible, use methods like [registerEvent()](https://docs.obsidian.md/Reference/TypeScript+API/Component/registerEvent) or [addCommand()](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/addCommand) to automatically clean up resources when the plugin unloads.

```typescript
export default class MyPlugin extends Plugin {
  onload() {
    this.registerEvent(this.app.vault.on("create", this.onCreate));
  }

  onCreate: (file: TAbstractFile) => {
    // ...
  };
}
```

**Note:** You don't need to clean up resources that are guaranteed to be removed when your plugin unloads. For example, if you register a `mouseenter` listener on a DOM element, the event listener will be garbage-collected when the element goes out of scope.

### `onunload` Behavior

When the user updates your plugin, any open leaves will be reinitialized at their original position, regardless of where the user had moved them.

### Avoid Default Hotkeys

Setting a default hotkey may lead to conflicts between plugins and may override hotkeys that the user has already configured. It's also difficult to choose a default hotkey that is available on all operating systems.

### Use Appropriate Command Callbacks

When you add a command in your plugin, use the appropriate callback type.

- Use `callback` if the command runs unconditionally.
- Use `checkCallback` if the command only runs under certain conditions.

If the command requires an open and active Markdown editor, use `editorCallback`, or the corresponding `editorCheckCallback`.

### Avoid Using `workspace.activeLeaf` Directly

If you want to access the active view, use [getActiveViewOfType()](https://docs.obsidian.md/Reference/TypeScript+API/Workspace/getActiveViewOfType) instead:

```typescript
const view = this.app.workspace.getActiveViewOfType(MarkdownView);

// getActiveViewOfType will return null if the active view is null, or if it's not a MarkdownView.
if (view) {
  // ...
}
```

If you want to access the editor in the active note, use `activeEditor` instead:

```typescript
const editor = this.app.workspace.activeEditor?.editor;

if (editor) {
  // ...
}
```

### Don't Manage References to Custom Views

Managing references to custom view can cause memory leaks or unintended consequences.

**Don't** do this:

```typescript
this.registerView(MY_VIEW_TYPE, () => (this.view = new MyCustomView()));
```

Do this instead:

```typescript
this.registerView(MY_VIEW_TYPE, () => new MyCustomView());
```

To access the view from your plugin, use `Workspace.getActiveLeavesOfType()`:

```typescript
for (let leaf of app.workspace.getActiveLeavesOfType(MY_VIEW_TYPE)) {
  let view = leaf.view;
  if (view instanceof MyCustomView) {
    // ...
  }
}
```

### Use Editor API Instead of `Vault.modify` for Active Files

If you want to edit an active note, use the [Editor](https://docs.obsidian.md/Plugins/Editor/Editor) interface instead of [Vault.modify()](https://docs.obsidian.md/Reference/TypeScript+API/Vault/modify).

Editor maintains information about the active note, such as cursor position, selection, and folded content. When you use [Vault.modify()](https://docs.obsidian.md/Reference/TypeScript+API/Vault/modify) to edit the note, all that information is lost, which leads to a poor experience for the user.

Editor is also more efficient when making small changes to parts of the note.

### Use `Vault.process` Instead of `Vault.modify` for Background Modifications

If you want to edit a note that is not currently opened, use the [Vault.process](https://docs.obsidian.md/Reference/TypeScript+API/Vault/process) function instead of [Vault.modify](https://docs.obsidian.md/Reference/TypeScript+API/Vault/modify).

The `process` function modifies the file atomically, which means that your plugin won't run into conflicts with other plugins modifying the same file.

### Use `FileManager.processFrontMatter` to Modify Frontmatter

Instead of extracting the frontmatter of a note, parsing and modifying the YAML manually you should use the [FileManager.processFrontMatter](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter) function.

`processFrontMatter` runs atomically, so modifying the file will not conflict with other plugins editing the same file. It will also ensure a consistent layout of the YAML produced.

## Best Practices

### Prefer Vault API Over Adapter API

Obsidian exposes two APIs for file operations: the Vault API (`app.vault`) and the Adapter API (`app.vault.adapter`).

While the file operations in the Adapter API are often more familiar to many developers, the Vault API has two main advantages over the adapter:

- **Performance:** The Vault API has a caching layer that can speed up file reads when the file is already known to Obsidian.
- **Safety:** The Vault API performs file operations serially to avoid any race conditions, for example when reading a file that is being written to at the same time.

### Use Efficient File Lookups

Avoid using `app.vault.getFiles().find()` to look up files by path. This is inefficient, especially for large vaults. Use [Vault.getFileByPath](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getFileByPath), [Vault.getFolderByPath](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getFolderByPath) or [Vault.getAbstractFileByPath](https://docs.obsidian.md/Reference/TypeScript+API/Vault/getAbstractFileByPath) instead.

**Don't** do this:

```typescript
this.app.vault.getFiles().find((file) => file.path === filePath);
```

Do this instead:

```typescript
const filePath = "folder/file.md";
// if you want to get a file
const file = this.app.vault.getFileByPath(filePath);
```

```typescript
const folderPath = "folder";
// or if you want to get a folder
const folder = this.app.vault.getFolderByPath(folderPath);
```

If you aren't sure if the path provided is for a folder or a file, use:

```typescript
const abstractFile = this.app.vault.getAbstractFileByPath(filePath);

if (file instanceof TFile) {
  // it's a file
}
if (file instanceof TFolder) {
  // it's a folder
}
```

### Use `normalizePath()` to Clean Up User-Defined Paths

Use [normalizePath()](https://docs.obsidian.md/Reference/TypeScript+API/normalizePath) whenever you accept user-defined paths to files or folders in the vault, or when you construct your own paths in the plugin code.

`normalizePath()` takes a path and scrubs it to be safe for the file system and for cross-platform use. This function:

- Cleans up the use of forward and backward slashes, such as replacing 1 or more of `\` or `/` with a single `/`.
- Removes leading and trailing forward and backward slashes.
- Replaces any non-breaking spaces, `\u00A0`, with a regular space.
- Runs the path through [String.prototype.normalize](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize).

```typescript
import { normalizePath } from "obsidian";
const pathToPlugin = normalizePath("//my-folder\file");
// pathToPlugin contains "my-folder/file" not "//my-folder\"
```

### Update Editor Extensions Properly

If you want to change or reconfigure an [editor extension](https://docs.obsidian.md/Plugins/Editor/Editor+extensions) after you've registered using [registerEditorExtension()](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerEditorExtension), use [updateOptions()](https://docs.obsidian.md/Reference/TypeScript+API/Workspace/updateOptions) to update all editors.

```typescript
class MyPlugin extends Plugin {
  private editorExtension: Extension[] = [];

  onload() {
    //...

    this.registerEditorExtension(this.editorExtension);
  }

  updateEditorExtension() {
    // Empty the array while keeping the same reference
    // (Don't create a new array here)
    this.editorExtension.length = 0;

    // Create new editor extension
    let myNewExtension = this.createEditorExtension();
    // Add it to the array
    this.editorExtension.push(myNewExtension);

    // Flush the changes to all editors
    this.app.workspace.updateOptions();
  }
}
```

### Use CSS Classes Instead of Inline Styles

**Don't** do this:

```typescript
const el = containerEl.createDiv();
el.style.color = "white";
el.style.backgroundColor = "red";
```

To make it easy for users to modify the styling of your plugin you should use CSS classes, as hardcoding the styling in the plugin code makes it impossible to modify with themes and snippets.

**Do** this instead:

```typescript
const el = containerEl.createDiv({ cls: "warning-container" });
```

In the plugin's CSS add the following:

```css
.warning-container {
  color: var(--text-normal);
  background-color: var(--background-modifier-error);
}
```

To make the styling of your plugin consistent with Obsidian and other plugins you should use the [CSS variables](https://docs.obsidian.md/Reference/CSS+variables/CSS+variables) provided by Obsidian. If there is no variable available that fits in your case, you can create your own.

### Use `const` and `let` Over `var`

For more information, refer to [4 Reasons Why var is Considered Obsolete in Modern JavaScript](https://javascript.plainenglish.io/4-reasons-why-var-is-considered-obsolete-in-modern-javascript-a30296b5f08f).

### Prefer `async`/`await` Over Promises

Recent versions of JavaScript and TypeScript support the `async` and `await` keywords to run code asynchronously, which allow for more readable code than using Promises.

**Don't** do this:

```typescript
function test(): Promise<string | null> {
  return requestUrl('https://example.com')
    .then(res => res.text
    .catch(e => {
      console.log(e);
      return null;
    });
}
```

Do this instead:

```typescript
async function AsyncTest(): Promise<string | null> {
  try {
    let res = await requestUrl("https://example.com");
    let text = await r.text;
    return text;
  } catch (e) {
    console.log(e);
    return null;
  }
}
```
