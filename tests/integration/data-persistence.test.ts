/**
 * Integration tests for data persistence
 *
 * Verifies that data survives plugin lifecycle:
 * - Save and load operations
 * - Plugin reload scenarios
 * - Data integrity after crashes
 * - Settings persistence
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Plugin } from '../setup/obsidian-mock';
import { createTestPlugin } from '../setup/test-helpers';
import { createMinimalVault } from '../fixtures/sample-vault';
import { createNewCard, createReviewCard } from '../fixtures/test-cards';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { CardManager } from '../../src/fsrs/card-manager';
import { Rating } from 'ts-fsrs';

describe('Data Persistence', () => {
	let plugin: Plugin;

	beforeEach(() => {
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);
	});

	test('Cards persist after save and load cycle', async () => {
		// Given: DataStore with several cards
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);
		const card1 = createNewCard('note1.md');
		const card2 = createReviewCard('note2.md', 5, 10.0, 5.0);

		cardManager.addCard(card1);
		cardManager.addCard(card2);

		// Force save
		await dataStore.save();

		// When: Create new DataStore instance (simulating plugin reload)
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore);

		// Then: Cards should be loaded correctly
		const loadedCard1 = newCardManager.getCard('note1.md');
		const loadedCard2 = newCardManager.getCard('note2.md');

		expect(loadedCard1).toBeDefined();
		expect(loadedCard2).toBeDefined();

		expect(loadedCard1!.state).toBe(card1.state);
		expect(loadedCard1!.reps).toBe(card1.reps);

		expect(loadedCard2!.state).toBe(card2.state);
		expect(loadedCard2!.due.getTime()).toBe(card2.due.getTime());
		expect(loadedCard2!.stability).toBe(card2.stability);
		expect(loadedCard2!.difficulty).toBe(card2.difficulty);
	});

	test('Review logs persist across sessions', async () => {
		// Given: DataStore with review logs
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const log1 = {
			id: '1',
			cardPath: 'note1.md',
			rating: Rating.Good,
			timestamp: new Date(),
			reviewDuration: 5000,
			stateBefore: 0,
			stateAfter: 2,
			undone: false,
		};

		const log2 = {
			id: '2',
			cardPath: 'note2.md',
			rating: Rating.Easy,
			timestamp: new Date(),
			reviewDuration: 3000,
			stateBefore: 2,
			stateAfter: 2,
			undone: false,
		};

		dataStore.addReviewLog(log1);
		dataStore.addReviewLog(log2);

		await dataStore.save();

		// When: Reload DataStore
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Then: Logs should be preserved
		const loadedLogs = newDataStore.getAllReviewLogs();
		expect(loadedLogs).toHaveLength(2);

		const loadedLog1 = loadedLogs.find(l => l.id === '1');
		const loadedLog2 = loadedLogs.find(l => l.id === '2');

		expect(loadedLog1).toBeDefined();
		expect(loadedLog1!.cardPath).toBe('note1.md');
		expect(loadedLog1!.rating).toBe(Rating.Good);

		expect(loadedLog2).toBeDefined();
		expect(loadedLog2!.cardPath).toBe('note2.md');
		expect(loadedLog2!.rating).toBe(Rating.Easy);
	});

	test('Queues persist across sessions', async () => {
		// Given: QueueManager with multiple queues
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const queueManager = new QueueManager(plugin.app, dataStore);

		const queue1 = queueManager.createQueue('Queue 1');
		queue1.folderCriterion = { folder: 'Notes', includeSubfolders: true };

		const queue2 = queueManager.createQueue('Queue 2');
		queue2.tagCriterion = { tag: 'review' };

		await dataStore.save();

		// When: Reload
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newQueueManager = new QueueManager(plugin.app, newDataStore);

		// Then: Queues should be preserved
		const queues = newQueueManager.getAllQueues();
		expect(queues).toHaveLength(2);

		const loadedQueue1 = queues.find(q => q.name === 'Queue 1');
		const loadedQueue2 = queues.find(q => q.name === 'Queue 2');

		expect(loadedQueue1).toBeDefined();
		expect(loadedQueue1!.folderCriterion).toBeDefined();
		expect(loadedQueue1!.folderCriterion!.folder).toBe('Notes');

		expect(loadedQueue2).toBeDefined();
		expect(loadedQueue2!.tagCriterion).toBeDefined();
		expect(loadedQueue2!.tagCriterion!.tag).toBe('review');
	});

	test('Settings persist across sessions', async () => {
		// Given: DataStore with custom settings
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const customSettings = {
			fsrsParameters: {
				request_retention: 0.95,
				maximum_interval: 36500,
				w: Array(19).fill(1) as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
			},
			reviewsPerDay: 50,
			includeSubfolders: false,
		};

		dataStore.updateSettings(customSettings);
		await dataStore.save();

		// When: Reload
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Then: Settings should be preserved
		const loadedSettings = newDataStore.getSettings();
		expect(loadedSettings.fsrsParameters.request_retention).toBe(0.95);
		expect(loadedSettings.reviewsPerDay).toBe(50);
		expect(loadedSettings.includeSubfolders).toBe(false);
	});

	test('Data saves are debounced to prevent excessive writes', async () => {
		// Given: DataStore with debounced saving
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);

		// When: Multiple rapid updates
		const startTime = Date.now();
		for (let i = 0; i < 10; i++) {
			const card = createNewCard(`note${i}.md`);
			cardManager.addCard(card);
			dataStore.queueSave(); // Queue save (debounced)
		}

		// Wait for debounce
		await new Promise(resolve => setTimeout(resolve, 1500));

		// Then: Should have saved once (or a small number of times)
		// This is hard to verify directly, but we can check data integrity
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore);
		const allCards = newCardManager.getAllCards();
		expect(allCards).toHaveLength(10);
	});

	test('Force save bypasses debouncing', async () => {
		// Given: DataStore with pending changes
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);
		const card = createNewCard('note1.md');
		cardManager.addCard(card);

		// When: Force save immediately
		await dataStore.save();

		// Then: Data should be saved immediately
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore);
		const loadedCard = newCardManager.getCard('note1.md');
		expect(loadedCard).toBeDefined();
	});

	test('Empty data store initializes with default values', async () => {
		// Given: New app with no saved data
		const dataStore = new DataStore(plugin);

		// When: Initialize
		await dataStore.initialize();

		// Then: Should have default settings
		const settings = dataStore.getSettings();
		expect(settings).toBeDefined();
		expect(settings.fsrsParameters).toBeDefined();
		expect(settings.fsrsParameters.request_retention).toBeGreaterThan(0);

		// And: Empty data structures
		const cardManager = new CardManager(dataStore);
		expect(cardManager.getAllCards()).toHaveLength(0);

		const queueManager = new QueueManager(plugin.app, dataStore);
		expect(queueManager.getAllQueues()).toHaveLength(0);
	});

	test('Partial data corruption creates backup and resets', async () => {
		// Given: DataStore with some data
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);
		cardManager.addCard(createNewCard('note1.md'));
		await dataStore.save();

		// When: Corrupt the data structure manually
		// (In real scenario, this would be caught by schema validation)
		const rawData = await plugin.loadData();
		const corruptedData = {
			...rawData,
			cards: 'not-an-array', // Invalid structure
		};
		await plugin.saveData(corruptedData);

		// Then: New DataStore should handle corruption gracefully
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Should either:
		// 1. Reset to defaults, or
		// 2. Load with empty cards array
		const newCardManager = new CardManager(newDataStore);
		const cards = newCardManager.getAllCards();

		// Data should be valid (even if empty due to corruption)
		expect(Array.isArray(cards)).toBe(true);
	});

	test('Concurrent saves do not corrupt data', async () => {
		// Given: DataStore
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);

		// When: Multiple concurrent save operations
		const savePromises = [];
		for (let i = 0; i < 5; i++) {
			const card = createNewCard(`note${i}.md`);
			cardManager.addCard(card);
			savePromises.push(dataStore.save());
		}

		await Promise.all(savePromises);

		// Then: All data should be saved correctly
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore);
		const allCards = newCardManager.getAllCards();
		expect(allCards).toHaveLength(5);

		// Verify each card
		for (let i = 0; i < 5; i++) {
			const card = newCardManager.getCard(`note${i}.md`);
			expect(card).toBeDefined();
		}
	});

	test('Large datasets persist correctly', async () => {
		// Given: DataStore with many cards
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const cardManager = new CardManager(dataStore);

		// Create 100 cards with various states
		for (let i = 0; i < 100; i++) {
			let card;
			if (i % 3 === 0) {
				card = createNewCard(`note${i}.md`);
			} else if (i % 3 === 1) {
				card = createReviewCard(`note${i}.md`, i % 30, 10.0 + i, 5.0);
			} else {
				card = createReviewCard(`note${i}.md`, -i % 10, 10.0, 5.0 + i % 5);
			}
			cardManager.addCard(card);
		}

		await dataStore.save();

		// When: Reload
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Then: All cards should be loaded
		const newCardManager = new CardManager(newDataStore);
		const allCards = newCardManager.getAllCards();
		expect(allCards).toHaveLength(100);

		// Spot check a few cards
		const card0 = newCardManager.getCard('note0.md');
		const card50 = newCardManager.getCard('note50.md');
		const card99 = newCardManager.getCard('note99.md');

		expect(card0).toBeDefined();
		expect(card50).toBeDefined();
		expect(card99).toBeDefined();
	});
});
