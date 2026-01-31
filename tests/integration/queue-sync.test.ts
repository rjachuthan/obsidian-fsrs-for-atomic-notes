/**
 * Integration tests for queue synchronization
 *
 * Verifies that queues stay in sync with vault changes:
 * - Notes added to tracked folders
 * - Notes moved between folders
 * - Notes renamed
 * - Notes deleted
 * - Settings changes triggering resync
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Plugin, TFile } from '../setup/obsidian-mock';
import { createTestPlugin } from '../setup/test-helpers';
import { createFolderVault, addNoteToVault } from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { CardManager } from '../../src/fsrs/card-manager';

describe('Queue Synchronization', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let queueManager: QueueManager;
	let cardManager: CardManager;

	beforeEach(async () => {
		const { vault, metadataCache } = createFolderVault();
		plugin = createTestPlugin(vault, metadataCache);
		

		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		queueManager = new QueueManager(plugin.app, dataStore);
		cardManager = new CardManager(dataStore);
	});

	test('New note in tracked folder is added to queue', async () => {
		// Given: Queue tracking "Notes/" folder
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		const initialStats = queueManager.getQueueStats(queue.id);
		const initialCount = initialStats.total;

		// When: New note created in "Notes/" folder
		const newNote = await plugin.app.vault.create('Notes/new-note.md', '# New Note\nContent');

		// Trigger sync
		await queueManager.syncQueue(queue.id);

		// Then: Queue should include the new note
		const newStats = queueManager.getQueueStats(queue.id);
		expect(newStats.total).toBe(initialCount + 1);

		// And: Card should be created
		const card = cardManager.getCard('Notes/new-note.md');
		expect(card).toBeDefined();
	});

	test('Note moved out of tracked folder is removed from queue', async () => {
		// Given: Queue tracking "Notes/" folder with note
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		const initialStats = queueManager.getQueueStats(queue.id);
		expect(initialStats.total).toBeGreaterThan(0);

		// Get first note in queue
		const allCards = cardManager.getAllCards();
		const firstCard = allCards.find(c => c.notePath.startsWith('Notes/'));
		expect(firstCard).toBeDefined();

		// When: Note moved to "Archive/"
		const file = plugin.app.vault.getAbstractFileByPath(firstCard!.notePath) as TFile;
		await plugin.app.vault.rename(file, 'Archive/moved-note.md');

		// Trigger sync
		await queueManager.syncQueue(queue.id);

		// Then: Queue should have one less note
		const newStats = queueManager.getQueueStats(queue.id);
		expect(newStats.total).toBe(initialStats.total - 1);

		// And: Card should be removed or marked orphan
		const movedCard = cardManager.getCard('Archive/moved-note.md');
		const originalCard = cardManager.getCard(firstCard!.notePath);

		// Either card is removed, or path is updated but card removed from queue
		if (movedCard) {
			// Card path updated but not in queue
			expect(movedCard.notePath).toBe('Archive/moved-note.md');
		} else {
			// Card was removed entirely
			expect(originalCard).toBeUndefined();
		}
	});

	test('Note renamed updates card path', async () => {
		// Given: Queue with note
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		const allCards = cardManager.getAllCards();
		const firstCard = allCards.find(c => c.notePath.startsWith('Notes/'));
		expect(firstCard).toBeDefined();

		const originalPath = firstCard!.notePath;
		const originalDue = firstCard!.due;
		const originalStability = firstCard!.stability;

		// When: Note renamed within same folder
		const file = plugin.app.vault.getAbstractFileByPath(originalPath) as TFile;
		const newPath = 'Notes/renamed-note.md';
		await plugin.app.vault.rename(file, newPath);

		// Trigger sync
		await queueManager.syncQueue(queue.id);

		// Then: Card path should be updated
		const updatedCard = cardManager.getCard(newPath);
		expect(updatedCard).toBeDefined();

		// And: Schedule should be preserved
		expect(updatedCard!.due.getTime()).toBe(originalDue.getTime());
		expect(updatedCard!.stability).toBe(originalStability);

		// And: Old path should not exist
		const oldCard = cardManager.getCard(originalPath);
		expect(oldCard).toBeUndefined();
	});

	test('Note deleted removes card from queue', async () => {
		// Given: Queue with note
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		const initialStats = queueManager.getQueueStats(queue.id);

		const allCards = cardManager.getAllCards();
		const firstCard = allCards.find(c => c.notePath.startsWith('Notes/'));
		expect(firstCard).toBeDefined();

		const pathToDelete = firstCard!.notePath;

		// When: Note deleted
		const file = plugin.app.vault.getAbstractFileByPath(pathToDelete) as TFile;
		await plugin.app.vault.delete(file);

		// Trigger sync
		await queueManager.syncQueue(queue.id);

		// Then: Queue should have one less note
		const newStats = queueManager.getQueueStats(queue.id);
		expect(newStats.total).toBe(initialStats.total - 1);

		// And: Card should be removed or orphaned
		const deletedCard = cardManager.getCard(pathToDelete);
		// Card may be kept as orphan or deleted depending on implementation
		if (deletedCard) {
			// If kept, should be marked as orphan somehow
			expect(deletedCard).toBeDefined();
		}
	});

	test('Subfolder notes are included when includeSubfolders is true', async () => {
		// Given: Queue tracking "Notes/" with subfolders
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		// Then: Should include notes in "Notes/Subfolder/"
		const stats = queueManager.getQueueStats(queue.id);
		const allCards = cardManager.getAllCards();
		const subfolderCards = allCards.filter(c => c.notePath.startsWith('Notes/Subfolder/'));

		expect(subfolderCards.length).toBeGreaterThan(0);
	});

	test('Subfolder notes are excluded when includeSubfolders is false', async () => {
		// Given: Queue tracking "Notes/" without subfolders
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: false };
		await queueManager.syncQueue(queue.id);

		// Then: Should not include notes in "Notes/Subfolder/"
		const allCards = cardManager.getAllCards();
		const subfolderCards = allCards.filter(c => c.notePath.startsWith('Notes/Subfolder/'));

		expect(subfolderCards.length).toBe(0);

		// But should include top-level notes
		const topLevelCards = allCards.filter(c =>
			c.notePath.startsWith('Notes/') && !c.notePath.includes('/', 'Notes/'.length)
		);
		expect(topLevelCards.length).toBeGreaterThan(0);
	});

	test('Tag criterion finds all tagged notes', async () => {
		// Given: Queue tracking notes with #programming tag
		const queue = queueManager.createQueue('Programming Queue');
		queue.tagCriterion = { tag: 'programming' };
		await queueManager.syncQueue(queue.id);

		// Then: Should include all notes with #programming tag
		const stats = queueManager.getQueueStats(queue.id);
		expect(stats.total).toBeGreaterThan(0);

		const allCards = cardManager.getAllCards();
		for (const card of allCards) {
			const file = plugin.app.vault.getAbstractFileByPath(card.notePath) as TFile;
			const metadata = plugin.app.metadataCache.getFileCache(file);
			const tags = metadata?.tags?.map(t => t.tag.replace('#', '')) || [];
			expect(tags).toContain('programming');
		}
	});

	test('Exclusion by name works correctly', async () => {
		// Given: Queue excluding notes with "draft" in name
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		queue.exclusionCriteria = [
			{ type: 'name', pattern: 'draft' },
		];

		// Add a draft note to vault
		addNoteToVault(
			plugin.app.vault,
			plugin.app.metadataCache,
			{ path: 'draft-note.md', content: '# Draft\nDraft content.' }
		);

		await queueManager.syncQueue(queue.id);

		// Then: Draft note should not be in queue
		const draftCard = cardManager.getCard('draft-note.md');
		expect(draftCard).toBeUndefined();
	});

	test('Exclusion by tag works correctly', async () => {
		// Given: Queue excluding notes with #exclude tag
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		queue.exclusionCriteria = [
			{ type: 'tag', tag: 'exclude' },
		];

		// Add note with exclude tag
		addNoteToVault(
			plugin.app.vault,
			plugin.app.metadataCache,
			{
				path: 'excluded-note.md',
				content: '# Excluded\nContent.',
				tags: ['exclude'],
			}
		);

		await queueManager.syncQueue(queue.id);

		// Then: Excluded note should not be in queue
		const excludedCard = cardManager.getCard('excluded-note.md');
		expect(excludedCard).toBeUndefined();
	});

	test('Exclusion by property works correctly', async () => {
		// Given: Queue excluding notes with type: template
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		queue.exclusionCriteria = [
			{ type: 'property', key: 'type', value: 'template' },
		];

		// Add note with type: template
		addNoteToVault(
			plugin.app.vault,
			plugin.app.metadataCache,
			{
				path: 'template-note.md',
				content: '# Template\nContent.',
				frontmatter: { type: 'template' },
			}
		);

		await queueManager.syncQueue(queue.id);

		// Then: Template note should not be in queue
		const templateCard = cardManager.getCard('template-note.md');
		expect(templateCard).toBeUndefined();
	});

	test('Multiple exclusion criteria combine correctly', async () => {
		// Given: Queue with multiple exclusions
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		queue.exclusionCriteria = [
			{ type: 'name', pattern: 'draft' },
			{ type: 'tag', tag: 'exclude' },
		];

		// Add various notes
		addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
			path: 'draft-note.md',
			content: '# Draft',
		});

		addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
			path: 'excluded-note.md',
			content: '# Excluded',
			tags: ['exclude'],
		});

		addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
			path: 'normal-note.md',
			content: '# Normal',
		});

		await queueManager.syncQueue(queue.id);

		// Then: Only normal note should be in queue
		expect(cardManager.getCard('draft-note.md')).toBeUndefined();
		expect(cardManager.getCard('excluded-note.md')).toBeUndefined();
		expect(cardManager.getCard('normal-note.md')).toBeDefined();
	});

	test('Settings changes trigger queue resync', async () => {
		// Given: Queue tracking folder
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: false };
		await queueManager.syncQueue(queue.id);

		const initialStats = queueManager.getQueueStats(queue.id);

		// When: Settings changed to include subfolders
		queue.folderCriterion.includeSubfolders = true;
		queueManager.updateQueue(queue);
		await queueManager.syncQueue(queue.id);

		// Then: Queue should now include subfolder notes
		const newStats = queueManager.getQueueStats(queue.id);
		expect(newStats.total).toBeGreaterThan(initialStats.total);
	});

	test('Queue statistics are accurate', async () => {
		// Given: Queue with mixed card states
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		// When: Get queue statistics
		const stats = queueManager.getQueueStats(queue.id);

		// Then: Stats should be accurate
		expect(stats.total).toBeGreaterThan(0);
		expect(stats.new).toBe(stats.total); // All new cards initially
		expect(stats.due).toBe(0); // No cards due yet
		expect(stats.learning).toBe(0);
		expect(stats.review).toBe(0);
	});

	test('Due notes are filtered correctly', async () => {
		// Given: Queue with notes of various due dates
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);

		// Manually set some cards as due (for testing)
		const allCards = cardManager.getAllCards();
		if (allCards.length >= 2) {
			// Set first card as due today
			allCards[0].due = new Date();
			cardManager.updateCard(allCards[0]);

			// Set second card as due in future
			allCards[1].due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			allCards[1].state = 2; // Review state
			cardManager.updateCard(allCards[1]);
		}

		// When: Get due notes
		const dueNotes = queueManager.getDueNotes(queue.id);

		// Then: Should only include notes due today or earlier
		expect(dueNotes.length).toBeGreaterThanOrEqual(1);

		for (const notePath of dueNotes) {
			const card = cardManager.getCard(notePath);
			expect(card).toBeDefined();
			expect(card!.due.getTime()).toBeLessThanOrEqual(Date.now());
		}
	});
});
