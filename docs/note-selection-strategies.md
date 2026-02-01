## Card Selection Strategies

### 1. **Due Date Order (Most Common)**
Select cards based on their `due` date:

```typescript
function getDueCards(cards: Card[]): Card[] {
  const now = new Date();
  return cards
    .filter(card => card.due <= now)
    .sort((a, b) => a.due.getTime() - b.due.getTime()); // Earliest first
}
```

### 2. **State-Based Priority**
Prioritize by card state:

```typescript
function getCardsByPriority(cards: Card[]): Card[] {
  const now = new Date();
  const dueCards = cards.filter(card => card.due <= now);
  
  // Priority order: Learning > Relearning > Review > New
  const statePriority = {
    [State.Learning]: 1,
    [State.Relearning]: 2,
    [State.Review]: 3,
    [State.New]: 4
  };
  
  return dueCards.sort((a, b) => {
    const priorityDiff = statePriority[a.state] - statePriority[b.state];
    if (priorityDiff !== 0) return priorityDiff;
    // Within same state, sort by due date
    return a.due.getTime() - b.due.getTime();
  });
}
```

### 3. **Retrievability-Based**
Select cards with lowest retrievability (most likely to be forgotten):

```typescript
function getCardsByRetrievability(cards: Card[], f: FSRS): Card[] {
  const now = new Date();
  const dueCards = cards.filter(card => card.due <= now);
  
  return dueCards
    .map(card => ({
      card,
      retrievability: f.get_retrievability(card, now) as number
    }))
    .sort((a, b) => a.retrievability - b.retrievability) // Lowest first
    .map(item => item.card);
}
```

### 4. **Load Balancing**
Distribute reviews evenly across days:

```typescript
function getDueCardsWithLimit(cards: Card[], dailyLimit: number): Card[] {
  const now = new Date();
  return cards
    .filter(card => card.due <= now)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, dailyLimit);
}
```

### 5. **Mixed Strategy (Anki-style)**
Combine new cards, learning cards, and review cards:

```typescript
interface DeckSettings {
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  newCardOrder: 'random' | 'due' | 'added';
}

function getNextCards(
  cards: Card[], 
  settings: DeckSettings
): Card[] {
  const now = new Date();
  
  // Separate by state
  const newCards = cards.filter(c => c.state === State.New && c.due <= now);
  const learningCards = cards.filter(c => 
    (c.state === State.Learning || c.state === State.Relearning) && 
    c.due <= now
  );
  const reviewCards = cards.filter(c => c.state === State.Review && c.due <= now);
  
  // Apply limits
  const selectedNew = newCards.slice(0, settings.newCardsPerDay);
  const selectedReviews = reviewCards
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, settings.maxReviewsPerDay);
  
  // Learning cards always have priority
  return [
    ...learningCards.sort((a, b) => a.due.getTime() - b.due.getTime()),
    ...selectedNew,
    ...selectedReviews
  ];
}
```

### 6. **Randomization (To Avoid Patterns)**

```typescript
function getRandomDueCards(cards: Card[], count: number): Card[] {
  const now = new Date();
  const dueCards = cards.filter(card => card.due <= now);
  
  // Shuffle and take N cards
  return dueCards
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
```

## Key Points

1. **FSRS only sets `card.due`** - Your app decides which due cards to show
2. **No "fuzzing" in selection** - Fuzzing in FSRS only affects scheduling intervals, not selection order
3. **Common pattern**: Learning/Relearning → Reviews → New cards
4. **Performance**: For large collections, use database queries with indexes on `due` and `state`

## Example: Complete Selection System

```typescript
class ReviewQueue {
  private f = fsrs();
  
  getNextCard(
    cards: Card[],
    options: {
      maxNew?: number;
      maxReviews?: number;
      prioritizeByState?: boolean;
    } = {}
  ): Card | null {
    const now = new Date();
    const dueCards = cards.filter(card => card.due <= now);
    
    if (dueCards.length === 0) return null;
    
    // Priority 1: Learning/Relearning (must be done)
    const inProgress = dueCards.filter(c => 
      c.state === State.Learning || c.state === State.Relearning
    );
    if (inProgress.length > 0) {
      return inProgress.sort((a, b) => 
        a.due.getTime() - b.due.getTime()
      )[0];
    }
    
    // Priority 2: Reviews
    const reviews = dueCards.filter(c => c.state === State.Review);
    if (reviews.length > 0) {
      return reviews.sort((a, b) => 
        a.due.getTime() - b.due.getTime()
      )[0];
    }
    
    // Priority 3: New cards
    const newCards = dueCards.filter(c => c.state === State.New);
    if (newCards.length > 0) {
      return newCards[0];
    }
    
    return null;
  }
}
```

The flexibility in card selection is a **feature**, not a limitation - it allows you to customize the learning experience for your specific application!
