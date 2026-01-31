/**
 * TagCriterion - Tag-based note selection
 * Evaluates whether a note has one of the tracked tags
 */

import type { TFile, CachedMetadata } from "obsidian";
import type { SelectionCriterion } from "../types";

/**
 * TagCriterion selects notes based on tag presence
 */
export class TagCriterion implements SelectionCriterion {
	readonly id = "tag";
	readonly type = "include" as const;

	private tags: string[];
	private normalizedTags: string[];

	constructor(tags: string[]) {
		this.tags = tags;
		this.normalizedTags = tags.map((t) => this.normalizeTag(t));
	}

	/**
	 * Normalize a tag for comparison
	 * - Remove leading # if present
	 * - Convert to lowercase for case-insensitive matching
	 */
	private normalizeTag(tag: string): string {
		return tag.replace(/^#/, "").toLowerCase();
	}

	/**
	 * Extract all tags from a note's metadata
	 */
	private extractTags(metadata: CachedMetadata | null): string[] {
		if (!metadata) {
			return [];
		}

		const tags: string[] = [];

		// Tags from content (inline tags like #tag)
		if (metadata.tags) {
			for (const tagCache of metadata.tags) {
				tags.push(this.normalizeTag(tagCache.tag));
			}
		}

		// Tags from frontmatter
		if (metadata.frontmatter?.tags) {
			const fmTags = metadata.frontmatter.tags as unknown;
			if (Array.isArray(fmTags)) {
				for (const tag of fmTags) {
					if (typeof tag === "string") {
						tags.push(this.normalizeTag(tag));
					}
				}
			} else if (typeof fmTags === "string") {
				// Single tag as string
				tags.push(this.normalizeTag(fmTags));
			}
		}

		// Also check for singular "tag" property
		if (metadata.frontmatter?.tag) {
			const fmTag = metadata.frontmatter.tag as unknown;
			if (typeof fmTag === "string") {
				tags.push(this.normalizeTag(fmTag));
			}
		}

		return tags;
	}

	/**
	 * Check if a tag matches any tracked tag (including nested tags)
	 */
	private matchesTag(noteTag: string, trackedTag: string): boolean {
		// Exact match
		if (noteTag === trackedTag) {
			return true;
		}

		// Nested tag match: #parent/child matches #parent
		if (noteTag.startsWith(trackedTag + "/")) {
			return true;
		}

		return false;
	}

	/**
	 * Evaluate whether a file matches this criterion
	 */
	evaluate(file: TFile, metadata: CachedMetadata | null): boolean {
		// Skip non-markdown files
		if (file.extension !== "md") {
			return false;
		}

		// If no tags specified, no matches
		if (this.normalizedTags.length === 0) {
			return false;
		}

		// Extract tags from the note
		const noteTags = this.extractTags(metadata);

		// Check if any note tag matches any tracked tag
		return this.normalizedTags.some((trackedTag) =>
			noteTags.some((noteTag) => this.matchesTag(noteTag, trackedTag))
		);
	}

	/**
	 * Update the list of tracked tags
	 */
	updateTags(tags: string[]): void {
		this.tags = tags;
		this.normalizedTags = tags.map((t) => this.normalizeTag(t));
	}

	/**
	 * Get the current list of tags
	 */
	getTags(): string[] {
		return [...this.tags];
	}
}
