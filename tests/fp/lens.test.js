import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  lensProp,
  lensPath,
  lensWhere,
  composeL,
  view,
  set,
  over,
} from '../../js/fp/lens.js';

const arbObj = fc.record({
  a: fc.integer(),
  b: fc.string(),
  nested: fc.record({ c: fc.integer() }),
});

describe('lens laws', () => {
  it('lensProp get-set: set(l, view(l, s), s) === s (value-equal)', () => {
    fc.assert(
      fc.property(arbObj, (s) => {
        const l = lensProp('a');
        expect(set(l)(view(l)(s))(s)).toEqual(s);
      })
    );
  });

  it('lensProp set-get: view(l, set(l, v, s)) === v', () => {
    fc.assert(
      fc.property(arbObj, fc.integer(), (s, v) => {
        const l = lensProp('a');
        expect(view(l)(set(l)(v)(s))).toBe(v);
      })
    );
  });

  it('lensProp set-set: last set wins', () => {
    fc.assert(
      fc.property(arbObj, fc.integer(), fc.integer(), (s, v1, v2) => {
        const l = lensProp('a');
        expect(set(l)(v2)(set(l)(v1)(s))).toEqual(set(l)(v2)(s));
      })
    );
  });

  it('lensPath focuses nested values and obeys set-get', () => {
    fc.assert(
      fc.property(arbObj, fc.integer(), (s, v) => {
        const l = lensPath(['nested', 'c']);
        expect(view(l)(s)).toBe(s.nested.c);
        expect(view(l)(set(l)(v)(s))).toBe(v);
      })
    );
  });

  it('set does not mutate the source object', () => {
    fc.assert(
      fc.property(arbObj, fc.integer(), (s, v) => {
        const frozen = Object.freeze({ ...s, nested: Object.freeze(s.nested) });
        const l = lensPath(['nested', 'c']);
        // would throw in strict mode if it mutated
        const out = set(l)(v)(frozen);
        expect(out.nested.c).toBe(v);
        expect(frozen.nested.c).toBe(s.nested.c);
      })
    );
  });

  it('lensWhere focuses matching element; set on missing element is identity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.integer({ min: 0, max: 50 }), v: fc.integer() })
        ),
        fc.integer({ min: 0, max: 50 }),
        fc.integer(),
        (xs, id, v) => {
          const l = lensWhere((x) => x.id === id);
          const found = xs.find((x) => x.id === id);
          if (found) {
            const updated = set(l)({ id, v })(xs);
            expect(view(l)(updated)).toEqual({ id, v });
            expect(updated.length).toBe(xs.length);
          } else {
            expect(set(l)({ id, v })(xs)).toEqual(xs);
          }
        }
      )
    );
  });

  it('composeL(a, b) drills through both foci; over maps in place', () => {
    const s = { cols: [{ id: 1, cards: [{ id: 'x', n: 1 }] }] };
    const l = composeL(
      lensProp('cols'),
      lensWhere((c) => c.id === 1),
      lensProp('cards'),
      lensWhere((c) => c.id === 'x'),
      lensProp('n')
    );
    expect(view(l)(s)).toBe(1);
    const out = over(l)((n) => n + 10)(s);
    expect(view(l)(out)).toBe(11);
    expect(s.cols[0].cards[0].n).toBe(1);
  });

  it('composed lens set on a missing focus is identity', () => {
    const s = { cols: [] };
    const l = composeL(
      lensProp('cols'),
      lensWhere((c) => c.id === 999),
      lensProp('cards')
    );
    expect(set(l)([])(s)).toEqual(s);
  });
});
