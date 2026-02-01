# Troubleshooting – FSRS for Atomic Notes

## No notes due for review

- **Check tracked folders/tags**  
  Settings → FSRS for Atomic Notes. Ensure **Tracked folders** or **Tracked tags** include the folder(s) or tag(s) where your notes live.

- **Sync the queue**  
  Open **Manage queues**, select your queue, and use the option to sync (or create the default queue and start a review once). New notes get a “New” card and appear as due.

- **New vault**  
  If you just added the plugin, the default queue may not exist yet. Open **Start review** once; the default queue is created and synced on first use.

## Plugin won’t load or errors on load

- **Reload the app**  
  Command Palette → **Reload app without saving**. Try again.

- **Check the console**  
  Open Developer Tools (Ctrl/Cmd+Shift+I) → Console. Look for `[FSRS]` errors. They often indicate corrupted plugin data.

- **Use defaults**  
  If the plugin still fails, you can rename or remove the plugin data file so the plugin starts with fresh data. (Your note files are never modified; only the plugin’s stored data is reset.) Location is inside the vault under `.obsidian/plugins/obsidian-fsrs-atomic/` (Obsidian stores plugin data in its own path—check your OS for the exact location).

## Missing note during session

If the current note was deleted or moved while you’re in a session:

- You’ll see a message like “Note not found” or the sidebar will ask you to open the correct note.
- Use **Skip** to move to the next note, or **End session** to stop.
- The plugin marks the card as orphaned so you can resolve it later (e.g. relink or remove) from the orphan resolution flow.

## Corrupted or invalid data

If the plugin detects invalid or corrupted data on load:

- It logs the error and creates a backup of the bad data (if possible).
- It may fall back to default data so the plugin still loads.
- You can **restore from backup** if you have a recovery option in settings or via a dedicated recovery flow. The plugin keeps the last 5 backups before saves.

**Restore from backup (when available)**  
If the plugin exposes “Restore from backup” (e.g. in settings or a recovery modal):

1. Choose a backup from the list (newest first).
2. Confirm restore. The plugin replaces current data with that backup and reloads.
3. Reload the app if prompted.

## Save failed / retry

If saving fails (e.g. disk full or permission issue):

- The plugin retries with exponential backoff. Check the console for `[FSRS] Save attempt X/3 failed`.
- Fix the underlying issue (free space, permissions), then trigger another save (e.g. change a setting or do a review). If all retries fail, you’ll see a notice; your last in-memory state is not lost until you close the app, so fix the issue and try again.

## Rating or session doesn’t update

- **End and restart**  
  End the session and start a new one. If the problem persists, reload the app.

- **Check console**  
  Developer Tools → Console. Look for `[FSRS]` errors during rating or session start.

## Mobile-specific issues

- **Sidebar not opening**  
  Use the brain icon or Command Palette → **FSRS: Start review**. Ensure the plugin is enabled in Community plugins on mobile.

- **Touch targets**  
  The plugin adds a mobile class for larger buttons. If buttons are hard to tap, try rotating the device or using the command palette to trigger actions.

## Getting more help

- **GitHub issues**  
  Report bugs or request features at: [GitHub – obsidian-fsrs-for-atomic-notes](https://github.com/rituraj/obsidian-fsrs-for-atomic-notes/issues).  
  Include: Obsidian version, OS, what you did, what you expected, and any `[FSRS]` console errors.

- **Documentation**  
  See [USER_MANUAL.md](USER_MANUAL.md) and [SETTINGS.md](SETTINGS.md) for full usage and options.
