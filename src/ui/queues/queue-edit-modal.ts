/**
 * Queue Edit Modal - Create or edit a queue
 */

import { Modal, App, Setting, Notice } from "obsidian";
import { InputModal } from "../settings/input-modal";
import type { QueueManager } from "../../queues/queue-manager";
import type { DataStore } from "../../data/data-store";
import type { Queue, SelectionCriteria, SelectionCriteriaType } from "../../types";
import { DEFAULT_QUEUE_ID, NOTICE_DURATION_MS } from "../../constants";

/**
 * Modal for creating or editing a queue
 */
export class QueueEditModal extends Modal {
	private queueManager: QueueManager;
	private dataStore: DataStore;
	private queue: Queue | undefined;
	private onSave: () => void;

	// Form state
	private name: string = "";
	private criteriaType: SelectionCriteriaType = "folder";
	private folders: string[] = [];
	private tags: string[] = [];

	// Preview state
	private previewCount: number = 0;

	constructor(
		app: App,
		queueManager: QueueManager,
		dataStore: DataStore,
		queue: Queue | undefined,
		onSave: () => void
	) {
		super(app);
		this.queueManager = queueManager;
		this.dataStore = dataStore;
		this.queue = queue;
		this.onSave = onSave;

		// Initialize form state from queue if editing
		if (queue) {
			this.name = queue.name;
			this.criteriaType = queue.criteria.type;
			this.folders = [...(queue.criteria.folders ?? [])];
			this.tags = [...(queue.criteria.tags ?? [])];
		}
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-queue-edit-modal");
		contentEl.empty();

		this.render();
		this.updatePreview();
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

		const isEditing = !!this.queue;
		const isDefault = this.queue?.id === DEFAULT_QUEUE_ID;

		// Header
		contentEl.createEl("h2", {
			text: isEditing ? "Edit Queue" : "Create Queue",
		});

		// Name input
		new Setting(contentEl)
			.setName("Queue name")
			.setDesc("A unique name for this queue")
			.addText((text) =>
				text
					.setPlaceholder("My queue")
					.setValue(this.name)
					.onChange((value) => {
						this.name = value;
					})
			);

		// Selection mode (disabled for default queue)
		const modeSetting = new Setting(contentEl)
			.setName("Selection mode")
			.setDesc("How to select notes for this queue");

		if (isDefault) {
			modeSetting.setDesc("Default queue uses global settings");
			modeSetting.addText((text) =>
				text
					.setValue(this.criteriaType === "folder" ? "Folder-based" : "Tag-based")
					.setDisabled(true)
			);
		} else {
			modeSetting.addDropdown((dropdown) =>
				dropdown
					.addOption("folder", "Folder-based")
					.addOption("tag", "Tag-based")
					.setValue(this.criteriaType)
					.onChange((value) => {
						this.criteriaType = value as SelectionCriteriaType;
						this.render();
						this.updatePreview();
					})
			);
		}

		// Criteria-specific UI
		if (!isDefault) {
			if (this.criteriaType === "folder") {
				this.renderFolderSelection(contentEl);
			} else {
				this.renderTagSelection(contentEl);
			}
		}

		// Preview section
		const previewSection = contentEl.createDiv({ cls: "fsrs-queue-edit-preview" });
		previewSection.createSpan({
			cls: "fsrs-queue-preview-count",
			text: `${this.previewCount} notes match`,
		});

		// Actions
		const actionRow = contentEl.createDiv({ cls: "fsrs-queue-edit-actions" });

		const cancelBtn = actionRow.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const saveBtn = actionRow.createEl("button", {
			cls: "mod-cta",
			text: isEditing ? "Save" : "Create",
		});
		saveBtn.addEventListener("click", () => this.save());
	}

	/**
	 * Render folder selection UI
	 */
	private renderFolderSelection(container: HTMLElement): void {
		const section = container.createDiv({ cls: "fsrs-queue-criteria-section" });

		new Setting(section)
			.setName("Folders")
			.setDesc("Notes in these folders will be included");

		const folderList = section.createDiv({ cls: "fsrs-folder-list" });

		for (const folder of this.folders) {
			const item = folderList.createDiv({ cls: "fsrs-folder-item" });
			item.createSpan({ text: folder || "(root)" });

			const removeBtn = item.createEl("button", {
				cls: "fsrs-remove-button",
				text: "×",
			});
			removeBtn.addEventListener("click", () => {
				this.folders = this.folders.filter((f) => f !== folder);
				this.render();
				this.updatePreview();
			});
		}

		// Add folder button
		const addBtn = section.createEl("button", {
			cls: "fsrs-add-button",
			text: "Add folder",
		});
		addBtn.addEventListener("click", () => {
			this.showFolderPicker();
		});
	}

	/**
	 * Render tag selection UI
	 */
	private renderTagSelection(container: HTMLElement): void {
		const section = container.createDiv({ cls: "fsrs-queue-criteria-section" });

		new Setting(section)
			.setName("Tags")
			.setDesc("Notes with these tags will be included (supports nested tags)");

		const tagList = section.createDiv({ cls: "fsrs-tag-list" });

		for (const tag of this.tags) {
			const item = tagList.createDiv({ cls: "fsrs-tag-item" });
			item.createSpan({ text: `#${tag}` });

			const removeBtn = item.createEl("button", {
				cls: "fsrs-remove-button",
				text: "×",
			});
			removeBtn.addEventListener("click", () => {
				this.tags = this.tags.filter((t) => t !== tag);
				this.render();
				this.updatePreview();
			});
		}

		// Add tag input
		const addRow = section.createDiv({ cls: "fsrs-tag-add-row" });
		const tagInput = addRow.createEl("input", {
			cls: "fsrs-tag-input",
			attr: {
				type: "text",
				placeholder: "Enter tag (e.g., review or #review)",
			},
		});

		const addBtn = addRow.createEl("button", {
			cls: "fsrs-add-button",
			text: "Add",
		});

		const addTag = () => {
			const value = tagInput.value.trim().replace(/^#/, "");
			if (value && !this.tags.includes(value)) {
				this.tags.push(value);
				tagInput.value = "";
				this.render();
				this.updatePreview();
			}
		};

		addBtn.addEventListener("click", addTag);
		tagInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addTag();
			}
		});
	}

	/**
	 * Show folder picker using InputModal
	 */
	private showFolderPicker(): void {
		const modal = new InputModal(
			this.app,
			"Add folder",
			"Enter folder path (empty for root)",
			(folderPath: string | null) => {
				if (folderPath === null) return;

				const normalizedPath = folderPath.trim();

				// Validate folder exists (unless root)
				if (normalizedPath !== "" && !this.app.vault.getAbstractFileByPath(normalizedPath)) {
					new Notice(`Folder "${normalizedPath}" not found`, NOTICE_DURATION_MS);
					return;
				}

				if (this.folders.includes(normalizedPath)) {
					new Notice("Folder already added", NOTICE_DURATION_MS);
					return;
				}

				this.folders.push(normalizedPath);
				this.render();
				this.updatePreview();
			}
		);
		modal.open();
	}

	/**
	 * Update preview count
	 */
	private updatePreview(): void {
		const criteria: SelectionCriteria = {
			type: this.criteriaType,
			folders: this.criteriaType === "folder" ? this.folders : undefined,
			tags: this.criteriaType === "tag" ? this.tags : undefined,
		};

		const noteResolver = this.queueManager.getNoteResolver();
		const matchingNotes = noteResolver.resolveNotesForCriteria(criteria);
		this.previewCount = matchingNotes.length;

		// Update preview text
		const previewEl = this.contentEl.querySelector(".fsrs-queue-preview-count");
		if (previewEl) {
			previewEl.textContent = `${this.previewCount} notes match`;
		}
	}

	/**
	 * Validate and save the queue
	 */
	private save(): void {
		// Validate name
		if (!this.name.trim()) {
			new Notice("Please enter a queue name", NOTICE_DURATION_MS);
			return;
		}

		// Check for duplicate names (excluding current queue if editing)
		const existingQueues = this.queueManager.getAllQueues();
		const nameExists = existingQueues.some(
			(q) => q.name.toLowerCase() === this.name.trim().toLowerCase() && q.id !== this.queue?.id
		);

		if (nameExists) {
			new Notice("A queue with this name already exists", NOTICE_DURATION_MS);
			return;
		}

		// Validate criteria
		if (this.criteriaType === "folder" && this.folders.length === 0) {
			new Notice("Please add at least one folder", NOTICE_DURATION_MS);
			return;
		}

		if (this.criteriaType === "tag" && this.tags.length === 0) {
			new Notice("Please add at least one tag", NOTICE_DURATION_MS);
			return;
		}

		const criteria: SelectionCriteria = {
			type: this.criteriaType,
			folders: this.criteriaType === "folder" ? this.folders : undefined,
			tags: this.criteriaType === "tag" ? this.tags : undefined,
		};

		if (this.queue) {
			// Update existing queue
			this.queueManager.updateQueue(this.queue.id, {
				name: this.name.trim(),
				criteria,
			});

			// Sync to update cards
			this.queueManager.syncQueue(this.queue.id);

			new Notice("Queue updated", NOTICE_DURATION_MS);
		} else {
			// Create new queue
			const newQueue = this.queueManager.createQueue(this.name.trim(), criteria);

			// Sync to add cards
			this.queueManager.syncQueue(newQueue.id);

			new Notice("Queue created", NOTICE_DURATION_MS);
		}

		this.onSave();
		this.close();
	}
}
