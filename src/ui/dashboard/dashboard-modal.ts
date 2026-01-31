/**
 * Dashboard Modal - Main analytics dashboard
 * Orchestrates all dashboard visualization components
 */

import { Modal, App } from "obsidian";
import type { DataStore } from "../../data/data-store";
import type { QueueManager } from "../../queues/queue-manager";
import { DEFAULT_QUEUE_ID, DEFAULT_FSRS_PARAMS } from "../../constants";

// Import visualization components
import {
	calculateOverviewStats,
	generateHeatmapData,
	calculateRetentionStats,
	generateForecast,
	calculateStateDistribution,
	calculateDifficultyDistribution,
	calculateStreaks,
	generateCardTableData,
} from "./dashboard-analytics";
import { renderOverviewCards } from "./overview-cards";
import { renderCalendarHeatmap } from "./calendar-heatmap";
import { renderRetentionStats } from "./retention-stats";
import { renderForecastChart } from "./forecast-chart";
import { renderStateDistribution, renderDifficultyDistribution } from "./distribution-charts";
import { renderStreakTracker } from "./streak-tracker";
import { renderNoteTable } from "./note-table";

/**
 * Dashboard Modal for analytics and statistics
 */
export class DashboardModal extends Modal {
	private dataStore: DataStore;
	private queueManager: QueueManager;
	private selectedQueueId: string = DEFAULT_QUEUE_ID;

	constructor(
		app: App,
		dataStore: DataStore,
		queueManager: QueueManager
	) {
		super(app);
		this.dataStore = dataStore;
		this.queueManager = queueManager;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-dashboard-modal");
		contentEl.empty();

		// Modal header
		this.renderHeader(contentEl);

		// Dashboard content
		const dashboardContent = contentEl.createDiv({ cls: "fsrs-dashboard-content" });

		this.renderDashboard(dashboardContent);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render modal header with queue selector
	 */
	private renderHeader(container: HTMLElement): void {
		const header = container.createDiv({ cls: "fsrs-dashboard-header" });

		header.createEl("h2", { text: "Dashboard", cls: "fsrs-dashboard-title" });

		// Queue selector
		const queues = this.queueManager.getAllQueues();

		if (queues.length > 1) {
			const selectorContainer = header.createDiv({ cls: "fsrs-dashboard-queue-selector" });
			selectorContainer.createSpan({ text: "Queue: ", cls: "fsrs-dashboard-queue-label" });

			const select = selectorContainer.createEl("select", { cls: "fsrs-dashboard-queue-select dropdown" });

			// "All queues" option
			select.createEl("option", {
				text: "All queues",
				attr: { value: "" },
			});

			for (const queue of queues) {
				const option = select.createEl("option", {
					text: queue.name,
					attr: { value: queue.id },
				});

				if (queue.id === this.selectedQueueId) {
					option.selected = true;
				}
			}

			select.addEventListener("change", () => {
				this.selectedQueueId = select.value || DEFAULT_QUEUE_ID;
				this.refresh();
			});
		}

		// Refresh button
		const refreshBtn = header.createEl("button", {
			cls: "fsrs-dashboard-refresh-btn clickable-icon",
			attr: { "aria-label": "Refresh dashboard" },
		});
		createRefreshIcon(refreshBtn);
		refreshBtn.addEventListener("click", () => this.refresh());
	}

	/**
	 * Refresh the dashboard content
	 */
	private refresh(): void {
		const content = this.contentEl.querySelector(".fsrs-dashboard-content");
		if (content instanceof HTMLElement) {
			this.renderDashboard(content);
		}
	}

	/**
	 * Render main dashboard content
	 */
	private renderDashboard(container: HTMLElement): void {
		container.empty();

		const cards = this.dataStore.getCards();
		const reviews = this.dataStore.getReviews();
		const settings = this.dataStore.getSettings();
		const targetRetention = settings.fsrsParams?.requestRetention ?? DEFAULT_FSRS_PARAMS.requestRetention;

		const queueId = this.selectedQueueId || undefined;

		// Overview Cards Section
		const overviewSection = container.createDiv({ cls: "fsrs-dashboard-section fsrs-dashboard-overview" });
		const overviewStats = calculateOverviewStats(cards, queueId);
		renderOverviewCards(overviewSection, overviewStats);

		// Two-column layout for charts
		const chartsRow = container.createDiv({ cls: "fsrs-dashboard-row" });

		// Left column: Heatmap + Streaks
		const leftCol = chartsRow.createDiv({ cls: "fsrs-dashboard-col" });

		// Heatmap
		const heatmapSection = leftCol.createDiv({ cls: "fsrs-dashboard-section" });
		const heatmapData = generateHeatmapData(reviews, 12);
		renderCalendarHeatmap(heatmapSection, heatmapData);

		// Streaks
		const streakSection = leftCol.createDiv({ cls: "fsrs-dashboard-section" });
		const streakData = calculateStreaks(reviews);
		renderStreakTracker(streakSection, streakData);

		// Right column: Retention + Distributions
		const rightCol = chartsRow.createDiv({ cls: "fsrs-dashboard-col" });

		// Retention
		const retentionSection = rightCol.createDiv({ cls: "fsrs-dashboard-section" });
		const retentionStats = calculateRetentionStats(reviews, targetRetention, cards, queueId);
		renderRetentionStats(retentionSection, retentionStats);

		// State Distribution
		const stateSection = rightCol.createDiv({ cls: "fsrs-dashboard-section" });
		const stateData = calculateStateDistribution(cards, queueId);
		renderStateDistribution(stateSection, stateData);

		// Difficulty Distribution
		const difficultySection = rightCol.createDiv({ cls: "fsrs-dashboard-section" });
		const difficultyData = calculateDifficultyDistribution(cards, queueId);
		renderDifficultyDistribution(difficultySection, difficultyData);

		// Forecast Chart (full width)
		const forecastSection = container.createDiv({ cls: "fsrs-dashboard-section fsrs-dashboard-full-width" });
		const forecastData = generateForecast(cards, 30, queueId);
		renderForecastChart(forecastSection, forecastData);

		// Notes Table (full width)
		const tableSection = container.createDiv({ cls: "fsrs-dashboard-section fsrs-dashboard-full-width" });
		const tableData = generateCardTableData(cards, queueId);
		renderNoteTable(tableSection, tableData, this.app);
	}
}

function createRefreshIcon(container: HTMLElement): void {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "18");
	svg.setAttribute("height", "18");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path1.setAttribute("d", "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8");
	svg.appendChild(path1);

	const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path2.setAttribute("d", "M21 3v5h-5");
	svg.appendChild(path2);

	container.appendChild(svg);
}
