# Using Svelte

Svelte is a light-weight alternative to React/Vue. It compiles to optimized vanilla JavaScript with no virtual DOM overhead.

## Installation

```bash
npm install --save-dev svelte svelte-preprocess esbuild-svelte svelte-check
```

**Important:** Svelte requires TypeScript 5.0+:

```bash
npm install typescript@~5.0.0
```

## Configuration

1. **Extend `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
    // ...
  },
  "include": ["**/*.ts", "**/*.svelte"]
}
```

2. **Update `esbuild.config.mjs`**:

```js
import esbuildSvelte from "esbuild-svelte";
import { sveltePreprocess } from "svelte-preprocess";

const context = await esbuild.context({
  plugins: [
    esbuildSvelte({
      compilerOptions: { css: "injected" },
      preprocess: sveltePreprocess(),
    }),
  ],
  // ...
});
```

3. **Add script to `package.json`**:

```json
{
  "scripts": {
    "svelte-check": "svelte-check --tsconfig tsconfig.json"
  }
}
```

## Create a Svelte Component

`Counter.svelte`:

```svelte
<script lang="ts">
  interface Props {
    startCount: number;
  }

  let {
    startCount
  }: Props = $props();

  let count = $state(startCount);

  export function increment() {
    count += 1;
  }
</script>

<div class="number">
  <span>My number is {count}!</span>
</div>

<style>
  .number {
    color: red;
  }
</style>
```

## Mount the Component

```typescript
import { ItemView, WorkspaceLeaf } from "obsidian";
import Counter from "./Counter.svelte";
import { mount, unmount } from "svelte";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
  counter: ReturnType<typeof Counter> | undefined;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    this.counter = mount(Counter, {
      target: this.contentEl,
      props: {
        startCount: 5,
      },
    });

    // Exported methods are typed
    this.counter.increment();
  }

  async onClose() {
    if (this.counter) {
      unmount(this.counter);
    }
  }
}
```

**VS Code Extension:** Install the [official Svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) for syntax highlighting and IntelliSense.

For more: [Svelte tutorial](https://svelte.dev/tutorial/svelte/welcome-to-svelte) and [documentation](https://svelte.dev/docs/svelte/overview).
