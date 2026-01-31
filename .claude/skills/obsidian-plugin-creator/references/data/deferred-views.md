# Deferred Views

## Understanding Deferred Views

As of Obsidian v1.7.2, when Obsidian loads, all views are created as instances of **DeferredView**. Once a view is visible on screen (i.e., the tab is selected within its containing tab group), the `leaf` will rerender and the view will be switched out to the correct `View` instance.

This change might break some assumptions that your plugin is currently making.

## Checking View Instances

If your plugin is iterating the workspace (using either `iterateAllLeaves` or `getLeavesOfType`), it's now very important that you perform an `instanceof` check before making any assumptions about `leaf.view`.

**Bad:**

```typescript
workspace.iterateAllLeaves(leaf => {
    if (leaf.view.getViewType() === 'my-view') {
        let view = leaf.view as MyCustomView;
        ...
    }
});
```

**Good:**

```typescript
workspace.iterateAllLeaves(leaf => {
    if (leaf.view instanceof MyCustomView) {
        ...
    }
});
```

**Bad:**

```typescript
let leaf = workspace.getLeavesOfType('my-view').first();
if (leaf) {
	let view = leaf.view as MyCustomView;
}
...
```

**Good:**

```typescript
let leaf = workspace.getLeavesOfType('my-view').first();
if (leaf && leaf.view instanceof MyCustomView) {
    ...
}
```

This will avoid your plugin breaking by making a bad assumption about the workspace and causing your plugin to error out.

## Revealing Views

**General rule:** If your plugin is attempting to communicate with a view, that view should be visible.

If your plugin needs to access an instance of `CustomView` in the workspace, you might notice that the previous code snippets won't work. For most use cases, the solution is simple:

```typescript
let leaf = workspace.getLeavesOfType("my-view").first();
if (leaf) {
  await workspace.revealLeaf(leaf); // Ensure the view is visible, `await` it to make sure the view is fully loaded
  if (leaf.view instanceof MyCustomView) {
    let view = leaf.view; // You now have your CustomView
  }
}
```

For most cases, this will be the correct way to handle accessing your custom view.

## Loading Views Without Reveal (Advanced)

There are some cases where you want to access a view without revealing it. For example, if your plugin is applying modifications to an existing view type.

In this case, you will need to manually request that the view is loaded:

```typescript
let leaves = workspace.getLeavesOfType("my-view");
for (let leaf of leaves) {
  if (requireApiVersion("1.7.2")) {
    await leaf.loadIfDeferred(); // Ensure view is fully loaded
  }
  // perform modifications here...
}
```

**Performance Warning:** Manually calling `loadIfDeferred`, your plugin is removing this performance optimization from the given views. Use this _sparingly_.
