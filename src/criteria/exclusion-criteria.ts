/**
 * Exclusion criteria implementations
 * These criteria exclude notes from selection
 */

import type { TFile, CachedMetadata } from "obsidian";
import type { SelectionCriterion, PropertyMatch } from "../types";

/**
 * ExcludeByNameCriterion - Excludes notes with specific names
 */
export class ExcludeByNameCriterion implements SelectionCriterion {
	readonly id = "exclude-by-name";
	readonly type = "exclude" as const;

	private names: string[];
	private normalizedNames: Set<string>;

	constructor(names: string[]) {
		this.names = names;
		this.normalizedNames = new Set(names.map((n) => n.toLowerCase()));
	}

	/**
	 * Get the base name of a file (without extension)
	 */
	private getBaseName(file: TFile): string {
		return file.basename.toLowerCase();
	}

	evaluate(file: TFile, _metadata: CachedMetadata | null): boolean {
		const baseName = this.getBaseName(file);
		return this.normalizedNames.has(baseName);
	}

	updateNames(names: string[]): void {
		this.names = names;
		this.normalizedNames = new Set(names.map((n) => n.toLowerCase()));
	}

	getNames(): string[] {
		return [...this.names];
	}
}

/**
 * ExcludeByTagCriterion - Excludes notes with specific tags
 */
export class ExcludeByTagCriterion implements SelectionCriterion {
	readonly id = "exclude-by-tag";
	readonly type = "exclude" as const;

	private tags: string[];
	private normalizedTags: string[];

	constructor(tags: string[]) {
		this.tags = tags;
		this.normalizedTags = tags.map((t) => this.normalizeTag(t));
	}

	private normalizeTag(tag: string): string {
		return tag.replace(/^#/, "").toLowerCase();
	}

	private extractTags(metadata: CachedMetadata | null): string[] {
		if (!metadata) {
			return [];
		}

		const tags: string[] = [];

		// Tags from content
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
				tags.push(this.normalizeTag(fmTags));
			}
		}

		if (metadata.frontmatter?.tag) {
			const fmTag = metadata.frontmatter.tag as unknown;
			if (typeof fmTag === "string") {
				tags.push(this.normalizeTag(fmTag));
			}
		}

		return tags;
	}

	private matchesTag(noteTag: string, excludeTag: string): boolean {
		// Exact match
		if (noteTag === excludeTag) {
			return true;
		}
		// Nested tag match
		if (noteTag.startsWith(excludeTag + "/")) {
			return true;
		}
		return false;
	}

	evaluate(file: TFile, metadata: CachedMetadata | null): boolean {
		if (this.normalizedTags.length === 0) {
			return false;
		}

		const noteTags = this.extractTags(metadata);

		return this.normalizedTags.some((excludeTag) =>
			noteTags.some((noteTag) => this.matchesTag(noteTag, excludeTag))
		);
	}

	updateTags(tags: string[]): void {
		this.tags = tags;
		this.normalizedTags = tags.map((t) => this.normalizeTag(t));
	}

	getTags(): string[] {
		return [...this.tags];
	}
}

/**
 * ExcludeByPropertyCriterion - Excludes notes with specific frontmatter properties
 */
export class ExcludeByPropertyCriterion implements SelectionCriterion {
	readonly id = "exclude-by-property";
	readonly type = "exclude" as const;

	private properties: PropertyMatch[];

	constructor(properties: PropertyMatch[]) {
		this.properties = properties;
	}

	private matchProperty(
		frontmatter: Record<string, unknown> | undefined,
		property: PropertyMatch
	): boolean {
		if (!frontmatter) {
			return false;
		}

		const value = frontmatter[property.key];

		switch (property.operator) {
			case "exists":
				return value !== undefined && value !== null;

			case "equals":
				if (typeof value === "string") {
					return value.toLowerCase() === property.value.toLowerCase();
				}
				return String(value) === property.value;

			case "contains":
				if (typeof value === "string") {
					return value.toLowerCase().includes(property.value.toLowerCase());
				}
				if (Array.isArray(value)) {
					return value.some((v) => {
						if (typeof v === "string") {
							return v.toLowerCase().includes(property.value.toLowerCase());
						}
						return String(v).includes(property.value);
					});
				}
				return false;

			default:
				return false;
		}
	}

	evaluate(file: TFile, metadata: CachedMetadata | null): boolean {
		if (this.properties.length === 0) {
			return false;
		}

		const frontmatter = metadata?.frontmatter as Record<string, unknown> | undefined;

		// Return true if ANY property matches (note should be excluded)
		return this.properties.some((prop) => this.matchProperty(frontmatter, prop));
	}

	updateProperties(properties: PropertyMatch[]): void {
		this.properties = properties;
	}

	getProperties(): PropertyMatch[] {
		return [...this.properties];
	}
}

/**
 * CombinedExclusionCriterion - Combines multiple exclusion criteria
 */
export class CombinedExclusionCriterion implements SelectionCriterion {
	readonly id = "combined-exclusion";
	readonly type = "exclude" as const;

	private nameCriterion: ExcludeByNameCriterion;
	private tagCriterion: ExcludeByTagCriterion;
	private propertyCriterion: ExcludeByPropertyCriterion;

	constructor(
		excludedNames: string[],
		excludedTags: string[],
		excludedProperties: PropertyMatch[]
	) {
		this.nameCriterion = new ExcludeByNameCriterion(excludedNames);
		this.tagCriterion = new ExcludeByTagCriterion(excludedTags);
		this.propertyCriterion = new ExcludeByPropertyCriterion(excludedProperties);
	}

	evaluate(file: TFile, metadata: CachedMetadata | null): boolean {
		// Return true if ANY exclusion criterion matches
		return (
			this.nameCriterion.evaluate(file, metadata) ||
			this.tagCriterion.evaluate(file, metadata) ||
			this.propertyCriterion.evaluate(file, metadata)
		);
	}

	updateNames(names: string[]): void {
		this.nameCriterion.updateNames(names);
	}

	updateTags(tags: string[]): void {
		this.tagCriterion.updateTags(tags);
	}

	updateProperties(properties: PropertyMatch[]): void {
		this.propertyCriterion.updateProperties(properties);
	}
}
