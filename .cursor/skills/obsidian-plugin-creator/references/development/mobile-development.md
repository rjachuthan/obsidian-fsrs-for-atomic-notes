# Mobile Development

## Desktop Emulation

Test mobile features without a device:

1. Open the **Developer Tools**
2. Select the **Console** tab
3. Enter `this.app.emulateMobile(true);` and press Enter

To disable: `this.app.emulateMobile(false);`

**Tip:** Toggle with `this.app.emulateMobile(!this.app.isMobile);`

## Physical Device Debugging

**Android:**

1. Enable USB Debugging in Developer settings
2. Connect device via USB
3. Navigate to `chrome://inspect/` in a Chromium browser
4. Run devtools from there

More info: https://developer.chrome.com/docs/devtools/remote-debugging

**iOS (16.4+):**
Requires macOS. See: https://webkit.org/web-inspector/enabling-web-inspector/

## Platform-Specific Features

```typescript
import { Platform } from "obsidian";

if (Platform.isIosApp) {
  // iOS-specific code
}

if (Platform.isAndroidApp) {
  // Android-specific code
}
```

## Desktop-Only Plugins

To only support the desktop app, set `isDesktopOnly` to `true` in the [Manifest](https://docs.obsidian.md/Reference/Manifest).

## Common Mobile Issues

- **Node.js/Electron API unavailable** - Calls to these APIs will crash your plugin on mobile
- **Regex lookbehind** - Only supported on iOS 16.4+. Check [Can I Use](https://caniuse.com/js-regexp-lookbehind) for compatibility
