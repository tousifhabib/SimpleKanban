import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as M from '../../js/fp/maybe.js';

const arbMaybe = fc.oneof(
  fc.anything({ maxDepth: 1 }).map(M.Just),
  fc.constant(M.Nothing)
);

// fc functions as data: generate (number -> number) style fns from tables
const arbFn = fc.func(fc.integer());

describe('Maybe', () => {
  it('functor identity: map(id) === id', () => {
    fc.assert(
      fc.property(arbMaybe, (m) => {
        expect(M.map((x) => x)(m)).toEqual(m);
      })
    );
  });

  it('functor composition: map(f . g) === map(f) . map(g)', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, arbFn, (x, f, g) => {
        const m = M.Just(x);
        expect(M.map((v) => f(g(v)))(m)).toEqual(M.map(f)(M.map(g)(m)));
      })
    );
  });

  it('monad left identity: of(a).chain(f) === f(a)', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, (a, f) => {
        const fM = (x) => M.Just(f(x));
        expect(M.chain(fM)(M.of(a))).toEqual(fM(a));
      })
    );
  });

  it('monad right identity: m.chain(of) === m', () => {
    fc.assert(
      fc.property(arbMaybe, (m) => {
        expect(M.chain(M.of)(m)).toEqual(m);
      })
    );
  });

  it('monad associativity', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, arbFn, (a, f, g) => {
        const fM = (x) => M.Just(f(x));
        const gM = (x) => M.Just(g(x));
        const m = M.Just(a);
        expect(M.chain(gM)(M.chain(fM)(m))).toEqual(
          M.chain((x) => M.chain(gM)(fM(x)))(m)
        );
      })
    );
  });

  it('applicative: ap with Nothing on either side is Nothing', () => {
    fc.assert(
      fc.property(arbMaybe, (m) => {
        expect(M.ap(M.Nothing)(m)).toEqual(M.Nothing);
        expect(M.ap(m)(M.Nothing)).toEqual(M.Nothing);
      })
    );
  });

  it('fromNullable: null/undefined -> Nothing, else Just', () => {
    expect(M.fromNullable(null)).toEqual(M.Nothing);
    expect(M.fromNullable(undefined)).toEqual(M.Nothing);
    fc.assert(
      fc.property(
        fc.anything().filter((x) => x != null),
        (x) => {
          expect(M.isJust(M.fromNullable(x))).toBe(true);
        }
      )
    );
  });

  it('getOrElse/fold agree', () => {
    fc.assert(
      fc.property(arbMaybe, fc.integer(), (m, d) => {
        expect(M.getOrElse(d)(m)).toEqual(
          M.fold(
            () => d,
            (v) => v
          )(m)
        );
      })
    );
  });

  it('traverse: all Just collects, any Nothing short-circuits', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        expect(M.traverse(M.Just)(xs)).toEqual(M.Just(xs));
        if (xs.length > 0) {
          expect(
            M.traverse((x) => (x === xs[0] ? M.Nothing : M.Just(x)))(xs)
          ).toEqual(M.Nothing);
        }
      })
    );
  });

  it('values are frozen', () => {
    expect(Object.isFrozen(M.Just(1))).toBe(true);
    expect(Object.isFrozen(M.Nothing)).toBe(true);
  });
});
