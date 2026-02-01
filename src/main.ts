/**
 * FSRS for Atomic Notes - Main Plugin Entry Point
 *
 * This file handles plugin lifecycle only. All feature logic is delegated to modules.
 */

import { Plugin, WorkspaceLeaf, Notice } from "obsidian";
import { DataStore } from "./data";
import { Scheduler, CardManager } from "./fsrs";
import { QueueManager } from "./queues";
import { SessionManager } from "./review";
import { NoteWatcher, OrphanDetector } from "./sync";
import {
	ReviewSidebar,
	SettingsTab,
	DashboardModal,
	QueueListModal,
	QueueSelectorModal,
} from "./ui";
import { registerCommands } from "./commands";
import {
	REVIEW_SIDEBAR_VIEW_TYPE,
	COMMANDS,
	COMMAND_NAMES,
	NOTICE_DURATION_MS,
} from "./constants";
import { handleError } from "./utils/error-handler";

/** Interval for periodic orphan detection (5 minutes) */
const ORPHAN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default class FSRSPlugin extends Plugin {
	// Core services
	private dataStore!: DataStore;
	private scheduler!: Scheduler;
	private cardManager!: CardManager;
	private queueManager!: QueueManager;
	private sessionManager!: SessionManager;

	// Sync services
	private noteWatcher!: NoteWatcher;
	private orphanDetector!: OrphanDetector;

	async onload(): Promise<void> {
		try {
			// Initialize data store
			this.dataStore = new DataStore(this);
			await this.dataStore.initialize();
		} catch (error) {
			handleError(error, { component: "DataStore.initialize", notifyUser: true });
			return;
		}

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

		// Initialize sync services
		this.noteWatcher = new NoteWatcher(this.app, this.cardManager, this.dataStore);
		this.orphanDetector = new OrphanDetector(this.app, this.cardManager, this.dataStore);

		// Register vault events via NoteWatcher
		this.noteWatcher.registerEvents(this);

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

		// Register all commands (start-review shows queue selector when multiple queues)
		registerCommands(this, this.sessionManager, this.queueManager, {
			onStartReview: async (queueId: string) => {
				await this.sessionManager.startSession(queueId);
				await this.activateSidebar();
			},
		});
		this.registerAdditionalCommands();

		// Add ribbon icons
		this.addRibbonIcon("brain", "Start review session", async () => {
			await this.activateSidebar();
		});

		this.addRibbonIcon("bar-chart-2", "Open dashboard", () => {
			this.openDashboard();
		});

		// Sync default queue on startup
		this.app.workspace.onLayoutReady(() => {
			void Promise.resolve()
				.then(() => {
					this.queueManager.syncDefaultQueue();
					this.orphanDetector.detectOrphans();
				})
				.catch((error) => {
					handleError(error, { component: "startup sync", notifyUser: true });
				});
		});

		// Register periodic orphan check
		this.registerInterval(
			window.setInterval(() => {
				this.orphanDetector.detectOrphans();
			}, ORPHAN_CHECK_INTERVAL_MS)
		);
	}

	onunload(): void {
		// End any active session
		this.sessionManager.endSession();

		// Save any pending data
		void this.dataStore.forceSave();
	}

	/**
	 * Register additional commands not in the main commands module
	 */
	private registerAdditionalCommands(): void {
		// Open Dashboard
		this.addCommand({
			id: COMMANDS.OPEN_DASHBOARD,
			name: COMMAND_NAMES[COMMANDS.OPEN_DASHBOARD],
			callback: () => {
				this.openDashboard();
			},
		});

		// Manage Queues
		this.addCommand({
			id: COMMANDS.MANAGE_QUEUES,
			name: COMMAND_NAMES[COMMANDS.MANAGE_QUEUES],
			callback: () => {
				this.openQueueManager();
			},
		});

		// Add to Queue
		this.addCommand({
			id: COMMANDS.ADD_TO_QUEUE,
			name: COMMAND_NAMES[COMMANDS.ADD_TO_QUEUE],
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile || !activeFile.path.endsWith(".md")) {
					return false;
				}
				if (!checking) {
					this.addCurrentNoteToQueue();
				}
				return true;
			},
		});

	}

	/**
	 * Open the dashboard modal
	 */
	private openDashboard(): void {
		const modal = new DashboardModal(this.app, this.dataStore, this.queueManager);
		modal.open();
	}

	/**
	 * Open queue manager modal
	 */
	private openQueueManager(): void {
		const modal = new QueueListModal(
			this.app,
			this.queueManager,
			this.dataStore,
			(queueId) => {
				void this.sessionManager.startSession(queueId);
				void this.activateSidebar();
			}
		);
		modal.open();
	}

	/**
	 * Add current note to a queue
	 */
	private addCurrentNoteToQueue(): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active note", NOTICE_DURATION_MS);
			return;
		}

		const queues = this.queueManager.getAllQueues();

		if (queues.length === 1) {
			// Only one queue, add directly
			const queue = queues[0];
			if (queue) {
				this.cardManager.createCard(activeFile.path, queue.id);
				this.queueManager.updateQueueStats(queue.id);
				new Notice(`Added to "${queue.name}"`, NOTICE_DURATION_MS);
			}
		} else {
			// Show queue selector
			const modal = new QueueSelectorModal(this.app, this.queueManager, (queueId) => {
				this.cardManager.createCard(activeFile.path, queueId);
				this.queueManager.updateQueueStats(queueId);
				const queue = this.queueManager.getQueue(queueId);
				new Notice(`Added to "${queue?.name ?? queueId}"`, NOTICE_DURATION_MS);
			});
			modal.open();
		}
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
}
