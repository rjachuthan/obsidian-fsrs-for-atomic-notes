/**
 * BackupManager - High-level backup and recovery API
 * Delegates to DataStore for persistence; used by settings or recovery UI
 */

import type { DataStore } from "./data-store";
import type { BackupEntry } from "../types";

/** Backup info for UI (id, timestamp for display) */
export interface BackupInfo {
	id: string;
	timestamp: number;
	/** Human-readable date string */
	dateLabel: string;
}

/**
 * BackupManager exposes backup creation, listing, restore, and cleanup
 */
export class BackupManager {
	constructor(private dataStore: DataStore) {}

	/**
	 * Create a backup of current data (stored in plugin data; keep last 5)
	 */
	createBackup(): void {
		this.dataStore.createBackupBeforeSave();
	}

	/**
	 * List available backups (newest first) for UI
	 */
	listBackups(): BackupInfo[] {
		const entries = this.dataStore.listBackups();
		return entries.map((e) => ({
			id: e.id,
			timestamp: e.timestamp,
			dateLabel: new Date(e.timestamp).toLocaleString(),
		}));
	}

	/**
	 * Restore from a backup by ID (replaces in-memory data; caller should save)
	 */
	restoreFromBackup(backupId: string): boolean {
		return this.dataStore.restoreFromBackup(backupId);
	}

	/**
	 * Remove old backups (keep last 5)
	 */
	cleanupOldBackups(): void {
		this.dataStore.cleanupOldBackups();
	}

	/**
	 * Get raw backup entry by ID (e.g. for preview)
	 */
	getBackupEntry(backupId: string): BackupEntry | undefined {
		return this.dataStore.listBackups().find((b) => b.id === backupId);
	}
}
