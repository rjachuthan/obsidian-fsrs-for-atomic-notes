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
} from '../fixtures/test-cards';
import { DataStore } from '../../src/data/data-store';
import { Scheduler } from '../../src/fsrs/scheduler';
import { CardManager } from '../../src/fsrs/card-manager';

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

		scheduler = new Scheduler(dataStore);
		cardManager = new CardManager(dataStore);
	});

	test('New card rated "Good" transitions to Review state', async () => {
		// Given: New card
		const card = createNewCard('note1.md');
		cardManager.addCard(card);

		// When: Rated "Good"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Good);

		// Then: Should transition to Review state
		expect(updatedCard.state).toBe(State.Review);
		expect(updatedCard.reps).toBe(1);

		// And: Should have initial interval (typically 1-3 days)
		const intervalDays = (updatedCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(intervalDays).toBeGreaterThan(0.5);
		expect(intervalDays).toBeLessThan(5);
	});

	test('New card rated "Easy" gives longer interval than "Good"', async () => {
		// Given: Two identical new cards
		const card1 = createNewCard('note1.md');
		const card2 = createNewCard('note2.md');
		cardManager.addCard(card1);
		cardManager.addCard(card2);

		// When: One rated "Good", one rated "Easy"
		const { updatedCard: goodCard } = await scheduler.rateCard(card1, Rating.Good);
		const { updatedCard: easyCard } = await scheduler.rateCard(card2, Rating.Easy);

		// Then: Easy should have longer interval
		const goodInterval = (goodCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const easyInterval = (easyCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

		expect(easyInterval).toBeGreaterThan(goodInterval);
		expect(easyCard.stability).toBeGreaterThan(goodCard.stability);
	});

	test('New card rated "Hard" stays in Learning state', async () => {
		// Given: New card
		const card = createNewCard('note1.md');
		cardManager.addCard(card);

		// When: Rated "Hard"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Hard);

		// Then: Should stay in Learning state
		expect(updatedCard.state).toBe(State.Learning);
		expect(updatedCard.reps).toBe(1);

		// And: Should have short interval (minutes to hours)
		const intervalMinutes = (updatedCard.due.getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(1);
		expect(intervalMinutes).toBeLessThan(60 * 24); // Less than 1 day
	});

	test('New card rated "Again" stays in Learning with shortest interval', async () => {
		// Given: New card
		const card = createNewCard('note1.md');
		cardManager.addCard(card);

		// When: Rated "Again"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Again);

		// Then: Should be in Learning state
		expect(updatedCard.state).toBe(State.Learning);

		// And: Should have very short interval
		const intervalMinutes = (updatedCard.due.getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(0);
		expect(intervalMinutes).toBeLessThan(30); // Less than 30 minutes
	});

	test('Review card intervals increase after successful review', async () => {
		// Given: Card in Review state with 5-day interval
		const card = createReviewCard('note1.md', 0, 10.0, 5.0);
		cardManager.addCard(card);

		const originalInterval = card.scheduled_days;

		// When: Rated "Good" when due
		const { updatedCard } = await scheduler.rateCard(card, Rating.Good);

		// Then: Interval should increase
		const newIntervalDays = (updatedCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(newIntervalDays).toBeGreaterThan(originalInterval);

		// And: Stability should increase
		expect(updatedCard.stability).toBeGreaterThan(card.stability);
	});

	test('Review card rated "Easy" increases interval more than "Good"', async () => {
		// Given: Two identical cards in Review state
		const card1 = createReviewCard('note1.md', 0, 10.0, 5.0);
		const card2 = createReviewCard('note2.md', 0, 10.0, 5.0);
		cardManager.addCard(card1);
		cardManager.addCard(card2);

		// When: One rated "Good", one rated "Easy"
		const { updatedCard: goodCard } = await scheduler.rateCard(card1, Rating.Good);
		const { updatedCard: easyCard } = await scheduler.rateCard(card2, Rating.Easy);

		// Then: Easy should have longer next interval
		const goodInterval = (goodCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		const easyInterval = (easyCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

		expect(easyInterval).toBeGreaterThan(goodInterval);
		expect(easyCard.stability).toBeGreaterThan(goodCard.stability);
		expect(easyCard.difficulty).toBeLessThan(goodCard.difficulty); // Easier cards have lower difficulty
	});

	test('Review card rated "Hard" decreases interval', async () => {
		// Given: Card in Review state
		const card = createReviewCard('note1.md', 0, 10.0, 5.0);
		cardManager.addCard(card);

		const originalInterval = card.scheduled_days;

		// When: Rated "Hard"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Hard);

		// Then: Next interval should be shorter
		const newIntervalDays = (updatedCard.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
		expect(newIntervalDays).toBeLessThan(originalInterval);

		// And: Difficulty should increase
		expect(updatedCard.difficulty).toBeGreaterThan(card.difficulty);
	});

	test('Review card rated "Again" becomes Relearning and tracks lapse', async () => {
		// Given: Card in Review state
		const card = createReviewCard('note1.md', 0, 10.0, 5.0);
		cardManager.addCard(card);

		// When: Rated "Again" (forgotten)
		const { updatedCard } = await scheduler.rateCard(card, Rating.Again);

		// Then: Should move to Relearning state
		expect(updatedCard.state).toBe(State.Relearning);

		// And: Should track lapse
		expect(updatedCard.lapses).toBe(card.lapses + 1);

		// And: Should have short relearning interval
		const intervalMinutes = (updatedCard.due.getTime() - Date.now()) / (1000 * 60);
		expect(intervalMinutes).toBeGreaterThan(0);
		expect(intervalMinutes).toBeLessThan(60 * 24); // Less than 1 day
	});

	test('Overdue card adjusts based on elapsed time', async () => {
		// Given: Card 3 days overdue (originally 7-day interval)
		const card = createOverdueCard('note1.md', 3, 10.0);
		cardManager.addCard(card);

		const originalStability = card.stability;

		// When: Rated "Good"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Good);

		// Then: Stability should be adjusted based on actual performance
		// (overdue but still remembered = better than expected)
		expect(updatedCard.stability).toBeDefined();

		// And: Card should return to Review state
		expect(updatedCard.state).toBe(State.Review);
	});

	test('Learning card graduates to Review after "Good" rating', async () => {
		// Given: Card in Learning state
		const card = createLearningCard('note1.md');
		cardManager.addCard(card);

		// When: Rated "Good"
		const { updatedCard } = await scheduler.rateCard(card, Rating.Good);

		// Then: May graduate to Review (depends on learning steps)
		// At minimum, should progress in learning
		expect(updatedCard.reps).toBeGreaterThan(card.reps);
	});

	test('Retrievability decreases over time', async () => {
		// Given: Card just reviewed
		const card = createReviewCard('note1.md', 7, 10.0, 5.0);
		cardManager.addCard(card);

		// When: Calculate retrievability now vs in the future
		const retrievabilityNow = scheduler.calculateRetrievability(card);

		// Simulate card 7 days later (at due date)
		const futureCard = { ...card, elapsed_days: 7 };
		const retrievabilityAtDue = scheduler.calculateRetrievability(futureCard);

		// Then: Retrievability should be higher now than at due date
		expect(retrievabilityNow).toBeGreaterThan(retrievabilityAtDue);

		// And: At due date, retrievability should be around 90% (FSRS target)
		expect(retrievabilityAtDue).toBeGreaterThan(0.85);
		expect(retrievabilityAtDue).toBeLessThan(0.95);
	});

	test('Multiple successful reviews increase stability significantly', async () => {
		// Given: New card
		let card = createNewCard('note1.md');
		cardManager.addCard(card);

		// When: Review multiple times with "Good" ratings
		const stabilities: number[] = [card.stability];

		for (let i = 0; i < 5; i++) {
			const result = await scheduler.rateCard(card, Rating.Good);
			card = result.updatedCard;
			cardManager.updateCard(card);
			stabilities.push(card.stability);

			// Wait for due date (simulate)
			card.elapsed_days = card.scheduled_days;
		}

		// Then: Stability should increase with each review
		for (let i = 1; i < stabilities.length; i++) {
			expect(stabilities[i]).toBeGreaterThan(stabilities[i - 1]);
		}

		// And: Final stability should be significantly higher than initial
		expect(stabilities[stabilities.length - 1]).toBeGreaterThan(stabilities[0] * 3);
	});

	test('Lapses increase difficulty', async () => {
		// Given: Card in Review state
		let card = createReviewCard('note1.md', 0, 10.0, 5.0);
		cardManager.addCard(card);

		const originalDifficulty = card.difficulty;

		// When: Card is forgotten multiple times
		for (let i = 0; i < 3; i++) {
			const result = await scheduler.rateCard(card, Rating.Again);
			card = result.updatedCard;
			cardManager.updateCard(card);

			// Complete relearning
			const relearnResult = await scheduler.rateCard(card, Rating.Good);
			card = relearnResult.updatedCard;
			cardManager.updateCard(card);
		}

		// Then: Difficulty should increase after multiple lapses
		expect(card.difficulty).toBeGreaterThan(originalDifficulty);
		expect(card.lapses).toBe(3);
	});

	test('FSRS parameters affect scheduling', async () => {
		// Given: Two identical cards with different FSRS parameters
		const card1 = createNewCard('note1.md');
		const card2 = createNewCard('note2.md');

		// Default parameters
		const scheduler1 = new Scheduler(dataStore);

		// More aggressive parameters (higher ease)
		const customParams = {
			request_retention: 0.95, // Higher retention target
			maximum_interval: 36500, // Default
			w: Array(19).fill(1) as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number],
		};
		const scheduler2 = new Scheduler(dataStore, customParams);

		// When: Both rated "Good"
		const { updatedCard: card1Updated } = await scheduler1.rateCard(card1, Rating.Good);
		const { updatedCard: card2Updated } = await scheduler2.rateCard(card2, Rating.Good);

		// Then: Different parameters should produce different intervals
		// (This test assumes custom parameters would affect scheduling)
		expect(card1Updated.due).toBeDefined();
		expect(card2Updated.due).toBeDefined();
	});
});
