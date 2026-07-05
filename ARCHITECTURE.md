# Architecture

SimpleKanban is a dependency-free vanilla-JS app organized as a **functional
core inside an imperative shell** (hexagonal / ports-and-adapters). Since
refactoring sprint 5 the codebase contains **no classes and no mutable
shared state**: state lives in immutable stores driven by pure reducers,
and every effect flows through an explicit port.

## The rings

```
js/
  fp/         hand-written FP stdlib (pure, zero dependencies)
  domain/     the functional core — 100% pure, enforced by ESLint
  core/       tiny runtimes: createStore, Observable, debounce, timers
  effects/    the Free-monad effect language + browser interpreter
  ports/      browser adapters returning IO values; env.js composes them
  app/        imperative shell: factories wiring core to DOM
  views/      pure render functions (data, ctx) → DOM via el()
  services/   i18n runtime (pure translate + factory) and locale data
  index.js    composition root — the only place that news up the world
```

**js/fp/** — Maybe and Result ADTs, IO (lazy sync effects), Task
(continuation-based async), a stack-safe Free monad interpreted via
trampoline, ResultT-over-IO helpers, van Laarhoven lenses (law-tested),
structural pattern matching with runtime exhaustiveness, `memoizeLast`,
`deepFreeze` (dev only), pure array helpers, `pipe`.

**js/domain/** — pure functions only. ESLint bans DOM globals, storage,
`Math.random`, `Date.now`, and imports from the shell here. Time, ids and
randomness always arrive as values.

- `board/` — CQRS core: command creators `(fx) => (...args) => command`
  resolve all nondeterminism *before* dispatch; transitions
  `(state, payload) => state` are total (missing targets return the same
  reference); selectors are the read side (`findCard` returns Maybe);
  `migrate` lifts null/legacy/modern persisted shapes.
- `filters/` — predicates `(config, ctx) => (card) => bool`, criteria
  transitions, chips as data.
- `gantt/timeline.js`, `picker/weights.js`, `drag/geometry.js`,
  `dates.js`, `i18n/translate.js` — all decision math, pure.

**js/core/store.js** — `createStore({transitions, initialState})`. One
dispatch = one atomic transition = at most one microtask-coalesced notify.
Dev builds deep-freeze state so accidental mutation throws; unknown
command types throw (runtime exhaustiveness via `match`).

**js/effects/** — multi-step effectful flows (boot, import, export,
persist) are Free programs: plain data interpreted by
`browserInterpreter` in production and by a pure state-threaded
interpreter in tests.

**js/ports/** — `createEnv(window)` builds the capability dictionary
(tagless-final style): storage, clock, ids, rng, interactions (dialogs),
system (reload/download). `env.fx` is the value-level edge used by
command creators.

## Dataflow

```
DOM event ─▶ app/boardEvents ─▶ command creator(fx) ─▶ store.dispatch
                                                          │  pure transition
            render(state) ◀─ subscribe (coalesced) ◀──────┤
            persist (debounced 150ms) ◀───────────────────┘  (only on change)
```

Rendering is a full re-render: pure view functions rebuild the DOM from
state on every notify. Immutability makes this trivially correct;
`memoizeLast` skips recomputing derived models (gantt, compiled filters)
when input references are unchanged — with immutable state, identity
tracks content.

## Adding a command

1. Add the transition to `domain/board/transitions.js` (pure, total).
2. Add a creator to `domain/board/commands.js`; resolve ids/time via `fx`.
3. Dispatch it from a handler in `app/boardCommands.js` (or events).
4. Add a property test in `tests/domain/board.test.js`.

## Testing

- `tests/fp/` — law tests (functor/monad, lens laws, stack safety).
- `tests/domain/` — mock-free property tests over frozen inputs.
- `tests/state|filters|picker|gantt|utils/` — characterization suites that
  froze the pre-refactor behavior; they run against the real stores via
  thin legacy-API adapters in `tests/helpers/`.
- Effect programs are verified under the pure test interpreter
  (`tests/helpers/testInterpreter.js`) with zero mocks.

Run `npm test` (vitest + fast-check), `npm run dev` (unobfuscated dev
server on :8080), `npm run build` (production bundle with obfuscation).

## Storage compatibility

Persisted shapes are unchanged from before the refactor: keys
`flexibleKanbanState`, `kanban_lang`, `kanban-filter-presets`,
`kanban-randomizer-options`; the legacy single-board shape is still
migrated on load. Corrupt JSON now degrades gracefully (default board /
empty presets / default options) instead of crashing boot.
