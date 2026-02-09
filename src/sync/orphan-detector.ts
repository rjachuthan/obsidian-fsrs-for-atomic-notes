/**
 * OrphanDetector - Periodic scanning and matching for orphaned cards
 * Detects cards whose notes no longer exist and finds potential matches
 */

import type { App, TFile } from "obsidian";
import type { CardManager } from "../fsrs/card-manager";
import type { DataStore } from "../data/data-store";
import type { OrphanRecord, CardData } from "../types";
import { generateId } from "../utils/id-generator";
import { nowISO, parseISODate } from "../utils/date-utils";

/**
 * Potential match for an orphaned card
 */
export interface OrphanMatch {
	/** File that might be the renamed/moved note */
	file: TFile;
	/** Confidence score (0-1) */
	confidence: number;
	/** Reason for the match */
	reason: string;
}

/**
 * OrphanDetector scans for orphaned cards and suggests matches
 */
export class OrphanDetector {
	private app: App;
	private cardManager: CardManager;
	private dataStore: DataStore;

	constructor(app: App, cardManager: CardManager, dataStore: DataStore) {
		this.app = app;
		this.cardManager = cardManager;
		this.dataStore = dataStore;
	}

	/**
	 * Scan all cards and detect orphans (cards without corresponding notes)
	 */
	detectOrphans(): OrphanRecord[] {
		const cards = this.dataStore.getCards();
		const newOrphans: OrphanRecord[] = [];

		for (const [path, card] of Object.entries(cards)) {
			const file = this.app.vault.getFileByPath(path);

			if (!file) {
				// Note doesn't exist - create orphan record
				const existingOrphan = this.dataStore
					.getOrphans()
					.find((o) => o.originalPath === path && o.status === "pending");

				if (!existingOrphan) {
					const orphan: OrphanRecord = {
						id: generateId(),
						originalPath: path,
						cardData: structuredClone(card),
						detectedAt: nowISO(),
						status: "pending",
					};

					this.dataStore.addOrphan(orphan);
					newOrphans.push(orphan);

					// Remove from active cards
					this.cardManager.deleteCard(path);
				}
			}
		}

		return newOrphans;
	}

	/**
	 * Find potential matches for an orphan based on various heuristics
	 */
	findPotentialMatches(orphan: OrphanRecord): OrphanMatch[] {
		const matches: OrphanMatch[] = [];

		const originalFileName = getFileName(orphan.originalPath);
		const originalFolder = getFolder(orphan.originalPath);

		// Get all markdown files
		const allFiles = this.app.vault.getMarkdownFiles();

		// Get files that already have cards
		const cards = this.dataStore.getCards();
		const filesWithCards = new Set(Object.keys(cards));

		for (const file of allFiles) {
			// Skip files that already have cards
			if (filesWithCards.has(file.path)) {
				continue;
			}

			let totalScore = 0;
			const reasons: string[] = [];

			// 1. Exact filename match (highest confidence)
			const fileName = getFileName(file.path);
			if (fileName.toLowerCase() === originalFileName.toLowerCase()) {
				totalScore += 0.5;
				reasons.push("Same filename");
			} else if (fileName.toLowerCase().includes(originalFileName.toLowerCase())) {
				totalScore += 0.2;
				reasons.push("Similar filename");
			} else if (originalFileName.toLowerCase().includes(fileName.toLowerCase())) {
				totalScore += 0.15;
				reasons.push("Partial filename match");
			}

			// 2. Same folder (medium confidence)
			const fileFolder = getFolder(file.path);
			if (fileFolder === originalFolder) {
				totalScore += 0.2;
				reasons.push("Same folder");
			}

			// 3. Creation time similarity (if card was recently created)
			const orphanCreatedAt = parseISODate(orphan.cardData.createdAt);
			const fileCreatedAt = new Date(file.stat.ctime);
			const timeDiffDays = Math.abs(
				(orphanCreatedAt.getTime() - fileCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
			);

			if (timeDiffDays < 1) {
				totalScore += 0.3;
				reasons.push("Created same day");
			} else if (timeDiffDays < 7) {
				totalScore += 0.15;
				reasons.push("Created within a week");
			}

			// 4. File modified after orphan detected (potential rename)
			const orphanDetectedAt = parseISODate(orphan.detectedAt);
			const fileModifiedAt = new Date(file.stat.mtime);

			if (fileModifiedAt >= orphanDetectedAt) {
				totalScore += 0.1;
				reasons.push("Modified recently");
			}

			// Only include if there's some confidence
			if (totalScore >= 0.2 && reasons.length > 0) {
				matches.push({
					file,
					confidence: Math.min(1, totalScore),
					reason: reasons.join(", "),
				});
			}
		}

		// Sort by confidence descending
		matches.sort((a, b) => b.confidence - a.confidence);

		// Limit to top 5 matches
		return matches.slice(0, 5);
	}

	/**
	 * Relink an orphan to a new note
	 */
	relinkOrphan(orphanId: string, newPath: string): boolean {
		const orphan = this.dataStore.getOrphans().find((o) => o.id === orphanId);
		if (!orphan) {
			return false;
		}

		// Verify the file exists
		const file = this.app.vault.getFileByPath(newPath);
		if (!file) {
			return false;
		}

		// Restore the card data with new path
		const restoredCard: CardData = {
			...orphan.cardData,
			notePath: newPath,
			lastModified: nowISO(),
		};

		this.dataStore.setCard(newPath, restoredCard);

		// Migrate review logs from old path to new path
		this.dataStore.migrateReviewLogPaths(orphan.originalPath, newPath);

		// Mark orphan as resolved
		this.dataStore.updateOrphan(orphanId, {
			status: "resolved",
			resolution: {
				action: "relink",
				newPath,
				resolvedAt: nowISO(),
			},
		});

		return true;
	}

	/**
	 * Permanently remove an orphan (delete scheduling data)
	 */
	removeOrphan(orphanId: string): boolean {
		const orphan = this.dataStore.getOrphans().find((o) => o.id === orphanId);
		if (!orphan) {
			return false;
		}

		// Mark orphan as removed
		this.dataStore.updateOrphan(orphanId, {
			status: "removed",
			resolution: {
				action: "remove",
				resolvedAt: nowISO(),
			},
		});

		return true;
	}

	/**
	 * Get all pending orphans
	 */
	getPendingOrphans(): OrphanRecord[] {
		return this.dataStore.getPendingOrphans();
	}

	/**
	 * Get orphan count
	 */
	getOrphanCount(): number {
		return this.getPendingOrphans().length;
	}
}

/**
 * Extract filename without extension
 */
function getFileName(path: string): string {
	return path.split("/").pop()?.replace(".md", "") ?? path;
}

/**
 * Extract folder path
 */
function getFolder(path: string): string {
	const parts = path.split("/");
	parts.pop();
	return parts.join("/");
}
