/**
 * Queue Delete Modal - Confirmation for queue deletion
 */

import { Modal, App, Notice, Setting } from "obsidian";
import type { QueueManager } from "../../queues/queue-manager";
import type { Queue } from "../../types";
import { NOTICE_DURATION_MS } from "../../constants";

/**
 * Modal for confirming queue deletion
 */
export class QueueDeleteModal extends Modal {
	private queueManager: QueueManager;
	private queue: Queue;
	private onDelete: () => void;
	private removeCards: boolean = false;

	constructor(
		app: App,
		queueManager: QueueManager,
		queue: Queue,
		onDelete: () => void
	) {
		super(app);
		this.queueManager = queueManager;
		this.queue = queue;
		this.onDelete = onDelete;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-queue-delete-modal");
		contentEl.empty();

		// Warning header
		const header = contentEl.createDiv({ cls: "fsrs-delete-header" });
		createWarningIcon(header);
		header.createEl("h2", { text: "Delete queue" });

		// Message
		contentEl.createEl("p", {
			cls: "fsrs-delete-message",
			text: `Are you sure you want to delete "${this.queue.name}"?`,
		});

		// Stats
		const stats = this.queueManager.getQueueStats(this.queue.id);
		const statsEl = contentEl.createDiv({ cls: "fsrs-delete-stats" });
		statsEl.createSpan({ text: `This queue contains ${stats.totalNotes} notes with ${stats.dueNotes} due for review.` });

		// Remove cards option
		new Setting(contentEl)
			.setName("Remove card data")
			.setDesc("Also remove scheduling data for cards in this queue. If unchecked, card data is preserved and can be recovered by adding the same notes to another queue.")
			.addToggle((toggle) =>
				toggle.setValue(this.removeCards).onChange((value) => {
					this.removeCards = value;
				})
			);

		// Warning for remove cards
		const warningEl = contentEl.createDiv({ cls: "fsrs-delete-warning" });
		warningEl.createSpan({
			text: "This action cannot be undone.",
			cls: "fsrs-delete-warning-text",
		});

		// Actions
		const actions = contentEl.createDiv({ cls: "fsrs-delete-actions" });

		const cancelBtn = actions.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const deleteBtn = actions.createEl("button", {
			cls: "mod-warning",
			text: "Delete",
		});
		deleteBtn.addEventListener("click", () => this.confirmDelete());
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Confirm and execute deletion
	 */
	private confirmDelete(): void {
		try {
			this.queueManager.deleteQueue(this.queue.id, this.removeCards);
			new Notice(`Queue "${this.queue.name}" deleted`, NOTICE_DURATION_MS);
			this.onDelete();
			this.close();
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Failed to delete queue: ${message}`, NOTICE_DURATION_MS);
		}
	}
}

function createWarningIcon(container: HTMLElement): void {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "var(--color-orange)");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z");
	svg.appendChild(path);

	const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line1.setAttribute("x1", "12");
	line1.setAttribute("y1", "9");
	line1.setAttribute("x2", "12");
	line1.setAttribute("y2", "13");
	svg.appendChild(line1);

	const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line2.setAttribute("x1", "12");
	line2.setAttribute("y1", "17");
	line2.setAttribute("x2", "12.01");
	line2.setAttribute("y2", "17");
	svg.appendChild(line2);

	container.appendChild(svg);
}
