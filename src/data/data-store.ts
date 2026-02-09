/**
 * DataStore - Central data persistence layer
 * Handles loading, saving, and managing all plugin data
 */

import type { Plugin } from "obsidian";
import type {
	PluginData,
	PluginSettings,
	Queue,
	CardData,
	ReviewLog,
	OrphanRecord,
	BackupEntry,
	DeepPartial,
	PropertyMatch,
	FSRSParams,
} from "../types";
import {
	CURRENT_SCHEMA_VERSION,
	DEFAULT_PLUGIN_DATA,
	DEFAULT_SETTINGS,
	SAVE_DEBOUNCE_MS,
	MIN_SAVE_INTERVAL_MS,
	MAX_BACKUPS,
	MAX_REVIEW_HISTORY,
	BACKUP_INTERVAL_MS,
	DEFAULT_FSRS_PARAMS,
} from "../constants";
import { nowISO } from "../utils/date-utils";

/**
 * DataStore manages all plugin data persistence
 * Provides CRUD operations with automatic debounced saving
 */
export class DataStore {
	private plugin: Plugin;
	private data: PluginData;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private lastSaveTime = 0;
	private dirty = false;
	private initialized = false;
	private lastBackupTime = 0;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.data = structuredClone(DEFAULT_PLUGIN_DATA);
	}

	/**
	 * Initialize the data store by loading persisted data
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		const loadedData: unknown = await this.plugin.loadData();

		if (loadedData) {
			try {
				this.data = this.validateAndMigrate(loadedData);
			} catch (error) {
				console.error("[FSRS] Failed to load data, using defaults:", error);
				// Create backup of corrupted data
				await this.createBackup(loadedData);
				this.data = structuredClone(DEFAULT_PLUGIN_DATA);
			}
		} else {
			// First run - use defaults
			this.data = structuredClone(DEFAULT_PLUGIN_DATA);
		}

		this.initialized = true;
	}

	/**
	 * Validate loaded data and migrate if necessary
	 */
	private validateAndMigrate(data: unknown): PluginData {
		// Type guard for basic structure
		if (!data || typeof data !== "object") {
			throw new Error("Invalid data format: not an object");
		}

		const rawData = data as Record<string, unknown>;

		// Ensure version exists
		const version = typeof rawData.version === "number" ? rawData.version : 0;

		// Run migrations if needed
		let migratedData = rawData;
		if (version < CURRENT_SCHEMA_VERSION) {
			migratedData = this.runMigrations(rawData, version);
		}

		// Merge with defaults to ensure all fields exist
		const validatedData: PluginData = {
			version: CURRENT_SCHEMA_VERSION,
			settings: this.validateSettings(migratedData.settings),
			queues: this.validateQueues(migratedData.queues),
			cards: this.validateCards(migratedData.cards),
			reviews: this.validateReviews(migratedData.reviews),
			orphans: this.validateOrphans(migratedData.orphans),
			backups: this.validateBackups(migratedData.backups),
		};

		return validatedData;
	}

	/**
	 * Validate backups array (keep last MAX_BACKUPS valid entries)
	 */
	private validateBackups(backups: unknown): BackupEntry[] {
		if (!Array.isArray(backups)) {
			return [];
		}
		const valid: BackupEntry[] = [];
		for (const b of backups) {
			if (
				b &&
				typeof b === "object" &&
				typeof (b as Record<string, unknown>).id === "string" &&
				typeof (b as Record<string, unknown>).timestamp === "number" &&
				(b as Record<string, unknown>).data !== undefined
			) {
				valid.push(b as BackupEntry);
			}
		}
		return valid.slice(-MAX_BACKUPS);
	}

	/**
	 * Run data migrations from old versions
	 */
	private runMigrations(
		data: Record<string, unknown>,
		fromVersion: number
	): Record<string, unknown> {
		let result = { ...data };

		// Migration from version 0 to 1
		if (fromVersion < 1) {
			// Initial version - no migrations needed
			result.version = 1;
		}

		// Future migrations can be added here
		// if (fromVersion < 2) { ... }

		return result;
	}

	/**
	 * Validate and merge settings with defaults
	 */
	private validateSettings(settings: unknown): PluginSettings {
		if (!settings || typeof settings !== "object") {
			return structuredClone(DEFAULT_SETTINGS);
		}

		const s = settings as Record<string, unknown>;

		return {
			selectionMode: this.validateEnum(s.selectionMode, ["folder", "tag"], DEFAULT_SETTINGS.selectionMode),
			trackedFolders: this.validateStringArray(s.trackedFolders, DEFAULT_SETTINGS.trackedFolders),
			trackedTags: this.validateStringArray(s.trackedTags, DEFAULT_SETTINGS.trackedTags),
			excludedNoteNames: this.validateStringArray(s.excludedNoteNames, DEFAULT_SETTINGS.excludedNoteNames),
			excludedTags: this.validateStringArray(s.excludedTags, DEFAULT_SETTINGS.excludedTags),
			excludedProperties: Array.isArray(s.excludedProperties)
				? s.excludedProperties.filter((item) => this.isValidPropertyMatch(item))
				: DEFAULT_SETTINGS.excludedProperties,
			queueOrder: this.validateEnum(
				s.queueOrder,
				[
					"mixed-anki",
					"due-overdue-first",
					"due-chronological",
					"state-priority",
					"retrievability-asc",
					"load-balancing",
					"random",
					"difficulty-desc",
					"difficulty-asc",
				],
				DEFAULT_SETTINGS.queueOrder
			),
			newCardsPerDay: this.validateDailyLimit(
				s.newCardsPerDay,
				DEFAULT_SETTINGS.newCardsPerDay,
				1,
				1000
			),
			maxReviewsPerDay: this.validateDailyLimit(
				s.maxReviewsPerDay,
				DEFAULT_SETTINGS.maxReviewsPerDay,
				1,
				1000
			),
			showNoteStats: typeof s.showNoteStats === "boolean" ? s.showNoteStats : DEFAULT_SETTINGS.showNoteStats,
			showPredictedIntervals:
				typeof s.showPredictedIntervals === "boolean"
					? s.showPredictedIntervals
					: DEFAULT_SETTINGS.showPredictedIntervals,
			showSessionStats:
				typeof s.showSessionStats === "boolean" ? s.showSessionStats : DEFAULT_SETTINGS.showSessionStats,
			sidebarPosition: this.validateEnum(
				s.sidebarPosition,
				["left", "right"],
				DEFAULT_SETTINGS.sidebarPosition
			),
			fsrsParams: this.validateFsrsParams(s.fsrsParams),
		};
	}

	/**
	 * Validate FSRS parameters with bounds checking
	 */
	private validateFsrsParams(params: unknown): FSRSParams | undefined {
		if (!params || typeof params !== "object") {
			return undefined; // Use defaults from constants
		}

		const p = params as Record<string, unknown>;

		const requestRetention = typeof p.requestRetention === "number"
			? Math.max(0.7, Math.min(0.97, p.requestRetention))
			: DEFAULT_FSRS_PARAMS.requestRetention;

		const maximumInterval = typeof p.maximumInterval === "number" && Number.isInteger(p.maximumInterval)
			? Math.max(1, Math.min(36500, p.maximumInterval))
			: DEFAULT_FSRS_PARAMS.maximumInterval;

		const enableFuzz = typeof p.enableFuzz === "boolean"
			? p.enableFuzz
			: DEFAULT_FSRS_PARAMS.enableFuzz;

		return { requestRetention, maximumInterval, enableFuzz };
	}

	/**
	 * Validate queues array
	 */
	private validateQueues(queues: unknown): Queue[] {
		if (!Array.isArray(queues)) {
			return [];
		}

		return queues.filter((item) => this.isValidQueue(item));
	}

	/**
	 * Validate cards record
	 */
	private validateCards(cards: unknown): Record<string, CardData> {
		if (!cards || typeof cards !== "object") {
			return {};
		}

		const result: Record<string, CardData> = {};
		const rawCards = cards as Record<string, unknown>;

		for (const [path, card] of Object.entries(rawCards)) {
			if (this.isValidCardData(card)) {
				result[path] = card;
			}
			// Silently skip invalid cards to avoid console noise
		}

		return result;
	}

	/**
	 * Validate reviews array
	 */
	private validateReviews(reviews: unknown): ReviewLog[] {
		if (!Array.isArray(reviews)) {
			return [];
		}

		return reviews.filter((item) => this.isValidReviewLog(item));
	}

	/**
	 * Validate orphans array
	 */
	private validateOrphans(orphans: unknown): OrphanRecord[] {
		if (!Array.isArray(orphans)) {
			return [];
		}

		return orphans.filter((item) => this.isValidOrphanRecord(item));
	}

	// Type guards for validation
	private validateEnum<T extends string>(value: unknown, allowed: T[], defaultValue: T): T {
		return allowed.includes(value as T) ? (value as T) : defaultValue;
	}

	private validateStringArray(value: unknown, defaultValue: string[]): string[] {
		if (!Array.isArray(value)) {
			return defaultValue;
		}
		return value.filter((item): item is string => typeof item === "string");
	}

	private validateDailyLimit(
		value: unknown,
		defaultValue: number,
		min: number,
		max: number
	): number {
		const n = typeof value === "number" && Number.isInteger(value) ? value : defaultValue;
		return Math.max(min, Math.min(max, n));
	}

	private isValidPropertyMatch(item: unknown): item is PropertyMatch {
		if (!item || typeof item !== "object") return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.key === "string" &&
			typeof obj.value === "string" &&
			["equals", "contains", "exists"].includes(obj.operator as string)
		);
	}

	private isValidQueue(item: unknown): item is Queue {
		if (!item || typeof item !== "object") return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.id === "string" &&
			typeof obj.name === "string" &&
			typeof obj.createdAt === "string" &&
			obj.criteria !== undefined &&
			obj.stats !== undefined
		);
	}

	private isValidCardData(item: unknown): item is CardData {
		if (!item || typeof item !== "object") return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.notePath === "string" &&
			typeof obj.noteId === "string" &&
			typeof obj.schedules === "object" &&
			typeof obj.createdAt === "string"
		);
	}

	private isValidReviewLog(item: unknown): item is ReviewLog {
		if (!item || typeof item !== "object") return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.id === "string" &&
			typeof obj.cardPath === "string" &&
			typeof obj.queueId === "string" &&
			typeof obj.rating === "number"
		);
	}

	private isValidOrphanRecord(item: unknown): item is OrphanRecord {
		if (!item || typeof item !== "object") return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.id === "string" &&
			typeof obj.originalPath === "string" &&
			typeof obj.detectedAt === "string"
		);
	}

	/**
	 * Create a backup of corrupted data (on load failure)
	 */
	private async createBackup(data: unknown): Promise<void> {
		try {
			const id = `backup-corrupt-${Date.now()}`;
			const entry: BackupEntry = {
				id,
				timestamp: Date.now(),
				data: data && typeof data === "object" ? { ...(data as Omit<PluginData, "backups">) } : DEFAULT_PLUGIN_DATA,
			};
			if (!this.data.backups) {
				this.data.backups = [];
			}
			this.data.backups.push(entry);
			this.data.backups = this.data.backups.slice(-MAX_BACKUPS);
			this.dirty = true;
			await this.plugin.saveData(this.data);
			console.warn("[FSRS] Created backup of corrupted data:", id);
		} catch (error) {
			console.error("[FSRS] Failed to create backup:", error);
		}
	}

	/**
	 * Path to the separate backups file
	 */
	private get backupsFilePath(): string {
		return `${this.plugin.manifest.dir}/backups.json`;
	}

	/**
	 * Create a backup of current data before a save.
	 * Backups are written to a separate file and throttled to BACKUP_INTERVAL_MS.
	 */
	private async createBackupBeforeSave(): Promise<void> {
		const now = Date.now();
		if (now - this.lastBackupTime < BACKUP_INTERVAL_MS) {
			return;
		}

		try {
			const snapshot = this.getSnapshot();
			const dataWithoutBackups: Omit<PluginData, "backups"> = {
				version: snapshot.version,
				settings: snapshot.settings,
				queues: snapshot.queues,
				cards: snapshot.cards,
				reviews: snapshot.reviews,
				orphans: snapshot.orphans,
			};
			const entry: BackupEntry = {
				id: `backup-${now}`,
				timestamp: now,
				data: dataWithoutBackups,
			};

			// Read existing backups from file
			let backups: BackupEntry[] = [];
			try {
				const raw = await this.plugin.app.vault.adapter.read(this.backupsFilePath);
				const parsed: unknown = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					backups = parsed as BackupEntry[];
				}
			} catch {
				// File doesn't exist yet — start fresh
			}

			backups.push(entry);
			backups = backups.slice(-MAX_BACKUPS);

			await this.plugin.app.vault.adapter.write(
				this.backupsFilePath,
				JSON.stringify(backups)
			);
			this.lastBackupTime = now;
		} catch (error) {
			console.error("[FSRS] Failed to write backup:", error);
		}
	}

	/**
	 * List available backups (newest first) from the separate backups file
	 */
	async listBackups(): Promise<BackupEntry[]> {
		try {
			const raw = await this.plugin.app.vault.adapter.read(this.backupsFilePath);
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return (parsed as BackupEntry[]).reverse();
			}
		} catch {
			// No backups file yet
		}
		// Fall back to legacy in-data backups for migration
		const legacy = this.data.backups ?? [];
		return [...legacy].reverse();
	}

	/**
	 * Restore from a backup by ID (replaces current data in memory; call save() to persist)
	 */
	async restoreFromBackup(backupId: string): Promise<boolean> {
		const backups = await this.listBackups();
		const entry = backups.find((b) => b.id === backupId);
		if (!entry) {
			return false;
		}
		this.data = {
			...entry.data,
			backups: [],
		};
		this.dirty = true;
		return true;
	}

	// ============================================================================
	// Getters
	// ============================================================================

	/**
	 * Get current settings
	 */
	getSettings(): PluginSettings {
		return this.data.settings;
	}

	/**
	 * Get all queues
	 */
	getQueues(): Queue[] {
		return this.data.queues;
	}

	/**
	 * Get a specific queue by ID
	 */
	getQueue(id: string): Queue | undefined {
		return this.data.queues.find((q) => q.id === id);
	}

	/**
	 * Get all cards
	 */
	getCards(): Record<string, CardData> {
		return this.data.cards;
	}

	/**
	 * Get a specific card by note path
	 */
	getCard(notePath: string): CardData | undefined {
		return this.data.cards[notePath];
	}

	/**
	 * Get all review logs
	 */
	getReviews(): ReviewLog[] {
		return this.data.reviews;
	}

	/**
	 * Get review logs for a specific card
	 */
	getReviewsForCard(notePath: string): ReviewLog[] {
		return this.data.reviews.filter((r) => r.cardPath === notePath);
	}

	/**
	 * Get all orphan records
	 */
	getOrphans(): OrphanRecord[] {
		return this.data.orphans;
	}

	/**
	 * Get pending orphan records
	 */
	getPendingOrphans(): OrphanRecord[] {
		return this.data.orphans.filter((o) => o.status === "pending");
	}

	// ============================================================================
	// Settings Operations
	// ============================================================================

	/**
	 * Update settings (partial update supported)
	 */
	updateSettings(updates: DeepPartial<PluginSettings>): void {
		this.data.settings = {
			...this.data.settings,
			...updates,
		} as PluginSettings;
		this.markDirty();
	}

	// ============================================================================
	// Queue Operations
	// ============================================================================

	/**
	 * Add a new queue
	 */
	addQueue(queue: Queue): void {
		// Ensure unique ID
		if (this.data.queues.some((q) => q.id === queue.id)) {
			throw new Error(`Queue with ID "${queue.id}" already exists`);
		}
		this.data.queues.push(queue);
		this.markDirty();
	}

	/**
	 * Update an existing queue
	 */
	updateQueue(id: string, updates: Partial<Queue>): void {
		const index = this.data.queues.findIndex((q) => q.id === id);
		if (index === -1) {
			throw new Error(`Queue with ID "${id}" not found`);
		}
		const existing = this.data.queues[index];
		if (!existing) {
			throw new Error(`Queue with ID "${id}" not found`);
		}
		this.data.queues[index] = {
			id: updates.id ?? existing.id,
			name: updates.name ?? existing.name,
			createdAt: updates.createdAt ?? existing.createdAt,
			criteria: updates.criteria ?? existing.criteria,
			stats: updates.stats ?? existing.stats,
		};
		this.markDirty();
	}

	/**
	 * Delete a queue
	 */
	deleteQueue(id: string): void {
		const index = this.data.queues.findIndex((q) => q.id === id);
		if (index === -1) {
			throw new Error(`Queue with ID "${id}" not found`);
		}
		this.data.queues.splice(index, 1);
		this.markDirty();
	}

	// ============================================================================
	// Card Operations
	// ============================================================================

	/**
	 * Add or update a card
	 */
	setCard(notePath: string, card: CardData): void {
		this.data.cards[notePath] = card;
		this.markDirty();
	}

	/**
	 * Update an existing card
	 */
	updateCard(notePath: string, updates: Partial<CardData>): void {
		const existing = this.data.cards[notePath];
		if (!existing) {
			throw new Error(`Card for "${notePath}" not found`);
		}
		this.data.cards[notePath] = {
			...existing,
			...updates,
		};
		this.markDirty();
	}

	/**
	 * Delete a card
	 */
	deleteCard(notePath: string): void {
		delete this.data.cards[notePath];
		this.markDirty();
	}

	/**
	 * Rename a card (update path)
	 */
	renameCard(oldPath: string, newPath: string): void {
		const card = this.data.cards[oldPath];
		if (!card) {
			throw new Error(`Card for "${oldPath}" not found`);
		}
		// Update the card's notePath
		card.notePath = newPath;
		card.lastModified = nowISO();
		// Move to new key
		this.data.cards[newPath] = card;
		delete this.data.cards[oldPath];

		// Migrate review logs to new path
		this.migrateReviewLogPaths(oldPath, newPath);
	}

	// ============================================================================
	// Review Log Operations
	// ============================================================================

	/**
	 * Add a review log entry (auto-compacts when exceeding MAX_REVIEW_HISTORY)
	 */
	addReview(review: ReviewLog): void {
		this.data.reviews.push(review);

		// Compact if we've exceeded the limit by 10% to avoid trimming on every add
		if (this.data.reviews.length > MAX_REVIEW_HISTORY * 1.1) {
			this.compactReviews();
		}

		this.markDirty();
	}

	/**
	 * Compact review history by removing oldest entries beyond the limit.
	 * Undone reviews are removed first since they carry no analytical value.
	 */
	private compactReviews(): void {
		const reviews = this.data.reviews;
		if (reviews.length <= MAX_REVIEW_HISTORY) return;

		// Remove undone reviews first
		const active = reviews.filter((r) => !r.undone);

		if (active.length <= MAX_REVIEW_HISTORY) {
			this.data.reviews = active;
		} else {
			// Keep most recent entries
			this.data.reviews = active.slice(-MAX_REVIEW_HISTORY);
		}
	}

	/**
	 * Mark a review as undone
	 */
	markReviewUndone(reviewId: string): void {
		const review = this.data.reviews.find((r) => r.id === reviewId);
		if (review) {
			review.undone = true;
			this.markDirty();
		}
	}

	/**
	 * Migrate review log cardPath entries from old path to new path.
	 * Used when relinking orphaned cards to preserve review history continuity.
	 */
	migrateReviewLogPaths(oldPath: string, newPath: string): void {
		let migrated = 0;
		for (const review of this.data.reviews) {
			if (review.cardPath === oldPath) {
				review.cardPath = newPath;
				migrated++;
			}
		}
		if (migrated > 0) {
			this.markDirty();
		}
	}

	// ============================================================================
	// Orphan Operations
	// ============================================================================

	/**
	 * Add an orphan record
	 */
	addOrphan(orphan: OrphanRecord): void {
		this.data.orphans.push(orphan);
		this.markDirty();
	}

	/**
	 * Update an orphan record
	 */
	updateOrphan(id: string, updates: Partial<OrphanRecord>): void {
		const orphan = this.data.orphans.find((o) => o.id === id);
		if (orphan) {
			Object.assign(orphan, updates);
			this.markDirty();
		}
	}

	/**
	 * Remove resolved orphan records
	 */
	cleanupResolvedOrphans(): void {
		this.data.orphans = this.data.orphans.filter((o) => o.status === "pending");
		this.markDirty();
	}

	// ============================================================================
	// Save Operations
	// ============================================================================

	/**
	 * Mark data as dirty and schedule save
	 */
	private markDirty(): void {
		this.dirty = true;
		this.scheduleSave();
	}

	/**
	 * Schedule a debounced save
	 */
	private scheduleSave(): void {
		// Clear existing timeout
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		// Check if we can save immediately (respecting min interval)
		const timeSinceLastSave = Date.now() - this.lastSaveTime;
		const delay = Math.max(SAVE_DEBOUNCE_MS, MIN_SAVE_INTERVAL_MS - timeSinceLastSave);

		this.saveTimeout = setTimeout(() => {
			this.save().catch((error) => {
				console.error("[FSRS] Background save failed after all retries:", error);
			});
		}, delay);
	}

	/** Save retry configuration */
	private static readonly SAVE_MAX_RETRIES = 3;
	private static readonly SAVE_INITIAL_BACKOFF_MS = 100;

	/**
	 * Save data immediately (with backup before write and retry with exponential backoff)
	 */
	async save(): Promise<void> {
		if (!this.dirty) {
			return;
		}

		// Clear scheduled save
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		await this.createBackupBeforeSave();

		// Clear legacy in-data backups to reduce data.json size
		if (this.data.backups && this.data.backups.length > 0) {
			this.data.backups = [];
		}

		let lastError: Error | null = null;
		for (let attempt = 0; attempt < DataStore.SAVE_MAX_RETRIES; attempt++) {
			try {
				await this.plugin.saveData(this.data);
				this.dirty = false;
				this.lastSaveTime = Date.now();
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				console.error(`[FSRS] Save attempt ${attempt + 1}/${DataStore.SAVE_MAX_RETRIES} failed:`, lastError);
				if (attempt < DataStore.SAVE_MAX_RETRIES - 1) {
					const backoff = DataStore.SAVE_INITIAL_BACKOFF_MS * Math.pow(2, attempt);
					await new Promise((r) => setTimeout(r, backoff));
				}
			}
		}
		console.error("[FSRS] All save retries failed");
		throw lastError ?? new Error("Failed to save data");
	}

	/**
	 * Force an immediate save (used during plugin unload)
	 */
	async forceSave(): Promise<void> {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		this.dirty = true;
		await this.save();
	}

	/**
	 * Check if there are unsaved changes
	 */
	isDirty(): boolean {
		return this.dirty;
	}

	/**
	 * Get a snapshot of all data (for debugging/export)
	 */
	getSnapshot(): PluginData {
		return structuredClone(this.data);
	}
}
