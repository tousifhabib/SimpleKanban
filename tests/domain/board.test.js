// Pure-domain property tests: zero mocks. fx values are ordinary
// generated data; deepFreeze on every input state makes any mutation
// throw, so passing tests double as purity proofs.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deepFreeze } from '../../js/fp/freeze.js';
import { transitions } from '../../js/domain/board/transitions.js';
import * as make from '../../js/domain/board/commands.js';
import * as sel from '../../js/domain/board/selectors.js';
import { migrate } from '../../js/domain/board/migrate.js';
import { mkCard } from '../../js/domain/board/model.js';
import { isJust, isNothing } from '../../js/fp/maybe.js';
import { arbState, arbLegacyState, cardIdsOf } from '../helpers/arbitraries.js';

// Deterministic fx: counter ids, fixed clock.
const mkFx = () => {
  let n = 0;
  return {
    newId: (prefix) => `${prefix}-fx-${++n}`,
    nowIso: () => '2026-07-05T12:00:00.000Z',
  };
};

const NOW = '2026-07-05T12:00:00.000Z';

const apply = (state, command) =>
  transitions[command.type](deepFreeze(state), command.payload);

const frozenClone = (state) => deepFreeze(JSON.parse(JSON.stringify(state)));

describe('transition totality and purity', () => {
  it('every transition tolerates unknown target ids and returns the SAME reference', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const fx = mkFx();
        const s = frozenClone(state);
        const noops = [
          make.selectBoard()('missing-board'),
          make.renameBoard()('missing-board', 'x'),
          make.deleteBoard()('missing-board'),
          make.updateLabel()('missing-label', 'n', '#fff'),
          make.removeColumn()('missing-col'),
          make.renameColumn()('missing-col', 't'),
          make.addCard(fx)('missing-col', 'text'),
          make.updateCard(fx)('missing-col', 'missing-card', {}),
          make.toggleCardComplete(fx)('missing-col', 'missing-card'),
          make.removeCard()('missing-col', 'missing-card'),
          make.duplicateCard(fx)('missing-col', 'missing-card'),
          make.addCardLog(fx)('missing-col', 'missing-card', 't'),
          make.addCardDependency(fx)('missing-col', 'missing-card', 'd'),
          make.removeCardDependency(fx)('missing-col', 'missing-card', 'd'),
          make.reorderCards()('missing-col', []),
          make.moveCard(fx)('missing-card', 'missing-col', 'also-missing', []),
        ];
        for (const cmd of noops) {
          expect(apply(s, cmd)).toBe(s);
        }
      }),
      { numRuns: 25 }
    );
  });

  it('deleteBoard on the last board is a no-op', () => {
    const fx = mkFx();
    const state = frozenClone(migrate(null, fx, undefined));
    expect(apply(state, make.deleteBoard()(state.activeBoardId))).toBe(state);
  });
});

describe('card multiset invariants', () => {
  it('moveCard preserves card ids; reorders never lose cards', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const fx = mkFx();
        const s = frozenClone(state);
        const board = sel.activeBoard(s);
        const from = board.columns.find((c) => c.cards.length > 0);
        if (!from || board.columns.length < 2) return;
        const to = board.columns.find((c) => c.id !== from.id);
        const card = from.cards[0];

        const order = [...to.cards.map((c) => c.id), card.id];
        const moved = apply(
          s,
          make.moveCard(fx)(card.id, from.id, to.id, order)
        );
        expect(cardIdsOf(sel.activeBoard(moved))).toEqual(cardIdsOf(board));

        // moved card stamped, all others untouched
        const stamped = sel
          .activeBoard(moved)
          .columns.flatMap((c) => c.cards)
          .filter((c) => c.updatedAt === NOW)
          .map((c) => c.id);
        expect(stamped).toEqual([card.id]);

        // permutation reorder preserves
        const permuted = apply(
          s,
          make.reorderCards()(
            from.id,
            [...from.cards.map((c) => c.id)].reverse()
          )
        );
        expect(cardIdsOf(sel.activeBoard(permuted))).toEqual(cardIdsOf(board));

        // FIXED: a partial order array preserves omitted cards at the end
        if (from.cards.length > 1) {
          const partial = apply(
            s,
            make.reorderCards()(
              from.id,
              from.cards.slice(1).map((c) => c.id)
            )
          );
          const afterCards = sel
            .activeBoard(partial)
            .columns.find((c) => c.id === from.id).cards;
          expect(afterCards).toHaveLength(from.cards.length);
          expect(afterCards.at(-1).id).toBe(from.cards[0].id);
        }
      }),
      { numRuns: 30 }
    );
  });
});

describe('cascades', () => {
  it('removeLabel leaves no dangling label references', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const s0 = frozenClone(state);
        const board = sel.activeBoard(s0);
        if (!board.labels.length) return;
        const label = board.labels[0];

        // attach the label to every card first
        let s = s0;
        const fx = mkFx();
        for (const col of board.columns) {
          for (const card of col.cards) {
            s = apply(
              s,
              make.updateCard(fx)(col.id, card.id, {
                labels: [label.id],
              })
            );
          }
        }

        const after = apply(deepFreeze(s), make.removeLabel()(label.id));
        expect(sel.labels(after).map((l) => l.id)).not.toContain(label.id);
        for (const col of sel.activeBoard(after).columns) {
          for (const card of col.cards) {
            expect(card.labels).not.toContain(label.id);
          }
        }
      }),
      { numRuns: 20 }
    );
  });

  it('removeCard strips dangling dependencies board-wide', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const fx = mkFx();
        const s0 = frozenClone(state);
        const board = sel.activeBoard(s0);
        const all = board.columns.flatMap((c) =>
          c.cards.map((card) => ({ card, colId: c.id }))
        );
        if (all.length < 2) return;
        const victim = all[0];
        let s = s0;
        for (const { card, colId } of all.slice(1)) {
          s = apply(
            s,
            make.addCardDependency(fx)(colId, card.id, victim.card.id, 'FS')
          );
        }
        const after = apply(
          deepFreeze(s),
          make.removeCard()(victim.colId, victim.card.id)
        );
        for (const col of sel.activeBoard(after).columns) {
          for (const card of col.cards) {
            expect(card.dependencies.map((d) => d.id)).not.toContain(
              victim.card.id
            );
          }
        }
        expect(isNothing(sel.findCard(victim.card.id)(after))).toBe(true);
      }),
      { numRuns: 20 }
    );
  });
});

describe('duplicateCard (intended semantics: after the original)', () => {
  it('inserts the clone at index+1 with fresh identity and cleared logs/deps', () => {
    const fx = mkFx();
    const state = frozenClone({
      activeBoardId: 'b1',
      boards: [
        {
          id: 'b1',
          name: 'B',
          columns: [
            {
              id: 'c1',
              title: 'C',
              cards: [
                mkCard(
                  {
                    id: 'k1',
                    text: 'orig',
                    logs: [
                      { id: 'lg', text: 'x', columnTitle: 'C', createdAt: NOW },
                    ],
                    dependencies: [{ id: 'k2', type: 'FS' }],
                  },
                  'k1',
                  '2026-01-01T00:00:00.000Z'
                ),
                mkCard({ id: 'k2', text: 'two' }, 'k2', NOW),
              ],
            },
          ],
          labels: [],
        },
      ],
    });

    const cmd = make.duplicateCard(fx)('c1', 'k1');
    const after = apply(state, cmd);
    const cards = sel.activeBoard(after).columns[0].cards;

    expect(cards.map((c) => c.id)).toEqual(['k1', cmd.payload.newId, 'k2']);
    const clone = cards[1];
    expect(clone.text).toBe('orig');
    expect(clone.logs).toEqual([]);
    expect(clone.dependencies).toEqual([]);
    expect(clone.createdAt).toBe(NOW);
  });
});

describe('selectors', () => {
  it('findCard is Just for present ids and Nothing otherwise; allCards covers the board', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const s = frozenClone(state);
        const board = sel.activeBoard(s);
        const all = sel.allCards(s);
        expect(all.map((e) => e.card.id).sort()).toEqual(cardIdsOf(board));
        for (const entry of all) {
          const found = sel.findCard(entry.card.id)(s);
          expect(isJust(found)).toBe(true);
          expect(found.value.columnId).toBe(entry.columnId);
        }
        expect(isNothing(sel.findCard('card-definitely-missing')(s))).toBe(
          true
        );
      }),
      { numRuns: 25 }
    );
  });

  it('boardList defaults blank names; canDeleteBoard tracks count', () => {
    const fx = mkFx();
    const single = frozenClone(migrate(null, fx, undefined));
    expect(sel.canDeleteBoard(single)).toBe(false);
    const two = apply(single, make.createBoard(fx)('', 'empty', undefined));
    expect(sel.canDeleteBoard(two)).toBe(true);
    expect(sel.boardList(two).map((b) => b.name)).toEqual([
      'My First Board',
      'New Board',
    ]);
  });
});

describe('migrate', () => {
  it('null -> default board named My First Board with basic-template columns', () => {
    const fx = mkFx();
    const state = migrate(null, fx, {
      basic: { columns: { todo: 'To Do', doing: 'Doing', done: 'Done' } },
    });
    expect(state.boards).toHaveLength(1);
    expect(state.boards[0].name).toBe('My First Board');
    expect(state.activeBoardId).toBe(state.boards[0].id);
    expect(state.boards[0].columns.map((c) => c.title)).toEqual([
      'To Do',
      'Doing',
      'Done',
    ]);
  });

  it('legacy shape lifts to one "My Board" with normalized cards', () => {
    fc.assert(
      fc.property(arbLegacyState, (legacy) => {
        const fx = mkFx();
        const state = migrate(frozenClone(legacy), fx, undefined);
        expect(state.boards).toHaveLength(1);
        expect(state.boards[0].name).toBe('My Board');
        expect(state.activeBoardId).toBe(state.boards[0].id);
        for (const col of state.boards[0].columns) {
          for (const card of col.cards) {
            expect(card).toHaveProperty('priority');
            expect(card).toHaveProperty('logs');
            expect(card).toHaveProperty('dependencies');
            expect(typeof card.effort).toBe('number');
          }
        }
      }),
      { numRuns: 20 }
    );
  });

  it('is idempotent: migrate(migrate(x)) structurally equals migrate(x)', () => {
    fc.assert(
      fc.property(fc.oneof(arbLegacyState, arbState), (raw) => {
        const once = migrate(frozenClone(raw), mkFx(), undefined);
        const twice = migrate(frozenClone(once), mkFx(), undefined);
        expect(twice).toEqual(once);
      }),
      { numRuns: 20 }
    );
  });

  it('modern shape preserves activeBoardId; missing one defaults to first board', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const fx = mkFx();
        const kept = migrate(frozenClone(state), fx, undefined);
        expect(kept.activeBoardId).toBe(state.activeBoardId);

        const noActive = { boards: state.boards };
        const defaulted = migrate(frozenClone(noActive), mkFx(), undefined);
        expect(defaulted.activeBoardId).toBe(state.boards[0].id);
      }),
      { numRuns: 20 }
    );
  });

  it('states survive JSON round-trips value-identically', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const migrated = migrate(frozenClone(state), mkFx(), undefined);
        expect(JSON.parse(JSON.stringify(migrated))).toEqual(migrated);
      }),
      { numRuns: 20 }
    );
  });
});
