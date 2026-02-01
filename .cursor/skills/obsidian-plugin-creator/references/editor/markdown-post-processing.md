# Markdown Post Processing

If you want to change how a Markdown document renders in Reading view, add a _Markdown post processor_. The post processor runs _after_ Markdown is processed into HTML, allowing you to add, remove, or replace HTML elements in the rendered document.

## Post Processors

**Example: Emoji Replacer**

This example finds code blocks containing text between colons (`:`) and replaces them with emojis:

```typescript
import { Plugin } from "obsidian";

const ALL_EMOJIS: Record<string, string> = {
  ":+1:": "👍",
  ":sunglasses:": "😎",
  ":smile:": "😄",
};

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.registerMarkdownPostProcessor((element, context) => {
      const codeblocks = element.findAll("code");

      for (let codeblock of codeblocks) {
        const text = codeblock.innerText.trim();
        if (text[0] === ":" && text[text.length - 1] === ":") {
          const emojiEl = codeblock.createSpan({
            text: ALL_EMOJIS[text] ?? text,
          });
          codeblock.replaceWith(emojiEl);
        }
      }
    });
  }
}
```

## Code Block Processors

Obsidian supports special code blocks like Mermaid diagrams. You can create custom code blocks using `registerMarkdownCodeBlockProcessor()`.

**Example: CSV to Table**

This example renders CSV data as a table:

````markdown
```csv
Name,Age,City
Alice,30,New York
Bob,25,London
```
````

**Implementation:**

```typescript
import { Plugin } from "obsidian";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("csv", (source, el, ctx) => {
      const rows = source.split("\n").filter((row) => row.length > 0);

      const table = el.createEl("table");
      const body = table.createEl("tbody");

      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].split(",");
        const row = body.createEl("tr");

        for (let j = 0; j < cols.length; j++) {
          row.createEl("td", { text: cols[j] });
        }
      }
    });
  }
}
```
