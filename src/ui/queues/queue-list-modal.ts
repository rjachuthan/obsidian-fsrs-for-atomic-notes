/**
 * Queue List Modal - Display and manage all queues
 */

import { Modal, App, Notice } from "obsidian";
import type { QueueManager } from "../../queues/queue-manager";
import type { DataStore } from "../../data/data-store";
import type { Queue } from "../../types";
import { DEFAULT_QUEUE_ID, NOTICE_DURATION_MS } from "../../constants";
import { QueueEditModal } from "./queue-edit-modal";
import { QueueDeleteModal } from "./queue-delete-modal";

/**
 * Modal for listing and managing queues
 */
export class QueueListModal extends Modal {
	private queueManager: QueueManager;
	private dataStore: DataStore;
	private onQueueSelect?: (queueId: string) => void;

	constructor(
		app: App,
		queueManager: QueueManager,
		dataStore: DataStore,
		onQueueSelect?: (queueId: string) => void
	) {
		super(app);
		this.queueManager = queueManager;
		this.dataStore = dataStore;
		this.onQueueSelect = onQueueSelect;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-queue-list-modal");
		contentEl.empty();

		this.render();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render the modal content
	 */
	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		const header = contentEl.createDiv({ cls: "fsrs-queue-list-header" });
		header.createEl("h2", { text: "Manage queues" });

		const addBtn = header.createEl("button", {
			cls: "fsrs-queue-add-btn mod-cta",
			text: "New queue",
		});
		addBtn.addEventListener("click", () => {
			this.openEditModal();
		});

		// Queue list
		const queues = this.queueManager.getAllQueues();
		const listContainer = contentEl.createDiv({ cls: "fsrs-queue-list" });

		if (queues.length === 0) {
			listContainer.createDiv({
				cls: "fsrs-queue-empty",
				text: "No queues yet. Create one to get started!",
			});
		} else {
			for (const queue of queues) {
				this.renderQueueItem(listContainer, queue);
			}
		}
	}

	/**
	 * Render a single queue item
	 */
	private renderQueueItem(container: HTMLElement, queue: Queue): void {
		const isDefault = queue.id === DEFAULT_QUEUE_ID;
		const stats = this.queueManager.getQueueStats(queue.id);

		const item = container.createDiv({ cls: "fsrs-queue-item" });

		// Left: Queue info
		const info = item.createDiv({ cls: "fsrs-queue-info" });

		const nameRow = info.createDiv({ cls: "fsrs-queue-name-row" });
		nameRow.createSpan({ cls: "fsrs-queue-name", text: queue.name });

		if (isDefault) {
			nameRow.createSpan({ cls: "fsrs-queue-badge fsrs-queue-default", text: "Default" });
		}

		// Stats row
		const statsRow = info.createDiv({ cls: "fsrs-queue-stats" });
		statsRow.createSpan({ text: `${stats.totalNotes} notes` });
		statsRow.createSpan({ text: `${stats.dueNotes} due` });
		statsRow.createSpan({ text: `${stats.newNotes} new` });

		// Criteria info
		const criteriaInfo = info.createDiv({ cls: "fsrs-queue-criteria" });
		criteriaInfo.createSpan({
			text: this.formatCriteria(queue),
			cls: "fsrs-queue-criteria-text",
		});

		// Right: Actions
		const actions = item.createDiv({ cls: "fsrs-queue-actions" });

		// Start Review button
		const reviewBtn = actions.createEl("button", {
			cls: "fsrs-queue-action-btn",
			text: "Review",
			attr: { "aria-label": "Start review" },
		});
		if (stats.dueNotes === 0) {
			reviewBtn.disabled = true;
			reviewBtn.title = "No cards due";
		}
		reviewBtn.addEventListener("click", () => {
			if (this.onQueueSelect) {
				this.onQueueSelect(queue.id);
				this.close();
			}
		});

		// Sync button
		const syncBtn = actions.createEl("button", {
			cls: "fsrs-queue-action-btn clickable-icon",
			attr: { "aria-label": "Sync queue" },
		});
		createSyncIcon(syncBtn);
		syncBtn.addEventListener("click", () => {
			const result = this.queueManager.syncQueue(queue.id);
			new Notice(
				`Synced: +${result.added.length} added, ${result.removed.length} removed`,
				NOTICE_DURATION_MS
			);
			this.render();
		});

		// Edit button
		const editBtn = actions.createEl("button", {
			cls: "fsrs-queue-action-btn clickable-icon",
			attr: { "aria-label": "Edit queue" },
		});
		createEditIcon(editBtn);
		editBtn.addEventListener("click", () => {
			this.openEditModal(queue);
		});

		// Delete button (not for default queue)
		if (!isDefault) {
			const deleteBtn = actions.createEl("button", {
				cls: "fsrs-queue-action-btn clickable-icon fsrs-queue-delete-btn",
				attr: { "aria-label": "Delete queue" },
			});
			createDeleteIcon(deleteBtn);
			deleteBtn.addEventListener("click", () => {
				this.openDeleteModal(queue);
			});
		}
	}

	/**
	 * Format criteria for display
	 */
	private formatCriteria(queue: Queue): string {
		const criteria = queue.criteria;

		if (criteria.type === "folder") {
			const folders = criteria.folders ?? [];
			if (folders.length === 0) return "No folders selected";
			if (folders.length === 1) return `Folder: ${folders[0] || "(root)"}`;
			return `Folders: ${folders.length} selected`;
		}

		if (criteria.type === "tag") {
			const tags = criteria.tags ?? [];
			if (tags.length === 0) return "No tags";
			if (tags.length === 1) return `Tag: #${tags[0]}`;
			return `Tags: ${tags.length} selected`;
		}

		return "Custom criteria";
	}

	/**
	 * Open edit modal for creating or editing a queue
	 */
	private openEditModal(queue?: Queue): void {
		const modal = new QueueEditModal(
			this.app,
			this.queueManager,
			this.dataStore,
			queue,
			() => this.render()
		);
		modal.open();
	}

	/**
	 * Open delete confirmation modal
	 */
	private openDeleteModal(queue: Queue): void {
		const modal = new QueueDeleteModal(
			this.app,
			this.queueManager,
			queue,
			() => this.render()
		);
		modal.open();
	}
}

function createSvgIcon(container: HTMLElement, paths: string[], size = 16): void {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", String(size));
	svg.setAttribute("height", String(size));
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	for (const d of paths) {
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", d);
		svg.appendChild(path);
	}

	container.appendChild(svg);
}

function createSyncIcon(container: HTMLElement): void {
	createSvgIcon(container, [
		"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
		"M21 3v5h-5",
	]);
}

function createEditIcon(container: HTMLElement): void {
	createSvgIcon(container, [
		"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
		"m15 5 4 4",
	]);
}

function createDeleteIcon(container: HTMLElement): void {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "16");
	svg.setAttribute("height", "16");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	const paths = ["M3 6h18", "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"];
	for (const d of paths) {
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", d);
		svg.appendChild(path);
	}

	const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line1.setAttribute("x1", "10");
	line1.setAttribute("x2", "10");
	line1.setAttribute("y1", "11");
	line1.setAttribute("y2", "17");
	svg.appendChild(line1);

	const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line2.setAttribute("x1", "14");
	line2.setAttribute("x2", "14");
	line2.setAttribute("y1", "11");
	line2.setAttribute("y2", "17");
	svg.appendChild(line2);

	container.appendChild(svg);
}
