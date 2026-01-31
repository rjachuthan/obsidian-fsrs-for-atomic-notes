/**
 * Calendar Heatmap - 12-month review activity visualization
 * Pure CSS grid-based heatmap similar to GitHub contribution graph
 */

import type { HeatmapData } from "./dashboard-analytics";

/**
 * Render calendar heatmap
 */
export function renderCalendarHeatmap(container: HTMLElement, data: HeatmapData[]): void {
	container.empty();
	container.addClass("fsrs-heatmap-container");

	// Header
	const header = container.createDiv({ cls: "fsrs-heatmap-header" });
	header.createSpan({ text: "Review Activity", cls: "fsrs-heatmap-title" });

	// Calculate totals
	const totalReviews = data.reduce((sum, d) => sum + d.count, 0);
	const activeDays = data.filter((d) => d.count > 0).length;
	header.createSpan({
		text: `${totalReviews} reviews in ${activeDays} days`,
		cls: "fsrs-heatmap-summary",
	});

	// Month labels row
	const monthsContainer = container.createDiv({ cls: "fsrs-heatmap-months" });
	const months = getMonthLabels(data);
	for (const month of months) {
		const monthLabel = monthsContainer.createSpan({
			cls: "fsrs-heatmap-month-label",
		});
		monthLabel.textContent = month.label;
		monthLabel.style.gridColumnStart = String(month.startWeek + 1);
	}

	// Main grid container
	const gridContainer = container.createDiv({ cls: "fsrs-heatmap-grid-wrapper" });

	// Day labels (Sun-Sat)
	const dayLabels = gridContainer.createDiv({ cls: "fsrs-heatmap-day-labels" });
	const days = ["", "Mon", "", "Wed", "", "Fri", ""];
	for (const day of days) {
		dayLabels.createDiv({ cls: "fsrs-heatmap-day-label", text: day });
	}

	// Grid
	const grid = gridContainer.createDiv({ cls: "fsrs-heatmap-grid" });

	// Group data by week
	const weeks = groupDataByWeek(data);

	for (const week of weeks) {
		const weekCol = grid.createDiv({ cls: "fsrs-heatmap-week" });

		for (const day of week) {
			const cell = weekCol.createDiv({
				cls: `fsrs-heatmap-cell fsrs-heatmap-level-${day?.level ?? 0}`,
			});

			if (day) {
				cell.setAttribute("data-date", day.date);
				cell.setAttribute("data-count", String(day.count));
				cell.setAttribute("aria-label", `${day.count} reviews on ${formatDateDisplay(day.date)}`);
				cell.title = `${day.count} reviews on ${formatDateDisplay(day.date)}`;
			} else {
				cell.addClass("fsrs-heatmap-empty");
			}
		}
	}

	// Legend
	const legend = container.createDiv({ cls: "fsrs-heatmap-legend" });
	legend.createSpan({ text: "Less", cls: "fsrs-heatmap-legend-text" });

	for (let level = 0; level <= 4; level++) {
		legend.createDiv({
			cls: `fsrs-heatmap-cell fsrs-heatmap-level-${level} fsrs-heatmap-legend-cell`,
		});
	}

	legend.createSpan({ text: "More", cls: "fsrs-heatmap-legend-text" });
}

interface MonthLabel {
	label: string;
	startWeek: number;
}

function getMonthLabels(data: HeatmapData[]): MonthLabel[] {
	if (data.length === 0) return [];

	const months: MonthLabel[] = [];
	let currentMonth = -1;
	let weekIndex = 0;
	let dayInWeek = 0;

	const firstItem = data[0];
	if (!firstItem) return [];

	const firstDate = new Date(firstItem.date);
	dayInWeek = firstDate.getDay();

	for (const item of data) {
		const date = new Date(item.date);
		const month = date.getMonth();

		if (month !== currentMonth) {
			months.push({
				label: getMonthShortName(month),
				startWeek: weekIndex,
			});
			currentMonth = month;
		}

		dayInWeek++;
		if (dayInWeek === 7) {
			dayInWeek = 0;
			weekIndex++;
		}
	}

	return months;
}

function getMonthShortName(month: number): string {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	return months[month] ?? "";
}

function groupDataByWeek(data: HeatmapData[]): (HeatmapData | null)[][] {
	if (data.length === 0) return [];

	const weeks: (HeatmapData | null)[][] = [];
	let currentWeek: (HeatmapData | null)[] = [];

	// Fill in empty days at the start
	const firstItem = data[0];
	if (!firstItem) return [];

	const firstDate = new Date(firstItem.date);
	const startDayOfWeek = firstDate.getDay();

	for (let i = 0; i < startDayOfWeek; i++) {
		currentWeek.push(null);
	}

	// Add data
	for (const item of data) {
		currentWeek.push(item);

		if (currentWeek.length === 7) {
			weeks.push(currentWeek);
			currentWeek = [];
		}
	}

	// Add remaining days
	if (currentWeek.length > 0) {
		while (currentWeek.length < 7) {
			currentWeek.push(null);
		}
		weeks.push(currentWeek);
	}

	return weeks;
}

function formatDateDisplay(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
