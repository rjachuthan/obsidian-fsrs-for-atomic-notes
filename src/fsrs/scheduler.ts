/**
 * Scheduler - FSRS algorithm wrapper
 * Provides scheduling logic using ts-fsrs library
 */

import {
	FSRS,
	createEmptyCard,
	Rating,
	State,
	type Card,
	type FSRSParameters,
	type RecordLogItem,
	type Grade,
} from "ts-fsrs";
import type { CardSchedule, RatingValue, SchedulingPreview, FSRSParams } from "../types";
import { DEFAULT_FSRS_PARAMS } from "../constants";
import { formatInterval, nowISO } from "../utils/date-utils";

/**
 * Scheduler wraps ts-fsrs for scheduling calculations
 */
export class Scheduler {
	private fsrs: FSRS;

	constructor(params?: Partial<FSRSParams>) {
		const fsrsParams = this.buildFSRSParams(params);
		this.fsrs = new FSRS(fsrsParams);
	}

	/**
	 * Build FSRS parameters from plugin params
	 */
	private buildFSRSParams(params?: Partial<FSRSParams>): Partial<FSRSParameters> {
		const mergedParams = {
			...DEFAULT_FSRS_PARAMS,
			...params,
		};

		return {
			request_retention: mergedParams.requestRetention,
			maximum_interval: mergedParams.maximumInterval,
			enable_fuzz: mergedParams.enableFuzz,
		};
	}

	/**
	 * Create a new card schedule for a fresh note
	 */
	createNewSchedule(queueId: string): CardSchedule {
		const card = createEmptyCard();
		return this.cardToSchedule(card, queueId);
	}

	/**
	 * Convert FSRS Card to our CardSchedule format
	 */
	private cardToSchedule(card: Card, queueId: string, existingAddedAt?: string): CardSchedule {
		return {
			due: card.due.toISOString(),
			stability: card.stability,
			difficulty: card.difficulty,
			elapsedDays: card.elapsed_days,
			scheduledDays: card.scheduled_days,
			reps: card.reps,
			lapses: card.lapses,
			state: card.state as 0 | 1 | 2 | 3,
			lastReview: card.last_review ? card.last_review.toISOString() : null,
			addedToQueueAt: existingAddedAt ?? nowISO(),
		};
	}

	/**
	 * Convert our CardSchedule to FSRS Card format
	 */
	private scheduleToCard(schedule: CardSchedule): Card {
		return {
			due: new Date(schedule.due),
			stability: schedule.stability,
			difficulty: schedule.difficulty,
			elapsed_days: schedule.elapsedDays,
			scheduled_days: schedule.scheduledDays,
			reps: schedule.reps,
			lapses: schedule.lapses,
			state: schedule.state as State,
			last_review: schedule.lastReview ? new Date(schedule.lastReview) : undefined,
		};
	}

	/**
	 * Get scheduling preview for all ratings
	 */
	getSchedulingPreview(schedule: CardSchedule): SchedulingPreview {
		const card = this.scheduleToCard(schedule);
		const now = new Date();
		const recordLog = this.fsrs.repeat(card, now);

		const preview: SchedulingPreview = {};
		const ratings: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

		for (const rating of ratings) {
			const result = recordLog[rating];
			const intervalDays = result.card.scheduled_days;

			preview[rating] = {
				due: result.card.due,
				interval: intervalDays,
				intervalText: formatInterval(intervalDays),
			};
		}

		return preview;
	}

	/**
	 * Apply a rating to a card schedule
	 */
	rateCard(
		schedule: CardSchedule,
		rating: RatingValue,
		queueId: string
	): { schedule: CardSchedule; log: RecordLogItem["log"] } {
		const card = this.scheduleToCard(schedule);
		const now = new Date();

		// Get the result for this specific rating
		const recordLog = this.fsrs.repeat(card, now);
		const result = recordLog[rating as Grade];

		return {
			schedule: this.cardToSchedule(result.card, queueId, schedule.addedToQueueAt),
			log: result.log,
		};
	}

	/**
	 * Rollback a rating using the review log
	 * Returns the previous card state
	 */
	rollback(
		schedule: CardSchedule,
		log: RecordLogItem["log"],
		queueId: string
	): CardSchedule {
		const card = this.scheduleToCard(schedule);
		const previousCard = this.fsrs.rollback(card, log);
		return this.cardToSchedule(previousCard, queueId, schedule.addedToQueueAt);
	}

	/**
	 * Get current retrievability (probability of recall)
	 */
	getRetrievability(schedule: CardSchedule, now?: Date): number {
		const card = this.scheduleToCard(schedule);
		const retrievability = this.fsrs.get_retrievability(card, now ?? new Date());
		return typeof retrievability === 'number' ? retrievability : 0;
	}

	/**
	 * Check if a card is due for review
	 */
	isDue(schedule: CardSchedule, now?: Date): boolean {
		const dueDate = new Date(schedule.due);
		const checkDate = now ?? new Date();
		return dueDate <= checkDate;
	}

	/**
	 * Check if a card is overdue
	 */
	isOverdue(schedule: CardSchedule, now?: Date): boolean {
		const dueDate = new Date(schedule.due);
		const checkDate = now ?? new Date();
		// Card is overdue if due date is before the start of today
		const startOfToday = new Date(checkDate);
		startOfToday.setHours(0, 0, 0, 0);
		return dueDate < startOfToday;
	}

	/**
	 * Get the state label for a card
	 */
	getStateLabel(state: 0 | 1 | 2 | 3): string {
		const labels = ["New", "Learning", "Review", "Relearning"];
		return labels[state] ?? "Unknown";
	}

	/**
	 * Update FSRS parameters (for settings changes)
	 */
	updateParams(params: Partial<FSRSParams>): void {
		const fsrsParams = this.buildFSRSParams(params);
		this.fsrs = new FSRS(fsrsParams);
	}
}
