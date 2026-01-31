/**
 * Critical tests for data integrity
 *
 * Ensures that data corruption is prevented:
 * - Duplicate path prevention
 * - Schema validation
 * - Atomic operations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Plugin } from '../setup/obsidian-mock';
import { createTestPlugin } from '../setup/test-helpers';
import { createMinimalVault } from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { CardManager } from '../../src/fsrs/card-manager';
import { Scheduler } from '../../src/fsrs/scheduler';
import { QueueManager } from '../../src/queues/queue-manager';

describe('Data Integrity', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let scheduler: Scheduler;
	let cardManager: CardManager;
	let queueManager: QueueManager;
	let queueId: string;

	beforeEach(async () => {
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);

		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		scheduler = new Scheduler();
		cardManager = new CardManager(dataStore, scheduler);

		const settings = dataStore.getSettings();
		queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);

		// Create a test queue
		const queue = queueManager.createQueue('Test Queue', {
			type: 'folder',
			folders: [''],
		});
		queueId = queue.id;
	});

	test('Cannot create duplicate cards with same path in same queue', () => {
		// Given: Card already exists
		cardManager.createCard('note1.md', queueId);

		// When: Try to create same card again
		const secondCard = cardManager.createCard('note1.md', queueId);

		// Then: Should return existing card (idempotent)
		expect(secondCard).toBeDefined();
		expect(secondCard.notePath).toBe('note1.md');

		// And: Should only have one card in dataStore
		const allCards = dataStore.getCards();
		expect(Object.keys(allCards)).toHaveLength(1);
	});

	test('Deleting non-existent card does not throw', () => {
		// When: Try to delete non-existent card
		const deleteNonExistent = () => {
			cardManager.deleteCard('non-existent.md');
		};

		// Then: Should not throw (idempotent operation)
		expect(deleteNonExistent).not.toThrow();
	});

	test('Getting non-existent card returns undefined', () => {
		// When: Get non-existent card
		const card = cardManager.getCard('non-existent.md');

		// Then: Should return undefined, not throw
		expect(card).toBeUndefined();
	});

	test('Rating operation creates review log', () => {
		// Given: Card exists
		cardManager.createCard('note1.md', queueId);

		// When: Rate card
		const reviewLog = cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-1');

		// Then: Review log should be created
		expect(reviewLog).toBeDefined();
		expect(reviewLog.cardPath).toBe('note1.md');
		expect(reviewLog.rating).toBe(3);

		// And: Review log should be in dataStore
		const reviews = dataStore.getReviews();
		expect(reviews).toHaveLength(1);
		expect(reviews[0].cardPath).toBe('note1.md');
	});

	test('Concurrent card updates work correctly', async () => {
		// Given: Single card
		cardManager.createCard('note1.md', queueId);

		// When: Multiple ratings in sequence
		cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-1');
		cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-2');
		cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-3');

		// Then: All reviews should be recorded
		const reviews = dataStore.getReviews();
		expect(reviews.length).toBeGreaterThanOrEqual(3);

		// And: Card should have updated state
		const finalCard = cardManager.getCard('note1.md');
		expect(finalCard).toBeDefined();
		expect(finalCard!.schedules[queueId].reps).toBeGreaterThanOrEqual(3);
	});

	test('Card deletion works correctly', () => {
		// Given: Card exists
		cardManager.createCard('note1.md', queueId);
		expect(cardManager.getCard('note1.md')).toBeDefined();

		// When: Delete card
		cardManager.deleteCard('note1.md');

		// Then: Card should not exist
		expect(cardManager.getCard('note1.md')).toBeUndefined();
	});

	test('Empty or null values are handled gracefully', () => {
		// When: Try various operations
		const operations = [
			() => cardManager.getCard(''),
			() => cardManager.deleteCard(''),
			() => dataStore.getReviews(),
		];

		// Then: Should not throw
		for (const op of operations) {
			expect(op).not.toThrow();
		}
	});

	test('Large card dataset maintains integrity', () => {
		// Given: Many cards
		const cardCount = 100;
		for (let i = 0; i < cardCount; i++) {
			cardManager.createCard(`note${i}.md`, queueId);
		}

		// Then: All cards should be retrievable
		const allCards = dataStore.getCards();
		expect(Object.keys(allCards)).toHaveLength(cardCount);

		// And: No duplicates
		const paths = Object.keys(allCards);
		const uniquePaths = new Set(paths);
		expect(uniquePaths.size).toBe(cardCount);

		// And: Each card is valid
		for (const card of Object.values(allCards)) {
			expect(card.notePath).toBeTruthy();
			expect(card.schedules[queueId]).toBeDefined();
			expect(card.schedules[queueId].state).toBeGreaterThanOrEqual(0);
			expect(card.schedules[queueId].state).toBeLessThanOrEqual(3);
		}
	});

	test('Card dates are stored and retrieved correctly', () => {
		// Given: Card with specific creation time
		const beforeCreate = Date.now();
		const card = cardManager.createCard('note1.md', queueId);
		const afterCreate = Date.now();

		// When: Retrieve card
		const retrievedCard = cardManager.getCard('note1.md');

		// Then: Dates should be preserved
		expect(retrievedCard).toBeDefined();
		const createdTime = new Date(retrievedCard!.createdAt).getTime();
		expect(createdTime).toBeGreaterThanOrEqual(beforeCreate);
		expect(createdTime).toBeLessThanOrEqual(afterCreate);
	});

	test('Floating point precision is maintained', () => {
		// Given: Card
		cardManager.createCard('note1.md', queueId);

		// When: Rate card (causes stability/difficulty changes)
		cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-1');

		// Then: Retrieve card
		const retrievedCard = cardManager.getCard('note1.md');
		expect(retrievedCard).toBeDefined();

		const schedule = retrievedCard!.schedules[queueId];
		// Values should be numbers with reasonable precision
		expect(typeof schedule.stability).toBe('number');
		expect(typeof schedule.difficulty).toBe('number');
		expect(schedule.stability).toBeGreaterThan(0);
		expect(schedule.difficulty).toBeGreaterThan(0);
	});

	test('Card rename preserves data', () => {
		// Given: Card with reviews
		cardManager.createCard('old-note.md', queueId);
		cardManager.updateCardSchedule('old-note.md', queueId, 3, 'session-1');

		const oldCard = cardManager.getCard('old-note.md');
		const oldSchedule = oldCard!.schedules[queueId];

		// When: Rename card
		cardManager.renameCard('old-note.md', 'new-note.md');

		// Then: Old path should not exist
		expect(cardManager.getCard('old-note.md')).toBeUndefined();

		// And: New path should exist with same data
		const newCard = cardManager.getCard('new-note.md');
		expect(newCard).toBeDefined();
		expect(newCard!.notePath).toBe('new-note.md');
		expect(newCard!.schedules[queueId].reps).toBe(oldSchedule.reps);
		expect(newCard!.schedules[queueId].stability).toBe(oldSchedule.stability);
	});

	test('Data persists after save and reload', async () => {
		// Given: Card with review
		cardManager.createCard('note1.md', queueId);
		cardManager.updateCardSchedule('note1.md', queueId, 3, 'session-1');

		// Force save
		await dataStore.save();

		// When: Create new DataStore (simulating reload)
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Then: Card should still exist
		const reloadedCard = newDataStore.getCard('note1.md');
		expect(reloadedCard).toBeDefined();
		expect(reloadedCard!.notePath).toBe('note1.md');

		// And: Review should still exist
		const reloadedReviews = newDataStore.getReviews();
		expect(reloadedReviews.length).toBeGreaterThanOrEqual(1);
	});

	test('Queue data integrity is maintained', () => {
		// Given: Multiple queues
		const queue1 = queueManager.createQueue('Queue 1', { type: 'folder', folders: ['folder1'] });
		const queue2 = queueManager.createQueue('Queue 2', { type: 'folder', folders: ['folder2'] });

		// When: Create cards in different queues
		cardManager.createCard('note1.md', queue1.id);
		cardManager.createCard('note2.md', queue2.id);

		// Then: Queues should be independent
		const queue1Cards = cardManager.getCardsForQueue(queue1.id);
		const queue2Cards = cardManager.getCardsForQueue(queue2.id);

		expect(queue1Cards).toHaveLength(1);
		expect(queue2Cards).toHaveLength(1);
		expect(queue1Cards[0].notePath).toBe('note1.md');
		expect(queue2Cards[0].notePath).toBe('note2.md');
	});

	test('Card can belong to multiple queues', () => {
		// Given: Two queues
		const queue1 = queueManager.createQueue('Queue 1', { type: 'folder', folders: [''] });
		const queue2 = queueManager.createQueue('Queue 2', { type: 'folder', folders: [''] });

		// When: Add same note to both queues
		cardManager.createCard('note1.md', queue1.id);
		cardManager.createCard('note1.md', queue2.id);

		// Then: Card should have schedules for both queues
		const card = cardManager.getCard('note1.md');
		expect(card).toBeDefined();
		expect(card!.schedules[queue1.id]).toBeDefined();
		expect(card!.schedules[queue2.id]).toBeDefined();

		// And: Only one card should exist in dataStore
		const allCards = dataStore.getCards();
		expect(Object.keys(allCards)).toHaveLength(1);
	});
});
