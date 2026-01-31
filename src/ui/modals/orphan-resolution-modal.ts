/**
 * Orphan Resolution Modal - Resolve orphaned card records
 */

import { Modal, App, Notice } from "obsidian";
import type { OrphanDetector, OrphanMatch } from "../../sync/orphan-detector";
import type { OrphanRecord } from "../../types";
import { NOTICE_DURATION_MS, CARD_STATE_LABELS } from "../../constants";
import { parseISODate } from "../../utils/date-utils";

/**
 * Modal for resolving an orphaned card
 */
export class OrphanResolutionModal extends Modal {
	private orphanDetector: OrphanDetector;
	private orphan: OrphanRecord;
	private onResolved: () => void;
	private matches: OrphanMatch[] = [];

	constructor(
		app: App,
		orphanDetector: OrphanDetector,
		orphan: OrphanRecord,
		onResolved: () => void
	) {
		super(app);
		this.orphanDetector = orphanDetector;
		this.orphan = orphan;
		this.onResolved = onResolved;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-orphan-modal");
		contentEl.empty();

		// Find potential matches
		this.matches = this.orphanDetector.findPotentialMatches(this.orphan);

		this.render();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render modal content
	 */
	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		contentEl.createEl("h2", { text: "Resolve orphaned card" });

		// Orphan info
		const infoSection = contentEl.createDiv({ cls: "fsrs-orphan-info" });

		infoSection.createDiv({
			cls: "fsrs-orphan-path",
			text: `Original: ${this.orphan.originalPath}`,
		});

		const detectedDate = parseISODate(this.orphan.detectedAt);
		infoSection.createDiv({
			cls: "fsrs-orphan-detected",
			text: `Detected: ${detectedDate.toLocaleDateString()}`,
		});

		// Card stats summary
		const statsSection = contentEl.createDiv({ cls: "fsrs-orphan-stats" });
		statsSection.createEl("h4", { text: "Scheduling data" });

		const statsGrid = statsSection.createDiv({ cls: "fsrs-orphan-stats-grid" });

		// Show stats for each queue the card was in
		for (const [queueId, schedule] of Object.entries(this.orphan.cardData.schedules)) {
			const queueStats = statsGrid.createDiv({ cls: "fsrs-orphan-queue-stats" });

			queueStats.createSpan({
				cls: "fsrs-orphan-queue-label",
				text: `Queue: ${queueId}`,
			});

			const statsItems = queueStats.createDiv({ cls: "fsrs-orphan-stats-items" });

			statsItems.createSpan({
				text: `State: ${CARD_STATE_LABELS[schedule.state as keyof typeof CARD_STATE_LABELS]}`,
			});
			statsItems.createSpan({ text: `Reviews: ${schedule.reps}` });
			statsItems.createSpan({ text: `Stability: ${schedule.stability.toFixed(1)}d` });
			statsItems.createSpan({ text: `Difficulty: ${schedule.difficulty.toFixed(1)}` });
		}

		// Potential matches section
		const matchesSection = contentEl.createDiv({ cls: "fsrs-orphan-matches" });
		matchesSection.createEl("h4", { text: "Potential matches" });

		if (this.matches.length === 0) {
			matchesSection.createDiv({
				cls: "fsrs-orphan-no-matches",
				text: "No potential matches found",
			});
		} else {
			const matchList = matchesSection.createDiv({ cls: "fsrs-orphan-match-list" });

			for (const match of this.matches) {
				this.renderMatchOption(matchList, match);
			}
		}

		// Manual relink option
		const manualSection = contentEl.createDiv({ cls: "fsrs-orphan-manual" });
		manualSection.createEl("h4", { text: "Manual relink" });

		const manualRow = manualSection.createDiv({ cls: "fsrs-orphan-manual-row" });
		const pathInput = manualRow.createEl("input", {
			cls: "fsrs-orphan-path-input",
			attr: {
				type: "text",
				placeholder: "Enter note path (e.g., folder/note.md)",
			},
		});

		const relinkBtn = manualRow.createEl("button", {
			cls: "fsrs-orphan-relink-btn",
			text: "Relink",
		});

		relinkBtn.addEventListener("click", () => {
			const path = pathInput.value.trim();
			if (path) {
				this.relinkTo(path);
			} else {
				new Notice("Please enter a note path", NOTICE_DURATION_MS);
			}
		});

		// Actions
		const actionsSection = contentEl.createDiv({ cls: "fsrs-orphan-actions" });

		const ignoreBtn = actionsSection.createEl("button", {
			text: "Ignore",
			attr: { title: "Keep orphan record for later" },
		});
		ignoreBtn.addEventListener("click", () => this.close());

		const removeBtn = actionsSection.createEl("button", {
			cls: "mod-warning",
			text: "Remove permanently",
			attr: { title: "Delete scheduling data forever" },
		});
		removeBtn.addEventListener("click", () => this.removePermanently());

		// Focus the first match or manual input
		if (this.matches.length > 0) {
			const firstSelectBtn = contentEl.querySelector(".fsrs-orphan-select-btn");
			if (firstSelectBtn instanceof HTMLButtonElement) {
				firstSelectBtn.focus();
			}
		} else {
			pathInput.focus();
		}
	}

	/**
	 * Render a match option
	 */
	private renderMatchOption(container: HTMLElement, match: OrphanMatch): void {
		const item = container.createDiv({ cls: "fsrs-orphan-match-item" });

		const info = item.createDiv({ cls: "fsrs-orphan-match-info" });

		const pathRow = info.createDiv({ cls: "fsrs-orphan-match-path" });
		pathRow.createSpan({ text: match.file.path });

		pathRow.createSpan({
			cls: `fsrs-orphan-confidence ${getConfidenceClass(match.confidence)}`,
			text: `${Math.round(match.confidence * 100)}%`,
		});

		info.createDiv({
			cls: "fsrs-orphan-match-reason",
			text: match.reason,
		});

		const selectBtn = item.createEl("button", {
			cls: "fsrs-orphan-select-btn mod-cta",
			text: "Select",
		});
		selectBtn.addEventListener("click", () => {
			this.relinkTo(match.file.path);
		});
	}

	/**
	 * Relink orphan to a new path
	 */
	private relinkTo(path: string): void {
		// Ensure path ends with .md
		const normalizedPath = path.endsWith(".md") ? path : `${path}.md`;

		// Verify file exists
		const file = this.app.vault.getFileByPath(normalizedPath);
		if (!file) {
			new Notice(`Note not found: ${normalizedPath}`, NOTICE_DURATION_MS);
			return;
		}

		const success = this.orphanDetector.relinkOrphan(this.orphan.id, normalizedPath);

		if (success) {
			new Notice(`Card relinked to "${normalizedPath}"`, NOTICE_DURATION_MS);
			this.onResolved();
			this.close();
		} else {
			new Notice("Failed to relink card", NOTICE_DURATION_MS);
		}
	}

	/**
	 * Permanently remove the orphan
	 */
	private removePermanently(): void {
		const fileName = this.orphan.originalPath.split("/").pop()?.replace(".md", "") ?? "this card";

		// Show confirmation modal
		const confirmModal = new ConfirmDeleteModal(
			this.app,
			fileName,
			() => {
				const success = this.orphanDetector.removeOrphan(this.orphan.id);

				if (success) {
					new Notice("Scheduling data removed", NOTICE_DURATION_MS);
					this.onResolved();
					this.close();
				} else {
					new Notice("Failed to remove orphan", NOTICE_DURATION_MS);
				}
			}
		);
		confirmModal.open();
	}
}

/**
 * Simple confirmation modal for delete action
 */
class ConfirmDeleteModal extends Modal {
	private fileName: string;
	private onConfirm: () => void;

	constructor(app: App, fileName: string, onConfirm: () => void) {
		super(app);
		this.fileName = fileName;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		modalEl.addClass("fsrs-confirm-delete-modal");
		contentEl.empty();

		contentEl.createEl("h3", { text: "Confirm deletion" });
		contentEl.createEl("p", {
			text: `Are you sure you want to permanently delete scheduling data for "${this.fileName}"? This cannot be undone.`,
		});

		const actions = contentEl.createDiv({ cls: "fsrs-confirm-actions" });

		const cancelBtn = actions.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const deleteBtn = actions.createEl("button", {
			cls: "mod-warning",
			text: "Delete",
		});
		deleteBtn.addEventListener("click", () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function getConfidenceClass(confidence: number): string {
	if (confidence >= 0.7) return "fsrs-confidence-high";
	if (confidence >= 0.4) return "fsrs-confidence-medium";
	return "fsrs-confidence-low";
}

/**
 * Modal for listing all pending orphans
 */
export class OrphanListModal extends Modal {
	private orphanDetector: OrphanDetector;
	private onChanged: () => void;

	constructor(app: App, orphanDetector: OrphanDetector, onChanged: () => void) {
		super(app);
		this.orphanDetector = orphanDetector;
		this.onChanged = onChanged;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-orphan-list-modal");
		contentEl.empty();

		this.render();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render modal content
	 */
	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		const header = contentEl.createDiv({ cls: "fsrs-orphan-list-header" });
		header.createEl("h2", { text: "Orphaned cards" });

		const scanBtn = header.createEl("button", {
			text: "Scan now",
			cls: "fsrs-orphan-scan-btn",
		});
		scanBtn.addEventListener("click", () => {
			const newOrphans = this.orphanDetector.detectOrphans();
			if (newOrphans.length > 0) {
				new Notice(`Found ${newOrphans.length} new orphan(s)`, NOTICE_DURATION_MS);
			} else {
				new Notice("No new orphans found", NOTICE_DURATION_MS);
			}
			this.render();
		});

		// Orphan list
		const orphans = this.orphanDetector.getPendingOrphans();

		if (orphans.length === 0) {
			contentEl.createDiv({
				cls: "fsrs-orphan-empty",
				text: "No orphaned cards found. All cards are linked to existing notes.",
			});
			return;
		}

		contentEl.createDiv({
			cls: "fsrs-orphan-list-desc",
			text: `${orphans.length} orphaned card(s) found. These are cards whose notes have been deleted or moved.`,
		});

		const list = contentEl.createDiv({ cls: "fsrs-orphan-list" });

		for (const orphan of orphans) {
			this.renderOrphanItem(list, orphan);
		}
	}

	/**
	 * Render an orphan list item
	 */
	private renderOrphanItem(container: HTMLElement, orphan: OrphanRecord): void {
		const item = container.createDiv({ cls: "fsrs-orphan-list-item" });

		const info = item.createDiv({ cls: "fsrs-orphan-item-info" });

		const fileName = orphan.originalPath.split("/").pop()?.replace(".md", "") ?? orphan.originalPath;
		info.createDiv({ cls: "fsrs-orphan-item-name", text: fileName });
		info.createDiv({ cls: "fsrs-orphan-item-path", text: orphan.originalPath });

		// Quick stats
		const queueCount = Object.keys(orphan.cardData.schedules).length;
		const totalReps = Object.values(orphan.cardData.schedules).reduce(
			(sum, s) => sum + s.reps,
			0
		);

		info.createDiv({
			cls: "fsrs-orphan-item-stats",
			text: `${queueCount} queue(s), ${totalReps} review(s)`,
		});

		const resolveBtn = item.createEl("button", {
			cls: "fsrs-orphan-resolve-btn",
			text: "Resolve",
		});
		resolveBtn.addEventListener("click", () => {
			const modal = new OrphanResolutionModal(
				this.app,
				this.orphanDetector,
				orphan,
				() => {
					this.onChanged();
					this.render();
				}
			);
			modal.open();
		});
	}
}
