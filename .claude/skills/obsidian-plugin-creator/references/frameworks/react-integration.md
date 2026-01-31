# Using React

## Installation

```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom
```

## Configuration

In `tsconfig.json`, enable JSX support:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

## Create a React Component

`ReactView.tsx`:

```tsx
export const ReactView = () => {
  return <h4>Hello, React!</h4>;
};
```

## Mount the Component

```tsx
import { StrictMode } from "react";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { ReactView } from "./ReactView";

const VIEW_TYPE_EXAMPLE = "example-view";

class ExampleView extends ItemView {
  root: Root | null = null;

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
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <ReactView />,
      </StrictMode>,
    );
  }

  async onClose() {
    this.root?.unmount();
  }
}
```

## Using App Context

Create a context for the App object:

```tsx
// context.ts
import { createContext } from "react";
import { App } from "obsidian";

export const AppContext = createContext<App | undefined>(undefined);
```

Wrap ReactView with the provider:

```tsx
this.root = createRoot(this.contentEl);
this.root.render(
  <AppContext.Provider value={this.app}>
    <ReactView />
  </AppContext.Provider>,
);
```

Create a custom hook:

```tsx
// hooks.ts
import { useContext } from "react";
import { AppContext } from "./context";

export const useApp = (): App | undefined => {
  return useContext(AppContext);
};
```

Use in components:

```tsx
import { useApp } from "./hooks";

export const ReactView = () => {
  const { vault } = useApp();
  return <h4>{vault.getName()}</h4>;
};
```

For more: [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) and [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).
