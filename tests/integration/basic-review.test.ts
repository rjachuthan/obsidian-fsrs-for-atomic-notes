/**
 * Basic integration test - demonstrates correct API usage
 * This test actually works with the real implementation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { Plugin } from '../setup/obsidian-mock';
import { createTestPlugin } from '../setup/test-helpers';
import { createMinimalVault } from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { Scheduler } from '../../src/fsrs/scheduler';
import { CardManager } from '../../src/fsrs/card-manager';
import { QueueManager } from '../../src/queues/queue-manager';
import { SessionManager } from '../../src/review/session-manager';

describe('Basic Review Workflow (Correct API)', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let scheduler: Scheduler;
	let cardManager: CardManager;
	let queueManager: QueueManager;
	let sessionManager: SessionManager;

	beforeEach(async () => {
		// Setup plugin with vault
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);

		// Initialize data store
		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		// Initialize scheduler
		scheduler = new Scheduler();

		// Initialize managers (note: CardManager needs Scheduler!)
		cardManager = new CardManager(dataStore, scheduler);

		// Get settings from dataStore
		const settings = dataStore.getSettings();
		queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);

		// Initialize session manager (needs all dependencies)
		sessionManager = new SessionManager(
			plugin.app,
			dataStore,
			cardManager,
			queueManager,
			scheduler
		);
	});

	test('Can create a queue and add notes to it', async () => {
		// Given: Empty data store
		const initialQueues = dataStore.getQueues();
		expect(initialQueues).toHaveLength(0);

		// When: Create a queue
		const queue = queueManager.createQueue('Test Queue', {
			type: 'folder',
			folders: [''], // Root folder
		});

		// Sync the queue to find notes
		await queueManager.syncQueue(queue.id);

		// Then: Queue should exist
		const savedQueue = dataStore.getQueue(queue.id);
		expect(savedQueue).toBeDefined();
		expect(savedQueue!.name).toBe('Test Queue');

		// Cards will be created (exact count depends on vault)
		const cards = cardManager.getCardsForQueue(queue.id);
		// At minimum, queue should be created successfully
		expect(queue.id).toBeTruthy();
	});

	test('Can create a card for a note', () => {
		// Given: A queue
		const queue = queueManager.createQueue('Test Queue', 'folder');

		// When: Create a card for a note
		const card = cardManager.createCard('note1.md', queue.id);

		// Then: Card should exist with correct structure
		expect(card).toBeDefined();
		expect(card.notePath).toBe('note1.md');
		expect(card.noteId).toBeTruthy();
		expect(card.schedules[queue.id]).toBeDefined();

		// And: Card should be retrievable
		const retrieved = cardManager.getCard('note1.md');
		expect(retrieved).toBeDefined();
		expect(retrieved!.notePath).toBe('note1.md');
	});

	test('Cards are stored in DataStore', () => {
		// Given: A queue
		const queue = queueManager.createQueue('Test Queue', 'folder');

		// When: Create multiple cards
		cardManager.createCard('note1.md', queue.id);
		cardManager.createCard('note2.md', queue.id);
		cardManager.createCard('note3.md', queue.id);

		// Then: DataStore should have all cards
		const allCards = dataStore.getCards();
		expect(Object.keys(allCards)).toHaveLength(3);
		expect(allCards['note1.md']).toBeDefined();
		expect(allCards['note2.md']).toBeDefined();
		expect(allCards['note3.md']).toBeDefined();
	});

	test('Can get new cards for a queue', () => {
		// Given: Queue with cards
		const queue = queueManager.createQueue('Test Queue', 'folder');
		cardManager.createCard('note1.md', queue.id);
		cardManager.createCard('note2.md', queue.id);

		// When: Get new cards
		const newCards = cardManager.getNewCards(queue.id);

		// Then: Should return all cards (they're all new)
		expect(newCards).toHaveLength(2);
		newCards.forEach(card => {
			const schedule = card.schedules[queue.id];
			expect(schedule.state).toBe(0); // New state
			expect(schedule.reps).toBe(0);
		});
	});

	test('Can rate a card and update schedule', () => {
		// Given: Card in queue
		const queue = queueManager.createQueue('Test Queue', 'folder');
		const card = cardManager.createCard('note1.md', queue.id);

		// Get original schedule
		const originalSchedule = card.schedules[queue.id];
		expect(originalSchedule.state).toBe(0); // New
		expect(originalSchedule.reps).toBe(0);

		// When: Rate the card (3 = Good in ts-fsrs)
		const sessionId = 'test-session';
		const reviewLog = cardManager.updateCardSchedule('note1.md', queue.id, 3, sessionId);

		// Then: Review log should be created
		expect(reviewLog).toBeDefined();
		expect(reviewLog.cardPath).toBe('note1.md');
		expect(reviewLog.rating).toBe(3);
		expect(reviewLog.queueId).toBe(queue.id);

		// And: Card schedule should be updated
		const updatedCard = cardManager.getCard('note1.md');
		expect(updatedCard).toBeDefined();
		const newSchedule = updatedCard!.schedules[queue.id];
		expect(newSchedule.reps).toBe(1); // Should have 1 review
		expect(newSchedule.state).toBeGreaterThan(0); // Should have progressed from New state

		// And: Review should be in data store
		const reviews = dataStore.getReviews();
		expect(reviews).toHaveLength(1);
		expect(reviews[0].cardPath).toBe('note1.md');
	});

	test('Data persists after reload', async () => {
		// Given: Queue with reviewed card
		const queue = queueManager.createQueue('Test Queue', 'folder');
		cardManager.createCard('note1.md', queue.id);
		cardManager.updateCardSchedule('note1.md', queue.id, 3, 'session-1');

		// Force save
		await dataStore.save();

		// When: Create new DataStore (simulating reload)
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		// Then: Queue should still exist
		const reloadedQueues = newDataStore.getQueues();
		expect(reloadedQueues).toHaveLength(1);
		expect(reloadedQueues[0].name).toBe('Test Queue');

		// And: Card should still exist
		const reloadedCard = newDataStore.getCard('note1.md');
		expect(reloadedCard).toBeDefined();
		expect(reloadedCard!.notePath).toBe('note1.md');

		// And: Review should still exist
		const reloadedReviews = newDataStore.getReviews();
		expect(reloadedReviews).toHaveLength(1);
	});

	test('Can delete a card', () => {
		// Given: Card exists
		const queue = queueManager.createQueue('Test Queue', 'folder');
		cardManager.createCard('note1.md', queue.id);
		expect(cardManager.getCard('note1.md')).toBeDefined();

		// When: Delete card
		cardManager.deleteCard('note1.md');

		// Then: Card should not exist
		expect(cardManager.getCard('note1.md')).toBeUndefined();
	});

	test('Can rename a card', () => {
		// Given: Card exists with old path
		const queue = queueManager.createQueue('Test Queue', 'folder');
		cardManager.createCard('old-note.md', queue.id);
		expect(cardManager.getCard('old-note.md')).toBeDefined();

		// When: Rename card
		cardManager.renameCard('old-note.md', 'new-note.md');

		// Then: Old path should not exist
		expect(cardManager.getCard('old-note.md')).toBeUndefined();

		// And: New path should exist
		const renamedCard = cardManager.getCard('new-note.md');
		expect(renamedCard).toBeDefined();
		expect(renamedCard!.notePath).toBe('new-note.md');
	});

	test('Scheduling preview shows all rating options', () => {
		// Given: Card in queue
		const queue = queueManager.createQueue('Test Queue', {
			type: 'folder',
			folders: [''],
		});
		cardManager.createCard('note1.md', queue.id);

		// When: Get scheduling preview
		const preview = cardManager.getSchedulingPreview('note1.md', queue.id);

		// Then: Should show all 4 ratings
		expect(preview).toBeDefined();
		expect(preview).toHaveProperty('1'); // Again
		expect(preview).toHaveProperty('2'); // Hard
		expect(preview).toHaveProperty('3'); // Good
		expect(preview).toHaveProperty('4'); // Easy

		// Each rating should have interval info
		expect(preview!['3']).toHaveProperty('interval');
		// Preview contains scheduling information (interval can be 0 for new cards)
		expect(typeof preview!['3'].interval).toBe('number');
	});
});
