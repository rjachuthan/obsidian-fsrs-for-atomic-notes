/**
 * Test helper functions and utilities
 */

import { Plugin, App, Vault, MetadataCache } from './obsidian-mock';

/**
 * Create a test plugin instance with a custom vault
 */
export function createTestPlugin(vault?: Vault, metadataCache?: MetadataCache): Plugin {
	const plugin = new Plugin();

	if (vault) {
		plugin.app.vault = vault;
	}
	if (metadataCache) {
		plugin.app.metadataCache = metadataCache;
	}

	return plugin;
}

/**
 * Create a minimal test environment with plugin, app, vault, and metadata cache
 */
export interface TestEnvironment {
	plugin: Plugin;
	app: App;
	vault: Vault;
	metadataCache: MetadataCache;
}

export function createTestEnvironment(): TestEnvironment {
	const plugin = new Plugin();
	const app = plugin.app;
	const vault = app.vault;
	const metadataCache = app.metadataCache;

	return { plugin, app, vault, metadataCache };
}
