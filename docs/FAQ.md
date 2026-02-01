# FAQ – FSRS for Atomic Notes

## General

**Do my note files get modified?**  
No. All scheduling data (due dates, stability, difficulty, review history) is stored in the plugin’s data store. Your markdown files are never written to by the plugin.

**What is FSRS?**  
FSRS (Free Spaced Repetition Scheduler) is a modern algorithm that uses stability and difficulty to schedule reviews. The plugin uses the same idea as Anki’s FSRS scheduler but runs entirely inside Obsidian.

**Can I use this on mobile?**  
Yes. The plugin works on Obsidian Mobile (iOS and Android) with touch-friendly buttons and the same commands.

## Queues and notes

**What is a queue?**  
A queue is a named set of notes defined by criteria (e.g. a folder or tag). Each queue has its own due list and statistics. You can have one “Default” queue or many (e.g. “Math”, “Languages”).

**How do I add a note to a queue?**  
If the note matches a queue’s criteria (folder/tag), it’s added automatically when the queue is synced. You can also add the current note manually: Command Palette → **FSRS: Add to queue**, then choose the queue.

**Why don’t I see any notes due?**  
- Check that **Tracked folders** or **Tracked tags** in settings include the notes you want.  
- Open **Manage queues** and ensure the queue is synced (new notes get a “New” card and are due immediately).  
- If you just installed, run **Start review** once so the default queue is created and synced.

**What are “orphans”?**  
Orphans are cards whose note file was deleted or moved. The plugin detects them and can show a list so you can relink or remove the card.

## Ratings and scheduling

**What do Again / Hard / Good / Easy do?**  
They’re the 1–4 ratings. FSRS uses them to update the card’s stability and difficulty and to set the next due date. “Again” resets or lowers stability; “Easy” increases it more than “Good”.

**Can I undo a rating?**  
Yes. During a session, use **Undo last rating** in the sidebar or the corresponding command. Only the last rating in the current session can be undone.

**Why is my next review so far away?**  
FSRS pushes well-known cards further out. If you want more reviews soon, you can lower **Request retention** in advanced FSRS settings (when available), or use a queue order that favors overdue/earlier due cards.

## Data and backups

**Where is my data stored?**  
In Obsidian’s plugin storage (per-vault). The plugin does not store anything inside your note files.

**Does the plugin backup my data?**  
Yes. Before risky writes, the plugin creates a backup and keeps the last 5. You can restore from one of these if something goes wrong (see Troubleshooting).

**Can I export my reviews?**  
Export/import is not built in yet. Your data is in the plugin’s JSON storage; backing up the vault (including `.obsidian`) backs up plugin data too.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for “No notes due”, “Plugin won’t load”, “Missing note during session”, and recovery from corrupted data.
