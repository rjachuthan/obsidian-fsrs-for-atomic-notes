# State Fields

## Overview

A state field is an editor extension that manages custom editor state. This section demonstrates building a calculator extension that can add, subtract, and reset numbers.

**Prerequisites**: Basic understanding of [State management](#state-management)

**Reference**: [CodeMirror 6 State Fields](https://codemirror.net/docs/guide/#state-fields)

## State Effects

State effects describe state changes you want to make. Think of them as methods on a class.

For a calculator, define effects for each operation:

```typescript
const addEffect = StateEffect.define<number>();
const subtractEffect = StateEffect.define<number>();
const resetEffect = StateEffect.define();
```

The type between angle brackets `<>` defines the input type. The `resetEffect` doesn't need input, so the type is omitted.

## Defining State Fields

State fields don't actually _store_ state—they _manage_ it. They take the current state, apply state effects, and return the new state.

```typescript
export const calculatorField = StateField.define<number>({
  create(state: EditorState): number {
    return 0;
  },
  update(oldState: number, transaction: Transaction): number {
    let newState = oldState;

    for (let effect of transaction.effects) {
      if (effect.is(addEffect)) {
        newState += effect.value;
      } else if (effect.is(subtractEffect)) {
        newState -= effect.value;
      } else if (effect.is(resetEffect)) {
        newState = 0;
      }
    }

    return newState;
  },
});
```

- `create` returns the initial value (calculator starts at 0)
- `update` contains logic for applying effects
- `effect.is()` checks the effect type before applying

## Dispatching State Effects

To apply a state effect, dispatch it to the editor view as part of a transaction:

```typescript
view.dispatch({
  effects: [addEffect.of(num)],
});
```

**Helper Functions:**

You can define helper functions for a more familiar API:

```typescript
export function add(view: EditorView, num: number) {
  view.dispatch({
    effects: [addEffect.of(num)],
  });
}

export function subtract(view: EditorView, num: number) {
  view.dispatch({
    effects: [subtractEffect.of(num)],
  });
}

export function reset(view: EditorView) {
  view.dispatch({
    effects: [resetEffect.of(null)],
  });
}
```

**Providing Decorations:**

State fields can provide [Decorations](#decorations) to change how the document displays.
