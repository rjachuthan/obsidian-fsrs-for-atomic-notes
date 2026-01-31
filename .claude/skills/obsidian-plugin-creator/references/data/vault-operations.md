# Vault Operations

Each collection of notes in Obsidian is known as a Vault. A Vault consists of a folder and any sub-folders within it. While your plugin can access the file system like any other Node.js application, the Vault module aims to make it easier to work with files and folders within a Vault.

**Note:** The Vault API only allows access to files visible inside the app. Files included in hidden folders can only be accessed using the Adapter API.

## Listing Files

The following example recursively prints the paths of all Markdown files in a Vault:

```typescript
const files = this.app.vault.getMarkdownFiles();

for (let i = 0; i < files.length; i++) {
  console.log(files[i].path);
}
```

**Tip:** If you want to list _all_ files, and not just Markdown documents, use `getFiles()` instead.

## Reading Files

There are two methods for reading the content of a file: `read()` and `cachedRead()`.

- If you only want to display the content to the user, then use `cachedRead()` to avoid reading the file from disk multiple times.
- If you want to read the content, change it, and then write it back to disk, then use `read()` to avoid potentially overwriting the file with a stale copy.

**Info:** The only difference between `cachedRead()` and `read()` is when the file was modified outside of Obsidian just before the plugin reads it. As soon as the file system notifies Obsidian that the file has changed from the outside, `cachedRead()` behaves _exactly_ like `read()`. Similarly, if you save the file within Obsidian, the read cache is flushed as well.

The following example reads the content of all Markdown files in the Vault and returns the average document size:

```typescript
import { Notice, Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("info", "Calculate average file length", async () => {
      const fileLength = await this.averageFileLength();
      new Notice(`The average file length is ${fileLength} characters.`);
    });
  }

  async averageFileLength(): Promise<number> {
    const { vault } = this.app;

    const fileContents: string[] = await Promise.all(
      vault.getMarkdownFiles().map((file) => vault.cachedRead(file)),
    );

    let totalLength = 0;
    fileContents.forEach((content) => {
      totalLength += content.length;
    });

    return totalLength / fileContents.length;
  }
}
```

## Writing and Modifying Files

To write text content to an existing file, use `Vault.modify()`:

```typescript
function writeCurrentDate(vault: Vault, file: TFile): Promise<void> {
  return vault.modify(
    file,
    `Today is ${new Intl.DateTimeFormat().format(new Date())}.`,
  );
}
```

If you want to modify a file based on its current content, use `Vault.process()` instead. The second argument is a callback that provides the current file content and returns the modified content:

```typescript
// emojify replaces all occurrences of :) with 🙂.
function emojify(vault: Vault, file: TFile): Promise<string> {
  return vault.process(file, (data) => {
    return data.replace(":)", "🙂");
  });
}
```

`Vault.process()` is an abstraction on top of `Vault.read()` and `Vault.modify()` that guarantees that the file doesn't change between reading the current content and writing the updated content. Always prefer `Vault.process()` over `Vault.read()`/`Vault.modify()` to avoid unintentional loss of data.

### Asynchronous Modifications

`Vault.process()` only supports synchronous modifications. If you need to modify a file asynchronously:

1. Read the file using `Vault.cachedRead()`.
2. Perform the async operations.
3. Update the file using `Vault.process()`.

Remember to check that the `data` in the `process()` callback is the same as the data returned by `cachedRead()`. If they aren't the same, that means that the file was changed by a different process, and you may want to ask the user for confirmation, or try again.

## Deleting Files

There are two methods to delete a file: `delete()` and `trash()`. Which one you should use depends on if you want to allow the user to change their mind.

- `delete()` removes the file without a trace.
- `trash()` moves the file to the trash bin.

When you use `trash()`, you have the option to move the file to the system's trash bin, or to a local `.trash` folder at the root of the user's Vault.

## Working with Files and Folders

Some operations return or accept a `TAbstractFile` object, which can be either a file or a folder. Always check the concrete type of a `TAbstractFile` before you use it.

```typescript
const folderOrFile = this.app.vault.getAbstractFileByPath("folderOrFile");

if (folderOrFile instanceof TFile) {
  console.log("It's a file!");
} else if (folderOrFile instanceof TFolder) {
  console.log("It's a folder!");
}
```
