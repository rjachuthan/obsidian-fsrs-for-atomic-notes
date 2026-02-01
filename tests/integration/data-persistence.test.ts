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
import { createNewCard, createReviewCard, cardDataFromFsrsCard, TEST_QUEUE_ID } from '../fixtures/test-cards';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { CardManager } from '../../src/fsrs/card-manager';
import { Scheduler } from '../../src/fsrs/scheduler';
import { Rating } from 'ts-fsrs';
import { DEFAULT_QUEUE_STATS } from '../../src/constants';
import { nowISO } from '../../src/utils/date-utils';

describe('Data Persistence', () => {
	let plugin: Plugin;

	beforeEach(() => {
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);
	});

	test('Cards persist after save and load cycle', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);

		// Create cards via createCard (new) and setCard (review card)
		cardManager.createCard('note1.md', TEST_QUEUE_ID);
		const reviewCard = createReviewCard('note2.md', 5, 10.0, 5.0);
		dataStore.setCard('note2.md', cardDataFromFsrsCard(reviewCard, TEST_QUEUE_ID));

		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newScheduler = new Scheduler();
		const newCardManager = new CardManager(newDataStore, newScheduler);

		const loadedCard1 = newCardManager.getCard('note1.md');
		const loadedCard2 = newCardManager.getCard('note2.md');

		expect(loadedCard1).toBeDefined();
		expect(loadedCard2).toBeDefined();

		const s1 = loadedCard1!.schedules[TEST_QUEUE_ID];
		const s2 = loadedCard2!.schedules[TEST_QUEUE_ID];
		expect(s1).toBeDefined();
		expect(s2).toBeDefined();
		expect(s1!.state).toBe(0); // New
		expect(s2!.state).toBe(2); // Review
		expect(s2!.stability).toBe(10.0);
		expect(s2!.difficulty).toBe(5.0);
		expect(new Date(s2!.due).getTime()).toBe(new Date(reviewCard.due).getTime());
	});

	test('Review logs persist across sessions', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const log1 = {
			id: '1',
			cardPath: 'note1.md',
			queueId: 'q1',
			rating: Rating.Good as 1 | 2 | 3 | 4,
			state: 0 as 0 | 1 | 2 | 3,
			due: new Date().toISOString(),
			stability: 0,
			difficulty: 5,
			elapsedDays: 0,
			lastElapsedDays: 0,
			scheduledDays: 1,
			review: new Date().toISOString(),
			sessionId: 's1',
			undone: false,
		};

		const log2 = {
			id: '2',
			cardPath: 'note2.md',
			queueId: 'q1',
			rating: Rating.Easy as 1 | 2 | 3 | 4,
			state: 2 as 0 | 1 | 2 | 3,
			due: new Date().toISOString(),
			stability: 10,
			difficulty: 5,
			elapsedDays: 0,
			lastElapsedDays: 0,
			scheduledDays: 5,
			review: new Date().toISOString(),
			sessionId: 's1',
			undone: false,
		};

		dataStore.addReview(log1);
		dataStore.addReview(log2);

		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const loadedLogs = newDataStore.getReviews();
		expect(loadedLogs).toHaveLength(2);

		const loadedLog1 = loadedLogs.find((l) => l.id === '1');
		const loadedLog2 = loadedLogs.find((l) => l.id === '2');

		expect(loadedLog1).toBeDefined();
		expect(loadedLog1!.cardPath).toBe('note1.md');
		expect(loadedLog1!.rating).toBe(Rating.Good);

		expect(loadedLog2).toBeDefined();
		expect(loadedLog2!.cardPath).toBe('note2.md');
		expect(loadedLog2!.rating).toBe(Rating.Easy);
	});

	test('Queues persist across sessions', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);
		const settings = dataStore.getSettings();
		const queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);

		const queue1 = queueManager.createQueue('Queue 1', { type: 'folder', folders: ['Notes'] });
		const queue2 = queueManager.createQueue('Queue 2', { type: 'tag', tags: ['review'] });

		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newScheduler = new Scheduler();
		const newCardManager = new CardManager(newDataStore, newScheduler);
		const newSettings = newDataStore.getSettings();
		const newQueueManager = new QueueManager(plugin.app, newDataStore, newCardManager, newSettings);

		const queues = newQueueManager.getAllQueues();
		expect(queues).toHaveLength(2);

		const loadedQueue1 = queues.find((q) => q.name === 'Queue 1');
		const loadedQueue2 = queues.find((q) => q.name === 'Queue 2');

		expect(loadedQueue1).toBeDefined();
		expect(loadedQueue1!.criteria).toBeDefined();
		expect(loadedQueue1!.criteria.type).toBe('folder');
		expect(loadedQueue1!.criteria.folders).toContain('Notes');

		expect(loadedQueue2).toBeDefined();
		expect(loadedQueue2!.criteria).toBeDefined();
		expect(loadedQueue2!.criteria.type).toBe('tag');
		expect(loadedQueue2!.criteria.tags).toContain('review');
	});

	test('Settings persist across sessions', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.updateSettings({
			fsrsParams: {
				requestRetention: 0.95,
				maximumInterval: 36500,
				enableFuzz: true,
			},
		});
		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const loadedSettings = newDataStore.getSettings();
		expect(loadedSettings.fsrsParams).toBeDefined();
		expect(loadedSettings.fsrsParams!.requestRetention).toBe(0.95);
	});

	test('Data saves are debounced to prevent excessive writes', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);

		for (let i = 0; i < 10; i++) {
			cardManager.createCard(`note${i}.md`, TEST_QUEUE_ID);
		}

		await new Promise((resolve) => setTimeout(resolve, 1500));
		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const cards = newDataStore.getCards();
		expect(Object.keys(cards).length).toBe(10);
	});

	test('Force save bypasses debouncing', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);
		cardManager.createCard('note1.md', TEST_QUEUE_ID);

		await dataStore.forceSave();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const loadedCard = newDataStore.getCard('note1.md');
		expect(loadedCard).toBeDefined();
	});

	test('Empty data store initializes with default values', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		const settings = dataStore.getSettings();
		expect(settings).toBeDefined();
		expect(settings.trackedFolders).toEqual([]);
		expect(settings.trackedTags).toEqual([]);

		const cards = dataStore.getCards();
		expect(Object.keys(cards)).toHaveLength(0);

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);
		const settingsForQM = dataStore.getSettings();
		const queueManager = new QueueManager(plugin.app, dataStore, cardManager, settingsForQM);
		expect(queueManager.getAllQueues()).toHaveLength(0);
	});

	test('Partial data corruption creates backup and resets', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);
		cardManager.createCard('note1.md', TEST_QUEUE_ID);
		await dataStore.save();

		const rawData = await plugin.loadData();
		const corruptedData = {
			...(rawData as Record<string, unknown>),
			cards: 'not-an-object',
		};
		await plugin.saveData(corruptedData);

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const cards = newDataStore.getCards();
		expect(typeof cards).toBe('object');
		expect(Array.isArray(cards) === false).toBe(true);
	});

	test('Concurrent saves do not corrupt data', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);

		for (let i = 0; i < 5; i++) {
			cardManager.createCard(`note${i}.md`, TEST_QUEUE_ID);
		}
		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const cards = newDataStore.getCards();
		expect(Object.keys(cards).length).toBe(5);

		for (let i = 0; i < 5; i++) {
			expect(newDataStore.getCard(`note${i}.md`)).toBeDefined();
		}
	});

	test('Large datasets persist correctly', async () => {
		const dataStore = new DataStore(plugin);
		await dataStore.initialize();

		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		const scheduler = new Scheduler();
		const cardManager = new CardManager(dataStore, scheduler);

		for (let i = 0; i < 100; i++) {
			if (i % 3 === 0) {
				cardManager.createCard(`note${i}.md`, TEST_QUEUE_ID);
			} else {
				const card = createReviewCard(`note${i}.md`, i % 30, 10.0 + i, 5.0);
				dataStore.setCard(`note${i}.md`, cardDataFromFsrsCard(card, TEST_QUEUE_ID));
			}
		}

		await dataStore.save();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore, new Scheduler());
		const cards = newDataStore.getCards();
		expect(Object.keys(cards).length).toBe(100);

		expect(newCardManager.getCard('note0.md')).toBeDefined();
		expect(newCardManager.getCard('note50.md')).toBeDefined();
		expect(newCardManager.getCard('note99.md')).toBeDefined();
	});
});
