# FSRS for Atomic Notes

Spaced repetition for atomic notes using the **FSRS** (Free Spaced Repetition Scheduler) algorithm. Your notes stay untouched—all scheduling data is stored externally in the plugin data folder.

## Screenshots

**Default view**

![Default view](docs/images/default%20view.png)

**Dashboard**

![Dashboard](docs/images/dashboard.jpg)

## Installation

### From Community Plugins

Not published to Community Plugins yet.

### Manual installation

1. Download the latest release `main.js`, `manifest.json`, and `styles.css` from the [releases page](https://github.com/rituraj/obsidian-fsrs-for-atomic-notes/releases).
2. Copy them into your vault folder:  
   `VaultFolder/.obsidian/plugins/obsidian-fsrs-atomic/`
3. Reload Obsidian and enable the plugin in **Settings** → **Community plugins**.

## Key features

- **FSRS v6 algorithm** – Modern spaced repetition with stability and difficulty tracking.
- **Zero note pollution** – No frontmatter or in-file metadata; all data in `.obsidian/plugins/obsidian-fsrs-atomic/`.
- **Multiple queues** – Organize reviews by topic (e.g. folders or tags).
- **Dashboard** – Overview, heatmap, forecast, and note table (Command Palette → **FSRS: Open dashboard**).
- **Mobile support** – Review on iOS and Android with touch-friendly controls.
- **Undo** – Undo the last rating in a session.
- **Backup & recovery** – Automatic backups before saves; restore from backup if needed.

## How it works

- **Atomic notes**: One concept per note (e.g. one markdown file per idea).
- **Queues**: Each queue has criteria (folders/tags). Notes matching a queue get a “card” and a schedule for that queue.
- **FSRS**: Each time you rate (Again / Hard / Good / Easy), the plugin updates stability and difficulty and sets the next due date. No changes are written to your note files.
- **Data location**: Cards, review logs, and settings are stored in the plugin’s data store (Obsidian’s plugin storage).

## Configuration

- **Settings** → **FSRS for Atomic Notes**:
  - **Tracked folders** / **Tracked tags** – What to include in the default queue.
  - **Queue order** – How to order due notes (e.g. mixed-anki, due-first, random).
  - **New cards per day** / **Max reviews per day** – Limits when using mixed-anki or load-balancing.
  - **Sidebar position** – Left or right for the review sidebar.

See [Settings](docs/SETTINGS.md) for full options.

## FAQ

See [docs/FAQ.md](docs/FAQ.md) for common questions and [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for problems and fixes.

## Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/rituraj/obsidian-fsrs-for-atomic-notes).
