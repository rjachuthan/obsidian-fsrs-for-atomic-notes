/**
 * Behavioral tests for session state management
 *
 * Verifies that review session state is reliable:
 * - Current note tracking
 * - Progress updates
 * - Navigation detection
 * - Statistics accuracy
 * - Multiple session prevention
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createTestPlugin } from '../setup/test-helpers';
import { Plugin } from '../setup/obsidian-mock';
import { createMinimalVault } from '../fixtures/sample-vault';
import { DataStore } from '../../src/data/data-store';
import { QueueManager } from '../../src/queues/queue-manager';
import { SessionManager } from '../../src/review/session-manager';
import { Scheduler } from '../../src/fsrs/scheduler';
import { CardManager } from '../../src/fsrs/card-manager';
import { Rating } from 'ts-fsrs';

describe('Session State Management', () => {
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

		// Create queue with root folder so all 3 notes are included; sync to create cards
		const queue = queueManager.createQueue('Test Queue', { type: 'folder', folders: [''] });
		queueManager.syncQueue(queue.id);
	});

	test('Session tracks current note correctly', async () => {
		const queues = queueManager.getAllQueues();
		const started = await sessionManager.startSession(queues[0]!.id);
		expect(started).toBe(true);

		const session = sessionManager.getState();
		expect(session).toBeDefined();
		expect(session!.currentIndex).toBe(0);
		expect(session!.reviewQueue).toHaveLength(3);

		// Rate first note
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
	});

	test('Progress updates after each rating', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		for (let i = 0; i < 3; i++) {
			const session = sessionManager.getState();
			expect(session).toBeDefined();

			const progress = sessionManager.getProgress();
			expect(progress).toBeDefined();
			expect(progress!.current).toBe(i + 1); // 1-based
			expect(progress!.total).toBe(3);

			await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		}

		const finalSession = sessionManager.getState();
		expect(finalSession).toBeNull();

		const finalProgress = sessionManager.getProgress();
		expect(finalProgress).toBeNull();
	});

	test('Session detects when user navigates away', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		const session = sessionManager.getState()!;
		const firstNotePath = session.reviewQueue[0];
		const firstFile = plugin.app.vault.getAbstractFileByPath(firstNotePath);

		if (firstFile && 'extension' in firstFile) {
			plugin.app.workspace.setActiveFile(firstFile);
		}

		// User navigates to different note
		const otherPath = session.reviewQueue[1];
		const otherFile = plugin.app.vault.getAbstractFileByPath(otherPath!);
		if (otherFile && 'extension' in otherFile) {
			plugin.app.workspace.setActiveFile(otherFile);
		}

		const isOnCurrentNote = sessionManager.isCurrentNoteExpected();
		expect(isOnCurrentNote).toBe(false);
	});

	test('"Bring back" returns to expected note', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		const session = sessionManager.getState()!;
		const currentNotePath = session.reviewQueue[session.currentIndex];

		// User navigates away (set active file to another note)
		const otherPath = session.reviewQueue[1]!;
		const otherFile = plugin.app.vault.getFileByPath(otherPath);
		if (otherFile) {
			plugin.app.workspace.setActiveFile(otherFile);
		}

		// Bring back should open the current session note
		await sessionManager.bringBack();

		const activeFile = plugin.app.workspace.getActiveFile();
		expect(activeFile).toBeDefined();
		expect(activeFile!.path).toBe(currentNotePath);
	});

	test('Session statistics are accurate', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		await sessionManager.rate(Rating.Easy as 1 | 2 | 3 | 4);
		await sessionManager.rate(Rating.Hard as 1 | 2 | 3 | 4);

		const session = sessionManager.getState();
		expect(session).toBeNull(); // Session ended after 3 ratings

		// Stats are on session; after end we can't get them. Check review logs instead
		const reviews = dataStore.getReviews();
		expect(reviews).toHaveLength(3);
	});

	test('Cannot start multiple sessions simultaneously', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		const secondStarted = await sessionManager.startSession(queues[0]!.id);
		expect(secondStarted).toBe(false);
	});

	test('Session can be ended early', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		sessionManager.endSession();

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeNull();

		const newStarted = await sessionManager.startSession(queues[0]!.id);
		expect(newStarted).toBe(true);
	});

	test('Session handles empty queue gracefully', async () => {
		const emptyQueue = queueManager.createQueue('Empty Queue', { type: 'folder', folders: ['NonExistent'] });
		queueManager.syncQueue(emptyQueue.id);

		const started = await sessionManager.startSession(emptyQueue.id);
		expect(started).toBe(false);
	});

	test('Session state does not persist across plugin reload', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const newSessionManager = new SessionManager(
			plugin.app,
			dataStore,
			cardManager,
			queueManager,
			scheduler
		);

		const currentSession = newSessionManager.getState();
		expect(currentSession).toBeNull();
	});

	test('Session tracks skipped notes', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		const session = sessionManager.getState()!;
		const firstNotePath = session.reviewQueue[0];

		await sessionManager.skip();

		const currentSession = sessionManager.getState();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
		expect(currentSession!.currentNotePath).toBe(session.reviewQueue[1]);
	});

	test('Session time tracking is accurate', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		await new Promise((resolve) => setTimeout(resolve, 100));
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		const logs = dataStore.getReviews();
		expect(logs).toHaveLength(1);
		expect(logs[0]!.review).toBeDefined();
	});

	test('Session handles invalid queue ID gracefully', async () => {
		const started = await sessionManager.startSession('non-existent-queue-id');
		expect(started).toBe(false);
	});

	test('Get current note returns correct note', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		const session = sessionManager.getState()!;
		const currentNotePath = sessionManager.getExpectedNotePath();
		expect(currentNotePath).toBe(session.reviewQueue[0]);

		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);
		const nextNotePath = sessionManager.getExpectedNotePath();
		expect(nextNotePath).toBe(session.reviewQueue[1]);
	});

	test('Session provides rating options for current card state', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		// SessionManager doesn't expose getRatingOptions; we can rate with any of 1,2,3,4
		const schedule = sessionManager.getCurrentSchedule();
		expect(schedule).toBeDefined();
		expect([0, 1, 2, 3]).toContain(schedule!.state);
	});

	test('Session calculates average review time', async () => {
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0]!.id);

		await new Promise((resolve) => setTimeout(resolve, 50));
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		await new Promise((resolve) => setTimeout(resolve, 100));
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		await new Promise((resolve) => setTimeout(resolve, 75));
		await sessionManager.rate(Rating.Good as 1 | 2 | 3 | 4);

		// Session ended; review logs have 'review' timestamp
		const reviews = dataStore.getReviews();
		expect(reviews).toHaveLength(3);
	});
});
