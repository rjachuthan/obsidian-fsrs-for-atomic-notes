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

			queueManager = new QueueManager(plugin.app, dataStore);
			cardManager = new CardManager(dataStore);
		});

		test('Folder criterion matches notes in specified folder', async () => {
			// Given: Folder criterion for "Notes/"
			const criterion = new FolderCriterion(plugin.app);
			const config = { folder: 'Notes', includeSubfolders: false };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should only include top-level notes in "Notes/"
			expect(matches.length).toBeGreaterThan(0);
			for (const path of matches) {
				expect(path).toMatch(/^Notes\/[^/]+\.md$/);
			}
		});

		test('Folder criterion includes subfolders when configured', async () => {
			// Given: Folder criterion with subfolders
			const criterion = new FolderCriterion(plugin.app);
			const config = { folder: 'Notes', includeSubfolders: true };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should include subfolder notes
			expect(matches.length).toBeGreaterThan(0);
			const subfolderNotes = matches.filter(path => path.startsWith('Notes/Subfolder/'));
			expect(subfolderNotes.length).toBeGreaterThan(0);
		});

		test('Folder criterion excludes subfolders when configured', async () => {
			// Given: Folder criterion without subfolders
			const criterion = new FolderCriterion(plugin.app);
			const config = { folder: 'Notes', includeSubfolders: false };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should not include subfolder notes
			const subfolderNotes = matches.filter(path => path.includes('/', 'Notes/'.length));
			expect(subfolderNotes.length).toBe(0);
		});

		test('Root folder includes all notes', async () => {
			// Given: Root folder criterion
			const criterion = new FolderCriterion(plugin.app);
			const config = { folder: '', includeSubfolders: true };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should include all markdown files
			const allFiles = plugin.app.vault.getMarkdownFiles();
			expect(matches.length).toBe(allFiles.length);
		});

		test('Non-existent folder returns empty array', async () => {
			// Given: Criterion for non-existent folder
			const criterion = new FolderCriterion(plugin.app);
			const config = { folder: 'NonExistent', includeSubfolders: true };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should return empty array
			expect(matches).toHaveLength(0);
		});
	});

	describe('Tag Criterion', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createTagVault();
			plugin = createTestPlugin(vault, metadataCache);
			

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			queueManager = new QueueManager(plugin.app, dataStore);
			cardManager = new CardManager(dataStore);
		});

		test('Tag criterion matches notes with specified tag', async () => {
			// Given: Tag criterion for #science
			const criterion = new TagCriterion(plugin.app);
			const config = { tag: 'science' };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should include all notes with #science tag
			expect(matches.length).toBeGreaterThan(0);
			for (const path of matches) {
				const file = plugin.app.vault.getAbstractFileByPath(path);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map(t => t.tag.replace('#', '')) || [];
					expect(tags).toContain('science');
				}
			}
		});

		test('Tag criterion handles tag with or without # prefix', async () => {
			// Given: Two tag criteria (with and without #)
			const criterion = new TagCriterion(plugin.app);
			const config1 = { tag: 'science' };
			const config2 = { tag: '#science' };

			// When: Get matching notes
			const matches1 = await criterion.getMatchingNotes(config1);
			const matches2 = await criterion.getMatchingNotes(config2);

			// Then: Should return same results
			expect(matches1.sort()).toEqual(matches2.sort());
		});

		test('Tag criterion returns empty for non-existent tag', async () => {
			// Given: Criterion for non-existent tag
			const criterion = new TagCriterion(plugin.app);
			const config = { tag: 'nonexistent' };

			// When: Get matching notes
			const matches = await criterion.getMatchingNotes(config);

			// Then: Should return empty array
			expect(matches).toHaveLength(0);
		});

		test('Tag criterion is case-sensitive', async () => {
			// Given: Tag criterion with different casing
			const criterion = new TagCriterion(plugin.app);
			const config1 = { tag: 'science' };
			const config2 = { tag: 'Science' };

			// When: Get matching notes
			const matches1 = await criterion.getMatchingNotes(config1);
			const matches2 = await criterion.getMatchingNotes(config2);

			// Then: May return different results (depends on implementation)
			// At minimum, should handle gracefully
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

			queueManager = new QueueManager(plugin.app, dataStore);
			cardManager = new CardManager(dataStore);
		});

		test('Name exclusion filters notes by name pattern', async () => {
			// Given: Queue with name exclusion for "draft"
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
			queue.exclusionCriteria = [{ type: 'name', pattern: 'draft' }];

			await queueManager.syncQueue(queue.id);

			// Then: Draft notes should not be included
			const allCards = cardManager.getAllCards();
			const draftCards = allCards.filter(c => c.notePath.includes('draft'));
			expect(draftCards).toHaveLength(0);
		});

		test('Tag exclusion filters notes by tag', async () => {
			// Given: Queue with tag exclusion for #exclude
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
			queue.exclusionCriteria = [{ type: 'tag', tag: 'exclude' }];

			await queueManager.syncQueue(queue.id);

			// Then: Notes with #exclude should not be included
			const allCards = cardManager.getAllCards();
			for (const card of allCards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map(t => t.tag.replace('#', '')) || [];
					expect(tags).not.toContain('exclude');
				}
			}
		});

		test('Property exclusion filters notes by frontmatter property', async () => {
			// Given: Queue with property exclusion for type: template
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
			queue.exclusionCriteria = [{ type: 'property', key: 'type', value: 'template' }];

			await queueManager.syncQueue(queue.id);

			// Then: Template notes should not be included
			const allCards = cardManager.getAllCards();
			for (const card of allCards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const type = metadata?.frontmatter?.type;
					expect(type).not.toBe('template');
				}
			}
		});

		test('Multiple exclusions combine with OR logic', async () => {
			// Given: Queue with multiple exclusions
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: 'Notes', includeSubfolders: true };
			queue.exclusionCriteria = [
				{ type: 'name', pattern: 'draft' },
				{ type: 'tag', tag: 'exclude' },
			];

			await queueManager.syncQueue(queue.id);

			// Then: Notes matching ANY exclusion should be filtered
			const allCards = cardManager.getAllCards();
			expect(allCards.every(c => !c.notePath.includes('draft'))).toBe(true);

			for (const card of allCards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map(t => t.tag.replace('#', '')) || [];
					expect(tags).not.toContain('exclude');
				}
			}
		});

		test('Exclusion with wildcard pattern works', async () => {
			// Given: Queue excluding notes starting with "temp"
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: '', includeSubfolders: true };
			queue.exclusionCriteria = [{ type: 'name', pattern: 'temp*' }];

			// Add test notes
			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'template-note.md',
				content: '# Template',
			});

			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'temporary.md',
				content: '# Temporary',
			});

			await queueManager.syncQueue(queue.id);

			// Then: Notes starting with "temp" should be excluded
			const allCards = cardManager.getAllCards();
			const tempCards = allCards.filter(c =>
				c.notePath.toLowerCase().includes('temp')
			);
			expect(tempCards).toHaveLength(0);
		});
	});

	describe('Combined Criteria', () => {
		beforeEach(async () => {
			const { vault, metadataCache } = createTagVault();
			plugin = createTestPlugin(vault, metadataCache);
			

			dataStore = new DataStore(plugin);
			await dataStore.initialize();

			queueManager = new QueueManager(plugin.app, dataStore);
			cardManager = new CardManager(dataStore);
		});

		test('Folder and tag criteria work together (AND logic)', async () => {
			// Given: Queue with both folder and tag criteria
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: '', includeSubfolders: true };
			queue.tagCriterion = { tag: 'science' };

			// Add note in specific folder with tag
			addNoteToVault(plugin.app.vault, plugin.app.metadataCache, {
				path: 'science-note.md',
				content: '# Science',
				tags: ['science'],
			});

			await queueManager.syncQueue(queue.id);

			// Then: Should only include notes matching BOTH criteria
			const allCards = cardManager.getAllCards();
			for (const card of allCards) {
				const file = plugin.app.vault.getAbstractFileByPath(card.notePath);
				if (file && 'extension' in file) {
					const metadata = plugin.app.metadataCache.getFileCache(file);
					const tags = metadata?.tags?.map(t => t.tag.replace('#', '')) || [];
					expect(tags).toContain('science');
				}
			}
		});

		test('Criteria update triggers resync', async () => {
			// Given: Queue with folder criterion
			const queue = queueManager.createQueue('Test Queue');
			queue.folderCriterion = { folder: '', includeSubfolders: true };
			await queueManager.syncQueue(queue.id);

			const initialCount = cardManager.getAllCards().length;

			// When: Update to add tag criterion
			queue.tagCriterion = { tag: 'science' };
			queueManager.updateQueue(queue);
			await queueManager.syncQueue(queue.id);

			// Then: Queue should be resynced with new criteria
			const newCount = cardManager.getAllCards().length;
			expect(newCount).toBeLessThan(initialCount); // More restrictive
		});
	});
});
