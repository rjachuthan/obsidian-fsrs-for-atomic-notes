import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: './tests/setup/obsidian-mock.ts',
		coverage: {
			enabled: false, // Not focused on coverage
		},
		testTimeout: 10000, // 10 seconds max per test
		hookTimeout: 10000,
	},
	resolve: {
		alias: {
			'obsidian': './tests/setup/obsidian-mock.ts',
		},
	},
});
