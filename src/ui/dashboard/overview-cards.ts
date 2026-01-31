/**
 * Overview Cards - Summary statistics display component
 * Shows total, due, overdue, new, and upcoming cards
 */

import type { OverviewStats } from "./dashboard-analytics";

/**
 * Render overview stat cards
 */
export function renderOverviewCards(container: HTMLElement, stats: OverviewStats): void {
	container.empty();
	container.addClass("fsrs-overview-cards");

	const cards = [
		{ label: "Total", value: stats.totalCards, cls: "fsrs-stat-total" },
		{ label: "Due Today", value: stats.dueToday, cls: "fsrs-stat-due", highlight: stats.dueToday > 0 },
		{ label: "Overdue", value: stats.overdue, cls: "fsrs-stat-overdue", highlight: stats.overdue > 0, warn: true },
		{ label: "New", value: stats.newCards, cls: "fsrs-stat-new" },
		{ label: "Learning", value: stats.learningCards, cls: "fsrs-stat-learning" },
		{ label: "Upcoming (7d)", value: stats.upcomingWeek, cls: "fsrs-stat-upcoming" },
	];

	for (const card of cards) {
		const cardEl = container.createDiv({ cls: `fsrs-overview-card ${card.cls}` });

		if (card.highlight) {
			cardEl.addClass("fsrs-highlight");
		}
		if (card.warn) {
			cardEl.addClass("fsrs-warn");
		}

		cardEl.createDiv({ cls: "fsrs-overview-value", text: String(card.value) });
		cardEl.createDiv({ cls: "fsrs-overview-label", text: card.label });
	}
}
