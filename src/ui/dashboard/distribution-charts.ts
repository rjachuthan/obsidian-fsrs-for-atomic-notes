/**
 * Distribution Charts - State and difficulty pie charts
 * Pure SVG-based pie chart visualization
 */

import type { StateDistribution, DifficultyDistribution } from "./dashboard-analytics";

/**
 * Render card state distribution chart
 */
export function renderStateDistribution(
	container: HTMLElement,
	data: StateDistribution[]
): void {
	container.empty();
	container.addClass("fsrs-distribution-container");

	const header = container.createDiv({ cls: "fsrs-distribution-header" });
	header.createSpan({ text: "Card States", cls: "fsrs-section-title" });

	const chartSection = container.createDiv({ cls: "fsrs-distribution-chart-section" });

	// SVG Pie chart
	const svgContainer = chartSection.createDiv({ cls: "fsrs-pie-container" });
	const total = data.reduce((sum, d) => sum + d.count, 0);

	if (total > 0) {
		const svg = createPieChart(data.map((d) => ({
			value: d.count,
			color: getStateColor(d.state),
		})));
		svgContainer.appendChild(svg);
	} else {
		svgContainer.createDiv({ cls: "fsrs-no-data", text: "No cards" });
	}

	// Legend
	const legend = chartSection.createDiv({ cls: "fsrs-distribution-legend" });
	for (const item of data) {
		if (item.count === 0) continue;

		const legendItem = legend.createDiv({ cls: "fsrs-distribution-legend-item" });
		const color = legendItem.createDiv({ cls: "fsrs-distribution-legend-color" });
		color.style.backgroundColor = getStateColor(item.state);
		legendItem.createSpan({
			text: `${item.label}: ${item.count} (${Math.round(item.percentage)}%)`,
		});
	}
}

/**
 * Render difficulty distribution chart
 */
export function renderDifficultyDistribution(
	container: HTMLElement,
	data: DifficultyDistribution[]
): void {
	container.empty();
	container.addClass("fsrs-distribution-container");

	const header = container.createDiv({ cls: "fsrs-distribution-header" });
	header.createSpan({ text: "Difficulty Distribution", cls: "fsrs-section-title" });

	const chartSection = container.createDiv({ cls: "fsrs-distribution-chart-section" });

	// SVG Pie chart
	const svgContainer = chartSection.createDiv({ cls: "fsrs-pie-container" });
	const total = data.reduce((sum, d) => sum + d.count, 0);

	if (total > 0) {
		const svg = createPieChart(data.map((d, i) => ({
			value: d.count,
			color: getDifficultyColor(i),
		})));
		svgContainer.appendChild(svg);
	} else {
		svgContainer.createDiv({ cls: "fsrs-no-data", text: "No cards" });
	}

	// Legend
	const legend = chartSection.createDiv({ cls: "fsrs-distribution-legend" });
	for (let i = 0; i < data.length; i++) {
		const item = data[i];
		if (!item || item.count === 0) continue;

		const legendItem = legend.createDiv({ cls: "fsrs-distribution-legend-item" });
		const color = legendItem.createDiv({ cls: "fsrs-distribution-legend-color" });
		color.style.backgroundColor = getDifficultyColor(i);
		legendItem.createSpan({
			text: `${item.range}: ${item.count} (${Math.round(item.percentage)}%)`,
		});
	}
}

interface PieSlice {
	value: number;
	color: string;
}

function createPieChart(slices: PieSlice[]): SVGElement {
	const size = 120;
	const center = size / 2;
	const radius = size / 2 - 5;

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", String(size));
	svg.setAttribute("height", String(size));
	svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
	svg.classList.add("fsrs-pie-chart");

	const total = slices.reduce((sum, s) => sum + s.value, 0);
	if (total === 0) return svg;

	let currentAngle = -90; // Start from top

	for (const slice of slices) {
		if (slice.value === 0) continue;

		const sliceAngle = (slice.value / total) * 360;
		const endAngle = currentAngle + sliceAngle;

		const path = createPieSlice(center, center, radius, currentAngle, endAngle, slice.color);
		svg.appendChild(path);

		currentAngle = endAngle;
	}

	return svg;
}

function createPieSlice(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	color: string
): SVGPathElement {
	// Handle full circle case
	if (endAngle - startAngle >= 359.9) {
		const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circle.setAttribute("cx", String(cx));
		circle.setAttribute("cy", String(cy));
		circle.setAttribute("r", String(r));
		circle.setAttribute("fill", color);
		return circle as unknown as SVGPathElement;
	}

	const startRad = (startAngle * Math.PI) / 180;
	const endRad = (endAngle * Math.PI) / 180;

	const x1 = cx + r * Math.cos(startRad);
	const y1 = cy + r * Math.sin(startRad);
	const x2 = cx + r * Math.cos(endRad);
	const y2 = cy + r * Math.sin(endRad);

	const largeArc = endAngle - startAngle > 180 ? 1 : 0;

	const d = [
		`M ${cx} ${cy}`,
		`L ${x1} ${y1}`,
		`A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
		"Z",
	].join(" ");

	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", d);
	path.setAttribute("fill", color);

	return path;
}

function getStateColor(state: number): string {
	const colors: Record<number, string> = {
		0: "var(--color-cyan)", // New
		1: "var(--color-yellow)", // Learning
		2: "var(--color-green)", // Review
		3: "var(--color-orange)", // Relearning
	};
	return colors[state] ?? "var(--text-muted)";
}

function getDifficultyColor(index: number): string {
	const colors = [
		"var(--color-cyan)", // Very Easy
		"var(--color-green)", // Easy
		"var(--color-yellow)", // Medium
		"var(--color-orange)", // Hard
		"var(--color-red)", // Very Hard
	];
	return colors[index] ?? "var(--text-muted)";
}
