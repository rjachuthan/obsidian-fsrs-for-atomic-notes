/**
 * NoteWatcher - Real-time vault event handling for card management
 * Handles file renames, deletions, and creates orphan records
 */

import type { App, Plugin, TAbstractFile } from "obsidian";
import { Notice } from "obsidian";
import type { CardManager } from "../fsrs/card-manager";
import type { DataStore } from "../data/data-store";
import type { OrphanRecord } from "../types";
import { generateId } from "../utils/id-generator";
import { nowISO } from "../utils/date-utils";
import { NOTICE_DURATION_MS } from "../constants";

/**
 * NoteWatcher monitors vault events and updates card data accordingly
 */
export class NoteWatcher {
	private app: App;
	private cardManager: CardManager;
	private dataStore: DataStore;

	constructor(app: App, cardManager: CardManager, dataStore: DataStore) {
		this.app = app;
		this.cardManager = cardManager;
		this.dataStore = dataStore;
	}

	/**
	 * Register vault event handlers with the plugin
	 */
	registerEvents(plugin: Plugin): void {
		// Handle file renames
		plugin.registerEvent(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				this.handleRename(file, oldPath);
			})
		);

		// Handle file deletions
		plugin.registerEvent(
			this.app.vault.on("delete", (file: TAbstractFile) => {
				this.handleDelete(file);
			})
		);
	}

	/**
	 * Handle file rename event
	 */
	private handleRename(file: TAbstractFile, oldPath: string): void {
		// Only process markdown files
		if (!oldPath.endsWith(".md") || !file.path.endsWith(".md")) {
			return;
		}

		const card = this.cardManager.getCard(oldPath);
		if (!card) {
			return; // No card for this file
		}

		// Update card path
		this.cardManager.renameCard(oldPath, file.path);
	}

	/**
	 * Handle file deletion event
	 */
	private handleDelete(file: TAbstractFile): void {
		// Only process markdown files
		if (!file.path.endsWith(".md")) {
			return;
		}

		const card = this.cardManager.getCard(file.path);
		if (!card) {
			return; // No card for this file
		}

		// Create orphan record to preserve scheduling data
		const orphan: OrphanRecord = {
			id: generateId(),
			originalPath: file.path,
			cardData: structuredClone(card),
			detectedAt: nowISO(),
			status: "pending",
		};

		this.dataStore.addOrphan(orphan);

		// Remove the card from active cards
		this.cardManager.deleteCard(file.path);

		// Notify user
		new Notice(
			`Note deleted. Scheduling data saved for "${getFileName(file.path)}"`,
			NOTICE_DURATION_MS
		);
	}
}

/**
 * Extract filename from path
 */
function getFileName(path: string): string {
	return path.split("/").pop()?.replace(".md", "") ?? path;
}
