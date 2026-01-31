/**
 * Test fixtures for creating sample vault data
 *
 * Provides factory functions to create test vaults with various configurations
 * of notes, folders, tags, and metadata.
 */

import { Vault, TFile, MetadataCache, CachedMetadata } from '../setup/obsidian-mock';

export interface TestNote {
	path: string;
	content: string;
	tags?: string[];
	frontmatter?: Record<string, unknown>;
}

/**
 * Create a test vault with sample notes
 */
export function createTestVault(notes: TestNote[]): { vault: Vault; metadataCache: MetadataCache } {
	const vault = new Vault();
	const metadataCache = new MetadataCache();

	for (const note of notes) {
		const file = vault.addFile(note.path, note.content);

		// Build metadata
		const metadata: CachedMetadata = {};

		if (note.tags) {
			metadata.tags = note.tags.map((tag, idx) => ({
				tag: tag.startsWith('#') ? tag : `#${tag}`,
				position: {
					start: { line: idx, col: 0 },
					end: { line: idx, col: tag.length },
				},
			}));
		}

		if (note.frontmatter) {
			metadata.frontmatter = note.frontmatter;
		}

		metadataCache.setFileCache(file, metadata);
	}

	return { vault, metadataCache };
}

/**
 * Sample notes for testing folder-based queues
 */
export const FOLDER_NOTES: TestNote[] = [
	{
		path: 'Notes/note1.md',
		content: '# Note 1\nThis is a note about JavaScript.',
		tags: ['programming'],
	},
	{
		path: 'Notes/note2.md',
		content: '# Note 2\nThis is a note about TypeScript.',
		tags: ['programming', 'typescript'],
	},
	{
		path: 'Notes/Subfolder/note3.md',
		content: '# Note 3\nThis is a nested note.',
		tags: ['nested'],
	},
	{
		path: 'Archive/note4.md',
		content: '# Note 4\nThis is an archived note.',
		tags: ['archive'],
	},
	{
		path: 'Daily/2024-01-01.md',
		content: '# Daily Note\nToday I learned about FSRS.',
		tags: ['daily'],
	},
];

/**
 * Sample notes for testing tag-based queues
 */
export const TAG_NOTES: TestNote[] = [
	{
		path: 'note1.md',
		content: '# Note 1\nContent about math #mathematics',
		tags: ['mathematics'],
	},
	{
		path: 'note2.md',
		content: '# Note 2\nContent about physics #physics #science',
		tags: ['physics', 'science'],
	},
	{
		path: 'note3.md',
		content: '# Note 3\nContent about chemistry #chemistry #science',
		tags: ['chemistry', 'science'],
	},
	{
		path: 'note4.md',
		content: '# Note 4\nContent about biology',
		tags: ['biology'],
	},
];

/**
 * Sample notes with exclusion criteria
 */
export const EXCLUSION_NOTES: TestNote[] = [
	{
		path: 'Notes/important.md',
		content: '# Important\nImportant note.',
		tags: ['important'],
	},
	{
		path: 'Notes/draft.md',
		content: '# Draft\nDraft note.',
		tags: ['draft'],
	},
	{
		path: 'Notes/template.md',
		content: '# Template\nTemplate note.',
		frontmatter: { type: 'template' },
	},
	{
		path: 'Notes/regular.md',
		content: '# Regular\nRegular note.',
		tags: ['regular'],
	},
	{
		path: 'Notes/excluded-by-tag.md',
		content: '# Excluded\nExcluded by tag.',
		tags: ['exclude'],
	},
];

/**
 * Sample notes with various due dates (for queue testing)
 */
export const SCHEDULED_NOTES: TestNote[] = [
	{
		path: 'Notes/overdue1.md',
		content: '# Overdue 1\nOverdue by 3 days.',
		tags: ['review'],
	},
	{
		path: 'Notes/overdue2.md',
		content: '# Overdue 2\nOverdue by 1 day.',
		tags: ['review'],
	},
	{
		path: 'Notes/due-today.md',
		content: '# Due Today\nDue today.',
		tags: ['review'],
	},
	{
		path: 'Notes/due-tomorrow.md',
		content: '# Due Tomorrow\nDue tomorrow.',
		tags: ['review'],
	},
	{
		path: 'Notes/new.md',
		content: '# New\nNever reviewed.',
		tags: ['review'],
	},
];

/**
 * Create a minimal test vault with just a few notes
 */
export function createMinimalVault(): { vault: Vault; metadataCache: MetadataCache } {
	return createTestVault([
		{
			path: 'note1.md',
			content: '# Note 1\nFirst note.',
		},
		{
			path: 'note2.md',
			content: '# Note 2\nSecond note.',
		},
		{
			path: 'note3.md',
			content: '# Note 3\nThird note.',
		},
	]);
}

/**
 * Create a vault with folder structure
 */
export function createFolderVault(): { vault: Vault; metadataCache: MetadataCache } {
	return createTestVault(FOLDER_NOTES);
}

/**
 * Create a vault with tagged notes
 */
export function createTagVault(): { vault: Vault; metadataCache: MetadataCache } {
	return createTestVault(TAG_NOTES);
}

/**
 * Create a vault with notes that should be excluded
 */
export function createExclusionVault(): { vault: Vault; metadataCache: MetadataCache } {
	return createTestVault(EXCLUSION_NOTES);
}

/**
 * Create a vault with scheduled notes
 */
export function createScheduledVault(): { vault: Vault; metadataCache: MetadataCache } {
	return createTestVault(SCHEDULED_NOTES);
}

/**
 * Helper to add a note to an existing vault
 */
export function addNoteToVault(
	vault: Vault,
	metadataCache: MetadataCache,
	note: TestNote
): TFile {
	const file = vault.addFile(note.path, note.content);

	const metadata: CachedMetadata = {};
	if (note.tags) {
		metadata.tags = note.tags.map((tag, idx) => ({
			tag: tag.startsWith('#') ? tag : `#${tag}`,
			position: {
				start: { line: idx, col: 0 },
				end: { line: idx, col: tag.length },
			},
		}));
	}
	if (note.frontmatter) {
		metadata.frontmatter = note.frontmatter;
	}

	metadataCache.setFileCache(file, metadata);
	return file;
}
