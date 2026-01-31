# Test Suite for FSRS Atomic Notes Plugin

## Overview

This test suite focuses on **behavioral and integration testing** to lock in critical user workflows and prevent regressions. Rather than aiming for high code coverage, these tests verify that the core functionality users depend on works correctly.

## Testing Philosophy

### What We Test

1. **User-Facing Behaviors**: Complete workflows from the user's perspective
2. **FSRS Algorithm Correctness**: Scheduling must be mathematically accurate
3. **Data Persistence**: Data must survive plugin lifecycle
4. **State Management**: Session state must be reliable
5. **Queue Synchronization**: Notes must stay in sync with vault

### What We Don't Test

- UI rendering details (hard to test without actual Obsidian)
- Visual layout and styling
- Every edge case (focus on important behaviors)
- Internal implementation details that may change

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npm test -- tests/integration/review-workflow.test.ts
```

### Watch mode (auto-rerun on changes)
```bash
npm test
```

## Test Structure

```
tests/
├── setup/
│   └── obsidian-mock.ts          # Mock Obsidian API for testing
├── fixtures/
│   ├── sample-vault.ts            # Test vault data factories
│   └── test-cards.ts              # Test card data factories
├── integration/                   # Integration tests
│   ├── review-workflow.test.ts    # Complete review session flows
│   ├── data-persistence.test.ts   # Data saving/loading
│   └── queue-sync.test.ts         # Queue synchronization
├── behavioral/                    # Behavioral tests
│   ├── fsrs-scheduling.test.ts    # FSRS algorithm accuracy
│   ├── note-selection.test.ts     # Folder/tag criteria
│   └── session-state.test.ts      # Session management
└── critical/                      # Critical tests
    └── data-integrity.test.ts     # Data corruption prevention
```

## Test Categories

### Integration Tests (`integration/`)

Test multiple components working together in realistic scenarios:

- **review-workflow.test.ts**: Complete review session from start to finish
  - Starting sessions
  - Rating notes
  - Undo functionality
  - Data persistence after sessions

- **data-persistence.test.ts**: Data surviving plugin lifecycle
  - Save and load cycles
  - Plugin reload scenarios
  - Settings persistence
  - Concurrent saves

- **queue-sync.test.ts**: Queue synchronization with vault
  - Notes added/moved/renamed/deleted
  - Settings changes triggering resync
  - Exclusion rules

### Behavioral Tests (`behavioral/`)

Test specific behaviors and logic:

- **fsrs-scheduling.test.ts**: FSRS algorithm correctness
  - Rating transitions (New → Learning, New → Review, etc.)
  - Interval progression
  - Retrievability calculations
  - Overdue card handling

- **session-state.test.ts**: Session state management
  - Current note tracking
  - Progress updates
  - Navigation detection
  - Statistics accuracy

- **note-selection.test.ts**: Note selection criteria
  - Folder criterion (with/without subfolders)
  - Tag criterion
  - Exclusion criteria (name, tag, property)

### Critical Tests (`critical/`)

Tests that must never fail:

- **data-integrity.test.ts**: Data corruption prevention
  - Invalid data rejection
  - Duplicate prevention
  - Schema validation
  - Atomic operations

## Writing Tests

### Good Test Example

```typescript
test('User can review 3 new notes and schedules persist', async () => {
  // Given: Queue with 3 new notes
  const queue = queueManager.createQueue('Test Queue');
  await queueManager.syncQueue(queue.id);

  // When: User starts session and rates: Good, Easy, Hard
  await sessionManager.startSession(queue.id);
  await sessionManager.rateCurrentNote(Rating.Good);
  await sessionManager.rateCurrentNote(Rating.Easy);
  await sessionManager.rateCurrentNote(Rating.Hard);

  // Then: All 3 cards have updated schedules
  const allCards = cardManager.getAllCards();
  expect(allCards).toHaveLength(3);
  expect(allCards.every(c => c.reps > 0)).toBe(true);

  // And: Data persists after plugin reload
  const newDataStore = new DataStore(app);
  await newDataStore.initialize();
  const newCardManager = new CardManager(newDataStore);
  expect(newCardManager.getAllCards()).toHaveLength(3);
});
```

### Test Structure (Given-When-Then)

Use the Given-When-Then pattern for clarity:

```typescript
test('description of behavior', async () => {
  // Given: Setup preconditions
  const queue = queueManager.createQueue('Test Queue');

  // When: Perform action
  await sessionManager.startSession(queue.id);

  // Then: Verify outcome
  expect(sessionManager.getCurrentSession()).toBeDefined();
});
```

### Use Fixtures

Reuse test data from fixtures:

```typescript
import { createMinimalVault, createFolderVault } from '../fixtures/sample-vault';
import { createNewCard, createReviewCard } from '../fixtures/test-cards';

// In test:
const { vault, metadataCache } = createMinimalVault();
const card = createNewCard('note1.md');
```

### Focus on Behaviors, Not Implementation

❌ **Bad**: Testing implementation details
```typescript
test('CardManager stores cards in a Map', () => {
  expect(cardManager._cards instanceof Map).toBe(true);
});
```

✅ **Good**: Testing behavior
```typescript
test('Cards can be retrieved after being added', () => {
  cardManager.addCard(card);
  const retrieved = cardManager.getCard('note1.md');
  expect(retrieved).toBeDefined();
});
```

## Mock Obsidian API

The test suite uses a lightweight mock of the Obsidian API (`tests/setup/obsidian-mock.ts`). This provides:

- **Vault**: In-memory file storage
- **MetadataCache**: Note metadata (tags, frontmatter)
- **App**: Main application interface
- **Plugin**: Plugin base class

The mock is automatically loaded for all tests via `vitest.config.ts`.

## Continuous Integration

Tests run automatically on:
- Push to `main`/`master` branch
- Pull requests to `main`/`master` branch

See `.github/workflows/test.yml` for CI configuration.

## Test Performance

Tests should run fast:
- ✅ All tests complete in < 5 seconds
- ❌ Avoid long timeouts or sleeps
- ❌ Avoid testing with large datasets unless necessary

## Debugging Tests

### Run single test
```bash
npm test -- -t "User can complete a review session"
```

### Debug with console logs
```typescript
test('something', () => {
  console.log('Debug info:', someValue);
  expect(someValue).toBe(expected);
});
```

### Use test.only for focused testing
```typescript
test.only('focus on this test', () => {
  // Only this test will run
});
```

### Use test.skip to temporarily disable
```typescript
test.skip('skip this test', () => {
  // This test will be skipped
});
```

## Coverage

We don't aim for 100% code coverage. Instead, we focus on:

- ✅ All critical user workflows covered
- ✅ All state transitions tested
- ✅ All data integrity scenarios verified
- ✅ Known regressions prevented

## Adding New Tests

When adding features:

1. **Identify critical behavior**: What must never break?
2. **Write integration test**: Test the full user workflow
3. **Add behavioral tests**: Test specific logic
4. **Verify test fails**: Break the code, ensure test catches it
5. **Implement feature**: Make test pass
6. **Verify test passes**: Run test suite

## Common Issues

### Test timeout
If tests timeout, increase timeout in `vitest.config.ts`:
```typescript
testTimeout: 10000, // 10 seconds
```

### Mock not working
Ensure you're importing from the mock:
```typescript
import { App, TFile } from '../setup/obsidian-mock';
```

### Test flakiness
Avoid time-based assertions. Use fixed dates:
```typescript
// Bad: Uses current time
expect(card.due.getTime()).toBeGreaterThan(Date.now());

// Good: Uses fixed date
const fixedDate = new Date('2025-06-15T10:00:00Z');
expect(card.due.getTime()).toBeGreaterThan(fixedDate.getTime());
```

## Contributing

When contributing tests:

1. Follow the Given-When-Then pattern
2. Use descriptive test names
3. Test behaviors, not implementation
4. Keep tests focused (one behavior per test)
5. Use fixtures for test data
6. Ensure tests run fast (< 1s per test)

## Questions?

For questions about the test suite, see:
- `docs/PRD.md` for product requirements
- `docs/Phases/` for development phases
- `.claude/CLAUDE.md` for development guidelines
