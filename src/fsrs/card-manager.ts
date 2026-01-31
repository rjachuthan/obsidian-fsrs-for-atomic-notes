/**
 * CardManager - Card CRUD operations
 * Manages cards in the data store with proper scheduling
 */

import type { CardData, CardSchedule, RatingValue, ReviewLog } from "../types";
import type { DataStore } from "../data/data-store";
import type { Scheduler } from "./scheduler";
import { generateId, generateReviewLogId } from "../utils/id-generator";
import { nowISO, isDue, isOverdue, parseISODate } from "../utils/date-utils";

/**
 * CardManager handles card CRUD operations
 */
export class CardManager {
	private dataStore: DataStore;
	private scheduler: Scheduler;

	constructor(dataStore: DataStore, scheduler: Scheduler) {
		this.dataStore = dataStore;
		this.scheduler = scheduler;
	}

	/**
	 * Create a new card for a note
	 */
	createCard(notePath: string, queueId: string): CardData {
		// Check if card already exists
		const existing = this.dataStore.getCard(notePath);
		if (existing) {
			// Card exists, just add schedule for this queue if needed
			if (!existing.schedules[queueId]) {
				existing.schedules[queueId] = this.scheduler.createNewSchedule(queueId);
				this.dataStore.updateCard(notePath, { schedules: existing.schedules });
			}
			return existing;
		}

		// Create new card
		const now = nowISO();
		const card: CardData = {
			notePath,
			noteId: generateId(),
			schedules: {
				[queueId]: this.scheduler.createNewSchedule(queueId),
			},
			createdAt: now,
			lastModified: now,
		};

		this.dataStore.setCard(notePath, card);
		return card;
	}

	/**
	 * Get a card by note path
	 */
	getCard(notePath: string): CardData | undefined {
		return this.dataStore.getCard(notePath);
	}

	/**
	 * Check if a card exists for a note
	 */
	hasCard(notePath: string): boolean {
		return this.dataStore.getCard(notePath) !== undefined;
	}

	/**
	 * Update a card's schedule after rating
	 */
	updateCardSchedule(
		notePath: string,
		queueId: string,
		rating: RatingValue,
		sessionId: string
	): ReviewLog {
		const card = this.dataStore.getCard(notePath);
		if (!card) {
			throw new Error(`Card not found for path: ${notePath}`);
		}

		const schedule = card.schedules[queueId];
		if (!schedule) {
			throw new Error(`Schedule not found for queue: ${queueId}`);
		}

		// Rate the card
		const result = this.scheduler.rateCard(schedule, rating, queueId);

		// Create review log
		const reviewLog: ReviewLog = {
			id: generateReviewLogId(),
			cardPath: notePath,
			queueId,
			rating,
			state: schedule.state,
			due: schedule.due,
			stability: schedule.stability,
			difficulty: schedule.difficulty,
			elapsedDays: schedule.elapsedDays,
			lastElapsedDays: result.log.last_elapsed_days,
			scheduledDays: result.log.scheduled_days,
			review: nowISO(),
			sessionId,
			undone: false,
		};

		// Update card with new schedule
		card.schedules[queueId] = result.schedule;
		card.lastModified = nowISO();
		this.dataStore.updateCard(notePath, card);

		// Add review log
		this.dataStore.addReview(reviewLog);

		return reviewLog;
	}

	/**
	 * Delete a card
	 */
	deleteCard(notePath: string): void {
		this.dataStore.deleteCard(notePath);
	}

	/**
	 * Remove a card's schedule from a specific queue
	 */
	removeFromQueue(notePath: string, queueId: string): void {
		const card = this.dataStore.getCard(notePath);
		if (!card) {
			return;
		}

		delete card.schedules[queueId];

		// If no schedules left, delete the entire card
		if (Object.keys(card.schedules).length === 0) {
			this.dataStore.deleteCard(notePath);
		} else {
			this.dataStore.updateCard(notePath, { schedules: card.schedules });
		}
	}

	/**
	 * Get all cards for a specific queue
	 */
	getCardsForQueue(queueId: string): CardData[] {
		const allCards = this.dataStore.getCards();
		return Object.values(allCards).filter((card) => card.schedules[queueId] !== undefined);
	}

	/**
	 * Get all due cards for a queue
	 */
	getDueCards(queueId: string, _now?: Date): CardData[] {
		const cards = this.getCardsForQueue(queueId);

		return cards.filter((card) => {
			const schedule = card.schedules[queueId];
			return schedule && isDue(parseISODate(schedule.due));
		});
	}

	/**
	 * Get all overdue cards for a queue
	 */
	getOverdueCards(queueId: string, _now?: Date): CardData[] {
		const cards = this.getCardsForQueue(queueId);

		return cards.filter((card) => {
			const schedule = card.schedules[queueId];
			return schedule && isOverdue(parseISODate(schedule.due));
		});
	}

	/**
	 * Get all new cards for a queue (never reviewed)
	 */
	getNewCards(queueId: string): CardData[] {
		const cards = this.getCardsForQueue(queueId);

		return cards.filter((card) => {
			const schedule = card.schedules[queueId];
			return schedule && schedule.state === 0; // New state
		});
	}

	/**
	 * Get card count for a queue
	 */
	getCardCount(queueId: string): number {
		return this.getCardsForQueue(queueId).length;
	}

	/**
	 * Rename a card (when note is renamed)
	 */
	renameCard(oldPath: string, newPath: string): void {
		this.dataStore.renameCard(oldPath, newPath);
	}

	/**
	 * Get retrievability for a card in a specific queue
	 */
	getRetrievability(notePath: string, queueId: string): number | null {
		const card = this.dataStore.getCard(notePath);
		if (!card) {
			return null;
		}

		const schedule = card.schedules[queueId];
		if (!schedule) {
			return null;
		}

		return this.scheduler.getRetrievability(schedule);
	}

	/**
	 * Get scheduling preview for a card
	 */
	getSchedulingPreview(notePath: string, queueId: string) {
		const card = this.dataStore.getCard(notePath);
		if (!card) {
			return null;
		}

		const schedule = card.schedules[queueId];
		if (!schedule) {
			return null;
		}

		return this.scheduler.getSchedulingPreview(schedule);
	}

	/**
	 * Ensure a card has a schedule for a queue
	 */
	ensureSchedule(notePath: string, queueId: string): CardSchedule {
		const card = this.dataStore.getCard(notePath);
		if (!card) {
			throw new Error(`Card not found for path: ${notePath}`);
		}

		if (!card.schedules[queueId]) {
			card.schedules[queueId] = this.scheduler.createNewSchedule(queueId);
			this.dataStore.updateCard(notePath, { schedules: card.schedules });
		}

		return card.schedules[queueId];
	}

	/**
	 * Get schedule for a card in a queue
	 */
	getSchedule(notePath: string, queueId: string): CardSchedule | undefined {
		const card = this.dataStore.getCard(notePath);
		return card?.schedules[queueId];
	}
}
