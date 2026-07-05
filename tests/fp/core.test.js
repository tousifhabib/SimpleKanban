import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { pipe, identity, constant } from '../../js/fp/fn.js';
import { match } from '../../js/fp/match.js';
import {
  updateWhere,
  removeWhere,
  insertAt,
  reorderByIds,
  uniqueBy,
} from '../../js/fp/arrays.js';
import { deepFreeze } from '../../js/fp/freeze.js';
import { memoizeLast } from '../../js/fp/memo.js';
import { debounce } from '../../js/core/debounce.js';

describe('fn', () => {
  it('pipe applies left to right; empty pipe is identity', () => {
    fc.assert(
      fc.property(fc.integer(), (x) => {
        expect(pipe()(x)).toBe(x);
        expect(
          pipe(
            (n) => n + 1,
            (n) => n * 2
          )(x)
        ).toBe((x + 1) * 2);
      })
    );
  });

  it('identity and constant', () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (a, b) => {
        expect(identity(a)).toBe(a);
        expect(constant(a)(b)).toBe(a);
      })
    );
  });
});

describe('match', () => {
  it('dispatches on tag and on type', () => {
    const m = match({ A: () => 1, B: (v) => v.n });
    expect(m({ tag: 'A' })).toBe(1);
    expect(m({ type: 'B', n: 7 })).toBe(7);
  });

  it('falls back to _ wildcard', () => {
    expect(match({ _: () => 'w' })({ tag: 'whatever' })).toBe('w');
  });

  it('throws on unhandled tag (runtime exhaustiveness)', () => {
    expect(() => match({ A: () => 1 })({ tag: 'B' })).toThrow(/unhandled/);
  });
});

describe('arrays', () => {
  it('updateWhere touches only matching elements', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const out = updateWhere(
          (x) => x % 2 === 0,
          (x) => x + 1
        )(xs);
        expect(out).toEqual(xs.map((x) => (x % 2 === 0 ? x + 1 : x)));
      })
    );
  });

  it('removeWhere is filter complement', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const out = removeWhere((x) => x > 0)(xs);
        expect(out).toEqual(xs.filter((x) => !(x > 0)));
      })
    );
  });

  it('insertAt inserts and grows by one', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer()),
        fc.nat(),
        fc.integer(),
        (xs, i, v) => {
          const idx = Math.min(i, xs.length);
          const out = insertAt(idx, v)(xs);
          expect(out.length).toBe(xs.length + 1);
          expect(out[idx]).toBe(v);
        }
      )
    );
  });

  it('reorderByIds: NEVER loses elements — omitted ids are appended in original order', () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(fc.integer({ min: 0, max: 1000 }))
          .map((ids) => ids.map((id) => ({ id }))),
        (xs) => {
          const ids = xs.map((x) => x.id);
          const shuffled = [...ids].reverse();
          expect(reorderByIds(shuffled)(xs).map((x) => x.id)).toEqual(shuffled);
          // FIXED SEMANTICS (bug-fix pass): a partial order array no
          // longer deletes elements — unlisted items keep their relative
          // order at the end.
          if (ids.length > 0) {
            const partial = ids.slice(1);
            expect(reorderByIds(partial)(xs).map((x) => x.id)).toEqual([
              ...partial,
              ids[0],
            ]);
          }
          // unknown ids are ignored
          expect(reorderByIds([...ids, 99999])(xs).length).toBe(xs.length);
        }
      )
    );
  });

  it('uniqueBy keeps first occurrence per key', () => {
    expect(
      uniqueBy((x) => x.k)([
        { k: 1, v: 'a' },
        { k: 1, v: 'b' },
      ])
    ).toEqual([{ k: 1, v: 'a' }]);
  });
});

describe('freeze', () => {
  it('deepFreeze freezes nested structures', () => {
    const o = deepFreeze({ a: { b: [{ c: 1 }] } });
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(o.a)).toBe(true);
    expect(Object.isFrozen(o.a.b)).toBe(true);
    expect(Object.isFrozen(o.a.b[0])).toBe(true);
  });

  it('deepFreeze tolerates null and primitives', () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(42)).toBe(42);
  });
});

describe('memoizeLast', () => {
  it('caches on reference-equal args and recomputes on change', () => {
    const spy = vi.fn((a, b) => ({ sum: a.n + b.n }));
    const memo = memoizeLast(spy);
    const a = { n: 1 };
    const b = { n: 2 };
    const r1 = memo(a, b);
    const r2 = memo(a, b);
    expect(r1).toBe(r2);
    expect(spy).toHaveBeenCalledTimes(1);
    memo({ n: 1 }, b); // new reference -> recompute
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('debounce', () => {
  it('fires once with the last args after the window', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const d = debounce(100, spy);
    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(99);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
});
