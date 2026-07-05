import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as R from '../../js/fp/result.js';
import * as M from '../../js/fp/maybe.js';

const arbResult = fc.oneof(fc.integer().map(R.Ok), fc.string().map(R.Err));

const arbFn = fc.func(fc.integer());

describe('Result', () => {
  it('functor identity', () => {
    fc.assert(
      fc.property(arbResult, (r) => {
        expect(R.map((x) => x)(r)).toEqual(r);
      })
    );
  });

  it('functor composition', () => {
    fc.assert(
      fc.property(arbResult, arbFn, arbFn, (r, f, g) => {
        expect(R.map((v) => f(g(v)))(r)).toEqual(R.map(f)(R.map(g)(r)));
      })
    );
  });

  it('monad left identity', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, (a, f) => {
        const fR = (x) => R.Ok(f(x));
        expect(R.chain(fR)(R.of(a))).toEqual(fR(a));
      })
    );
  });

  it('monad right identity', () => {
    fc.assert(
      fc.property(arbResult, (r) => {
        expect(R.chain(R.of)(r)).toEqual(r);
      })
    );
  });

  it('monad associativity', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, arbFn, (a, f, g) => {
        const fR = (x) => R.Ok(f(x));
        const gR = (x) => R.Ok(g(x));
        const r = R.Ok(a);
        expect(R.chain(gR)(R.chain(fR)(r))).toEqual(
          R.chain((x) => R.chain(gR)(fR(x)))(r)
        );
      })
    );
  });

  it('mapErr only touches Err; map only touches Ok', () => {
    fc.assert(
      fc.property(arbResult, arbFn, (r, f) => {
        if (R.isOk(r)) {
          expect(R.mapErr(f)(r)).toEqual(r);
        } else {
          expect(R.map(f)(r)).toEqual(r);
        }
      })
    );
  });

  it('tryCatch: throwing fn -> Err, returning fn -> Ok', () => {
    const boom = new Error('boom');
    expect(
      R.tryCatch(() => {
        throw boom;
      })
    ).toEqual(R.Err(boom));
    fc.assert(
      fc.property(fc.integer(), (x) => {
        expect(R.tryCatch(() => x)).toEqual(R.Ok(x));
      })
    );
  });

  it('toMaybe: Ok -> Just, Err -> Nothing', () => {
    fc.assert(
      fc.property(arbResult, (r) => {
        expect(R.toMaybe(r)).toEqual(R.isOk(r) ? M.Just(r.value) : M.Nothing);
      })
    );
  });

  it('traverse short-circuits on first Err', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1 }), (xs) => {
        expect(R.traverse(R.Ok)(xs)).toEqual(R.Ok(xs));
        const firstErr = R.traverse((x) =>
          x === xs[0] ? R.Err('nope') : R.Ok(x)
        )(xs);
        expect(firstErr).toEqual(R.Err('nope'));
      })
    );
  });
});
