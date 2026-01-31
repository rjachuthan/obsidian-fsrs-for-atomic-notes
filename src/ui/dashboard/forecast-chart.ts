/**
 * Forecast Chart - 30-day forecast bar chart
 * Pure CSS-based bar visualization
 */

import type { ForecastData } from "./dashboard-analytics";

/**
 * Render 30-day forecast chart
 */
export function renderForecastChart(container: HTMLElement, data: ForecastData[]): void {
	container.empty();
	container.addClass("fsrs-forecast-container");

	const header = container.createDiv({ cls: "fsrs-forecast-header" });
	header.createSpan({ text: "30-Day Forecast", cls: "fsrs-section-title" });

	// Calculate max for scaling
	const maxValue = Math.max(1, ...data.map((d) => d.dueCount + d.newCount));

	// Chart container
	const chartContainer = container.createDiv({ cls: "fsrs-forecast-chart" });

	// X-axis labels (every 7 days)
	const xAxisLabels = chartContainer.createDiv({ cls: "fsrs-forecast-x-labels" });

	// Bars container
	const barsContainer = chartContainer.createDiv({ cls: "fsrs-forecast-bars" });

	for (let i = 0; i < data.length; i++) {
		const item = data[i];
		if (!item) continue;

		const totalValue = item.dueCount + item.newCount;
		const heightPercent = (totalValue / maxValue) * 100;

		const barWrapper = barsContainer.createDiv({ cls: "fsrs-forecast-bar-wrapper" });

		// Stacked bar
		const bar = barWrapper.createDiv({ cls: "fsrs-forecast-bar" });
		bar.style.height = `${heightPercent}%`;

		if (item.newCount > 0 && item.dueCount > 0) {
			// Stacked: due on bottom, new on top
			const dueRatio = (item.dueCount / totalValue) * 100;
			const newRatio = (item.newCount / totalValue) * 100;

			const duePart = bar.createDiv({ cls: "fsrs-forecast-bar-due" });
			duePart.style.height = `${dueRatio}%`;

			const newPart = bar.createDiv({ cls: "fsrs-forecast-bar-new" });
			newPart.style.height = `${newRatio}%`;
		} else if (item.dueCount > 0) {
			bar.addClass("fsrs-forecast-bar-due-only");
		} else if (item.newCount > 0) {
			bar.addClass("fsrs-forecast-bar-new-only");
		}

		// Tooltip
		const tooltip = getDateLabel(item.date, i);
		bar.title = `${tooltip}: ${item.dueCount} due, ${item.newCount} new`;
		bar.setAttribute("aria-label", bar.title);

		// X-axis label for certain days
		if (i === 0 || i === 6 || i === 13 || i === 20 || i === 29) {
			const label = xAxisLabels.createDiv({ cls: "fsrs-forecast-x-label" });
			label.textContent = getShortDateLabel(item.date, i);
			label.style.left = `${(i / (data.length - 1)) * 100}%`;
		}
	}

	// Legend
	const legend = container.createDiv({ cls: "fsrs-forecast-legend" });

	const dueLegend = legend.createDiv({ cls: "fsrs-forecast-legend-item" });
	dueLegend.createDiv({ cls: "fsrs-forecast-legend-color fsrs-forecast-bar-due" });
	dueLegend.createSpan({ text: "Review" });

	const newLegend = legend.createDiv({ cls: "fsrs-forecast-legend-item" });
	newLegend.createDiv({ cls: "fsrs-forecast-legend-color fsrs-forecast-bar-new" });
	newLegend.createSpan({ text: "New" });

	// Summary
	const totalDue = data.reduce((sum, d) => sum + d.dueCount, 0);
	const totalNew = data.reduce((sum, d) => sum + d.newCount, 0);

	const summary = container.createDiv({ cls: "fsrs-forecast-summary" });
	summary.createSpan({
		text: `Total: ${totalDue + totalNew} cards (${totalDue} reviews, ${totalNew} new)`,
		cls: "fsrs-forecast-summary-text",
	});
}

function getDateLabel(dateStr: string, index: number): string {
	if (index === 0) return "Today";
	if (index === 1) return "Tomorrow";

	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getShortDateLabel(dateStr: string, index: number): string {
	if (index === 0) return "Today";

	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
