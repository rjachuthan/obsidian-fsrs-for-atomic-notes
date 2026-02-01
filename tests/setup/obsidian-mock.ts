/**
 * Mock implementation of Obsidian API for testing
 *
 * This provides a lightweight in-memory implementation of the core Obsidian API
 * needed for testing the plugin without launching the actual Obsidian app.
 */

import { vi } from 'vitest';

// Mock TFile
export class TFile {
	path: string;
	basename: string;
	extension: string;
	stat: { mtime: number; ctime: number; size: number };
	vault: Vault;

	constructor(path: string, vault: Vault) {
		this.path = path;
		this.basename = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
		this.extension = path.split('.').pop() || '';
		this.stat = {
			mtime: Date.now(),
			ctime: Date.now(),
			size: 0,
		};
		this.vault = vault;
	}
}

// Mock TFolder
export class TFolder {
	path: string;
	name: string;
	children: (TFile | TFolder)[];
	vault: Vault;

	constructor(path: string, vault: Vault) {
		this.path = path;
		this.name = path.split('/').pop() || '';
		this.children = [];
		this.vault = vault;
	}
}

// Mock TAbstractFile
export type TAbstractFile = TFile | TFolder;

// Mock CachedMetadata
export interface CachedMetadata {
	tags?: { tag: string; position: { start: { line: number; col: number }; end: { line: number; col: number } } }[];
	frontmatter?: Record<string, unknown>;
	links?: { link: string; original: string; displayText: string }[];
	headings?: { heading: string; level: number }[];
}

// Mock MetadataCache
export class MetadataCache {
	private cache: Map<string, CachedMetadata> = new Map();

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.get(file.path) || null;
	}

	setFileCache(file: TFile, metadata: CachedMetadata): void {
		this.cache.set(file.path, metadata);
	}

	on(event: string, callback: (...args: unknown[]) => void): { unload: () => void } {
		return { unload: vi.fn() };
	}
}

// Mock Vault
export class Vault {
	private files: Map<string, TFile> = new Map();
	private folders: Map<string, TFolder> = new Map();
	private fileContents: Map<string, string> = new Map();
	private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

	constructor() {
		// Create root folder
		this.folders.set('', new TFolder('', this));
	}

	getAbstractFileByPath(path: string): TAbstractFile | null {
		return this.files.get(path) || this.folders.get(path) || null;
	}

	getFileByPath(path: string): TFile | null {
		return this.files.get(path) || null;
	}

	getMarkdownFiles(): TFile[] {
		return Array.from(this.files.values()).filter(f => f.extension === 'md');
	}

	getFiles(): TFile[] {
		return Array.from(this.files.values());
	}

	getAllLoadedFiles(): TAbstractFile[] {
		return [...Array.from(this.files.values()), ...Array.from(this.folders.values())];
	}

	async read(file: TFile): Promise<string> {
		return this.fileContents.get(file.path) || '';
	}

	async modify(file: TFile, content: string): Promise<void> {
		this.fileContents.set(file.path, content);
		file.stat.mtime = Date.now();
		this.trigger('modify', file);
	}

	async create(path: string, content: string): Promise<TFile> {
		const file = new TFile(path, this);
		this.files.set(path, file);
		this.fileContents.set(path, content);
		this.trigger('create', file);
		return file;
	}

	async delete(file: TFile): Promise<void> {
		this.files.delete(file.path);
		this.fileContents.delete(file.path);
		this.trigger('delete', file);
	}

	async rename(file: TFile, newPath: string): Promise<void> {
		const oldPath = file.path;
		const content = this.fileContents.get(oldPath) || '';

		this.files.delete(oldPath);
		this.fileContents.delete(oldPath);

		file.path = newPath;
		file.basename = newPath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
		file.extension = newPath.split('.').pop() || '';

		this.files.set(newPath, file);
		this.fileContents.set(newPath, content);

		this.trigger('rename', file, oldPath);
	}

	on(event: string, callback: (...args: unknown[]) => void): { unload: () => void } {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback);

		return {
			unload: () => {
				this.listeners.get(event)?.delete(callback);
			},
		};
	}

	private trigger(event: string, ...args: unknown[]): void {
		this.listeners.get(event)?.forEach(callback => callback(...args));
	}

	// Helper methods for testing
	addFile(path: string, content: string = '', metadata?: CachedMetadata): TFile {
		const file = new TFile(path, this);
		this.files.set(path, file);
		this.fileContents.set(path, content);
		return file;
	}

	addFolder(path: string): TFolder {
		const folder = new TFolder(path, this);
		this.folders.set(path, folder);
		return folder;
	}
}

// Mock WorkspaceLeaf (minimal for SessionManager.openCurrentNote)
export class WorkspaceLeaf {
	constructor(private workspace: Workspace) {}

	async openFile(file: TFile): Promise<void> {
		this.workspace.setActiveFile(file);
	}
}

// Mock Workspace
export class Workspace {
	private activeFile: TFile | null = null;

	getActiveFile(): TFile | null {
		return this.activeFile;
	}

	setActiveFile(file: TFile | null): void {
		this.activeFile = file;
		this.trigger('active-leaf-change');
	}

	getLeaf(_createNew: boolean): WorkspaceLeaf {
		return new WorkspaceLeaf(this);
	}

	on(event: string, callback: (...args: unknown[]) => void): { unload: () => void } {
		return { unload: vi.fn() };
	}

	private trigger(event: string, ...args: unknown[]): void {
		// Stub for now
	}
}

// Mock App
export class App {
	vault: Vault;
	metadataCache: MetadataCache;
	workspace: Workspace;

	constructor() {
		this.vault = new Vault();
		this.metadataCache = new MetadataCache();
		this.workspace = new Workspace();
	}
}

// Mock Plugin class
export class Plugin {
	app: App;
	manifest: { id: string; name: string; version: string };
	private data: unknown = null;
	private registeredEvents: (() => void)[] = [];

	constructor() {
		this.app = new App();
		this.manifest = {
			id: 'obsidian-fsrs-atomic',
			name: 'FSRS for Atomic Notes',
			version: '0.1.0',
		};
	}

	async loadData(): Promise<unknown> {
		return this.data;
	}

	async saveData(data: unknown): Promise<void> {
		this.data = data;
	}

	registerEvent(event: { unload: () => void }): void {
		this.registeredEvents.push(event.unload);
	}

	registerDomEvent(target: EventTarget, event: string, callback: (...args: unknown[]) => void): void {
		const listener = () => callback();
		target.addEventListener(event, listener);
		this.registeredEvents.push(() => target.removeEventListener(event, listener));
	}

	registerInterval(id: number): void {
		this.registeredEvents.push(() => clearInterval(id));
	}

	addCommand(command: { id: string; name: string; callback: () => void }): void {
		// Stub
	}

	addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
		return document.createElement('div');
	}

	addSettingTab(tab: unknown): void {
		// Stub
	}

	async onload(): Promise<void> {
		// Override in actual plugin
	}

	async onunload(): Promise<void> {
		this.registeredEvents.forEach(cleanup => cleanup());
		this.registeredEvents = [];
	}
}

// Mock PluginSettingTab
export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement('div');
	}

	display(): void {
		// Override in actual implementation
	}

	hide(): void {
		// Override in actual implementation
	}
}

// Mock ItemView
export class ItemView {
	app: App;
	containerEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.containerEl = document.createElement('div');
		this.contentEl = document.createElement('div');
		this.containerEl.appendChild(this.contentEl);
	}

	getViewType(): string {
		return 'mock-view';
	}

	getDisplayText(): string {
		return 'Mock View';
	}

	async onOpen(): Promise<void> {
		// Override in actual implementation
	}

	async onClose(): Promise<void> {
		// Override in actual implementation
	}
}

// Mock Modal
export class Modal {
	app: App;
	containerEl: HTMLElement;
	contentEl: HTMLElement;
	modalEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.containerEl = document.createElement('div');
		this.contentEl = document.createElement('div');
		this.modalEl = document.createElement('div');
		this.containerEl.appendChild(this.modalEl);
		this.modalEl.appendChild(this.contentEl);
	}

	open(): void {
		// Stub
	}

	close(): void {
		// Stub
	}

	onOpen(): void {
		// Override in actual implementation
	}

	onClose(): void {
		// Override in actual implementation
	}
}

// Mock Notice
export class Notice {
	message: string;
	timeout: number;

	constructor(message: string, timeout?: number) {
		this.message = message;
		this.timeout = timeout || 5000;
	}
}

// Mock Setting
export class Setting {
	settingEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement('div');
		containerEl.appendChild(this.settingEl);
	}

	setName(name: string): this {
		return this;
	}

	setDesc(desc: string): this {
		return this;
	}

	addText(callback: (text: { setValue: (value: string) => void; onChange: (callback: (value: string) => void) => void }) => void): this {
		const text = {
			setValue: vi.fn(),
			onChange: vi.fn(),
		};
		callback(text);
		return this;
	}

	addToggle(callback: (toggle: { setValue: (value: boolean) => void; onChange: (callback: (value: boolean) => void) => void }) => void): this {
		const toggle = {
			setValue: vi.fn(),
			onChange: vi.fn(),
		};
		callback(toggle);
		return this;
	}

	addDropdown(callback: (dropdown: { addOption: (value: string, display: string) => void; setValue: (value: string) => void; onChange: (callback: (value: string) => void) => void }) => void): this {
		const dropdown = {
			addOption: vi.fn(),
			setValue: vi.fn(),
			onChange: vi.fn(),
		};
		callback(dropdown);
		return this;
	}

	addButton(callback: (button: { setButtonText: (text: string) => void; onClick: (callback: () => void) => void }) => void): this {
		const button = {
			setButtonText: vi.fn(),
			onClick: vi.fn(),
		};
		callback(button);
		return this;
	}
}

// Mock moment (for date handling)
export const moment = (date?: Date | string | number) => {
	const d = date ? new Date(date) : new Date();
	return {
		format: (format: string) => d.toISOString(),
		toDate: () => d,
		valueOf: () => d.getTime(),
		isBefore: (other: Date) => d < other,
		isAfter: (other: Date) => d > other,
		diff: (other: Date, unit: string) => {
			const diff = d.getTime() - other.getTime();
			switch (unit) {
				case 'days': return Math.floor(diff / (1000 * 60 * 60 * 24));
				case 'hours': return Math.floor(diff / (1000 * 60 * 60));
				case 'minutes': return Math.floor(diff / (1000 * 60));
				default: return diff;
			}
		},
		add: (amount: number, unit: string) => {
			const newDate = new Date(d);
			switch (unit) {
				case 'days': newDate.setDate(newDate.getDate() + amount); break;
				case 'hours': newDate.setHours(newDate.getHours() + amount); break;
				case 'minutes': newDate.setMinutes(newDate.getMinutes() + amount); break;
			}
			return moment(newDate);
		},
	};
};

// Export default mocks
export default {
	App,
	Plugin,
	PluginSettingTab,
	ItemView,
	Modal,
	Notice,
	Setting,
	TFile,
	TFolder,
	moment,
};
