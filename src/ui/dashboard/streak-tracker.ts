/**
 * Streak Tracker - Current and longest streak display
 */

import type { StreakInfo } from "./dashboard-analytics";

/**
 * Render streak information display
 */
export function renderStreakTracker(container: HTMLElement, streaks: StreakInfo): void {
	container.empty();
	container.addClass("fsrs-streak-container");

	const header = container.createDiv({ cls: "fsrs-streak-header" });
	header.createSpan({ text: "Streaks", cls: "fsrs-section-title" });

	const streaksGrid = container.createDiv({ cls: "fsrs-streak-grid" });

	// Current streak
	const currentCard = streaksGrid.createDiv({ cls: "fsrs-streak-card" });
	const currentIcon = currentCard.createDiv({ cls: "fsrs-streak-icon" });
	createFlameIcon(currentIcon, streaks.currentStreak > 0);

	const currentInfo = currentCard.createDiv({ cls: "fsrs-streak-info" });
	currentInfo.createDiv({
		cls: "fsrs-streak-value",
		text: String(streaks.currentStreak),
	});
	currentInfo.createDiv({ cls: "fsrs-streak-label", text: "Current" });

	// Longest streak
	const longestCard = streaksGrid.createDiv({ cls: "fsrs-streak-card" });
	const longestIcon = longestCard.createDiv({ cls: "fsrs-streak-icon fsrs-streak-icon-trophy" });
	createTrophyIcon(longestIcon);

	const longestInfo = longestCard.createDiv({ cls: "fsrs-streak-info" });
	longestInfo.createDiv({
		cls: "fsrs-streak-value",
		text: String(streaks.longestStreak),
	});
	longestInfo.createDiv({ cls: "fsrs-streak-label", text: "Longest" });

	// Last review info
	if (streaks.lastReviewDate) {
		const lastReviewDiv = container.createDiv({ cls: "fsrs-streak-last-review" });
		lastReviewDiv.createSpan({
			text: `Last review: ${formatLastReview(streaks.lastReviewDate)}`,
			cls: "fsrs-streak-last-text",
		});
	}

	// Streak status message
	const statusDiv = container.createDiv({ cls: "fsrs-streak-status" });
	statusDiv.textContent = getStreakMessage(streaks);
}

function createFlameIcon(container: HTMLElement, active: boolean): void {
	const color = active ? "var(--color-orange)" : "var(--text-muted)";
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", color);
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
	svg.appendChild(path);

	container.appendChild(svg);
}

function createTrophyIcon(container: HTMLElement): void {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "var(--color-yellow)");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");

	const paths = [
		"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
		"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
		"M4 22h16",
		"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
		"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
		"M18 2H6v7a6 6 0 0 0 12 0V2Z",
	];

	for (const d of paths) {
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", d);
		svg.appendChild(path);
	}

	container.appendChild(svg);
}

function formatLastReview(dateStr: string): string {
	const date = new Date(dateStr);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const reviewDate = new Date(date);
	reviewDate.setHours(0, 0, 0, 0);

	const diffDays = Math.round((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStreakMessage(streaks: StreakInfo): string {
	if (streaks.currentStreak === 0) {
		if (streaks.longestStreak === 0) {
			return "Start your first streak today!";
		}
		return "Review today to start a new streak!";
	}

	if (streaks.currentStreak >= streaks.longestStreak && streaks.currentStreak > 1) {
		return "You're on your longest streak ever!";
	}

	if (streaks.currentStreak >= 7) {
		return "Amazing consistency! Keep it up!";
	}

	if (streaks.currentStreak >= 3) {
		return "Great progress! You're building momentum.";
	}

	return "Keep going! Consistency is key.";
}
