# Modals

Modals display information and accept user input.

## Basic Modals

Create a modal by extending the `Modal` class:

```typescript
import { App, Modal } from "obsidian";

export class ExampleModal extends Modal {
  constructor(app: App) {
    super(app);
    this.setContent("Look at me, I'm a modal! 👀");
  }
}
```

Open the modal:

```typescript
import { Plugin } from "obsidian";
import { ExampleModal } from "./modal";

export default class ExamplePlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: "display-modal",
      name: "Display modal",
      callback: () => {
        new ExampleModal(this.app).open();
      },
    });
  }
}
```

## Input Modals

Handle user input with callbacks:

```typescript
import { App, Modal, Setting } from "obsidian";

export class ExampleModal extends Modal {
  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.setTitle("What's your name?");

    let name = "";
    new Setting(this.contentEl).setName("Name").addText((text) =>
      text.onChange((value) => {
        name = value;
      }),
    );

    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          this.close();
          onSubmit(name);
        }),
    );
  }
}
```

Use the modal:

```typescript
new ExampleModal(this.app, (result) => {
  new Notice(`Hello, ${result}!`);
}).open();
```

## Suggest Modal

`SuggestModal` displays a list of suggestions to the user:

```typescript
import { App, Notice, SuggestModal } from "obsidian";

interface Book {
  title: string;
  author: string;
}

const ALL_BOOKS = [
  {
    title: "How to Take Smart Notes",
    author: "Sönke Ahrens",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
  },
];

export class ExampleModal extends SuggestModal<Book> {
  // Returns all available suggestions.
  getSuggestions(query: string): Book[] {
    return ALL_BOOKS.filter((book) =>
      book.title.toLowerCase().includes(query.toLowerCase()),
    );
  }

  // Renders each suggestion item.
  renderSuggestion(book: Book, el: HTMLElement) {
    el.createEl("div", { text: book.title });
    el.createEl("small", { text: book.author });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(book: Book, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${book.title}`);
  }
}
```

## Fuzzy Suggest Modal

`FuzzySuggestModal` provides fuzzy string search out-of-the-box:

```typescript
import { FuzzySuggestModal, Notice } from "obsidian";

export class ExampleSuggestModal extends FuzzySuggestModal<Book> {
  getItems(): Book[] {
    return ALL_BOOKS;
  }

  getItemText(book: Book): string {
    return book.title;
  }

  onChooseItem(book: Book, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${book.title}`);
  }
}
```

For custom rendering with highlighted matches:

```typescript
import { FuzzyMatch, FuzzySuggestModal, Notice, renderResults } from "obsidian";

export class ExampleSuggestModal extends FuzzySuggestModal<Book> {
  // Return a string representation, so there is something to search
  getItemText(item: Book): string {
    return item.title + " " + item.author;
  }

  getItems(): Book[] {
    return ALL_BOOKS;
  }

  renderSuggestion(match: FuzzyMatch<Book>, el: HTMLElement) {
    const titleEl = el.createDiv();
    renderResults(titleEl, match.item.title, match.match);

    // Only render the matches in the author name.
    const authorEl = el.createEl("small");
    const offset = -(match.item.title.length + 1);
    renderResults(authorEl, match.item.author, match.match, offset);
  }

  onChooseItem(book: Book, evt: MouseEvent | KeyboardEvent): void {
    new Notice(`Selected ${book.title}`);
  }
}
```
