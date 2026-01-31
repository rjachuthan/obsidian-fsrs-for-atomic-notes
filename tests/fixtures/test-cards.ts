/**
 * Test fixtures for creating sample FSRS cards
 *
 * Provides factory functions to create cards in various states
 * (new, learning, review, relearning) with different schedules.
 */

import { Card, createEmptyCard, State, Rating } from 'ts-fsrs';

/**
 * Create a new card (never reviewed)
 */
export function createNewCard(notePath: string): Card & { notePath: string } {
	const card = createEmptyCard();
	return {
		...card,
		notePath,
	};
}

/**
 * Create a card in Learning state
 */
export function createLearningCard(notePath: string, step: number = 0): Card & { notePath: string } {
	const card = createEmptyCard();
	const now = new Date();

	return {
		...card,
		notePath,
		state: State.Learning,
		due: new Date(now.getTime() + 10 * 60 * 1000), // Due in 10 minutes
		stability: 0.4,
		difficulty: 5.0,
		elapsed_days: 0,
		scheduled_days: 0,
		reps: 1,
		lapses: 0,
		last_review: now,
	};
}

/**
 * Create a card in Review state with a specific interval
 */
export function createReviewCard(
	notePath: string,
	daysFromNow: number,
	stability: number = 10.0,
	difficulty: number = 5.0
): Card & { notePath: string } {
	const card = createEmptyCard();
	const now = new Date();
	const dueDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

	return {
		...card,
		notePath,
		state: State.Review,
		due: dueDate,
		stability,
		difficulty,
		elapsed_days: 0,
		scheduled_days: Math.abs(daysFromNow),
		reps: 3,
		lapses: 0,
		last_review: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last review 7 days ago
	};
}

/**
 * Create an overdue card
 */
export function createOverdueCard(
	notePath: string,
	daysOverdue: number,
	stability: number = 10.0
): Card & { notePath: string } {
	return createReviewCard(notePath, -daysOverdue, stability);
}

/**
 * Create a card due today
 */
export function createDueTodayCard(notePath: string): Card & { notePath: string } {
	return createReviewCard(notePath, 0);
}

/**
 * Create a card in Relearning state (after a lapse)
 */
export function createRelearningCard(notePath: string, lapses: number = 1): Card & { notePath: string } {
	const card = createEmptyCard();
	const now = new Date();

	return {
		...card,
		notePath,
		state: State.Relearning,
		due: new Date(now.getTime() + 10 * 60 * 1000), // Due in 10 minutes
		stability: 2.0,
		difficulty: 7.0,
		elapsed_days: 5,
		scheduled_days: 5,
		reps: 5,
		lapses,
		last_review: now,
	};
}

/**
 * Create a card with high stability (well-learned)
 */
export function createMatureCard(notePath: string, daysFromNow: number = 30): Card & { notePath: string } {
	const card = createEmptyCard();
	const now = new Date();
	const dueDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

	return {
		...card,
		notePath,
		state: State.Review,
		due: dueDate,
		stability: 100.0, // High stability
		difficulty: 3.0, // Low difficulty (easy card)
		elapsed_days: 0,
		scheduled_days: daysFromNow,
		reps: 10,
		lapses: 0,
		last_review: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
	};
}

/**
 * Create a card with high difficulty (hard to remember)
 */
export function createDifficultCard(notePath: string, daysFromNow: number = 2): Card & { notePath: string } {
	const card = createEmptyCard();
	const now = new Date();
	const dueDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

	return {
		...card,
		notePath,
		state: State.Review,
		due: dueDate,
		stability: 3.0, // Low stability
		difficulty: 9.0, // High difficulty
		elapsed_days: 0,
		scheduled_days: daysFromNow,
		reps: 8,
		lapses: 3,
		last_review: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
	};
}

/**
 * Create a set of cards with various due dates for queue testing
 */
export function createMixedScheduleCards(): (Card & { notePath: string })[] {
	return [
		createOverdueCard('Notes/overdue1.md', 3), // 3 days overdue
		createOverdueCard('Notes/overdue2.md', 1), // 1 day overdue
		createDueTodayCard('Notes/due-today.md'),
		createReviewCard('Notes/due-tomorrow.md', 1),
		createNewCard('Notes/new.md'),
	];
}

/**
 * Create a set of new cards for testing initial reviews
 */
export function createNewCards(count: number, pathPrefix: string = 'Notes'): (Card & { notePath: string })[] {
	return Array.from({ length: count }, (_, i) =>
		createNewCard(`${pathPrefix}/note${i + 1}.md`)
	);
}

/**
 * Create a set of cards in various states for comprehensive testing
 */
export function createComprehensiveCardSet(): (Card & { notePath: string })[] {
	return [
		createNewCard('Notes/new1.md'),
		createNewCard('Notes/new2.md'),
		createLearningCard('Notes/learning1.md'),
		createLearningCard('Notes/learning2.md', 1),
		createReviewCard('Notes/review-due.md', 0),
		createOverdueCard('Notes/overdue.md', 2),
		createRelearningCard('Notes/relearning.md'),
		createMatureCard('Notes/mature.md', 60),
		createDifficultCard('Notes/difficult.md', 1),
	];
}

/**
 * Helper to create a card snapshot for comparison in tests
 */
export function createCardSnapshot(card: Card & { notePath: string }): Record<string, unknown> {
	return {
		notePath: card.notePath,
		state: card.state,
		due: card.due.toISOString(),
		stability: card.stability,
		difficulty: card.difficulty,
		elapsed_days: card.elapsed_days,
		scheduled_days: card.scheduled_days,
		reps: card.reps,
		lapses: card.lapses,
	};
}

/**
 * Helper to check if two cards are equivalent (for undo testing)
 */
export function cardsEqual(
	card1: Card & { notePath: string },
	card2: Card & { notePath: string }
): boolean {
	return (
		card1.notePath === card2.notePath &&
		card1.state === card2.state &&
		Math.abs(card1.due.getTime() - card2.due.getTime()) < 1000 && // Within 1 second
		Math.abs(card1.stability - card2.stability) < 0.01 &&
		Math.abs(card1.difficulty - card2.difficulty) < 0.01 &&
		card1.reps === card2.reps &&
		card1.lapses === card2.lapses
	);
}
