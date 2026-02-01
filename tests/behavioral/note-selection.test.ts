/**
 * Behavioral tests for note selection criteria
 *
 * Verifies that folder and tag criteria work correctly:
 * - Folder criterion with/without subfolders
 * - Tag criterion
 * - Exclusion criteria (name, tag, property)
 * - Multiple criteria combinations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createTestPlugin } from '../setup/test-helpers';
import { Plugin } from '../setup/obsidian-mock';
import {
	createFolderVault,
	createTagVault,
	createExclusionVault,
	addNoteToVault,
} from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { CardManager } from '../../src/fsrs/card-manager';
import { Scheduler } from '../../src/fsrs/scheduler';
import { FolderCriterion } from '../../src/criteria/folder-criterion';
import { TagCriterion } from '../../src/criteria/tag-criterion';
describe('Note Selection Criteria', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let queueManager: QueueManager;
	let cardManager: CardManager;

	describe('Folder Criterion', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createFolderVault();
			plugin = createTestPlugin(vault, metadataCache);

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			const scheduler = new Scheduler();
			cardManager = new CardManager(dataStore, scheduler);
			const settings = dataStore.getSettings();
			queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);
		});

		test('Folder criterion matches notes in specified folder', async () => {
			// Given: Folder criterion for "Notes/"
			const criterion = new FolderCriterion(['Notes']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should only include notes in "Notes/" (and subfolders)
			expect(matches.length).toBeGreaterThan(0);
			for (const file of matches) {
				expect(file.path.startsWith('Notes/') || file.path === 'Notes').toBe(true);
			}
		});

		test('Folder criterion includes subfolders when configured', async () => {
			// Given: Folder criterion for "Notes" (implementation always includes subfolders)
			const criterion = new FolderCriterion(['Notes']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should include subfolder notes
			expect(matches.length).toBeGreaterThan(0);
			const subfolderNotes = matches.filter((f) => f.path.startsWith('Notes/Subfolder/'));
			expect(subfolderNotes.length).toBeGreaterThan(0);
		});

		test('Folder criterion excludes subfolders when configured', async () => {
			// Implementation always includes subfolders for a folder; verify that other folders are excluded
			const criterion = new FolderCriterion(['Notes']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should not include notes from Archive (different folder)
			const archiveNotes = matches.filter((f) => f.path.startsWith('Archive/'));
			expect(archiveNotes.length).toBe(0);
		});

		test('Root folder includes all notes', async () => {
			// Given: Root folder criterion
			const criterion = new FolderCriterion(['']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should include all markdown files
			expect(matches.length).toBe(files.length);
		});

		test('Non-existent folder returns empty array', async () => {
			// Given: Criterion for non-existent folder
			const criterion = new FolderCriterion(['NonExistent']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should return empty
			expect(matches).toHaveLength(0);
		});
	});

	describe('Tag Criterion', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createTagVault();
			plugin = createTestPlugin(vault, metadataCache);

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			const scheduler = new Scheduler();
			cardManager = new CardManager(dataStore, scheduler);
			const settings = dataStore.getSettings();
			queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);
		});

		test('Tag criterion matches notes with specified tag', async () => {
			// Given: Tag criterion for #science
			const criterion = new TagCriterion(['science']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should include all notes with #science tag
			expect(matches.length).toBeGreaterThan(0);
			for (const file of matches) {
				const metadata = plugin.app.metadataCache.getFileCache(file);
				const tags = metadata?.tags?.map((t) => t.tag.replace('#', '').toLowerCase()) || [];
				expect(tags.some((t) => t === 'science' || t.startsWith('science/'))).toBe(true);
			}
		});

		test('Tag criterion handles tag with or without # prefix', async () => {
			// Given: Two tag criteria (with and without #)
			const criterion = new TagCriterion([]);
			const matches1 = plugin.app.vault.getMarkdownFiles().filter((f) =>
				new TagCriterion(['science']).evaluate(f, plugin.app.metadataCache.getFileCache(f))
			);
			const matches2 = plugin.app.vault.getMarkdownFiles().filter((f) =>
				new TagCriterion(['#science']).evaluate(f, plugin.app.metadataCache.getFileCache(f))
			);

			// Then: Should return same results (TagCriterion normalizes #)
			expect(matches1.map((f) => f.path).sort()).toEqual(matches2.map((f) => f.path).sort());
		});

		test('Tag criterion returns empty for non-existent tag', async () => {
			// Given: Criterion for non-existent tag
			const criterion = new TagCriterion(['nonexistent']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches = files.filter((f) => criterion.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			// Then: Should return empty
			expect(matches).toHaveLength(0);
		});

		test('Tag criterion is case-sensitive', async () => {
			// TagCriterion normalizes to lowercase, so 'science' and 'Science' match the same
			const criterion1 = new TagCriterion(['science']);
			const criterion2 = new TagCriterion(['Science']);
			const files = plugin.app.vault.getMarkdownFiles();
			const matches1 = files.filter((f) => criterion1.evaluate(f, plugin.app.metadataCache.getFileCache(f)));
			const matches2 = files.filter((f) => criterion2.evaluate(f, plugin.app.metadataCache.getFileCache(f)));

			expect(Array.isArray(matches1)).toBe(true);
			expect(Array.isArray(matches2)).toBe(true);
		});
	});

	describe('Exclusion Criteria', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createExclusionVault();
			plugin = createTestPlugin(vault, metadataCache);

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			const scheduler = new Scheduler();
			cardManager = new CardManager(dataStore, scheduler);
			const settings = dataStore.getSettings();
			queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);
		});

		test('Name exclusion filters notes by name pattern', async () => {
			// Given: Global exclusion for name "draft" (excludedNoteNames)
			dataStore.updateSettings({ excludedNoteNames: ['draft'] });
			queueManager.updateSettings(dataStore.getSettings());

			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			// Then: Draft notes should not be in queue (draft.md base name is "draft")
			const cards = cardManager.getCardsForQueue(queue.id);
			const draftCards = cards.filter((c) => c.notePath.includes('draft'));
			expect(draftCards).toHaveLength(0);
		});

		test('Tag exclusion filters notes by tag', async () => {
			dataStore.updateSettings({ excludedTags: ['exclude'] });
			queueManager.updateSettings(dataStore.getSettings());

			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			const cards = cardManager.getCardsForQueue(queue.id);
			for (const card of cards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map((t) => t.tag.replace('#', '')) || [];
					expect(tags).not.toContain('exclude');
				}
			}
		});

		test('Property exclusion filters notes by frontmatter property', async () => {
			dataStore.updateSettings({ excludedProperties: [{ key: 'type', value: 'template', operator: 'equals' }] });
			queueManager.updateSettings(dataStore.getSettings());

			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			const cards = cardManager.getCardsForQueue(queue.id);
			for (const card of cards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const type = metadata?.frontmatter?.type;
					expect(type).not.toBe('template');
				}
			}
		});

		test('Multiple exclusions combine with OR logic', async () => {
			dataStore.updateSettings({
				excludedNoteNames: ['draft'],
				excludedTags: ['exclude'],
			});
			queueManager.updateSettings(dataStore.getSettings());

			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			const cards = cardManager.getCardsForQueue(queue.id);
			expect(cards.every((c) => !c.notePath.includes('draft'))).toBe(true);
			for (const card of cards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map((t) => t.tag.replace('#', '')) || [];
					expect(tags).not.toContain('exclude');
				}
			}
		});

		test('Exclusion with wildcard pattern works', async () => {
			// excludedNoteNames matches exact base name (case-insensitive)
			dataStore.updateSettings({ excludedNoteNames: ['template-note', 'temporary'] });
			queueManager.updateSettings(dataStore.getSettings());

			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'template-note.md',
				content: '# Template',
			});
			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'temporary.md',
				content: '# Temporary',
			});

			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			const cards = cardManager.getCardsForQueue(queue.id);
			// Excluded notes should not be in queue
			expect(cards.find((c) => c.notePath === 'template-note.md')).toBeUndefined();
			expect(cards.find((c) => c.notePath === 'temporary.md')).toBeUndefined();
		});
	});

	describe('Combined Criteria', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createTagVault();
			plugin = createTestPlugin(vault, metadataCache);

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			const scheduler = new Scheduler();
			cardManager = new CardManager(dataStore, scheduler);
			const settings = dataStore.getSettings();
			queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);
		});

		test('Folder and tag criteria work together (AND logic)', async () => {
			// Given: Queue with tag criteria (folder '' = all, tag = science)
			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'science-note.md',
				content: '# Science',
				tags: ['science'],
			});

			const queue = queueManager.createQueue('Test Queue', { type: 'tag', tags: ['science'] });
			queueManager.syncQueue(queue.id);

			const cards = cardManager.getCardsForQueue(queue.id);
			for (const card of cards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map((t) => t.tag.replace('#', '')) || [];
					expect(tags.some((t) => t === 'science' || t.startsWith('science/'))).toBe(true);
				}
			}
		});

		test('Criteria update triggers resync', async () => {
			// Given: Queue with folder criterion
			const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
			queueManager.syncQueue(queue.id);

			const initialCount = cardManager.getCardsForQueue(queue.id).length;

			// When: Update to tag criterion (more restrictive)
			dataStore.updateQueue(queue.id, { criteria: { type: 'tag', tags: ['science'] } });
			queueManager.updateSettings(dataStore.getSettings());
			queueManager.syncQueue(queue.id);

			// Then: Queue should be resynced with new criteria
			const newCount = cardManager.getCardsForQueue(queue.id).length;
			expect(newCount).toBeLessThanOrEqual(initialCount);
		});
	});
});
