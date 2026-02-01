# FSRS for Atomic Notes – User Manual

## Overview

This plugin adds spaced repetition to your Obsidian vault using the FSRS algorithm. It treats each note as a “card” and schedules reviews based on your ratings, without writing anything into your note files.

## Concepts

- **Queue**: A named set of notes (e.g. by folder or tag). Each queue has its own due list and statistics.
- **Card**: The scheduling record for one note in one queue. Stored only in plugin data.
- **Rating**: Again (1), Hard (2), Good (3), Easy (4). FSRS uses these to update stability and difficulty and to set the next due date.

## Workflow

1. **Setup**  
   In Settings → FSRS for Atomic Notes, set **Tracked folders** or **Tracked tags** so the default queue knows which notes to include. You can add more queues via **Manage queues** (Command Palette or dashboard).

2. **Start a session**  
   - Click the brain icon in the ribbon, or  
   - Command Palette → **FSRS: Start review**  
   The review sidebar opens. If you have multiple queues, you’ll choose one.

3. **Review**  
   - The current note opens in the editor.  
   - In the sidebar, rate with **Again**, **Hard**, **Good**, or **Easy**.  
   - The next due note opens automatically. Use **Skip**, **Back**, or **Undo** as needed.

4. **End session**  
   Click **End session** in the sidebar, or switch away; your progress is saved after each rating.

## Commands

| Command | Description |
|--------|-------------|
| FSRS: Start review | Open sidebar and start (or choose queue). |
| FSRS: Open dashboard | Open the stats/dashboard modal. |
| FSRS: Manage queues | Create, edit, delete queues. |
| FSRS: Add to queue | Add the current note to a queue (when one note is open). |
| FSRS: Rate Again / Hard / Good / Easy | Rate current note (during a session). |
| FSRS: Skip note | Skip current note. |
| FSRS: Undo last rating | Undo the last rating in the session. |
| FSRS: End session | End the current session. |

## Dashboard

Open via Command Palette → **FSRS: Open dashboard**. You get:

- **Overview** – Totals, due today, new, learning, review.
- **Heatmap** – Review activity over the last 12 months.
- **Forecast** – Due cards over the next 30 days.
- **Note table** – Sortable, filterable list of cards in the selected queue (with pagination).

## Multiple queues

- **Manage queues** creates queues with different criteria (folders/tags).  
- Each queue has its own due list and stats.  
- When you start a review, you pick the queue (or use the default if only one exists).  
- **Add to queue** adds the current note to the queue you choose.

## Data and backups

- All plugin data (cards, reviews, settings, queues) is stored in Obsidian’s plugin storage.  
- The plugin creates automatic backups before risky writes and keeps the last 5.  
- If something goes wrong, you can restore from a backup (see Troubleshooting).

## Mobile

The same features work on Obsidian Mobile. The sidebar uses larger touch targets when the app detects mobile. Use the brain icon or command palette to start a review.

## See also

- [Settings](SETTINGS.md) – All options explained.  
- [FAQ](FAQ.md) – Common questions.  
- [Troubleshooting](TROUBLESHOOTING.md) – Fixes for common issues.
