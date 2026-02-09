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
 * BackupManager exposes backup listing, restore, and recovery
 */
export class BackupManager {
	constructor(private dataStore: DataStore) {}

	/**
	 * List available backups (newest first) for UI
	 */
	async listBackups(): Promise<BackupInfo[]> {
		const entries = await this.dataStore.listBackups();
		return entries.map((e) => ({
			id: e.id,
			timestamp: e.timestamp,
			dateLabel: new Date(e.timestamp).toLocaleString(),
		}));
	}

	/**
	 * Restore from a backup by ID (replaces in-memory data; caller should save)
	 */
	async restoreFromBackup(backupId: string): Promise<boolean> {
		return this.dataStore.restoreFromBackup(backupId);
	}

	/**
	 * Get raw backup entry by ID (e.g. for preview)
	 */
	async getBackupEntry(backupId: string): Promise<BackupEntry | undefined> {
		const backups = await this.dataStore.listBackups();
		return backups.find((b) => b.id === backupId);
	}
}
