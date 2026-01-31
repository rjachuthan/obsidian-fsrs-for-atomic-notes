/**
 * Dashboard Analytics - Computation helpers for dashboard statistics
 * Provides data processing for all dashboard visualizations
 */

import type { CardData, ReviewLog, CardState } from "../../types";
import { parseISODate, getStartOfToday, isDue, isOverdue } from "../../utils/date-utils";

// ============================================================================
// Types
// ============================================================================

export interface OverviewStats {
	totalCards: number;
	dueToday: number;
	overdue: number;
	newCards: number;
	learningCards: number;
	reviewCards: number;
	upcomingWeek: number;
}

export interface HeatmapData {
	date: string; // YYYY-MM-DD
	count: number;
	level: 0 | 1 | 2 | 3 | 4; // Intensity level for coloring
}

export interface RetentionStats {
	targetRetention: number;
	trueRetention: number;
	estimatedRetention: number;
	totalReviews: number;
	successfulReviews: number;
}

export interface ForecastData {
	date: string;
	dueCount: number;
	newCount: number;
}

export interface StateDistribution {
	state: CardState;
	label: string;
	count: number;
	percentage: number;
}

export interface DifficultyDistribution {
	range: string;
	count: number;
	percentage: number;
}

export interface StreakInfo {
	currentStreak: number;
	longestStreak: number;
	lastReviewDate: string | null;
}

export interface CardTableEntry {
	notePath: string;
	noteTitle: string;
	state: CardState;
	stateLabel: string;
	due: Date;
	dueText: string;
	stability: number;
	difficulty: number;
	reps: number;
	lapses: number;
	queueId: string;
}

// ============================================================================
// Overview Statistics
// ============================================================================

/**
 * Calculate overview statistics for all cards or a specific queue
 */
export function calculateOverviewStats(
	cards: Record<string, CardData>,
	queueId?: string
): OverviewStats {
	const today = getStartOfToday();
	const weekFromNow = new Date(today);
	weekFromNow.setDate(weekFromNow.getDate() + 7);

	let totalCards = 0;
	let dueToday = 0;
	let overdue = 0;
	let newCards = 0;
	let learningCards = 0;
	let reviewCards = 0;
	let upcomingWeek = 0;

	for (const card of Object.values(cards)) {
		const schedules = queueId
			? { [queueId]: card.schedules[queueId] }
			: card.schedules;

		for (const [qId, schedule] of Object.entries(schedules)) {
			if (!schedule) continue;
			if (queueId && qId !== queueId) continue;

			totalCards++;

			const dueDate = parseISODate(schedule.due);

			// State counts
			if (schedule.state === 0) {
				newCards++;
			} else if (schedule.state === 1) {
				learningCards++;
			} else if (schedule.state === 2 || schedule.state === 3) {
				reviewCards++;
			}

			// Due status
			if (isOverdue(dueDate)) {
				overdue++;
				dueToday++;
			} else if (isDue(dueDate)) {
				dueToday++;
			}

			// Upcoming week (excluding today)
			if (dueDate > today && dueDate <= weekFromNow) {
				upcomingWeek++;
			}
		}
	}

	return {
		totalCards,
		dueToday,
		overdue,
		newCards,
		learningCards,
		reviewCards,
		upcomingWeek,
	};
}

// ============================================================================
// Heatmap Data
// ============================================================================

/**
 * Generate heatmap data for the last 12 months
 */
export function generateHeatmapData(
	reviews: ReviewLog[],
	months: number = 12
): HeatmapData[] {
	const today = new Date();
	const startDate = new Date(today);
	startDate.setMonth(startDate.getMonth() - months);
	startDate.setDate(1); // Start from first of that month

	// Count reviews per day
	const reviewCounts = new Map<string, number>();

	for (const review of reviews) {
		if (review.undone) continue;

		const reviewDate = parseISODate(review.review);
		if (reviewDate < startDate) continue;

		const dateKey = formatDateKey(reviewDate);
		reviewCounts.set(dateKey, (reviewCounts.get(dateKey) ?? 0) + 1);
	}

	// Find max for scaling
	const maxCount = Math.max(1, ...reviewCounts.values());

	// Generate data for each day
	const heatmapData: HeatmapData[] = [];
	const currentDate = new Date(startDate);

	while (currentDate <= today) {
		const dateKey = formatDateKey(currentDate);
		const count = reviewCounts.get(dateKey) ?? 0;
		const level = calculateHeatmapLevel(count, maxCount);

		heatmapData.push({
			date: dateKey,
			count,
			level,
		});

		currentDate.setDate(currentDate.getDate() + 1);
	}

	return heatmapData;
}

function formatDateKey(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateHeatmapLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
	if (count === 0) return 0;
	const ratio = count / maxCount;
	if (ratio <= 0.25) return 1;
	if (ratio <= 0.5) return 2;
	if (ratio <= 0.75) return 3;
	return 4;
}

// ============================================================================
// Retention Statistics
// ============================================================================

/**
 * Calculate retention statistics from review history
 */
export function calculateRetentionStats(
	reviews: ReviewLog[],
	targetRetention: number,
	cards: Record<string, CardData>,
	queueId?: string
): RetentionStats {
	// Filter reviews for queue if specified
	const filteredReviews = queueId
		? reviews.filter((r) => r.queueId === queueId && !r.undone)
		: reviews.filter((r) => !r.undone);

	const totalReviews = filteredReviews.length;

	// Successful reviews are those with rating >= 2 (not "Again")
	const successfulReviews = filteredReviews.filter((r) => r.rating >= 2).length;

	// True retention = successful / total
	const trueRetention = totalReviews > 0 ? successfulReviews / totalReviews : targetRetention;

	// Estimated retention based on current card retrievabilities
	let totalRetrievability = 0;
	let cardCount = 0;

	for (const card of Object.values(cards)) {
		const schedule = queueId ? card.schedules[queueId] : Object.values(card.schedules)[0];
		if (!schedule) continue;

		// Simple retrievability estimate based on stability and elapsed time
		const now = new Date();
		const elapsedDays = (now.getTime() - (schedule.lastReview ? parseISODate(schedule.lastReview).getTime() : now.getTime())) / (1000 * 60 * 60 * 24);

		if (schedule.stability > 0) {
			// R = exp(-t/S) where t is elapsed time and S is stability
			const retrievability = Math.exp(-elapsedDays / schedule.stability);
			totalRetrievability += retrievability;
			cardCount++;
		}
	}

	const estimatedRetention = cardCount > 0 ? totalRetrievability / cardCount : targetRetention;

	return {
		targetRetention,
		trueRetention,
		estimatedRetention,
		totalReviews,
		successfulReviews,
	};
}

// ============================================================================
// Forecast Data
// ============================================================================

/**
 * Generate 30-day forecast of due cards
 */
export function generateForecast(
	cards: Record<string, CardData>,
	days: number = 30,
	queueId?: string
): ForecastData[] {
	const today = getStartOfToday();
	const forecast: ForecastData[] = [];

	for (let i = 0; i < days; i++) {
		const targetDate = new Date(today);
		targetDate.setDate(targetDate.getDate() + i);
		const nextDate = new Date(targetDate);
		nextDate.setDate(nextDate.getDate() + 1);

		let dueCount = 0;
		let newCount = 0;

		for (const card of Object.values(cards)) {
			const schedule = queueId ? card.schedules[queueId] : Object.values(card.schedules)[0];
			if (!schedule) continue;

			const dueDate = parseISODate(schedule.due);

			// Card is due on this day
			if (dueDate >= targetDate && dueDate < nextDate) {
				if (schedule.state === 0) {
					newCount++;
				} else {
					dueCount++;
				}
			}

			// For day 0, include overdue cards
			if (i === 0 && dueDate < targetDate) {
				if (schedule.state === 0) {
					newCount++;
				} else {
					dueCount++;
				}
			}
		}

		forecast.push({
			date: formatDateKey(targetDate),
			dueCount,
			newCount,
		});
	}

	return forecast;
}

// ============================================================================
// State Distribution
// ============================================================================

/**
 * Calculate card state distribution
 */
export function calculateStateDistribution(
	cards: Record<string, CardData>,
	queueId?: string
): StateDistribution[] {
	const counts: Record<CardState, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
	const labels: Record<CardState, string> = {
		0: "New",
		1: "Learning",
		2: "Review",
		3: "Relearning",
	};

	let total = 0;

	for (const card of Object.values(cards)) {
		const schedule = queueId ? card.schedules[queueId] : Object.values(card.schedules)[0];
		if (!schedule) continue;

		counts[schedule.state]++;
		total++;
	}

	return ([0, 1, 2, 3] as CardState[]).map((state) => ({
		state,
		label: labels[state],
		count: counts[state],
		percentage: total > 0 ? (counts[state] / total) * 100 : 0,
	}));
}

// ============================================================================
// Difficulty Distribution
// ============================================================================

/**
 * Calculate difficulty distribution in ranges
 */
export function calculateDifficultyDistribution(
	cards: Record<string, CardData>,
	queueId?: string
): DifficultyDistribution[] {
	const ranges = [
		{ min: 0, max: 2, label: "Very Easy" },
		{ min: 2, max: 4, label: "Easy" },
		{ min: 4, max: 6, label: "Medium" },
		{ min: 6, max: 8, label: "Hard" },
		{ min: 8, max: 10, label: "Very Hard" },
	];

	const counts: number[] = new Array<number>(ranges.length).fill(0);
	let total = 0;

	for (const card of Object.values(cards)) {
		const schedule = queueId ? card.schedules[queueId] : Object.values(card.schedules)[0];
		if (!schedule) continue;

		const difficulty = schedule.difficulty;
		for (let i = 0; i < ranges.length; i++) {
			const range = ranges[i];
			if (range && difficulty >= range.min && difficulty < range.max) {
				const current = counts[i];
				if (current !== undefined) {
					counts[i] = current + 1;
				}
				break;
			}
		}
		total++;
	}

	return ranges.map((range, i) => ({
		range: range.label,
		count: counts[i] ?? 0,
		percentage: total > 0 ? ((counts[i] ?? 0) / total) * 100 : 0,
	}));
}

// ============================================================================
// Streak Calculation
// ============================================================================

/**
 * Calculate review streak information
 */
export function calculateStreaks(reviews: ReviewLog[]): StreakInfo {
	// Filter out undone reviews and sort by date descending
	const validReviews = reviews
		.filter((r) => !r.undone)
		.sort((a, b) => parseISODate(b.review).getTime() - parseISODate(a.review).getTime());

	if (validReviews.length === 0) {
		return { currentStreak: 0, longestStreak: 0, lastReviewDate: null };
	}

	// Get unique review days
	const reviewDays = new Set<string>();
	for (const review of validReviews) {
		reviewDays.add(formatDateKey(parseISODate(review.review)));
	}

	const sortedDays = Array.from(reviewDays).sort().reverse();
	const lastReviewDate = sortedDays[0] ?? null;

	// Calculate current streak
	let currentStreak = 0;
	const today = formatDateKey(new Date());
	const yesterday = formatDateKey(new Date(Date.now() - 86400000));

	// Current streak must include today or yesterday
	if (sortedDays[0] === today || sortedDays[0] === yesterday) {
		let checkDate = new Date(sortedDays[0]);
		for (const day of sortedDays) {
			if (formatDateKey(checkDate) === day) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}
	}

	// Calculate longest streak
	let longestStreak = 0;
	let tempStreak = 0;
	let prevDate: Date | null = null;

	for (const day of sortedDays.reverse()) {
		const currentDate = new Date(day);
		if (prevDate === null) {
			tempStreak = 1;
		} else {
			const diffDays = Math.round((prevDate.getTime() - currentDate.getTime()) / 86400000);
			if (diffDays === 1) {
				tempStreak++;
			} else {
				longestStreak = Math.max(longestStreak, tempStreak);
				tempStreak = 1;
			}
		}
		prevDate = currentDate;
	}
	longestStreak = Math.max(longestStreak, tempStreak);

	return {
		currentStreak,
		longestStreak,
		lastReviewDate,
	};
}

// ============================================================================
// Card Table Data
// ============================================================================

/**
 * Generate card table entries with sorting support
 */
export function generateCardTableData(
	cards: Record<string, CardData>,
	queueId?: string
): CardTableEntry[] {
	const entries: CardTableEntry[] = [];
	const stateLabels: Record<CardState, string> = {
		0: "New",
		1: "Learning",
		2: "Review",
		3: "Relearning",
	};

	for (const card of Object.values(cards)) {
		const schedules = queueId
			? { [queueId]: card.schedules[queueId] }
			: card.schedules;

		for (const [qId, schedule] of Object.entries(schedules)) {
			if (!schedule) continue;

			const dueDate = parseISODate(schedule.due);
			const noteTitle = card.notePath.split("/").pop()?.replace(".md", "") ?? card.notePath;

			entries.push({
				notePath: card.notePath,
				noteTitle,
				state: schedule.state,
				stateLabel: stateLabels[schedule.state],
				due: dueDate,
				dueText: formatRelativeDate(dueDate),
				stability: schedule.stability,
				difficulty: schedule.difficulty,
				reps: schedule.reps,
				lapses: schedule.lapses,
				queueId: qId,
			});
		}
	}

	return entries;
}

function formatRelativeDate(date: Date): string {
	const today = getStartOfToday();
	const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);

	if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
	if (diffDays === -1) return "Yesterday";
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Tomorrow";
	return `In ${diffDays} days`;
}

/**
 * Sort table entries by specified column
 */
export function sortCardTableData(
	entries: CardTableEntry[],
	column: keyof CardTableEntry,
	ascending: boolean = true
): CardTableEntry[] {
	return [...entries].sort((a, b) => {
		let comparison = 0;

		if (column === "due") {
			comparison = a.due.getTime() - b.due.getTime();
		} else if (typeof a[column] === "string") {
			comparison = String(a[column]).localeCompare(String(b[column]));
		} else if (typeof a[column] === "number") {
			comparison = Number(a[column]) - Number(b[column]);
		}

		return ascending ? comparison : -comparison;
	});
}

/**
 * Filter table entries by search query
 */
export function filterCardTableData(
	entries: CardTableEntry[],
	query: string
): CardTableEntry[] {
	if (!query.trim()) return entries;

	const lowerQuery = query.toLowerCase();
	return entries.filter(
		(entry) =>
			entry.noteTitle.toLowerCase().includes(lowerQuery) ||
			entry.notePath.toLowerCase().includes(lowerQuery) ||
			entry.stateLabel.toLowerCase().includes(lowerQuery)
	);
}
