/**
 * Utility functions for generating unique identifiers
 */

/**
 * Generate a unique identifier using crypto API if available, fallback to timestamp + random
 */
export function generateId(): string {
	// Use crypto.randomUUID if available (modern browsers/Node)
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	// Fallback: timestamp + random string
	const timestamp = Date.now().toString(36);
	const randomPart = Math.random().toString(36).substring(2, 15);
	return `${timestamp}-${randomPart}`;
}

/**
 * Generate a short identifier (8 characters)
 */
export function generateShortId(): string {
	return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a session identifier with timestamp prefix
 */
export function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `session-${timestamp}-${random}`;
}

/**
 * Generate a review log identifier
 */
export function generateReviewLogId(): string {
	return `review-${generateId()}`;
}
