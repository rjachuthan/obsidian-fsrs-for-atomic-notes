/**
 * Centralized error handling for the plugin
 * Logs errors, notifies users, and supports recovery flows
 */

import { Notice } from "obsidian";
import { ERROR_NOTICE_DURATION_MS } from "../constants";

/** Context for error reporting */
export interface ErrorContext {
	/** Component or operation where the error occurred */
	component?: string;
	/** Optional recovery callback (e.g. retry or restore from backup) */
	onRecovery?: () => void | Promise<void>;
	/** Whether to show a user-facing notice */
	notifyUser?: boolean;
}

/**
 * Centralized error handler: log, optionally notify user, and attempt recovery
 */
export function handleError(error: unknown, context: ErrorContext = {}): void {
	const message = error instanceof Error ? error.message : String(error);
	const { component = "FSRS", onRecovery, notifyUser = true } = context;

	console.error(`[FSRS]${component ? ` ${component}:` : ""}`, error);

	if (notifyUser) {
		const shortMessage = message.length > 80 ? `${message.slice(0, 77)}...` : message;
		new Notice(`FSRS: ${shortMessage}`, ERROR_NOTICE_DURATION_MS);
	}

	if (onRecovery && typeof onRecovery === "function") {
		try {
			void Promise.resolve(onRecovery()).catch((e) => {
				console.error("[FSRS] Recovery failed:", e);
			});
		} catch (e) {
			console.error("[FSRS] Recovery threw:", e);
		}
	}
}
