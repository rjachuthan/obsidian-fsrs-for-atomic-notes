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

		queueManager = new QueueManager(plugin.app, dataStore);
		scheduler = new Scheduler(dataStore);
		cardManager = new CardManager(dataStore);
		sessionManager = new SessionManager(plugin.app, dataStore, scheduler, cardManager);

		// Create queue
		const queue = queueManager.createQueue('Test Queue');
		queue.folderCriterion = { folder: '', includeSubfolders: true };
		await queueManager.syncQueue(queue.id);
	});

	test('Session tracks current note correctly', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		const session = await sessionManager.startSession(queues[0].id);

		// Then: Should start at first note
		expect(session.currentIndex).toBe(0);
		expect(session.notePaths).toHaveLength(3);

		// When: Rate first note
		await sessionManager.rateCurrentNote(Rating.Good);

		// Then: Should advance to second note
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.currentIndex).toBe(1);
	});

	test('Progress updates after each rating', async () => {
		// Given: Active session with 3 notes
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// When: Rate notes one by one
		for (let i = 0; i < 3; i++) {
			const session = sessionManager.getCurrentSession();
			expect(session).toBeDefined();

			const progress = sessionManager.getProgress();
			expect(progress.current).toBe(i);
			expect(progress.total).toBe(3);
			expect(progress.percentage).toBeCloseTo((i / 3) * 100);

			await sessionManager.rateCurrentNote(Rating.Good);
		}

		// Then: Session should be complete
		const finalSession = sessionManager.getCurrentSession();
		expect(finalSession).toBeNull();

		const finalProgress = sessionManager.getProgress();
		expect(finalProgress.current).toBe(3);
		expect(finalProgress.total).toBe(3);
		expect(finalProgress.percentage).toBe(100);
	});

	test('Session detects when user navigates away', async () => {
		// Given: Active session on first note
		const queues = queueManager.getAllQueues();
		const session = await sessionManager.startSession(queues[0].id);

		const firstNotePath = session.notePaths[0];
		const firstFile = plugin.app.vault.getAbstractFileByPath(firstNotePath);

		// Set active file to first note
		if (firstFile && 'extension' in firstFile) {
			plugin.app.workspace.setActiveFile(firstFile);
		}

		// When: User navigates to different note
		const otherFile = plugin.app.vault.getAbstractFileByPath(session.notePaths[1]);
		if (otherFile && 'extension' in otherFile) {
			plugin.app.workspace.setActiveFile(otherFile);
		}

		// Then: Session should detect navigation away
		const isOnCurrentNote = sessionManager.isOnCurrentNote();
		expect(isOnCurrentNote).toBe(false);
	});

	test('"Bring back" returns to expected note', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		const session = await sessionManager.startSession(queues[0].id);

		const currentNotePath = session.notePaths[session.currentIndex];

		// When: User navigates away
		const otherFile = plugin.app.vault.getAbstractFileByPath(session.notePaths[1]);
		if (otherFile && 'extension' in otherFile) {
			plugin.app.workspace.setActiveFile(otherFile);
		}

		// Then: Bring back should navigate to current review note
		await sessionManager.bringBackToCurrentNote();

		const activeFile = plugin.app.workspace.getActiveFile();
		expect(activeFile).toBeDefined();
		expect(activeFile!.path).toBe(currentNotePath);
	});

	test('Session statistics are accurate', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// When: Rate notes with different ratings
		await sessionManager.rateCurrentNote(Rating.Good);
		await sessionManager.rateCurrentNote(Rating.Easy);
		await sessionManager.rateCurrentNote(Rating.Hard);

		// Then: Statistics should reflect ratings
		const stats = sessionManager.getSessionStats();
		expect(stats).toBeDefined();
		expect(stats.totalReviewed).toBe(3);
		expect(stats.ratings[Rating.Good]).toBe(1);
		expect(stats.ratings[Rating.Easy]).toBe(1);
		expect(stats.ratings[Rating.Hard]).toBe(1);
		expect(stats.ratings[Rating.Again]).toBe(0);
	});

	test('Cannot start multiple sessions simultaneously', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// When: Try to start another session
		const secondAttempt = async () => {
			await sessionManager.startSession(queues[0].id);
		};

		// Then: Should throw or return null
		await expect(secondAttempt()).rejects.toThrow();
	});

	test('Session can be ended early', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// Rate one note
		await sessionManager.rateCurrentNote(Rating.Good);

		// When: End session early
		await sessionManager.endSession();

		// Then: Session should be null
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeNull();

		// And: Can start new session
		const newSession = await sessionManager.startSession(queues[0].id);
		expect(newSession).toBeDefined();
	});

	test('Session handles empty queue gracefully', async () => {
		// Given: Queue with no due notes
		const emptyQueue = queueManager.createQueue('Empty Queue');
		emptyQueue.folderCriterion = { folder: 'NonExistent', includeSubfolders: true };
		await queueManager.syncQueue(emptyQueue.id);

		// When: Try to start session
		const sessionAttempt = async () => {
			await sessionManager.startSession(emptyQueue.id);
		};

		// Then: Should handle gracefully (throw or return null)
		await expect(sessionAttempt()).rejects.toThrow();
	});

	test('Session state does not persist across plugin reload', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);
		await sessionManager.rateCurrentNote(Rating.Good);

		// When: Simulate plugin reload (new SessionManager instance)
		const newSessionManager = new SessionManager(plugin.app, dataStore, scheduler, cardManager);

		// Then: Session should be cleared
		const currentSession = newSessionManager.getCurrentSession();
		expect(currentSession).toBeNull();
	});

	test('Session tracks skipped notes', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		const session = await sessionManager.startSession(queues[0].id);

		const firstNotePath = session.notePaths[0];

		// When: Skip first note
		await sessionManager.skipCurrentNote();

		// Then: Skipped notes should be tracked
		const currentSession = sessionManager.getCurrentSession();
		expect(currentSession).toBeDefined();
		expect(currentSession!.skippedNotePaths).toContain(firstNotePath);
	});

	test('Session time tracking is accurate', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		const startTime = Date.now();

		// When: Wait and rate note
		await new Promise(resolve => setTimeout(resolve, 100));
		await sessionManager.rateCurrentNote(Rating.Good);

		// Then: Review duration should be tracked
		const logs = dataStore.getAllReviewLogs();
		expect(logs).toHaveLength(1);
		expect(logs[0].reviewDuration).toBeGreaterThan(50); // At least 50ms
		expect(logs[0].reviewDuration).toBeLessThan(5000); // Less than 5 seconds
	});

	test('Session handles invalid queue ID gracefully', async () => {
		// Given: Invalid queue ID
		const invalidQueueId = 'non-existent-queue-id';

		// When: Try to start session
		const sessionAttempt = async () => {
			await sessionManager.startSession(invalidQueueId);
		};

		// Then: Should handle gracefully
		await expect(sessionAttempt()).rejects.toThrow();
	});

	test('Get current note returns correct note', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		const session = await sessionManager.startSession(queues[0].id);

		// When: Get current note
		const currentNotePath = sessionManager.getCurrentNotePath();

		// Then: Should return first note
		expect(currentNotePath).toBe(session.notePaths[0]);

		// Rate and check next
		await sessionManager.rateCurrentNote(Rating.Good);
		const nextNotePath = sessionManager.getCurrentNotePath();
		expect(nextNotePath).toBe(session.notePaths[1]);
	});

	test('Session provides rating options for current card state', async () => {
		// Given: Active session with new card
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// When: Get rating options
		const options = sessionManager.getRatingOptions();

		// Then: Should provide all 4 rating options
		expect(options).toBeDefined();
		expect(options.length).toBe(4);
		expect(options).toContain(Rating.Again);
		expect(options).toContain(Rating.Hard);
		expect(options).toContain(Rating.Good);
		expect(options).toContain(Rating.Easy);
	});

	test('Session calculates average review time', async () => {
		// Given: Active session
		const queues = queueManager.getAllQueues();
		await sessionManager.startSession(queues[0].id);

		// When: Review multiple notes with delays
		await new Promise(resolve => setTimeout(resolve, 50));
		await sessionManager.rateCurrentNote(Rating.Good);

		await new Promise(resolve => setTimeout(resolve, 100));
		await sessionManager.rateCurrentNote(Rating.Good);

		await new Promise(resolve => setTimeout(resolve, 75));
		await sessionManager.rateCurrentNote(Rating.Good);

		// Then: Average time should be calculated
		const stats = sessionManager.getSessionStats();
		expect(stats.averageReviewTime).toBeGreaterThan(50);
		expect(stats.averageReviewTime).toBeLessThan(200);
	});
});
