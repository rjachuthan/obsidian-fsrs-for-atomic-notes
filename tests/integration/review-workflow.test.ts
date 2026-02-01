/**
 * Integration tests for complete review workflows
 *
 * Tests end-to-end review session flows that users depend on:
 * - Starting and completing a review session
 * - Rating notes and schedule updates
 * - Undo functionality
 * - Skip functionality
 * - Data persistence after sessions
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createTestPlugin } from '../setup/test-helpers';
import { Plugin } from '../setup/obsidian-mock';
import { createMinimalVault, addNoteToVault } from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { SessionManager } from '../../src/review/session-manager';
import { Scheduler } from '../../src/fsrs/scheduler';
import { CardManager } from '../../src/fsrs/card-manager';
import { Rating, State } from 'ts-fsrs';

describe('Complete Review Session', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let queueManager: QueueManager;
	let scheduler: Scheduler;
	let cardManager: CardManager;
	let sessionManager: SessionManager;

	beforeEach(async () => {
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);

		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		scheduler = new Scheduler();
		cardManager = new CardManager(dataStore, scheduler);
		const settings = dataStore.getSettings();
		queueManager = new QueueManager(plugin.app, dataStore, cardManager, settings);
		sessionManager = new SessionManager(
			plugin.app,
			dataStore,
			cardManager,
			queueManager,
			scheduler
		);

		const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
		queueManager.syncQueue(queue.id);
	});

	test('User can complete a review session with 3 new notes', async () => {
		const queues = queueManager.getAllQueues();
		expect(queues).toHaveLength(1);

		const queue = queues[0]!;
		const stats = queueManager.getQueueStats(queue.id);
		expect(stats.totalNotes).toBe(3);
		expect(stats.newNotes).toBe(3);

		const started = await sessionManager.startSession(queue.id);
		expect(started).toBe(true);

		const session = sessionManager.getState();
		expect(session).toBeDefined();
		expect(session!.reviewQueue).toHaveLength(3);
		expect(session!.currentIndex).toBe(0);

		const firstNotePath = session!.reviewQueue[0]!;

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard).toBeDefined();
		const s1 = firstCard!.schedules[queue.id];
		expect(s1).toBeDefined();
		expect([State.Learning, State.Review]).toContain(s1!.state);
		expect(s1!.reps).toBe(1);
		expect(new Date(s1!.due).getTime()).toBeGreaterThan(Date.now());

		let currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);

		await sessionManager.rate(Rating.Easy as 1 | 2 | 3 | 4);

		const secondNotePath = session!.reviewQueue[1]!;
		const secondCard = cardManager.getCard(secondNotePath);
		expect(secondCard).toBeDefined();
		const s2 = secondCard!.schedules[queue.id];
		expect(s2!.state).toBe(State.Review);
		expect(s2!.reps).toBe(1);

		const firstInterval = (new Date(s1!.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const secondInterval = (new Date(s2!.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(secondInterval).toBeGreaterThan(firstInterval);

		await sessionManager.rate(Rating.Hard as 1 | 2 | 3 | 4);

		const thirdNotePath = session!.reviewQueue[2]!;
		const thirdCard = cardManager.getCard(thirdNotePath);
		expect(thirdCard).toBeDefined();
		const s3 = thirdCard!.schedules[queue.id];
		expect(s3!.state).toBe(State.Learning);
		expect(s3!.reps).toBe(1);

		currentSession = sessionManager.getState();
		expect(currentSession).toBeNull();

		const logs = dataStore.getReviews();
		expect(logs).toHaveLength(3);
		expect(logs[0]!.rating).toBe(Rating.Good);
		expect(logs[1]!.rating).toBe(Rating.Easy);
		expect(logs[2]!.rating).toBe(Rating.Hard);
	});

	test('Review data persists after plugin reload', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getState();
		const notePath = session!.reviewQueue[0]!;

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const cardBeforeReload = cardManager.getCard(notePath);
		expect(cardBeforeReload).toBeDefined();
		const dueBeforeReload = cardBeforeReload!.schedules[queue.id]!.due;
		const stabilityBeforeReload = cardBeforeReload!.schedules[queue.id]!.stability;

		// Persist so that "reload" loads the updated data
		await dataStore.forceSave();

		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newScheduler = new Scheduler();
		const newCardManager = new CardManager(newDataStore, newScheduler);
		const newSettings = newDataStore.getSettings();
		const newQueueManager = new QueueManager(plugin.app, newDataStore, newCardManager, newSettings);

		const cardAfterReload = newCardManager.getCard(notePath);
		expect(cardAfterReload).toBeDefined();
		expect(cardAfterReload!.schedules[queue.id]!.due).toBe(dueBeforeReload);
		expect(cardAfterReload!.schedules[queue.id]!.stability).toBe(stabilityBeforeReload);
		expect([State.Learning, State.Review]).toContain(cardAfterReload!.schedules[queue.id]!.state);

		const logs = newDataStore.getReviews();
		expect(logs).toHaveLength(1);
		expect(logs[0]!.cardPath).toBe(notePath);
		expect(logs[0]!.rating).toBe(Rating.Good);

		const newSessionManager = new SessionManager(
			plugin.app,
			newDataStore,
			newCardManager,
			newQueueManager,
			newScheduler
		);
		expect(newSessionManager.getState()).toBeNull();
	});

	test('User can undo last rating', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getState();
		const firstNotePath = session!.reviewQueue[0]!;
		const secondNotePath = session!.reviewQueue[1]!;

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const firstCardAfterRating = cardManager.getCard(firstNotePath);
		expect(firstCardAfterRating).toBeDefined();

		await sessionManager.rate(Rating.Easy as 1 | 2 | 3 | 4);

		expect(sessionManager.canUndo()).toBe(true);
		await sessionManager.undoLastRating();

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
		expect(currentSession!.reviewQueue[currentSession!.currentIndex]).toBe(secondNotePath);

		const secondCard = cardManager.getCard(secondNotePath);
		expect(secondCard).toBeDefined();
		const s2 = secondCard!.schedules[queue.id];
		expect(s2!.state).toBe(0); // New
		expect(s2!.reps).toBe(0);

		const logs = dataStore.getReviews();
		const secondLog = logs.find((l) => l.cardPath === secondNotePath);
		expect(secondLog).toBeDefined();
		expect(secondLog!.undone).toBe(true);

		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard!.schedules[queue.id]!.state).toBe(firstCardAfterRating!.schedules[queue.id]!.state);
	});

	test('User can undo multiple times', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getState();
		const notePaths = session!.reviewQueue;

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		await sessionManager.undoLastRating();
		await sessionManager.undoLastRating();

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(0);
		expect(currentSession!.reviewQueue[0]).toBe(notePaths[0]);

		// Both cards should be back to New state after undoing both ratings
		const card1 = cardManager.getCard(notePaths[0]!);
		const card2 = cardManager.getCard(notePaths[1]!);
		expect(card1!.schedules[queue.id]!.state).toBe(0);
		expect(card1!.schedules[queue.id]!.reps).toBe(0);
		expect(card2!.schedules[queue.id]!.state).toBe(0);
		expect(card2!.schedules[queue.id]!.reps).toBe(0);

		const logs = dataStore.getReviews();
		expect(logs.filter((l) => !l.undone)).toHaveLength(0);
	});

	test('User can skip a note during review', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getState();
		const firstNotePath = session!.reviewQueue[0]!;
		const secondNotePath = session!.reviewQueue[1]!;

		await sessionManager.skip();

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
		expect(currentSession!.reviewQueue[currentSession!.currentIndex]).toBe(secondNotePath);

		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard).toBeDefined();
		expect(firstCard!.schedules[queue.id]!.state).toBe(0);
		expect(firstCard!.schedules[queue.id]!.reps).toBe(0);
	});

	test('Session advances through all due notes and ends', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		const started = await sessionManager.startSession(queue.id);
		expect(started).toBe(true);

		const session = sessionManager.getState();
		expect(session!.reviewQueue).toHaveLength(3);

		for (let i = 0; i < 3; i++) {
			const currentSession = sessionManager.getState();
			expect(currentSession).toBeDefined();
			expect(currentSession!.currentIndex).toBe(i);

			await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		}

		const finalSession = sessionManager.getState();
		expect(finalSession).toBeNull();

		expect(sessionManager.canUndo()).toBe(false);
	});

	test('Session handles notes becoming unavailable during review', async () => {
		const queues = queueManager.getAllQueues();
		const queue = queues[0]!;

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getState();
		const firstNotePath = session!.reviewQueue[0]!;

		const file = plugin.app.vault.getAbstractFileByPath(firstNotePath);
		if (file && 'extension' in file) {
			await plugin.app.vault.delete(file);
		}

		// Rating may succeed (card still exists) or fail; advanceToNext may skip missing file
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const currentSession = sessionManager.getState();
		if (currentSession) {
			expect(currentSession.currentIndex).toBeGreaterThanOrEqual(0);
		}
	});
});
