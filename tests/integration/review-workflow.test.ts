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
import { createNewCards } from '../fixtures/test-cards';
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
		// Setup mock app with test vault
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);
		

		// Initialize plugin components
		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		queueManager = new QueueManager(plugin.app, dataStore);
		scheduler = new Scheduler(dataStore);
		cardManager = new CardManager(dataStore);
		sessionManager = new SessionManager(plugin.app, dataStore, scheduler, cardManager);

		// Create a queue with 3 notes
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);
	});

	test('User can complete a review session with 3 new notes', async () => {
		// Given: Queue with 3 new notes
		const queues = queueManager.getAllQueues();
		expect(queues).toHaveLength(1);

		const queue = queues[0];
		const stats = queueManager.getQueueStats(queue.id);
		expect(stats.total).toBe(3);
		expect(stats.new).toBe(3);

		// When: User starts review session
		const session = await sessionManager.startSession(queue.id);
		expect(session).toBeDefined();
		expect(session.notePaths).toHaveLength(3);
		expect(session.currentIndex).toBe(0);

		// Rate first note as "Good"
		const firstNotePath = session.notePaths[0];
		await sessionManager.rateCurrentNote(Rating.Good);

		// Then: Card should be updated and moved to next state
		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard).toBeDefined();
		expect(firstCard!.state).toBe(State.Review); // New -> Review on Good
		expect(firstCard!.reps).toBe(1);
		expect(firstCard!.due.getTime()).toBeGreaterThan(Date.now()); // Should be scheduled in future

		// And: Session should advance to next note
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);

		// Rate second note as "Easy"
		await sessionManager.rateCurrentNote(Rating.Easy);

		const secondCard = cardManager.getCard(session.notePaths[1]);
		expect(secondCard).toBeDefined();
		expect(secondCard!.state).toBe(State.Review);
		expect(secondCard!.reps).toBe(1);

		// Easy should give longer interval than Good
		const firstInterval = (firstCard!.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const secondInterval = (secondCard!.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(secondInterval).toBeGreaterThan(firstInterval);

		// Rate third note as "Hard"
		await sessionManager.rateCurrentNote(Rating.Hard);

		const thirdCard = cardManager.getCard(session.notePaths[2]);
		expect(thirdCard).toBeDefined();
		expect(thirdCard!.state).toBe(State.Learning); // Hard keeps in Learning
		expect(thirdCard!.reps).toBe(1);

		// And: Session should be complete
		const finalSession = sessionManager.getCurrentSession();
		expect(finalSession).toBeNull();

		// And: All review logs should be created
		const logs = dataStore.getAllReviewLogs();
		expect(logs).toHaveLength(3);
		expect(logs[0].rating).toBe(Rating.Good);
		expect(logs[1].rating).toBe(Rating.Easy);
		expect(logs[2].rating).toBe(Rating.Hard);
	});

	test('Review data persists after plugin reload', async () => {
		// Given: User reviews a note and rates it "Good"
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getCurrentSession();
		const notePath = session!.notePaths[0];

		await sessionManager.rateCurrentNote(Rating.Good);

		// Get card state before reload
		const cardBeforeReload = cardManager.getCard(notePath);
		expect(cardBeforeReload).toBeDefined();
		const dueBeforeReload = cardBeforeReload!.due;
		const stabilityBeforeReload = cardBeforeReload!.stability;

		// When: Plugin is reloaded (simulate by creating new instances)
		const newDataStore = new DataStore(plugin);
		await newDataStore.initialize();

		const newCardManager = new CardManager(newDataStore);
		const newQueueManager = new QueueManager(plugin.app, newDataStore);

		// Then: Card should still have correct data
		const cardAfterReload = newCardManager.getCard(notePath);
		expect(cardAfterReload).toBeDefined();
		expect(cardAfterReload!.due.getTime()).toBe(dueBeforeReload.getTime());
		expect(cardAfterReload!.stability).toBe(stabilityBeforeReload);
		expect(cardAfterReload!.state).toBe(State.Review);

		// And: Review log should be preserved
		const logs = newDataStore.getAllReviewLogs();
		expect(logs).toHaveLength(1);
		expect(logs[0].cardPath).toBe(notePath);
		expect(logs[0].rating).toBe(Rating.Good);

		// And: Session state should be cleared (sessions don't persist)
		const newSessionManager = new SessionManager(plugin.app, newDataStore, scheduler, cardManager);
		const currentSession = newSessionManager.getCurrentSession();
		expect(currentSession).toBeNull();
	});

	test('User can undo last rating', async () => {
		// Given: User reviews two notes
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getCurrentSession();
		const firstNotePath = session!.notePaths[0];
		const secondNotePath = session!.notePaths[1];

		await sessionManager.rateCurrentNote(Rating.Good);

		// Save state of first card after rating
		const firstCardAfterRating = { ...cardManager.getCard(firstNotePath)! };

		await sessionManager.rateCurrentNote(Rating.Easy);

		// When: User undoes the second rating
		const canUndo = sessionManager.canUndo();
		expect(canUndo).toBe(true);

		await sessionManager.undo();

		// Then: Should return to second note
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
		expect(currentSession!.notePaths[currentSession!.currentIndex]).toBe(secondNotePath);

		// And: Second card should be restored to pre-rating state
		const secondCard = cardManager.getCard(secondNotePath);
		expect(secondCard).toBeDefined();
		expect(secondCard!.state).toBe(State.New);
		expect(secondCard!.reps).toBe(0);

		// And: Review log should be marked as undone
		const logs = dataStore.getAllReviewLogs();
		const secondLog = logs.find(l => l.cardPath === secondNotePath);
		expect(secondLog).toBeDefined();
		expect(secondLog!.undone).toBe(true);

		// And: First card should remain unchanged
		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard).toBeDefined();
		expect(firstCard!.state).toBe(firstCardAfterRating.state);
		expect(firstCard!.reps).toBe(firstCardAfterRating.reps);
	});

	test('User can undo multiple times', async () => {
		// Given: User reviews all three notes
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getCurrentSession();

		await sessionManager.rateCurrentNote(Rating.Good);
		await sessionManager.rateCurrentNote(Rating.Good);
		await sessionManager.rateCurrentNote(Rating.Good);

		// Session should be complete
		expect(sessionManager.getCurrentSession()).toBeNull();

		// When: User undoes three times
		await sessionManager.undo();
		await sessionManager.undo();
		await sessionManager.undo();

		// Then: Should be back at first note
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(0);
		expect(currentSession!.notePaths[0]).toBe(session!.notePaths[0]);

		// And: All cards should be back to New state
		for (const notePath of session!.notePaths) {
			const card = cardManager.getCard(notePath);
			expect(card).toBeDefined();
			expect(card!.state).toBe(State.New);
			expect(card!.reps).toBe(0);
		}

		// And: All review logs should be marked as undone
		const logs = dataStore.getAllReviewLogs();
		expect(logs).toHaveLength(3);
		expect(logs.every(l => l.undone)).toBe(true);
	});

	test('User can skip a note during review', async () => {
		// Given: User starts a review session
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getCurrentSession();
		const firstNotePath = session!.notePaths[0];
		const secondNotePath = session!.notePaths[1];

		// When: User skips the first note
		await sessionManager.skipCurrentNote();

		// Then: Should move to second note
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
		expect(currentSession!.notePaths[currentSession!.currentIndex]).toBe(secondNotePath);

		// And: First note should remain unrated
		const firstCard = cardManager.getCard(firstNotePath);
		expect(firstCard).toBeDefined();
		expect(firstCard!.state).toBe(State.New);
		expect(firstCard!.reps).toBe(0);

		// And: Skipped notes should be tracked
		expect(currentSession!.skippedNotePaths).toContain(firstNotePath);
	});

	test('Session advances through all due notes and ends', async () => {
		// Given: Queue with 3 notes
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		const session = await sessionManager.startSession(queue.id);
		expect(session.notePaths).toHaveLength(3);

		// When: User rates all notes
		for (let i = 0; i < 3; i++) {
			const currentSession = sessionManager.getCurrentSession();
			expect(currentSession).toBeDefined();
			expect(currentSession!.currentIndex).toBe(i);

			await sessionManager.rateCurrentNote(Rating.Good);
		}

		// Then: Session should be complete
		const finalSession = sessionManager.getCurrentSession();
		expect(finalSession).toBeNull();

		// And: Can't undo after session ends (unless we start a new session with history)
		const canUndo = sessionManager.canUndo();
		expect(canUndo).toBe(false);
	});

	test('Session handles notes becoming unavailable during review', async () => {
		// Given: Active review session
		const queues = queueManager.getAllQueues();
		const queue = queues[0];

		await sessionManager.startSession(queue.id);
		const session = sessionManager.getCurrentSession();
		const firstNotePath = session!.notePaths[0];

		// When: Note is deleted from vault during review
		const file = plugin.app.vault.getAbstractFileByPath(firstNotePath);
		if (file && 'extension' in file) {
			await plugin.app.vault.delete(file);
		}

		// Then: Rating should fail gracefully
		const ratingResult = await sessionManager.rateCurrentNote(Rating.Good);
		expect(ratingResult).toBeDefined();

		// And: Session should skip to next note or end gracefully
		const currentSession = sessionManager.getCurrentSession();
		if (currentSession) {
			expect(currentSession.currentIndex).toBeGreaterThan(0);
		}
	});
});
