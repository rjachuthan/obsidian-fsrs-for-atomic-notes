# FSRS for Atomic Notes – Settings

All options are under **Settings** → **FSRS for Atomic Notes**.

## Note selection

- **Selection mode**  
  - **Folder**: Include notes in the given folders.  
  - **Tag**: Include notes that have the given tags.

- **Tracked folders**  
  List of folder paths (e.g. `Notes/Concepts`). Only used when selection mode is **Folder**. Subfolders are included.

- **Tracked tags**  
  List of tags (e.g. `#learn`). Only used when selection mode is **Tag**. Notes that have any of these tags are included.

## Exclusions

- **Excluded note names**  
  Exact note names (e.g. `Index.md`) to never add to any queue.

- **Excluded tags**  
  Notes with any of these tags are excluded even if they match tracked folders/tags.

- **Excluded properties**  
  Frontmatter rules (key, value, operator) to exclude notes. For example, `status: draft` with operator **equals** excludes notes with `status: draft`.

## Review

- **Queue order**  
  How to order the due list:
  - **mixed-anki** – Learning first, then a mix of new and review (respects new/review limits).
  - **due-overdue-first** – Overdue first, then by due date.
  - **due-chronological** – Strictly by due date.
  - **state-priority** – Learning → Relearning → Review → New, then by due.
  - **retrievability-asc** – Lowest retrievability first.
  - **load-balancing** – By due date, capped by max reviews per day.
  - **random** – Random order.
  - **difficulty-desc** / **difficulty-asc** – By card difficulty.

- **New cards per day**  
  Max new cards per day when using **mixed-anki** (or strategies that use this limit). Default 20.

- **Max reviews per day**  
  Max reviews per day when using **mixed-anki** or **load-balancing**. Default 200.

## Display

- **Show note stats**  
  In the sidebar, show current note’s state, stability, difficulty, retrievability, reps, lapses.

- **Show predicted intervals**  
  On rating buttons, show the next interval for each rating (e.g. “Good · 5 days”).

- **Show session stats**  
  In the sidebar, show reviewed count and rating breakdown (A/H/G/E).

## UI

- **Sidebar position**  
  **Left** or **Right** for the review sidebar.

## FSRS parameters (advanced)

If present, these override the built-in FSRS defaults:

- **Request retention** – Target retention (e.g. 0.9).
- **Maximum interval** – Cap on days between reviews.
- **Enable fuzz** – Add slight randomness to intervals.

Defaults are tuned for general use; most users can leave these blank.
