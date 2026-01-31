/**
 * NoteResolver - Resolves notes matching selection criteria
 * Integrates with Obsidian's vault and metadata cache
 */

import type { App, TFile, CachedMetadata } from "obsidian";
import type { PluginSettings, SelectionCriteria } from "../types";
import { FolderCriterion } from "../criteria/folder-criterion";
import { TagCriterion } from "../criteria/tag-criterion";
import { CombinedExclusionCriterion } from "../criteria/exclusion-criteria";

/**
 * NoteResolver resolves notes from selection criteria
 */
export class NoteResolver {
	private app: App;
	private settings: PluginSettings;

	// Cached criteria instances
	private folderCriterion: FolderCriterion;
	private tagCriterion: TagCriterion;
	private exclusionCriterion: CombinedExclusionCriterion;

	constructor(app: App, settings: PluginSettings) {
		this.app = app;
		this.settings = settings;

		// Initialize criteria
		this.folderCriterion = new FolderCriterion(settings.trackedFolders);
		this.tagCriterion = new TagCriterion(settings.trackedTags);
		this.exclusionCriterion = new CombinedExclusionCriterion(
			settings.excludedNoteNames,
			settings.excludedTags,
			settings.excludedProperties
		);
	}

	/**
	 * Update settings (called when settings change)
	 */
	updateSettings(settings: PluginSettings): void {
		this.settings = settings;
		this.folderCriterion.updateFolders(settings.trackedFolders);
		this.tagCriterion.updateTags(settings.trackedTags);
		this.exclusionCriterion.updateNames(settings.excludedNoteNames);
		this.exclusionCriterion.updateTags(settings.excludedTags);
		this.exclusionCriterion.updateProperties(settings.excludedProperties);
	}

	/**
	 * Get all notes matching the global selection criteria
	 */
	resolveNotes(): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const matchingFiles: TFile[] = [];

		for (const file of allFiles) {
			if (this.matchesNote(file)) {
				matchingFiles.push(file);
			}
		}

		return matchingFiles;
	}

	/**
	 * Resolve notes for specific criteria (for queue-specific selection)
	 */
	resolveNotesForCriteria(criteria: SelectionCriteria): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();
		const matchingFiles: TFile[] = [];

		for (const file of allFiles) {
			if (this.matchesNoteCriteria(file, criteria)) {
				matchingFiles.push(file);
			}
		}

		return matchingFiles;
	}

	/**
	 * Check if a specific note matches the global criteria
	 */
	matchesNote(file: TFile): boolean {
		// Skip non-markdown files
		if (file.extension !== "md") {
			return false;
		}

		// Get metadata
		const metadata = this.app.metadataCache.getFileCache(file);

		// Check exclusions first
		if (this.exclusionCriterion.evaluate(file, metadata)) {
			return false;
		}

		// Check inclusion based on selection mode
		if (this.settings.selectionMode === "folder") {
			return this.folderCriterion.evaluate(file, metadata);
		} else {
			return this.tagCriterion.evaluate(file, metadata);
		}
	}

	/**
	 * Check if a note matches specific criteria
	 */
	matchesNoteCriteria(file: TFile, criteria: SelectionCriteria): boolean {
		// Skip non-markdown files
		if (file.extension !== "md") {
			return false;
		}

		// Get metadata
		const metadata = this.app.metadataCache.getFileCache(file);

		// Check exclusions first (always apply global exclusions)
		if (this.exclusionCriterion.evaluate(file, metadata)) {
			return false;
		}

		// Check inclusion based on criteria type
		switch (criteria.type) {
			case "folder": {
				if (!criteria.folders || criteria.folders.length === 0) {
					return false;
				}
				const folderCriterion = new FolderCriterion(criteria.folders);
				return folderCriterion.evaluate(file, metadata);
			}

			case "tag": {
				if (!criteria.tags || criteria.tags.length === 0) {
					return false;
				}
				const tagCriterion = new TagCriterion(criteria.tags);
				return tagCriterion.evaluate(file, metadata);
			}

			case "custom":
				// Future extensibility: handle custom criteria
				return false;

			default:
				return false;
		}
	}

	/**
	 * Get count of matching notes without loading all
	 */
	getMatchingCount(): number {
		const allFiles = this.app.vault.getMarkdownFiles();
		let count = 0;

		for (const file of allFiles) {
			if (this.matchesNote(file)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Get count of matching notes for specific criteria
	 */
	getMatchingCountForCriteria(criteria: SelectionCriteria): number {
		const allFiles = this.app.vault.getMarkdownFiles();
		let count = 0;

		for (const file of allFiles) {
			if (this.matchesNoteCriteria(file, criteria)) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Check if a path matches the current selection criteria
	 */
	matchesPath(path: string): boolean {
		const tfile = this.app.vault.getFileByPath(path);
		if (!tfile) {
			return false;
		}
		return this.matchesNote(tfile);
	}

	/**
	 * Get file by path
	 */
	getFile(path: string): TFile | null {
		return this.app.vault.getFileByPath(path);
	}

	/**
	 * Get metadata for a file
	 */
	getMetadata(file: TFile): CachedMetadata | null {
		return this.app.metadataCache.getFileCache(file);
	}
}
