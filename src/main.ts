/**
 * FSRS for Atomic Notes - Main Plugin Entry Point
 *
 * This file handles plugin lifecycle only. All feature logic is delegated to modules.
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { DataStore } from "./data";
import { Scheduler, CardManager } from "./fsrs";
import { QueueManager } from "./queues";
import { SessionManager } from "./review";
import { ReviewSidebar, SettingsTab } from "./ui";
import { registerCommands } from "./commands";
import { REVIEW_SIDEBAR_VIEW_TYPE } from "./constants";

export default class FSRSPlugin extends Plugin {
	// Core services
	private dataStore!: DataStore;
	private scheduler!: Scheduler;
	private cardManager!: CardManager;
	private queueManager!: QueueManager;
	private sessionManager!: SessionManager;

	async onload(): Promise<void> {
		// Initialize data store
		this.dataStore = new DataStore(this);
		await this.dataStore.initialize();

		// Initialize FSRS scheduler
		const settings = this.dataStore.getSettings();
		this.scheduler = new Scheduler(settings.fsrsParams);

		// Initialize card manager
		this.cardManager = new CardManager(this.dataStore, this.scheduler);

		// Initialize queue manager
		this.queueManager = new QueueManager(
			this.app,
			this.dataStore,
			this.cardManager,
			settings
		);

		// Initialize session manager
		this.sessionManager = new SessionManager(
			this.app,
			this.dataStore,
			this.cardManager,
			this.queueManager,
			this.scheduler
		);

		// Register sidebar view
		this.registerView(REVIEW_SIDEBAR_VIEW_TYPE, (leaf) => {
			return new ReviewSidebar(
				leaf,
				this.sessionManager,
				this.queueManager,
				this.dataStore
			);
		});

		// Register settings tab
		this.addSettingTab(
			new SettingsTab(
				this.app,
				this,
				this.dataStore,
				this.queueManager,
				(newSettings) => {
					// Update dependent services when settings change
					this.queueManager.updateSettings(newSettings);
					if (newSettings.fsrsParams) {
						this.scheduler.updateParams(newSettings.fsrsParams);
					}
				}
			)
		);

		// Register commands
		registerCommands(this, this.sessionManager, this.queueManager);

		// Add ribbon icon
		this.addRibbonIcon("brain", "Start review session", async () => {
			await this.activateSidebar();
		});

		// Sync default queue on startup
		this.app.workspace.onLayoutReady(() => {
			void Promise.resolve().then(() => {
				this.queueManager.syncDefaultQueue();
			});
		});

		// Watch for file changes
		this.registerVaultEvents();
	}

	onunload(): void {
		// End any active session
		this.sessionManager.endSession();

		// Save any pending data
		void this.dataStore.forceSave();
	}

	/**
	 * Activate the review sidebar
	 */
	private async activateSidebar(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined;
		const leaves = workspace.getLeavesOfType(REVIEW_SIDEBAR_VIEW_TYPE);

		if (leaves.length > 0) {
			// View already exists, reveal it
			leaf = leaves[0];
		} else {
			// Create new leaf in sidebar
			const settings = this.dataStore.getSettings();
			leaf = settings.sidebarPosition === "left"
				? workspace.getLeftLeaf(false) ?? undefined
				: workspace.getRightLeaf(false) ?? undefined;

			if (leaf) {
				await leaf.setViewState({
					type: REVIEW_SIDEBAR_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Register vault event listeners for note changes
	 */
	private registerVaultEvents(): void {
		// Handle file renames
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (file.path.endsWith(".md")) {
					const card = this.cardManager.getCard(oldPath);
					if (card) {
						this.cardManager.renameCard(oldPath, file.path);
					}
				}
			})
		);

		// Handle file deletions
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file.path.endsWith(".md")) {
					const card = this.cardManager.getCard(file.path);
					if (card) {
						// For now, just delete the card
						// Future: Create orphan record
						this.cardManager.deleteCard(file.path);
					}
				}
			})
		);
	}
}
