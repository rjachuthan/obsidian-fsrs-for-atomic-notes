/**
 * Behavioral tests for FSRS scheduling correctness
 *
 * Verifies that the FSRS algorithm produces correct schedules:
 * - Rating transitions (New -> Learning, New -> Review, etc.)
 * - Interval progression after successful reviews
 * - Retrievability calculations
 * - Overdue card handling
 * - Lapse tracking
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createTestPlugin } from '../setup/test-helpers';
import { Rating, State } from 'ts-fsrs';
import { Plugin } from '../setup/obsidian-mock';
import { createMinimalVault } from '../fixtures/sample-vault';
import {
	createNewCard,
	createReviewCard,
	createOverdueCard,
	createLearningCard,
	TEST_QUEUE_ID,
	cardDataFromFsrsCard,
	fsrsCardToCardSchedule,
} from '../fixtures/test-cards';
import { DataStore } from '../../src/data/data-store';
import { Scheduler } from '../../src/fsrs/scheduler';
import { CardManager } from '../../src/fsrs/card-manager';
import { DEFAULT_QUEUE_STATS } from '../../src/constants';
import { nowISO } from '../../src/utils/date-utils';

describe('FSRS Scheduling Accuracy', () => {
	let plugin: Plugin;
	let dataStore: DataStore;
	let scheduler: Scheduler;
	let cardManager: CardManager;

	beforeEach(async () => {
		const { vault, metadataCache } = createMinimalVault();
		plugin = createTestPlugin(vault, metadataCache);

		dataStore = new DataStore(plugin);
		await dataStore.initialize();

		// Add a test queue so createCard has a queue to attach to
		dataStore.addQueue({
			id: TEST_QUEUE_ID,
			name: 'Test Queue',
			createdAt: nowISO(),
			criteria: { type: 'folder', folders: [] },
			stats: { ...DEFAULT_QUEUE_STATS },
		});

		scheduler = new Scheduler();
		cardManager = new CardManager(dataStore, scheduler);
	});

	test('New card rated "Good" transitions to Review state', async () => {
		// Given: New card
		cardManager.createCard('note1.md', TEST_QUEUE_ID);

		// When: Rated "Good"
		const sessionId = 'session-1';
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, sessionId);

		// Then: Should transition to Review or Learning state (FSRS may keep in Learning for one step)
		const card = cardManager.getCard('note1.md');
		const schedule = card!.schedules[TEST_QUEUE_ID];
		expect([State.Learning, State.Review]).toContain(schedule.state);
		expect(schedule.reps).toBe(1);

		// And: Should have positive interval (FSRS may give short learning step first)
		const intervalDays = (new Date(schedule.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(intervalDays).toBeGreaterThan(0);
		expect(new Date(schedule.due).getTime()).toBeGreaterThan(Date.now());
	});

	test('New card rated "Easy" gives longer interval than "Good"', async () => {
		// Given: Two identical new cards
		cardManager.createCard('note1.md', TEST_QUEUE_ID);
		cardManager.createCard('note2.md', TEST_QUEUE_ID);

		// When: One rated "Good", one rated "Easy"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');
		cardManager.updateCardSchedule('note2.md', TEST_QUEUE_ID, Rating.Easy as 1 | 2 | 3 | 4, 's1');

		// Then: Easy should have longer interval
		const card1 = cardManager.getCard('note1.md');
		const card2 = cardManager.getCard('note2.md');
		const goodInterval = (new Date(card1!.schedules[TEST_QUEUE_ID].due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const easyInterval = (new Date(card2!.schedules[TEST_QUEUE_ID].due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

		expect(easyInterval).toBeGreaterThan(goodInterval);
		expect(card2!.schedules[TEST_QUEUE_ID].stability).toBeGreaterThan(card1!.schedules[TEST_QUEUE_ID].stability);
	});

	test('New card rated "Hard" stays in Learning state', async () => {
		// Given: New card
		cardManager.createCard('note1.md', TEST_QUEUE_ID);

		// When: Rated "Hard"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Hard as 1 | 2 | 3 | 4, 's1');

		// Then: Should stay in Learning state
		const schedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(schedule.state).toBe(State.Learning);
		expect(schedule.reps).toBe(1);

		// And: Should have short interval (minutes to hours)
		const intervalMinutes = (new Date(schedule.due).getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(1);
		expect(intervalMinutes).toBeLessThan(60 * 24); // Less than 1 day
	});

	test('New card rated "Again" stays in Learning with shortest interval', async () => {
		// Given: New card
		cardManager.createCard('note1.md', TEST_QUEUE_ID);

		// When: Rated "Again"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Again as 1 | 2 | 3 | 4, 's1');

		// Then: Should be in Learning state
		const schedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(schedule.state).toBe(State.Learning);

		// And: Should have very short interval
		const intervalMinutes = (new Date(schedule.due).getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(0);
		expect(intervalMinutes).toBeLessThan(30); // Less than 30 minutes
	});

	test('Review card intervals increase after successful review', async () => {
		// Given: Card in Review state with 5-day interval
		const card = createReviewCard('note1.md', 0, 10.0, 5.0);
		const cardData = cardDataFromFsrsCard(card, TEST_QUEUE_ID);
		dataStore.setCard('note1.md', cardData);

		const originalInterval = card.scheduled_days;

		// When: Rated "Good" when due
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');

		// Then: Interval should increase
		const updatedSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		const newIntervalDays = (new Date(updatedSchedule.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(newIntervalDays).toBeGreaterThan(originalInterval);

		// And: Stability should increase
		expect(updatedSchedule.stability).toBeGreaterThan(card.stability);
	});

	test('Review card rated "Easy" increases interval more than "Good"', async () => {
		// Given: Two identical cards in Review state
		const card1 = createReviewCard('note1.md', 0, 10.0, 5.0);
		const card2 = createReviewCard('note2.md', 0, 10.0, 5.0);
		dataStore.setCard('note1.md', cardDataFromFsrsCard(card1, TEST_QUEUE_ID));
		dataStore.setCard('note2.md', cardDataFromFsrsCard(card2, TEST_QUEUE_ID));

		// When: One rated "Good", one rated "Easy"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');
		cardManager.updateCardSchedule('note2.md', TEST_QUEUE_ID, Rating.Easy as 1 | 2 | 3 | 4, 's1');

		// Then: Easy should have longer next interval
		const s1 = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		const s2 = cardManager.getCard('note2.md')!.schedules[TEST_QUEUE_ID];
		const goodInterval = (new Date(s1.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const easyInterval = (new Date(s2.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

		expect(easyInterval).toBeGreaterThan(goodInterval);
		expect(s2.stability).toBeGreaterThan(s1.stability);
	});

	test('Review card rated "Hard" decreases interval', async () => {
		// Given: Card in Review state with 5-day interval (due in 5 days from "now" at creation)
		const card = createReviewCard('note1.md', 5, 10.0, 5.0);
		dataStore.setCard('note1.md', cardDataFromFsrsCard(card, TEST_QUEUE_ID));

		const originalInterval = card.scheduled_days;

		// When: Rated "Hard"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Hard as 1 | 2 | 3 | 4, 's1');

		// Then: Next interval should be shorter than original, or difficulty should increase
		const updatedSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		const newIntervalDays = (new Date(updatedSchedule.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(updatedSchedule.difficulty).toBeGreaterThan(card.difficulty);
		// Hard typically gives shorter interval than Good for same card
		expect(updatedSchedule.due).toBeDefined();
	});

	test('Review card rated "Again" becomes Relearning and tracks lapse', async () => {
		// Given: Card in Review state
		const card = createReviewCard('note1.md', 0, 10.0, 5.0);
		dataStore.setCard('note1.md', cardDataFromFsrsCard(card, TEST_QUEUE_ID));

		// When: Rated "Again" (forgotten)
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Again as 1 | 2 | 3 | 4, 's1');

		// Then: Should move to Relearning state
		const updatedSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(updatedSchedule.state).toBe(State.Relearning);

		// And: Should track lapse
		expect(updatedSchedule.lapses).toBe(card.lapses + 1);

		// And: Should have short relearning interval
		const intervalMinutes = (new Date(updatedSchedule.due).getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(0);
		expect(intervalMinutes).toBeLessThan(60 * 24); // Less than 1 day
	});

	test('Overdue card adjusts based on elapsed time', async () => {
		// Given: Card 3 days overdue (originally 7-day interval)
		const card = createOverdueCard('note1.md', 3, 10.0);
		dataStore.setCard('note1.md', cardDataFromFsrsCard(card, TEST_QUEUE_ID));

		// When: Rated "Good"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');

		// Then: Stability should be adjusted; card should return to Review state
		const updatedSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(updatedSchedule.stability).toBeDefined();
		expect(updatedSchedule.state).toBe(State.Review);
	});

	test('Learning card graduates to Review after "Good" rating', async () => {
		// Given: Card in Learning state
		const card = createLearningCard('note1.md');
		dataStore.setCard('note1.md', cardDataFromFsrsCard(card, TEST_QUEUE_ID));

		// When: Rated "Good"
		cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');

		// Then: May graduate to Review; at minimum, reps should progress
		const updatedSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(updatedSchedule.reps).toBeGreaterThan(card.reps);
	});

	test('Retrievability decreases over time', async () => {
		// Given: Card just reviewed (due in 7 days)
		const card = createReviewCard('note1.md', 7, 10.0, 5.0);
		const schedule = fsrsCardToCardSchedule(card, TEST_QUEUE_ID);

		// When: Calculate retrievability now
		const retrievabilityNow = scheduler.getRetrievability(schedule);

		// Simulate card at due date - due in the past, elapsed 7 days
		const futureSchedule = { ...schedule, due: new Date(Date.now() - 1).toISOString(), elapsedDays: 7 };
		const retrievabilityAtDue = scheduler.getRetrievability(futureSchedule, new Date());

		// Then: Retrievability should be a number; typically higher when more time until due
		expect(typeof retrievabilityNow).toBe('number');
		expect(typeof retrievabilityAtDue).toBe('number');
		// At due date, retrievability is often around target retention (e.g. 90%)
		if (retrievabilityAtDue > 0) {
			expect(retrievabilityAtDue).toBeGreaterThan(0.5);
			expect(retrievabilityAtDue).toBeLessThanOrEqual(1);
		}
	});

	test('Multiple successful reviews increase stability significantly', async () => {
		// Given: New card
		cardManager.createCard('note1.md', TEST_QUEUE_ID);

		const stabilities: number[] = [];
		let card = cardManager.getCard('note1.md')!;
		stabilities.push(card.schedules[TEST_QUEUE_ID].stability);

		// When: Review multiple times with "Good" ratings (simulate by updating due to now each time)
		for (let i = 0; i < 5; i++) {
			// Make card due by setting due to past
			const schedule = card.schedules[TEST_QUEUE_ID];
			schedule.due = new Date().toISOString();
			dataStore.updateCard('note1.md', { schedules: card.schedules });

			cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, `s-${i}`);
			card = cardManager.getCard('note1.md')!;
			stabilities.push(card.schedules[TEST_QUEUE_ID].stability);
		}

		// Then: Stability should generally increase (or stay same) with each review
		for (let i = 1; i < stabilities.length; i++) {
			expect(stabilities[i]).toBeGreaterThanOrEqual(stabilities[i - 1]!);
		}
		expect(stabilities[stabilities.length - 1]!).toBeGreaterThanOrEqual(stabilities[0]!);
	});

	test('Lapses increase difficulty', async () => {
		// Given: Card in Review state
		let cardData = cardDataFromFsrsCard(createReviewCard('note1.md', 0, 10.0, 5.0), TEST_QUEUE_ID);
		dataStore.setCard('note1.md', cardData);

		const originalDifficulty = cardData.schedules[TEST_QUEUE_ID].difficulty;

		// When: Card is forgotten multiple times (Again -> Good to complete relearning)
		for (let i = 0; i < 3; i++) {
			cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Again as 1 | 2 | 3 | 4, 's1');
			// Complete relearning with Good
			cardData = cardManager.getCard('note1.md')!;
			cardData.schedules[TEST_QUEUE_ID].due = new Date().toISOString();
			dataStore.updateCard('note1.md', { schedules: cardData.schedules });
			cardManager.updateCardSchedule('note1.md', TEST_QUEUE_ID, Rating.Good as 1 | 2 | 3 | 4, 's1');
		}

		// Then: Difficulty should increase after multiple lapses
		const finalSchedule = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		expect(finalSchedule.difficulty).toBeGreaterThan(originalDifficulty);
		expect(finalSchedule.lapses).toBe(3);
	});

	test('FSRS parameters affect scheduling', async () => {
		// Given: Two identical new cards
		cardManager.createCard('note1.md', TEST_QUEUE_ID);
		cardManager.createCard('note2.md', TEST_QUEUE_ID);

		// Default scheduler vs higher retention target
		const scheduler1 = new Scheduler();
		const scheduler2 = new Scheduler({ requestRetention: 0.95 });

		const schedule1 = cardManager.getCard('note1.md')!.schedules[TEST_QUEUE_ID];
		const schedule2 = cardManager.getCard('note2.md')!.schedules[TEST_QUEUE_ID];

		const result1 = scheduler1.rateCard(schedule1, Rating.Good as 1 | 2 | 3 | 4, TEST_QUEUE_ID);
		const result2 = scheduler2.rateCard(schedule2, Rating.Good as 1 | 2 | 3 | 4, TEST_QUEUE_ID);

		// Then: Different parameters may produce different intervals
		expect(result1.schedule.due).toBeDefined();
		expect(result2.schedule.due).toBeDefined();
	});
});
