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
	DeepPartial,
	PropertyMatch,
} from "../types";
import {
	CURRENT_SCHEMA_VERSION,
	DEFAULT_PLUGIN_DATA,
	DEFAULT_SETTINGS,
	SAVE_DEBOUNCE_MS,
	MIN_SAVE_INTERVAL_MS,
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
		};

		return validatedData;
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
			fsrsParams: s.fsrsParams as PluginSettings["fsrsParams"],
		};
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
	 * Create a backup of corrupted data
	 */
	private async createBackup(data: unknown): Promise<void> {
		try {
			const backupKey = `backup-${Date.now()}`;
			console.warn(`[FSRS] Creating backup of corrupted data: ${backupKey}`, JSON.stringify(data));
		} catch (error) {
			console.error("[FSRS] Failed to create backup:", error);
		}
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
		this.markDirty();
	}

	// ============================================================================
	// Review Log Operations
	// ============================================================================

	/**
	 * Add a review log entry
	 */
	addReview(review: ReviewLog): void {
		this.data.reviews.push(review);
		this.markDirty();
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
			void this.save();
		}, delay);
	}

	/**
	 * Save data immediately
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

		try {
			await this.plugin.saveData(this.data);
			this.dirty = false;
			this.lastSaveTime = Date.now();
		} catch (error) {
			console.error("[FSRS] Failed to save data:", error);
			throw error;
		}
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
