# TS-FSRS: Comprehensive Documentation

**Repository:** https://github.com/open-spaced-repetition/ts-fsrs  
**Documentation:** https://open-spaced-repetition.github.io/ts-fsrs/  
**Algorithm:** FSRS v6 (Free Spaced Repetition Scheduler)

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Core Concepts](#core-concepts)
4. [Quick Start Guide](#quick-start-guide)
5. [API Reference](#api-reference)
6. [Advanced Usage](#advanced-usage)
7. [Parameter Optimization](#parameter-optimization)
8. [Type Definitions](#type-definitions)
9. [Examples](#examples)
10. [Migration Guide](#migration-guide)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)

---

## Introduction

**TS-FSRS** is a versatile TypeScript package that implements the Free Spaced Repetition Scheduler (FSRS) algorithm, designed to optimize flashcard review intervals based on cognitive science principles. Unlike traditional algorithms like SM-2, FSRS uses a sophisticated mathematical model of memory to predict when learners are likely to forget information and schedules reviews accordingly.

### Key Features

- ✅ **FSRS v6 Algorithm:** Implements the latest version with improved accuracy
- ✅ **Multi-Module Support:** ES Modules, CommonJS, and UMD
- ✅ **TypeScript Native:** Full type safety and IDE autocomplete
- ✅ **Flexible Configuration:** Customizable parameters and strategies
- ✅ **Advanced Features:** Rescheduling, rollback, fuzzing, and more
- ✅ **High Performance:** Optimized for production use
- ✅ **Cross-Platform:** Works in Node.js, browsers, Deno, and Bun

### What is FSRS?

FSRS (Free Spaced Repetition Scheduler) is an algorithm that models memory using three key variables:

- **Difficulty (D):** The inherent complexity of the material (1-10 scale)
- **Stability (S):** The time interval for retrievability to decay from 100% to 90%
- **Retrievability (R):** The instantaneous probability of successful recall

The algorithm continuously adapts to individual learning patterns, providing 20-30% fewer reviews for the same retention level compared to traditional algorithms.

---

## Installation

### Requirements

- **Node.js:** v18.0.0 or higher (v16.0.0 for ts-fsrs@3.x)
- **Package Manager:** npm, yarn, pnpm, or bun

### Basic Installation

```bash
# npm
npm install ts-fsrs

# yarn
yarn add ts-fsrs

# pnpm
pnpm install ts-fsrs

# bun
bun add ts-fsrs
```

### Installing from GitHub

```bash
# npm
npm install github:open-spaced-repetition/ts-fsrs

# pnpm
pnpm install github:open-spaced-repetition/ts-fsrs
```

### Module System Support

Starting from version 3.5.6, ts-fsrs supports all major module systems:

- **ES Modules (ESM):** Modern JavaScript standard
- **CommonJS (CJS):** Node.js traditional format
- **UMD:** Universal Module Definition for browsers

---

## Core Concepts

### Card States

Cards in FSRS progress through four states:

| State | Enum Value | Description |
|-------|-----------|-------------|
| **New** | `State.New (0)` | Card has never been reviewed |
| **Learning** | `State.Learning (1)` | Card is being learned for the first time |
| **Review** | `State.Review (2)` | Card is in the review phase |
| **Relearning** | `State.Relearning (3)` | Card was forgotten and is being relearned |

### Rating System

When reviewing a card, users provide one of four ratings:

| Rating | Enum Value | Description |
|--------|-----------|-------------|
| **Again** | `Rating.Again (1)` | Complete failure to recall |
| **Hard** | `Rating.Hard (2)` | Difficult to recall |
| **Good** | `Rating.Good (3)` | Recalled successfully with effort |
| **Easy** | `Rating.Easy (4)` | Recalled effortlessly |

**Note:** `Rating.Manual (0)` exists for internal use but should not be used in standard reviews.

### State Transition Diagram

```
New → [First Review] → Learning → [Graduated] → Review
                                       ↓
                                  [Lapse] ← Review
                                       ↓
                                  Relearning → [Graduated] → Review
```

You can find the detailed state transition diagram here:
- [Google Drive](https://drive.google.com/file/d/1FLKjpt4T3Iis02vjoA10q7vxKCWwClfR/view?usp=sharing)
- [GitHub](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/ts-fsrs-workflow.drawio)

---

## Quick Start Guide

### Basic Example

```typescript
import {
  createEmptyCard,
  formatDate,
  fsrs,
  generatorParameters,
  Rating,
  Grades
} from 'ts-fsrs';

// 1. Configure FSRS parameters
const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: false
});

// 2. Initialize FSRS
const f = fsrs(params);

// 3. Create a new card
const card = createEmptyCard(new Date('2022-2-1 10:00:00'));

// 4. Schedule the card
const now = new Date('2022-2-2 10:00:00');
const scheduling_cards = f.repeat(card, now);

// 5. Access results for each rating
for (const item of scheduling_cards) {
  const grade = item.log.rating;
  const { log, card } = item;
  
  console.group(`${Rating[grade]}`);
  console.table({
    [`card_${Rating[grade]}`]: {
      ...card,
      due: formatDate(card.due),
      last_review: formatDate(card.last_review as Date),
    },
  });
  console.table({
    [`log_${Rating[grade]}`]: {
      ...log,
      review: formatDate(log.review),
    },
  });
  console.groupEnd();
}
```

### Simplified Example

```typescript
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';

// Initialize with default parameters
const f = fsrs();

// Create and review a card
let card = createEmptyCard();
const now = new Date();

// Get all possible outcomes
const scheduling_cards = f.repeat(card, now);

// User rates the card as "Good"
const good = scheduling_cards[Rating.Good];
const updatedCard = good.card;
const reviewLog = good.log;

console.log(`Next review in ${updatedCard.scheduled_days} days`);
console.log(`Stability: ${updatedCard.stability.toFixed(2)} days`);
console.log(`Difficulty: ${updatedCard.difficulty.toFixed(2)}`);
```

### Using `next()` Method (v4.0.0+)

For more direct control, use the `next()` method to specify a single rating:

```typescript
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';

const f = fsrs();
const card = createEmptyCard();
const now = new Date();

// Directly specify the rating
const result = f.next(card, now, Rating.Good);
const updatedCard = result.card;
const reviewLog = result.log;
```

---

## API Reference

### Core Classes

#### `FSRS`

The main class for scheduling cards.

**Constructor:**

```typescript
new FSRS(params?: Partial<FSRSParameters>): FSRS
```

**Methods:**

##### `repeat(card, now, afterHandler?)`

Returns all possible scheduling outcomes for a card.

```typescript
repeat(
  card: Card | CardInput,
  now?: DateInput,
  afterHandler?: (recordLog: RecordLog) => RecordLog
): RecordLog
```

**Parameters:**
- `card`: The card to schedule
- `now`: Current date/time (default: `new Date()`)
- `afterHandler`: Optional callback to modify the result

**Returns:** `RecordLog` - Object containing outcomes for all ratings

**Example:**

```typescript
const f = fsrs();
const card = createEmptyCard();
const scheduling_cards = f.repeat(card, new Date());

// Access each rating outcome
const again = scheduling_cards[Rating.Again];
const hard = scheduling_cards[Rating.Hard];
const good = scheduling_cards[Rating.Good];
const easy = scheduling_cards[Rating.Easy];
```

##### `next(card, now, grade, afterHandler?)`

Schedules a card with a specific rating.

```typescript
next(
  card: Card | CardInput,
  now: DateInput,
  grade: Grade,
  afterHandler?: (recordLogItem: RecordLogItem) => RecordLogItem
): RecordLogItem
```

**Parameters:**
- `card`: The card to schedule
- `now`: Current date/time
- `grade`: The rating (Again, Hard, Good, or Easy)
- `afterHandler`: Optional callback to modify the result

**Returns:** `RecordLogItem` - Updated card and review log

**Example:**

```typescript
const f = fsrs();
const card = createEmptyCard();
const result = f.next(card, new Date(), Rating.Good);
console.log(result.card, result.log);
```

##### `rollback(card, log)`

Reverts a card to its state before the last review.

```typescript
rollback(
  card: Card | CardInput,
  log: ReviewLog | ReviewLogInput
): Card
```

**Parameters:**
- `card`: The current card state
- `log`: The review log to rollback from

**Returns:** `Card` - The previous card state

**Example:**

```typescript
const f = fsrs();
let card = createEmptyCard();

// Review the card
const result = f.next(card, new Date(), Rating.Good);
const reviewedCard = result.card;
const log = result.log;

// Undo the review
const previousCard = f.rollback(reviewedCard, log);
```

##### `forget(card, now, resetCount?)`

Resets a card to the "New" state.

```typescript
forget(
  card: Card | CardInput,
  now: DateInput,
  resetCount?: boolean
): RecordLogItem
```

**Parameters:**
- `card`: The card to reset
- `now`: Current date/time
- `resetCount`: Whether to reset reps and lapses (default: `false`)

**Returns:** `RecordLogItem` - Reset card and log

**Example:**

```typescript
const f = fsrs();
let card = createEmptyCard();

// ... after some reviews ...

// Reset the card
const result = f.forget(card, new Date(), true);
const resetCard = result.card;
```

##### `reschedule(card, reviews, options)`

Replays a sequence of reviews to recalculate card state.

```typescript
reschedule<T = RecordLogItem>(
  card: CardInput | Card,
  reviews: FSRSHistory[],
  options: RescheduleOptions<T>
): IReschedule<T>
```

**Parameters:**
- `card`: Initial card state
- `reviews`: Array of historical reviews
- `options`: Rescheduling configuration

**Returns:** `IReschedule<T>` - Result with replayed reviews

**Example:**

```typescript
const f = fsrs();
const card = createEmptyCard();

const reviews: FSRSHistory[] = [
  { rating: Rating.Good, review: new Date('2024-01-01') },
  { rating: Rating.Good, review: new Date('2024-01-05') },
  { rating: Rating.Again, review: new Date('2024-01-10') }
];

const options: RescheduleOptions = {
  now: new Date(),
  skipManual: true,
  update_memory_state: true,
  recordLogHandler: (item) => item,
  reviewsOrderBy: (a, b) => 
    new Date(a.review).getTime() - new Date(b.review).getTime()
};

const result = f.reschedule(card, reviews, options);
console.log(result.card); // Final card state
console.log(result.collections); // Array of review results
```

##### `get_retrievability(card, now, format?)`

Calculates the current probability of recall.

```typescript
get_retrievability(
  card: Card | CardInput,
  now: DateInput,
  format?: boolean
): number | string
```

**Parameters:**
- `card`: The card to evaluate
- `now`: Current date/time
- `format`: Whether to return as percentage string (default: `false`)

**Returns:** `number` (0-1) or `string` (e.g., "85.23%")

**Example:**

```typescript
const f = fsrs();
const card = createEmptyCard();

// After some reviews...
const retrievability = f.get_retrievability(card, new Date());
console.log(`Probability of recall: ${(retrievability * 100).toFixed(2)}%`);

// Or get formatted string
const formatted = f.get_retrievability(card, new Date(), true);
console.log(formatted); // "85.23%"
```

### Helper Functions

#### `createEmptyCard(now?, afterHandler?)`

Creates a new card with default values.

```typescript
createEmptyCard(
  now?: DateInput,
  afterHandler?: (card: Card) => Card
): Card
```

**Parameters:**
- `now`: Initial creation date (default: `new Date()`)
- `afterHandler`: Optional callback to modify the card

**Returns:** `Card`

**Example:**

```typescript
import { createEmptyCard } from 'ts-fsrs';

// Create with current time
const card1 = createEmptyCard();

// Create with specific date
const card2 = createEmptyCard(new Date('2022-01-01'));

// Create with custom modifications
const card3 = createEmptyCard(new Date(), (card) => {
  card.difficulty = 5;
  return card;
});
```

#### `generatorParameters(props?)`

Generates complete FSRS parameters with defaults.

```typescript
generatorParameters(
  props?: Partial<FSRSParameters>
): FSRSParameters
```

**Parameters:**
- `props`: Partial parameters to override defaults

**Returns:** `FSRSParameters`

**Example:**

```typescript
import { generatorParameters } from 'ts-fsrs';

// Use all defaults
const defaultParams = generatorParameters();

// Override specific parameters
const customParams = generatorParameters({
  request_retention: 0.95,
  maximum_interval: 365,
  enable_fuzz: false
});
```

#### `fsrs(params?)`

Factory function to create an FSRS instance.

```typescript
fsrs(params?: Partial<FSRSParameters>): FSRS
```

**Parameters:**
- `params`: Optional parameters

**Returns:** `FSRS`

**Example:**

```typescript
import { fsrs } from 'ts-fsrs';

// Default parameters
const f1 = fsrs();

// Custom parameters
const f2 = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500
});
```

#### `formatDate(date)`

Formats a date to ISO string.

```typescript
formatDate(date: Date): string
```

**Example:**

```typescript
import { formatDate } from 'ts-fsrs';

const date = new Date('2024-01-15T10:30:00');
console.log(formatDate(date)); // "2024-01-15T10:30:00.000Z"
```

#### `date_scheduler(now, delta, isDay?)`

Schedules a date in the future.

```typescript
date_scheduler(
  now: Date,
  delta: number,
  isDay?: boolean
): Date
```

**Parameters:**
- `now`: Starting date
- `delta`: Number to add
- `isDay`: Whether delta is in days (default: `true`)

**Returns:** `Date`

**Example:**

```typescript
import { date_scheduler } from 'ts-fsrs';

const now = new Date('2024-01-01');
const future = date_scheduler(now, 7); // 7 days later
const futureMinutes = date_scheduler(now, 30, false); // 30 minutes later
```

#### `forgetting_curve(elapsed_days, stability)`

Calculates retrievability using the forgetting curve formula.

```typescript
forgetting_curve(
  elapsed_days: number,
  stability: number
): number
```

**Formula:** R(t,S) = (1 + FACTOR × t / (9 × S))^DECAY

**Parameters:**
- `elapsed_days`: Days since last review
- `stability`: Stability value

**Returns:** `number` - Retrievability (0-1)

**Example:**

```typescript
import { forgetting_curve } from 'ts-fsrs';

const stability = 100; // 100 days
const elapsed = 50; // 50 days since review
const retrievability = forgetting_curve(elapsed, stability);
console.log(`Retrievability: ${(retrievability * 100).toFixed(2)}%`);
```

### Type Conversion Functions

#### `fixState(state)`

Converts state string to State enum.

```typescript
fixState(state: StateType | State): State
```

#### `fixRating(rating)`

Converts rating string to Rating enum.

```typescript
fixRating(rating: RatingType | Rating): Rating
```

#### `fixDate(date)`

Converts various date inputs to Date object.

```typescript
fixDate(date: DateInput): Date
```

---

## Advanced Usage

### Custom Strategies

#### Seed Strategy

Control randomization by providing a custom seed strategy:

```typescript
import { fsrs, GenSeedStrategyWithCardId } from 'ts-fsrs';

// Use card ID for seed generation
const f = fsrs({}, {
  seed: GenSeedStrategyWithCardId('card_id')
});

const card = createEmptyCard();
card.card_id = 12345; // Custom property
const result = f.repeat(card, new Date());
```

#### Learning Steps Strategy

Customize the learning steps progression:

```typescript
import { fsrs, BasicLearningStepsStrategy } from 'ts-fsrs';

// Default strategy uses: [1 minute, 10 minutes]
const customStrategy = (state: State, currentStep: number) => {
  // Custom logic here
  return nextStep;
};

const f = fsrs({
  learning_steps: [1, 5, 10] // Custom steps in minutes
});
```

### Working with Review History

#### Batch Processing Reviews

```typescript
import { fsrs, Rating } from 'ts-fsrs';

const f = fsrs();
let card = createEmptyCard();

const reviewHistory = [
  { date: new Date('2024-01-01'), rating: Rating.Good },
  { date: new Date('2024-01-05'), rating: Rating.Good },
  { date: new Date('2024-01-12'), rating: Rating.Hard },
  { date: new Date('2024-01-20'), rating: Rating.Good },
];

for (const review of reviewHistory) {
  const result = f.next(card, review.date, review.rating);
  card = result.card;
  console.log(`Review on ${formatDate(review.date)}: Next due ${formatDate(card.due)}`);
}
```

#### Reschedule with Custom Handler

```typescript
interface CustomLog {
  card: Card;
  log: ReviewLog;
  customField: string;
}

const options: RescheduleOptions<CustomLog> = {
  now: new Date(),
  skipManual: true,
  update_memory_state: true,
  recordLogHandler: (item) => ({
    ...item,
    customField: 'custom value'
  }),
  reviewsOrderBy: (a, b) => 
    new Date(a.review).getTime() - new Date(b.review).getTime()
};

const result = f.reschedule(card, reviews, options);
result.collections.forEach(item => {
  console.log(item.customField); // "custom value"
});
```

### Fuzzing Intervals

Fuzzing adds randomness to review intervals to avoid clustering:

```typescript
const params = generatorParameters({
  enable_fuzz: true // Enable fuzzing (default)
});

const f = fsrs(params);

// Fuzzing affects intervals >= 2.5 days
// The fuzz range increases with interval length
```

The fuzzing formula:

```
- Review in 3 days: Choose between days 2 and 4
- Review in 7 days: Choose between days 5 and 9
- Review in 90 days: Choose between days 86 and 94
```

### Short-term Scheduling

Enable same-day reviews for new cards:

```typescript
const params = generatorParameters({
  enable_short_term: true // Enable short-term scheduling
});

const f = fsrs(params);
```

When enabled:
- New cards can be scheduled multiple times on the same day
- Uses specialized short-term memory parameters
- Useful for intensive learning sessions

---

## Parameter Optimization

### Default Parameters

#### FSRS Parameters Interface

```typescript
interface FSRSParameters {
  request_retention: number;    // Target retention rate (0.7-0.97)
  maximum_interval: number;     // Maximum review interval in days
  w: number[];                 // Algorithm weights (17 for v4.5, 21 for v6)
  enable_fuzz: boolean;        // Random interval jitter
  enable_short_term: boolean;  // Same-day review logic
}
```

#### Default Values

```typescript
const defaults = {
  request_retention: 0.9,        // 90% retention target
  maximum_interval: 36500,       // ~100 years
  enable_fuzz: true,
  enable_short_term: false,
  w: [                          // FSRS v6 default weights
    0.81496, 1.66972, 4.50087, 13.22126,
    5.25632, 1.13335, 1.01021, 0.00005,
    1.61428, 0.13599, 1.04719, 2.15225,
    0.12458, 0.29955, 2.28965, 0.20157,
    2.99991, 0.50642, 1.01712, 0.34827,
    1.18399
  ]
};
```

### Custom Parameters

```typescript
import { generatorParameters, fsrs } from 'ts-fsrs';

const params = generatorParameters({
  request_retention: 0.95,      // Higher retention target
  maximum_interval: 365,        // Max 1 year between reviews
  enable_fuzz: false,           // Disable randomization
  w: [                          // Custom optimized weights
    0.4, 0.6, 2.4, 5.8, 4.93,
    0.94, 0.86, 0.01, 1.49, 0.14,
    0.94, 2.18, 0.05, 0.34, 1.26,
    0.29, 2.61, 0.48, 1.05, 0.36,
    -0.54
  ]
});

const f = fsrs(params);
```

### Parameter Optimization with @open-spaced-repetition/binding

For computationally intensive parameter optimization, use the high-performance optimizer:

#### Installation

```bash
npm install @open-spaced-repetition/binding
```

**Requirements:** Node.js >= 20.0.0

#### Basic Usage

```typescript
import { 
  computeParameters, 
  convertCsvToFsrsItems 
} from '@open-spaced-repetition/binding';

// Load your review history
const fsrsItems = await convertCsvToFsrsItems('path/to/reviews.csv');

// Optimize parameters
const optimizedParams = await computeParameters(fsrsItems, {
  enableShortTerm: true,
  timeout: 100,
  progress: (current, total) => {
    console.log(`Progress: ${current}/${total}`);
  }
});

console.log('Optimized weights:', optimizedParams.w);

// Use optimized parameters
const f = fsrs(optimizedParams);
```

#### CSV Format for Reviews

```csv
card_id,review_time,rating
1,2024-01-01T10:00:00Z,3
1,2024-01-05T10:00:00Z,3
1,2024-01-12T10:00:00Z,2
2,2024-01-01T11:00:00Z,4
```

### When to Optimize

- Perform at least **1,000 reviews** with default weights before optimizing
- Re-optimize every **3-6 months** or after significant learning pattern changes
- The more review data, the better the optimization

---

## Type Definitions

### Card Interface

```typescript
interface Card {
  due: Date;                  // Next review date
  stability: number;          // Memory stability in days
  difficulty: number;         // Material difficulty (1-10)
  elapsed_days: number;       // Days since last review
  scheduled_days: number;     // Current interval length
  reps: number;              // Total review count
  lapses: number;            // Number of failures
  state: State;              // Current state
  last_review?: Date;        // Previous review date
}
```

### ReviewLog Interface

```typescript
interface ReviewLog {
  rating: Rating;            // Review rating
  state: State;             // State during review
  due: Date;                // Last scheduled date
  stability: number;        // Pre-review stability
  difficulty: number;       // Pre-review difficulty
  elapsed_days: number;     // Days since last review
  last_elapsed_days: number; // Previous interval
  scheduled_days: number;   // New interval
  learning_steps: number;   // Current learning step
  review: Date;             // Review timestamp
}
```

### RecordLog Type

```typescript
type RecordLogItem = {
  card: Card;
  log: ReviewLog;
};

type RecordLog = {
  [Rating.Again]: RecordLogItem;
  [Rating.Hard]: RecordLogItem;
  [Rating.Good]: RecordLogItem;
  [Rating.Easy]: RecordLogItem;
};
```

### Input Types

```typescript
type DateInput = Date | number | string;

type StateType = 'New' | 'Learning' | 'Review' | 'Relearning';
type RatingType = 'Manual' | 'Again' | 'Hard' | 'Good' | 'Easy';
type Grade = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

interface CardInput {
  // Partial Card with flexible types
  state: StateType | State;
  due: DateInput;
  last_review?: DateInput | null;
  // ... other Card properties
}

interface ReviewLogInput {
  rating: RatingType | Rating;
  state: StateType | State;
  due: DateInput;
  review: DateInput;
  // ... other ReviewLog properties
}
```

### FSRSHistory Type

```typescript
type FSRSHistory = {
  rating: Rating;
  review: DateInput;
  state?: StateType | State;
  elapsed_days?: number;
};
```

### RescheduleOptions Type

```typescript
type RescheduleOptions<T = RecordLogItem> = {
  first_card?: CardInput;                                    // Initial card state
  now: DateInput;                                           // Current time
  recordLogHandler: (recordLog: RecordLogItem) => T;        // Result transformer
  reviewsOrderBy: (a: FSRSHistory, b: FSRSHistory) => number; // Sort comparator
  skipManual: boolean;                                      // Skip manual ratings
  update_memory_state: boolean;                             // Update stability/difficulty
};
```

---

## Examples

### Example 1: Simple Flashcard App

```typescript
import { createEmptyCard, fsrs, Rating, Card } from 'ts-fsrs';

class FlashcardManager {
  private f = fsrs();
  private cards: Map<string, Card> = new Map();

  createCard(id: string): Card {
    const card = createEmptyCard();
    this.cards.set(id, card);
    return card;
  }

  reviewCard(id: string, rating: Rating): Card {
    const card = this.cards.get(id);
    if (!card) throw new Error('Card not found');

    const result = this.f.next(card, new Date(), rating);
    this.cards.set(id, result.card);
    
    return result.card;
  }

  getDueCards(): [string, Card][] {
    const now = new Date();
    return Array.from(this.cards.entries())
      .filter(([_, card]) => card.due <= now)
      .sort(([_, a], [__, b]) => a.due.getTime() - b.due.getTime());
  }

  getNextReviewDate(id: string): Date | null {
    const card = this.cards.get(id);
    return card ? card.due : null;
  }
}

// Usage
const manager = new FlashcardManager();
const card = manager.createCard('card-1');

// User reviews with "Good" rating
const updated = manager.reviewCard('card-1', Rating.Good);
console.log(`Next review: ${updated.due}`);

// Get cards due for review
const dueCards = manager.getDueCards();
console.log(`${dueCards.length} cards due for review`);
```

### Example 2: Review Session with Preview

```typescript
import { fsrs, createEmptyCard, Rating, formatDate } from 'ts-fsrs';

const f = fsrs();
const card = createEmptyCard();

// Show user all possible outcomes
const outcomes = f.repeat(card, new Date());

console.log('Review Options:');
console.log('──────────────────────────────────────');

Object.entries(outcomes).forEach(([ratingKey, { card, log }]) => {
  const rating = Rating[ratingKey as keyof typeof Rating];
  console.log(`${rating}:`);
  console.log(`  Next review: ${formatDate(card.due)}`);
  console.log(`  Interval: ${card.scheduled_days} days`);
  console.log(`  Stability: ${card.stability.toFixed(2)}`);
  console.log(`  Difficulty: ${card.difficulty.toFixed(2)}`);
  console.log('');
});

// User selects "Good"
const selectedOutcome = outcomes[Rating.Good];
const updatedCard = selectedOutcome.card;
```

### Example 3: Import Existing Reviews

```typescript
import { fsrs, createEmptyCard, Rating, FSRSHistory, RescheduleOptions } from 'ts-fsrs';

interface ReviewRecord {
  timestamp: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
}

function importReviews(reviews: ReviewRecord[]) {
  const f = fsrs();
  const card = createEmptyCard(new Date(reviews[0].timestamp));

  // Convert to FSRSHistory format
  const fsrsReviews: FSRSHistory[] = reviews.map(r => ({
    rating: ratingFromString(r.rating),
    review: new Date(r.timestamp)
  }));

  // Reschedule with history
  const options: RescheduleOptions = {
    now: new Date(),
    skipManual: true,
    update_memory_state: true,
    recordLogHandler: (item) => item,
    reviewsOrderBy: (a, b) => 
      new Date(a.review).getTime() - new Date(b.review).getTime()
  };

  const result = f.reschedule(card, fsrsReviews, options);
  return result.card;
}

function ratingFromString(rating: string): Rating {
  const map: Record<string, Rating> = {
    'again': Rating.Again,
    'hard': Rating.Hard,
    'good': Rating.Good,
    'easy': Rating.Easy
  };
  return map[rating] || Rating.Good;
}

// Usage
const importedReviews = [
  { timestamp: '2024-01-01T10:00:00Z', rating: 'good' as const },
  { timestamp: '2024-01-05T10:00:00Z', rating: 'good' as const },
  { timestamp: '2024-01-12T10:00:00Z', rating: 'hard' as const }
];

const card = importReviews(importedReviews);
console.log('Imported card state:', card);
```

### Example 4: Undo Functionality

```typescript
import { fsrs, createEmptyCard, Rating, Card, ReviewLog } from 'ts-fsrs';

class UndoableFlashcard {
  private f = fsrs();
  private card: Card;
  private history: { card: Card; log: ReviewLog }[] = [];

  constructor() {
    this.card = createEmptyCard();
  }

  review(rating: Rating): void {
    const result = this.f.next(this.card, new Date(), rating);
    
    // Save current state before updating
    this.history.push({
      card: this.card,
      log: result.log
    });
    
    this.card = result.card;
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    
    const previous = this.history.pop()!;
    this.card = previous.card;
    
    return true;
  }

  getCard(): Card {
    return this.card;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }
}

// Usage
const flashcard = new UndoableFlashcard();

flashcard.review(Rating.Good);
console.log('After review:', flashcard.getCard());

flashcard.review(Rating.Hard);
console.log('After second review:', flashcard.getCard());

// Undo last review
if (flashcard.undo()) {
  console.log('After undo:', flashcard.getCard());
}
```

### Example 5: Statistics and Analytics

```typescript
import { fsrs, createEmptyCard, Rating, Card, forgetting_curve } from 'ts-fsrs';

class FlashcardAnalytics {
  private f = fsrs();

  calculateRetention(card: Card, atDate?: Date): number {
    const now = atDate || new Date();
    return this.f.get_retrievability(card, now) as number;
  }

  getCardDifficulty(card: Card): 'Easy' | 'Medium' | 'Hard' {
    if (card.difficulty < 4) return 'Easy';
    if (card.difficulty < 7) return 'Medium';
    return 'Hard';
  }

  predictNextInterval(card: Card, rating: Rating): number {
    const outcomes = this.f.repeat(card, new Date());
    return outcomes[rating].card.scheduled_days;
  }

  getStudyStats(cards: Card[]): {
    total: number;
    new: number;
    learning: number;
    review: number;
    avgStability: number;
    avgDifficulty: number;
  } {
    const stats = {
      total: cards.length,
      new: 0,
      learning: 0,
      review: 0,
      avgStability: 0,
      avgDifficulty: 0
    };

    cards.forEach(card => {
      switch (card.state) {
        case 0: stats.new++; break;
        case 1: stats.learning++; break;
        case 2: stats.review++; break;
      }
      stats.avgStability += card.stability;
      stats.avgDifficulty += card.difficulty;
    });

    if (cards.length > 0) {
      stats.avgStability /= cards.length;
      stats.avgDifficulty /= cards.length;
    }

    return stats;
  }
}

// Usage
const analytics = new FlashcardAnalytics();
const card = createEmptyCard();

// ... after some reviews ...

const retention = analytics.calculateRetention(card);
console.log(`Current retention: ${(retention * 100).toFixed(2)}%`);

const difficulty = analytics.getCardDifficulty(card);
console.log(`Card difficulty: ${difficulty}`);

const nextInterval = analytics.predictNextInterval(card, Rating.Good);
console.log(`If rated Good, next review in ${nextInterval} days`);
```

### Example 6: Browser Usage (CDN)

```html
<!DOCTYPE html>
<html>
<head>
  <title>TS-FSRS Browser Example</title>
  <script src="https://cdn.jsdelivr.net/npm/ts-fsrs@latest/dist/index.min.js"></script>
</head>
<body>
  <h1>Flashcard Review</h1>
  <div id="card-info"></div>
  <div id="buttons"></div>

  <script>
    const { fsrs, createEmptyCard, Rating, formatDate } = window.TSFSRS;
    
    const f = fsrs();
    let card = createEmptyCard();

    function showCard() {
      const outcomes = f.repeat(card, new Date());
      
      const infoDiv = document.getElementById('card-info');
      infoDiv.innerHTML = `
        <p>Current State: ${card.state}</p>
        <p>Reviews: ${card.reps}</p>
        <p>Stability: ${card.stability.toFixed(2)} days</p>
      `;

      const buttonsDiv = document.getElementById('buttons');
      buttonsDiv.innerHTML = '';
      
      [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].forEach(rating => {
        const outcome = outcomes[rating];
        const button = document.createElement('button');
        button.textContent = `${Rating[rating]} (${outcome.card.scheduled_days}d)`;
        button.onclick = () => {
          card = outcome.card;
          showCard();
        };
        buttonsDiv.appendChild(button);
      });
    }

    showCard();
  </script>
</body>
</html>
```

---

## Migration Guide

### From v3.x to v4.x

#### Breaking Changes

1. **Node.js Version Requirement**
   ```typescript
   // v3.x: Node.js >= 16.0.0
   // v4.x: Node.js >= 18.0.0
   ```

2. **New `next()` Method**
   ```typescript
   // v3.x: Only repeat() available
   const scheduling = f.repeat(card, now);
   const good = scheduling[Rating.Good];

   // v4.x: Direct rating with next()
   const result = f.next(card, now, Rating.Good);
   ```

3. **Enhanced Type Safety**
   ```typescript
   // v4.x has stricter type checking
   // Ensure DateInput, CardInput are properly typed
   ```

#### Recommended Updates

```typescript
// Before (v3.x)
const f = new FSRS(params);
const scheduling = f.repeat(card, now);
const updated = scheduling[Rating.Good].card;

// After (v4.x)
const f = fsrs(params); // Use factory function
const result = f.next(card, now, Rating.Good); // Direct method
const updated = result.card;
```

### From SM-2 to FSRS

If migrating from SuperMemo 2 (SM-2) algorithm:

```typescript
// SM-2 concept mapping to FSRS
// SM-2 EF (Ease Factor) → FSRS Difficulty
// SM-2 Interval → FSRS Scheduled Days
// SM-2 Repetitions → FSRS Reps

// Example migration helper
function migrateSM2Card(sm2Card: {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: Date;
}): Card {
  const card = createEmptyCard(sm2Card.dueDate);
  
  // Map SM-2 data to FSRS
  card.scheduled_days = sm2Card.interval;
  card.reps = sm2Card.repetitions;
  card.difficulty = Math.max(1, Math.min(10, (5 - sm2Card.easeFactor) * 3));
  card.state = sm2Card.repetitions > 0 ? 2 : 0; // Review or New
  
  return card;
}
```

---

## Best Practices

### 1. Parameter Configuration

**Do:**
```typescript
// Use default parameters initially
const f = fsrs();

// After 1000+ reviews, optimize parameters
const optimized = fsrs({
  request_retention: 0.9,
  w: [...optimizedWeights]
});
```

**Don't:**
```typescript
// Don't customize parameters without data
const f = fsrs({
  request_retention: 0.99,  // Too high
  maximum_interval: 7       // Too restrictive
});
```

### 2. Date Handling

**Do:**
```typescript
// Use consistent timezone handling
const now = new Date();
const result = f.next(card, now, Rating.Good);

// Store dates as ISO strings in database
const dueString = card.due.toISOString();
```

**Don't:**
```typescript
// Don't mix date formats
const result = f.next(card, "2024-01-01", Rating.Good); // Works but inconsistent
```

### 3. Card State Management

**Do:**
```typescript
// Always save both card and log
const result = f.next(card, now, rating);
database.save({
  card: result.card,
  log: result.log,
  timestamp: new Date()
});
```

**Don't:**
```typescript
// Don't lose review history
const result = f.next(card, now, rating);
database.save(result.card); // Log is lost!
```

### 4. Error Handling

**Do:**
```typescript
try {
  const result = f.next(card, now, rating);
  await saveCard(result.card);
} catch (error) {
  console.error('Failed to process review:', error);
  // Rollback or retry logic
}
```

**Don't:**
```typescript
// Don't ignore errors
f.next(card, now, rating); // No error handling
```

### 5. Performance Optimization

**Do:**
```typescript
// Batch operations when possible
const cards = getDueCards();
const results = cards.map(card => ({
  id: card.id,
  outcomes: f.repeat(card, now)
}));

// Cache FSRS instance
class CardManager {
  private static fsrsInstance = fsrs();
  
  reviewCard(card: Card, rating: Rating) {
    return CardManager.fsrsInstance.next(card, new Date(), rating);
  }
}
```

**Don't:**
```typescript
// Don't create new FSRS instance per review
function reviewCard(card: Card, rating: Rating) {
  const f = fsrs(); // Wasteful
  return f.next(card, new Date(), rating);
}
```

### 6. Testing Strategies

```typescript
describe('Flashcard Reviews', () => {
  it('should schedule card correctly', () => {
    const f = fsrs();
    const card = createEmptyCard(new Date('2024-01-01'));
    
    const result = f.next(card, new Date('2024-01-01'), Rating.Good);
    
    expect(result.card.state).toBe(State.Learning);
    expect(result.card.reps).toBe(1);
    expect(result.card.due).toBeInstanceOf(Date);
  });

  it('should handle rollback correctly', () => {
    const f = fsrs();
    let card = createEmptyCard();
    
    const result = f.next(card, new Date(), Rating.Good);
    const reviewedCard = result.card;
    
    const rolledBack = f.rollback(reviewedCard, result.log);
    
    expect(rolledBack.state).toBe(card.state);
    expect(rolledBack.reps).toBe(card.reps);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Cards Not Scheduling Correctly

**Problem:** Cards showing unexpected intervals

**Solutions:**
```typescript
// Check parameters
const params = f.parameters;
console.log('Request retention:', params.request_retention);
console.log('Maximum interval:', params.maximum_interval);

// Verify card state
console.log('Card state:', card.state);
console.log('Stability:', card.stability);
console.log('Difficulty:', card.difficulty);

// Check for data corruption
const isValid = 
  card.stability > 0 &&
  card.difficulty >= 1 && card.difficulty <= 10 &&
  [0, 1, 2, 3].includes(card.state);
  
if (!isValid) {
  console.error('Card data is corrupted');
}
```

#### 2. Type Errors

**Problem:** TypeScript compilation errors

**Solutions:**
```typescript
// Ensure correct types
import { Card, Rating, DateInput } from 'ts-fsrs';

// Use type assertions when necessary
const card: Card = createEmptyCard();
const rating: Rating = Rating.Good;
const now: DateInput = new Date();

// Or let TypeScript infer
const result = f.next(card, now, rating);
```

#### 3. Import Errors

**Problem:** Module not found or import errors

**Solutions:**
```typescript
// ESM (modern)
import { fsrs } from 'ts-fsrs';

// CommonJS (Node.js)
const { fsrs } = require('ts-fsrs');

// UMD (browser)
const { fsrs } = window.TSFSRS;

// Check package.json
{
  "type": "module" // For ESM
}
```

#### 4. Date/Timezone Issues

**Problem:** Inconsistent due dates across timezones

**Solutions:**
```typescript
// Always use UTC for storage
const card = createEmptyCard();
const dueUTC = card.due.toISOString(); // "2024-01-15T10:00:00.000Z"

// Convert to local for display
const dueLocal = new Date(dueUTC).toLocaleDateString();

// Consistent comparison
const now = new Date();
const isDue = card.due.getTime() <= now.getTime();
```

#### 5. Memory/Performance Issues

**Problem:** Slow performance with large card collections

**Solutions:**
```typescript
// Use indexed queries
const dueCards = cards
  .filter(c => c.due <= now)
  .slice(0, 100); // Limit results

// Cache FSRS instance
const fsrsInstance = fsrs();

// Lazy load card data
async function getDueCard(id: string): Promise<Card> {
  return await database.getCard(id);
}

// Optimize reschedule operations
const options: RescheduleOptions = {
  skipManual: true, // Skip manual ratings
  update_memory_state: true
  // ... other options
};
```

### Debug Mode

Enable detailed logging:

```typescript
import { fsrs, createEmptyCard, Rating } from 'ts-fsrs';

// Add custom logging
const f = fsrs();
const card = createEmptyCard();

console.log('Initial card:', JSON.stringify(card, null, 2));

const result = f.next(card, new Date(), Rating.Good);

console.log('Updated card:', JSON.stringify(result.card, null, 2));
console.log('Review log:', JSON.stringify(result.log, null, 2));

// Check retrievability
const retrievability = f.get_retrievability(result.card, new Date());
console.log('Retrievability:', retrievability);
```

---

## Contributing

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/open-spaced-repetition/ts-fsrs.git
   cd ts-fsrs
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run tests:**
   ```bash
   pnpm test
   ```

4. **Build:**
   ```bash
   pnpm build
   ```

### Dev Container

For a consistent development environment, use the provided Dev Container:

📖 [Development Quickstart Guide](.devcontainer/QUICKSTART.md)

### Project Structure

```
ts-fsrs/
├── src/
│   ├── fsrs/
│   │   ├── algorithm.ts      # Core FSRS algorithm
│   │   ├── fsrs.ts           # Main FSRS class
│   │   ├── models.ts         # Type definitions
│   │   ├── default.ts        # Default parameters
│   │   ├── help.ts           # Helper functions
│   │   └── ...
│   └── index.ts              # Public API exports
├── __tests__/                # Test files
├── packages/                 # Sub-packages
│   └── binding/              # Native optimizer binding
├── examples/                 # Usage examples
└── docs/                     # Documentation
```

### Testing Guidelines

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { fsrs, createEmptyCard, Rating } from '../src';

describe('FSRS Scheduling', () => {
  it('should create new card with correct defaults', () => {
    const card = createEmptyCard();
    
    expect(card.state).toBe(0); // State.New
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBe(0);
  });

  it('should update card after review', () => {
    const f = fsrs();
    const card = createEmptyCard();
    
    const result = f.next(card, new Date(), Rating.Good);
    
    expect(result.card.reps).toBe(1);
    expect(result.card.state).not.toBe(0);
    expect(result.log.rating).toBe(Rating.Good);
  });
});
```

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `pnpm test`
6. Commit with clear message: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

### Code Style

The project uses Biome for code formatting and linting:

```bash
# Format code
pnpm format

# Lint code
pnpm lint
```

---

## Additional Resources

### Documentation

- **Official Documentation:** https://open-spaced-repetition.github.io/ts-fsrs/
- **GitHub Repository:** https://github.com/open-spaced-repetition/ts-fsrs
- **NPM Package:** https://www.npmjs.com/package/ts-fsrs
- **Algorithm Wiki:** https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm

### Related Projects

- **FSRS Optimizer (Rust):** https://github.com/open-spaced-repetition/fsrs-rs
- **FSRS for Anki:** https://github.com/open-spaced-repetition/fsrs4anki
- **FSRS Helper Add-on:** https://github.com/open-spaced-repetition/fsrs4anki-helper
- **Awesome FSRS:** https://open-spaced-repetition.github.io/awesome-fsrs/

### Example Implementations

- **ts-fsrs-demo (Next.js + Hono.js):** https://github.com/ishiko732/ts-fsrs-demo
- **Spaced (Next.js + Drizzle + tRPC):** https://github.com/zsh-eng/spaced
- **Browser Example:** [example.html](https://open-spaced-repetition.github.io/ts-fsrs/example)

### Research Papers

- [Free Spaced Repetition Scheduler Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- [Spaced Repetition Algorithm: A Three-Day Journey from Novice to Expert](https://github.com/open-spaced-repetition/fsrs4anki/wiki)

### Community

- **GitHub Discussions:** https://github.com/open-spaced-repetition/ts-fsrs/discussions
- **Issues:** https://github.com/open-spaced-repetition/ts-fsrs/issues

---

## License

MIT License - see [LICENSE](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE) file for details

---

## Changelog

For version history and breaking changes, see:
- [GitHub Releases](https://github.com/open-spaced-repetition/ts-fsrs/releases)
- [Changelog](https://github.com/open-spaced-repetition/ts-fsrs/blob/main/.changeset/)

---

## FAQ

### Q: What's the difference between FSRS and SM-2?

**A:** FSRS uses a more sophisticated mathematical model with 17-21 trainable parameters optimized on real user data, while SM-2 uses fixed formulas with manually tuned parameters. FSRS typically reduces reviews by 20-30% while maintaining the same retention rate.

### Q: Can I use custom learning steps?

**A:** Yes, configure the `learning_steps` parameter in minutes:
```typescript
const params = generatorParameters({
  learning_steps: [1, 10, 30] // 1min, 10min, 30min
});
```

### Q: How do I handle cards in different decks?

**A:** Use separate FSRS instances with different parameters per deck, or use the same instance and track deck information separately in your card metadata.

### Q: Is FSRS suitable for non-flashcard applications?

**A:** Yes! FSRS can be used for any spaced repetition learning, including language apps, music practice, physical skills, etc. The core algorithm is agnostic to content type.

### Q: How often should I re-optimize parameters?

**A:** Every 3-6 months or after 1000+ new reviews. More frequent optimization provides diminishing returns.

### Q: Can I use FSRS offline?

**A:** Yes, ts-fsrs works completely offline. Only parameter optimization requires the optional `@open-spaced-repetition/binding` package.

---

**Last Updated:** January 2025  
**Package Version:** 4.7.1+  
**Maintainers:** Open Spaced Repetition Community

For questions, issues, or contributions, please visit the [GitHub repository](https://github.com/open-spaced-repetition/ts-fsrs).
