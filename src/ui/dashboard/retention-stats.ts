/**
 * Retention Stats - Display target vs actual retention rates
 */

import type { RetentionStats } from "./dashboard-analytics";

/**
 * Render retention statistics display
 */
export function renderRetentionStats(container: HTMLElement, stats: RetentionStats): void {
	container.empty();
	container.addClass("fsrs-retention-container");

	const header = container.createDiv({ cls: "fsrs-retention-header" });
	header.createSpan({ text: "Retention", cls: "fsrs-section-title" });

	const statsGrid = container.createDiv({ cls: "fsrs-retention-grid" });

	// Target Retention
	renderRetentionBar(statsGrid, "Target", stats.targetRetention, "fsrs-retention-target");

	// True Retention (from review history)
	renderRetentionBar(statsGrid, "True", stats.trueRetention, getTrueRetentionClass(stats));

	// Estimated Retention (current state)
	renderRetentionBar(statsGrid, "Estimated", stats.estimatedRetention, "fsrs-retention-estimated");

	// Additional stats
	const details = container.createDiv({ cls: "fsrs-retention-details" });
	details.createSpan({
		text: `${stats.successfulReviews} / ${stats.totalReviews} successful reviews`,
		cls: "fsrs-retention-detail-text",
	});
}

function renderRetentionBar(
	container: HTMLElement,
	label: string,
	value: number,
	cls: string
): void {
	const row = container.createDiv({ cls: "fsrs-retention-row" });

	row.createDiv({ cls: "fsrs-retention-label", text: label });

	const barContainer = row.createDiv({ cls: "fsrs-retention-bar-container" });
	const bar = barContainer.createDiv({ cls: `fsrs-retention-bar ${cls}` });
	bar.style.width = `${Math.min(100, value * 100)}%`;

	row.createDiv({
		cls: "fsrs-retention-value",
		text: `${Math.round(value * 100)}%`,
	});
}

function getTrueRetentionClass(stats: RetentionStats): string {
	const diff = stats.trueRetention - stats.targetRetention;

	if (Math.abs(diff) < 0.02) {
		return "fsrs-retention-good";
	} else if (diff >= 0) {
		return "fsrs-retention-excellent";
	} else if (diff >= -0.05) {
		return "fsrs-retention-warning";
	} else {
		return "fsrs-retention-poor";
	}
}
