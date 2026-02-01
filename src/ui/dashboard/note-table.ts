/**
 * Note Table - Sortable and filterable card table
 */

import type { App } from "obsidian";
import type { CardTableEntry } from "./dashboard-analytics";
import { sortCardTableData, filterCardTableData } from "./dashboard-analytics";

type SortColumn = keyof CardTableEntry;
type SortDirection = "asc" | "desc";

interface TableState {
	sortColumn: SortColumn;
	sortDirection: SortDirection;
	filterQuery: string;
	page: number;
	pageSize: number;
}

/**
 * Render note table with sorting and filtering
 */
export function renderNoteTable(
	container: HTMLElement,
	data: CardTableEntry[],
	app: App,
	_onStateChange?: (state: TableState) => void
): void {
	container.empty();
	container.addClass("fsrs-table-container");

	const state: TableState = {
		sortColumn: "due",
		sortDirection: "asc",
		filterQuery: "",
		page: 0,
		pageSize: 25,
	};

	// Header with filter
	const header = container.createDiv({ cls: "fsrs-table-header" });
	header.createSpan({ text: "Notes", cls: "fsrs-section-title" });

	const filterInput = header.createEl("input", {
		cls: "fsrs-table-filter",
		attr: {
			type: "text",
			placeholder: "Filter notes...",
			"aria-label": "Filter notes by title or path",
		},
	});

	filterInput.addEventListener("input", () => {
		state.filterQuery = filterInput.value;
		state.page = 0;
		renderTableContent();
	});

	// Table wrapper for horizontal scroll
	const tableWrapper = container.createDiv({ cls: "fsrs-table-wrapper" });

	// Table
	const table = tableWrapper.createEl("table", { cls: "fsrs-note-table" });
	const thead = table.createEl("thead");
	const tbody = table.createEl("tbody");

	// Pagination
	const pagination = container.createDiv({ cls: "fsrs-table-pagination" });

	// Column definitions
	const columns: { key: SortColumn; label: string; sortable: boolean }[] = [
		{ key: "noteTitle", label: "Note", sortable: true },
		{ key: "stateLabel", label: "State", sortable: true },
		{ key: "due", label: "Due", sortable: true },
		{ key: "stability", label: "Stability", sortable: true },
		{ key: "difficulty", label: "Difficulty", sortable: true },
		{ key: "reps", label: "Reps", sortable: true },
		{ key: "lapses", label: "Lapses", sortable: true },
	];

	// Render table header
	function renderTableHeader(): void {
		thead.empty();
		const headerRow = thead.createEl("tr");

		for (const col of columns) {
			const th = headerRow.createEl("th", { cls: "fsrs-table-th" });
			const headerContent = th.createDiv({ cls: "fsrs-table-th-content" });

			headerContent.createSpan({ text: col.label });

			if (col.sortable) {
				th.addClass("fsrs-table-sortable");

				if (state.sortColumn === col.key) {
					const sortIcon = headerContent.createSpan({ cls: "fsrs-table-sort-icon" });
					sortIcon.textContent = state.sortDirection === "asc" ? "↑" : "↓";
				}

				th.addEventListener("click", () => {
					if (state.sortColumn === col.key) {
						state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
					} else {
						state.sortColumn = col.key;
						state.sortDirection = "asc";
					}
					state.page = 0;
					renderTableContent();
				});
			}
		}
	}

	// Render table content
	function renderTableContent(): void {
		tbody.empty();

		// Filter and sort
		let filteredData = filterCardTableData(data, state.filterQuery);
		filteredData = sortCardTableData(filteredData, state.sortColumn, state.sortDirection === "asc");

		// Calculate pagination
		const totalPages = Math.ceil(filteredData.length / state.pageSize);
		const startIndex = state.page * state.pageSize;
		const endIndex = Math.min(startIndex + state.pageSize, filteredData.length);
		const pageData = filteredData.slice(startIndex, endIndex);

		// Render rows
		if (pageData.length === 0) {
			const emptyRow = tbody.createEl("tr");
			const emptyCell = emptyRow.createEl("td", {
				attr: { colspan: String(columns.length) },
				cls: "fsrs-table-empty",
			});
			emptyCell.textContent = state.filterQuery
				? "No matching notes found"
				: "No notes in queue";
		} else {
			for (const entry of pageData) {
				const row = tbody.createEl("tr", { cls: "fsrs-table-row" });

				// Note title (clickable)
				const titleCell = row.createEl("td", { cls: "fsrs-table-td fsrs-table-note-cell" });
				const titleLink = titleCell.createEl("a", {
					cls: "fsrs-table-note-link",
					text: entry.noteTitle,
					attr: { href: "#" },
				});
				titleLink.addEventListener("click", (e) => {
					e.preventDefault();
					const file = app.vault.getFileByPath(entry.notePath);
					if (file) {
						void app.workspace.getLeaf(false).openFile(file);
					}
				});

				// State
				const stateCell = row.createEl("td", { cls: "fsrs-table-td" });
				stateCell.createSpan({
					cls: `fsrs-state-badge fsrs-state-${entry.state}`,
					text: entry.stateLabel,
				});

				// Due
				row.createEl("td", { cls: "fsrs-table-td", text: entry.dueText });

				// Stability
				row.createEl("td", {
					cls: "fsrs-table-td fsrs-table-number",
					text: entry.stability.toFixed(1),
				});

				// Difficulty
				row.createEl("td", {
					cls: "fsrs-table-td fsrs-table-number",
					text: entry.difficulty.toFixed(1),
				});

				// Reps
				row.createEl("td", {
					cls: "fsrs-table-td fsrs-table-number",
					text: String(entry.reps),
				});

				// Lapses
				row.createEl("td", {
					cls: "fsrs-table-td fsrs-table-number",
					text: String(entry.lapses),
				});
			}
		}

		// Update header with sort indicators
		renderTableHeader();

		// Update pagination
		renderPagination(filteredData.length, totalPages);
	}

	// Render pagination
	function renderPagination(totalItems: number, totalPages: number): void {
		pagination.empty();

		if (totalItems === 0) return;

		const startItem = state.page * state.pageSize + 1;
		const endItem = Math.min((state.page + 1) * state.pageSize, totalItems);

		// Info
		pagination.createSpan({
			cls: "fsrs-pagination-info",
			text: `${startItem}-${endItem} of ${totalItems}`,
		});

		// Controls
		const controls = pagination.createDiv({ cls: "fsrs-pagination-controls" });

		// Previous button
		const prevBtn = controls.createEl("button", {
			cls: "fsrs-pagination-btn",
			text: "←",
			attr: { "aria-label": "Previous page" },
		});
		prevBtn.disabled = state.page === 0;
		prevBtn.addEventListener("click", () => {
			if (state.page > 0) {
				state.page--;
				renderTableContent();
			}
		});

		// Page info
		controls.createSpan({
			cls: "fsrs-pagination-page",
			text: `${state.page + 1} / ${totalPages}`,
		});

		// Next button
		const nextBtn = controls.createEl("button", {
			cls: "fsrs-pagination-btn",
			text: "→",
			attr: { "aria-label": "Next page" },
		});
		nextBtn.disabled = state.page >= totalPages - 1;
		nextBtn.addEventListener("click", () => {
			if (state.page < totalPages - 1) {
				state.page++;
				renderTableContent();
			}
		});
	}

	// Initial render
	renderTableHeader();
	renderTableContent();
}
