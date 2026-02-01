/**
 * SettingsTab - Plugin settings interface
 * Provides UI for configuring the plugin
 */

import { App, PluginSettingTab, Setting, Notice, TFolder } from "obsidian";
import type { Plugin } from "obsidian";
import type { DataStore } from "../../data/data-store";
import type { QueueManager } from "../../queues/queue-manager";
import type { PluginSettings, SelectionMode, QueueOrderStrategy, SidebarPosition } from "../../types";
import { InputModal } from "./input-modal";

/** Callback for when settings change */
export type SettingsChangeCallback = (settings: PluginSettings) => void;

/**
 * SettingsTab provides the settings UI
 */
export class SettingsTab extends PluginSettingTab {
	private dataStore: DataStore;
	private queueManager: QueueManager;
	private onSettingsChange: SettingsChangeCallback;

	constructor(
		app: App,
		plugin: Plugin,
		dataStore: DataStore,
		queueManager: QueueManager,
		onSettingsChange: SettingsChangeCallback
	) {
		super(app, plugin);
		this.dataStore = dataStore;
		this.queueManager = queueManager;
		this.onSettingsChange = onSettingsChange;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const settings = this.dataStore.getSettings();

		// Note Selection Section
		this.renderNoteSelectionSection(containerEl, settings);

		// Exclusion Rules Section
		this.renderExclusionSection(containerEl, settings);

		// Review Settings Section
		this.renderReviewSettingsSection(containerEl, settings);

		// Interface Settings Section
		this.renderInterfaceSection(containerEl, settings);
	}

	/**
	 * Render Note Selection section
	 */
	private renderNoteSelectionSection(containerEl: HTMLElement, settings: PluginSettings): void {
		new Setting(containerEl).setName("Note selection").setHeading();

		// Selection Mode
		new Setting(containerEl)
			.setName("Selection mode")
			.setDesc("Choose how notes are selected for spaced repetition")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("folder", "Folder-based")
					.addOption("tag", "Tag-based")
					.setValue(settings.selectionMode)
					.onChange(async (value) => {
						await this.updateSetting("selectionMode", value as SelectionMode);
					})
			);

		// Tracked Folders (shown when folder mode)
		if (settings.selectionMode === "folder") {
			this.renderFoldersList(containerEl, settings);
		}

		// Tracked Tags (shown when tag mode)
		if (settings.selectionMode === "tag") {
			this.renderTagsList(containerEl, settings, "trackedTags", "Tracked tags");
		}
	}

	/**
	 * Render Exclusion Rules section
	 */
	private renderExclusionSection(containerEl: HTMLElement, settings: PluginSettings): void {
		new Setting(containerEl).setName("Exclusion rules").setHeading();

		// Excluded Tags
		this.renderTagsList(containerEl, settings, "excludedTags", "Excluded tags");

		// Excluded Note Names
		this.renderExcludedNamesSection(containerEl, settings);
	}

	/**
	 * Render Review Settings section
	 */
	private renderReviewSettingsSection(containerEl: HTMLElement, settings: PluginSettings): void {
		new Setting(containerEl).setName("Review").setHeading();

		// Queue Order
		new Setting(containerEl)
			.setName("Queue order")
			.setDesc("How to order notes during review")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("mixed-anki", "Anki-style (mixed)")
					.addOption("due-overdue-first", "Due date (overdue first)")
					.addOption("due-chronological", "Due date (chronological)")
					.addOption("state-priority", "State priority")
					.addOption("retrievability-asc", "Retrievability (hard first)")
					.addOption("load-balancing", "Load balancing")
					.addOption("difficulty-desc", "Difficulty (hard first)")
					.addOption("difficulty-asc", "Difficulty (easy first)")
					.addOption("random", "Random")
					.setValue(settings.queueOrder)
					.onChange(async (value) => {
						await this.updateSetting("queueOrder", value as QueueOrderStrategy);
					})
			);

		// Daily limits (used by mixed-anki and load-balancing)
		new Setting(containerEl)
			.setName("New cards per day")
			.setDesc("Max new cards per day (used by Anki-style and load-balancing strategies)")
			.addText((text) =>
				text
					.setPlaceholder("20")
					.setValue(String(settings.newCardsPerDay))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!Number.isNaN(n) && n >= 1 && n <= 1000) {
							await this.updateSetting("newCardsPerDay", n);
						}
					})
			);

		new Setting(containerEl)
			.setName("Max reviews per day")
			.setDesc("Max review cards per day (used by Anki-style and load-balancing strategies)")
			.addText((text) =>
				text
					.setPlaceholder("200")
					.setValue(String(settings.maxReviewsPerDay))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						if (!Number.isNaN(n) && n >= 1 && n <= 1000) {
							await this.updateSetting("maxReviewsPerDay", n);
						}
					})
			);

		// Show Note Stats
		new Setting(containerEl)
			.setName("Show note statistics")
			.setDesc("Display note statistics in the review sidebar")
			.addToggle((toggle) =>
				toggle.setValue(settings.showNoteStats).onChange(async (value) => {
					await this.updateSetting("showNoteStats", value);
				})
			);

		// Show Predicted Intervals
		new Setting(containerEl)
			.setName("Show predicted intervals")
			.setDesc("Show the predicted next review interval on rating buttons")
			.addToggle((toggle) =>
				toggle.setValue(settings.showPredictedIntervals).onChange(async (value) => {
					await this.updateSetting("showPredictedIntervals", value);
				})
			);

		// Show Session Stats
		new Setting(containerEl)
			.setName("Show session statistics")
			.setDesc("Display session statistics in the review sidebar")
			.addToggle((toggle) =>
				toggle.setValue(settings.showSessionStats).onChange(async (value) => {
					await this.updateSetting("showSessionStats", value);
				})
			);
	}

	/**
	 * Render Interface section
	 */
	private renderInterfaceSection(containerEl: HTMLElement, settings: PluginSettings): void {
		new Setting(containerEl).setName("Interface").setHeading();

		// Sidebar Position
		new Setting(containerEl)
			.setName("Sidebar position")
			.setDesc("Which side to show the review sidebar")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("left", "Left")
					.addOption("right", "Right")
					.setValue(settings.sidebarPosition)
					.onChange(async (value) => {
						await this.updateSetting("sidebarPosition", value as SidebarPosition);
					})
			);
	}

	/**
	 * Render folders list with add/remove functionality
	 */
	private renderFoldersList(containerEl: HTMLElement, settings: PluginSettings): void {
		const foldersContainer = containerEl.createDiv({ cls: "fsrs-settings-section" });

		new Setting(foldersContainer)
			.setName("Tracked folders")
			.setDesc("Notes in these folders will be included for review");

		const foldersList = foldersContainer.createDiv({ cls: "fsrs-folder-list" });

		// Render existing folders
		for (const folder of settings.trackedFolders) {
			this.renderFolderItem(foldersList, folder, settings);
		}

		// Add folder button
		const addBtn = foldersContainer.createEl("button", {
			cls: "fsrs-add-button",
			text: "Add folder",
		});

		addBtn.addEventListener("click", () => {
			this.showFolderSuggester(settings);
		});
	}

	/**
	 * Render a single folder item
	 */
	private renderFolderItem(
		container: HTMLElement,
		folder: string,
		settings: PluginSettings
	): void {
		const item = container.createDiv({ cls: "fsrs-folder-item" });
		item.createSpan({ text: folder || "(root)" });

		const removeBtn = item.createEl("button", { cls: "fsrs-remove-button", text: "×" });
		removeBtn.addEventListener("click", () => {
			const newFolders = settings.trackedFolders.filter((f) => f !== folder);
			void this.updateSetting("trackedFolders", newFolders).then(() => this.display());
		});
	}

	/**
	 * Show folder suggestion modal
	 */
	private showFolderSuggester(settings: PluginSettings): void {
		// Get all folders in vault
		const folders = this.app.vault
			.getAllLoadedFiles()
			.filter((f): f is TFolder => f instanceof TFolder)
			.map((f) => f.path)
			.filter((path) => !settings.trackedFolders.includes(path));

		if (folders.length === 0) {
			new Notice("No more folders available to add");
			return;
		}

		new InputModal(
			this.app,
			"Add folder",
			"Enter folder path (or leave empty for root)",
			(folderInput) => {
				if (folderInput === null) return;
				const normalizedPath = folderInput.trim();
				// Validate folder exists
				if (normalizedPath !== "" && !this.app.vault.getAbstractFileByPath(normalizedPath)) {
					new Notice(`Folder "${normalizedPath}" not found`);
					return;
				}
				if (settings.trackedFolders.includes(normalizedPath)) {
					new Notice("Folder already added");
					return;
				}
				const newFolders = [...settings.trackedFolders, normalizedPath];
				void this.updateSetting("trackedFolders", newFolders).then(() => this.display());
			}
		).open();
	}

	/**
	 * Render tags list with add/remove functionality
	 */
	private renderTagsList(
		containerEl: HTMLElement,
		settings: PluginSettings,
		settingKey: "trackedTags" | "excludedTags",
		label: string
	): void {
		const tagsContainer = containerEl.createDiv({ cls: "fsrs-settings-section" });

		new Setting(tagsContainer).setName(label).setDesc(
			settingKey === "trackedTags"
				? "Notes with these tags will be included for review"
				: "Notes with these tags will be excluded from review"
		);

		const tagsList = tagsContainer.createDiv({ cls: "fsrs-tag-list" });

		const tags = settings[settingKey];

		// Render existing tags
		for (const tag of tags) {
			this.renderTagItem(tagsList, tag, settingKey, settings);
		}

		// Add tag button
		const addBtn = tagsContainer.createEl("button", {
			cls: "fsrs-add-button",
			text: "Add tag",
		});

		addBtn.addEventListener("click", () => {
			new InputModal(
				this.app,
				"Add tag",
				"Enter tag (with or without #)",
				(tagInput) => {
					if (tagInput === null || tagInput.trim() === "") return;
					const normalizedTag = tagInput.trim().replace(/^#/, "");
					if (tags.includes(normalizedTag)) {
						new Notice("Tag already added");
						return;
					}
					const newTags = [...tags, normalizedTag];
					void this.updateSetting(settingKey, newTags).then(() => this.display());
				}
			).open();
		});
	}

	/**
	 * Render a single tag item
	 */
	private renderTagItem(
		container: HTMLElement,
		tag: string,
		settingKey: "trackedTags" | "excludedTags",
		settings: PluginSettings
	): void {
		const item = container.createDiv({ cls: "fsrs-tag-item" });
		item.createSpan({ text: `#${tag}` });

		const removeBtn = item.createEl("button", { cls: "fsrs-remove-button", text: "×" });
		removeBtn.addEventListener("click", () => {
			const newTags = settings[settingKey].filter((t) => t !== tag);
			void this.updateSetting(settingKey, newTags).then(() => this.display());
		});
	}

	/**
	 * Render excluded note names section
	 */
	private renderExcludedNamesSection(containerEl: HTMLElement, settings: PluginSettings): void {
		new Setting(containerEl)
			.setName("Excluded note names")
			.setDesc("Notes with these exact names will be excluded (one per line)")
			.addTextArea((text) =>
				text
					.setPlaceholder("Meeting notes\ntemplate")
					.setValue(settings.excludedNoteNames.join("\n"))
					.onChange(async (value) => {
						const names = value
							.split("\n")
							.map((n) => n.trim())
							.filter((n) => n !== "");
						await this.updateSetting("excludedNoteNames", names);
					})
			);
	}

	/**
	 * Update a single setting and trigger callbacks
	 */
	private async updateSetting<K extends keyof PluginSettings>(
		key: K,
		value: PluginSettings[K]
	): Promise<void> {
		this.dataStore.updateSettings({ [key]: value });
		await this.dataStore.save();

		const settings = this.dataStore.getSettings();
		this.onSettingsChange(settings);

		// Sync queue if selection-related settings changed
		if (
			key === "selectionMode" ||
			key === "trackedFolders" ||
			key === "trackedTags" ||
			key === "excludedNoteNames" ||
			key === "excludedTags" ||
			key === "excludedProperties"
		) {
			this.queueManager.syncDefaultQueue();
		}
	}
}
