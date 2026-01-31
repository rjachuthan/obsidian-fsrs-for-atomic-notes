/**
 * Date utility functions for FSRS scheduling and display
 */

import { TIME_THRESHOLDS, TIME_LABELS } from "../constants";

/**
 * Get the start of today (midnight) in local timezone
 */
export function getStartOfToday(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Get the end of today (23:59:59.999) in local timezone
 */
export function getEndOfToday(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	const today = getStartOfToday();
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return date >= today && date < tomorrow;
}

/**
 * Check if a date is before today (overdue)
 */
export function isOverdue(date: Date): boolean {
	return date < getStartOfToday();
}

/**
 * Check if a date is due (today or overdue)
 */
export function isDue(date: Date): boolean {
	return date <= getEndOfToday();
}

/**
 * Get days between two dates (can be negative if date2 is before date1)
 */
export function getDaysBetween(date1: Date, date2: Date): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Get days until a date from today
 */
export function getDaysUntil(date: Date): number {
	return getDaysBetween(getStartOfToday(), date);
}

/**
 * Format a duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
	if (seconds < 0) {
		return "overdue";
	}

	if (seconds < TIME_THRESHOLDS.MINUTE) {
		const value = Math.round(seconds);
		return `${value} ${value === 1 ? TIME_LABELS.second.singular : TIME_LABELS.second.plural}`;
	}

	if (seconds < TIME_THRESHOLDS.HOUR) {
		const value = Math.round(seconds / 60);
		return `${value} ${value === 1 ? TIME_LABELS.minute.singular : TIME_LABELS.minute.plural}`;
	}

	if (seconds < TIME_THRESHOLDS.DAY) {
		const value = Math.round(seconds / 3600);
		return `${value} ${value === 1 ? TIME_LABELS.hour.singular : TIME_LABELS.hour.plural}`;
	}

	if (seconds < TIME_THRESHOLDS.MONTH) {
		const value = Math.round(seconds / 86400);
		return `${value} ${value === 1 ? TIME_LABELS.day.singular : TIME_LABELS.day.plural}`;
	}

	if (seconds < TIME_THRESHOLDS.YEAR) {
		const value = Math.round(seconds / (86400 * 30));
		return `${value} ${value === 1 ? TIME_LABELS.month.singular : TIME_LABELS.month.plural}`;
	}

	const value = Math.round(seconds / (86400 * 365));
	return `${value} ${value === 1 ? TIME_LABELS.year.singular : TIME_LABELS.year.plural}`;
}

/**
 * Format interval in days to human-readable string
 */
export function formatInterval(days: number): string {
	if (days < 1) {
		// Less than a day, show in minutes or hours
		const hours = days * 24;
		if (hours < 1) {
			const minutes = Math.round(hours * 60);
			return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
		}
		const roundedHours = Math.round(hours);
		return `${roundedHours} ${roundedHours === 1 ? "hour" : "hours"}`;
	}

	if (days < 30) {
		const roundedDays = Math.round(days);
		return `${roundedDays} ${roundedDays === 1 ? "day" : "days"}`;
	}

	if (days < 365) {
		const months = Math.round(days / 30);
		return `${months} ${months === 1 ? "month" : "months"}`;
	}

	const years = Math.round(days / 365);
	return `${years} ${years === 1 ? "year" : "years"}`;
}

/**
 * Format a date relative to today (e.g., "Today", "Tomorrow", "In 3 days", "2 days ago")
 */
export function formatRelativeDate(date: Date): string {
	const daysUntil = getDaysUntil(date);

	if (daysUntil === 0) {
		return "Today";
	}

	if (daysUntil === 1) {
		return "Tomorrow";
	}

	if (daysUntil === -1) {
		return "Yesterday";
	}

	if (daysUntil > 1) {
		return `In ${daysUntil} days`;
	}

	return `${Math.abs(daysUntil)} days ago`;
}

/**
 * Parse an ISO date string to Date object
 */
export function parseISODate(isoString: string): Date {
	return new Date(isoString);
}

/**
 * Convert Date to ISO string for storage
 */
export function toISOString(date: Date): string {
	return date.toISOString();
}

/**
 * Get current timestamp as ISO string
 */
export function nowISO(): string {
	return new Date().toISOString();
}
