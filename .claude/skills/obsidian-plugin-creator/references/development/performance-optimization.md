# Performance Optimization

Plugins play an important role in app load time. To ensure that Obsidian behaves correctly, Obsidian loads all plugins before the user can interact with the app.

You can test the startup time of Obsidian by going to **Settings** → **General** → **Advanced** and selecting the stopwatch icon to debug startup time. This view indicates how long it takes for the app to launch.

**Optimization Checklist:**

- Simplify your plugin `onload`
- Check your plugin View constructor
- Avoid common pitfalls

## Production Builds

Make sure that you are using a production build of your plugin. If you are using a bundler like esbuild, rollup, or webpack, you can likely create a "development" build or a "production" build. A production build will usually be smaller, load faster, and remove code that's only used for testing. When you create a release, ensure that the `main.js` file is a production build.

In your build configuration, you should consider minifying your plugin code. This will make the overall plugin file size smaller and therefore faster for the plugin to read from disk and load.

## Optimizing onload

Make sure you aren't doing anything expensive inside your plugin's `onload` function. The `onload` function should only include code necessary for the plugin to initialize. This includes app registrations, like registering commands, view types, and Markdown post-processors. It should not include anything computationally expensive or data fetching.

## View Constructor Optimization

If your plugin creates any custom views, be mindful of your custom view constructor. When Obsidian opens, it will reopen all the views saved to the user's workspace. If your view is loaded (and not deferred), this will directly impact the app load time.

For most cases, you will want to wrap your code inside a `onLayoutReady` callback. These callbacks are deferred and are only called after Obsidian finishes loading.

## Handling Vault Events

As part of Obsidian's vault initialization process, it will call `create` for every file. If your plugin needs to react to new files getting created, you need to wait for the workspace to be ready first. Your vault event registration should be inside an `onLayoutReady` callback; this will ensure you don't start reacting to events until the workspace is fully initialized.

**Bad:**

```typescript
class MyPlugin extends Plugin {
  onload(app: App) {
    super(app);
    this.registerEvent(this.app.vault.on("create", this.onCreate, this));
  }

  onCreate() {
    if (!this.app.workspace.layoutReady) {
      // Workspace is still loading, do nothing
      return;
    }
    // ...
  }
}
```

**Good:**

```typescript
class MyPlugin extends Plugin {
  onload(app: App) {
    super(app);
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(this.app.vault.on("create", this.onCreate, this));
    });
  }

  onCreate() {
    // ...
  }
}
```

For additional help with optimizing your plugin, reach out for help from the developer community!
