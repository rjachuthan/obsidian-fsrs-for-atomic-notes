/**
 * FolderCriterion - Folder-based note selection
 * Evaluates whether a note is in one of the tracked folders
 */

import type { TFile, CachedMetadata } from "obsidian";
import type { SelectionCriterion } from "../types";

/**
 * FolderCriterion selects notes based on folder membership
 */
export class FolderCriterion implements SelectionCriterion {
	readonly id = "folder";
	readonly type = "include" as const;

	private folders: string[];
	private normalizedFolders: string[];

	constructor(folders: string[]) {
		this.folders = folders;
		// Normalize folders: remove trailing slashes and ensure consistent format
		this.normalizedFolders = folders.map((f) => this.normalizePath(f));
	}

	/**
	 * Normalize a folder path for comparison
	 */
	private normalizePath(path: string): string {
		// Remove trailing slashes
		let normalized = path.replace(/\/+$/, "");
		// Handle root folder (empty string or "/")
		if (normalized === "" || normalized === "/") {
			return "";
		}
		return normalized;
	}

	/**
	 * Get the folder part of a file path
	 */
	private getFolder(filePath: string): string {
		const lastSlash = filePath.lastIndexOf("/");
		if (lastSlash === -1) {
			return ""; // File is in root
		}
		return filePath.substring(0, lastSlash);
	}

	/**
	 * Check if a path is within a folder (including subfolders)
	 */
	private isInFolder(filePath: string, folder: string): boolean {
		const fileFolder = this.getFolder(filePath);

		// Root folder matches everything
		if (folder === "") {
			return true;
		}

		// Exact match
		if (fileFolder === folder) {
			return true;
		}

		// Check if file is in a subfolder
		if (fileFolder.startsWith(folder + "/")) {
			return true;
		}

		return false;
	}

	/**
	 * Evaluate whether a file matches this criterion
	 */
	evaluate(file: TFile, _metadata: CachedMetadata | null): boolean {
		// Skip non-markdown files
		if (file.extension !== "md") {
			return false;
		}

		// If no folders specified, no matches
		if (this.normalizedFolders.length === 0) {
			return false;
		}

		// Check if file is in any of the tracked folders
		return this.normalizedFolders.some((folder) => this.isInFolder(file.path, folder));
	}

	/**
	 * Update the list of tracked folders
	 */
	updateFolders(folders: string[]): void {
		this.folders = folders;
		this.normalizedFolders = folders.map((f) => this.normalizePath(f));
	}

	/**
	 * Get the current list of folders
	 */
	getFolders(): string[] {
		return [...this.folders];
	}
}
