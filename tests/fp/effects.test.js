import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import * as IO from '../../js/fp/io.js';
import * as T from '../../js/fp/task.js';
import * as Free from '../../js/fp/free.js';
import { ioResult } from '../../js/fp/transformers.js';
import { Ok, Err, isOk } from '../../js/fp/result.js';
import { bounce, done, trampoline } from '../../js/fp/trampoline.js';
import { delayValue } from '../../js/core/timers.js';
import { storageGet } from '../../js/effects/instructions.js';
import {
  bootProgram,
  importProgram,
  exportProgram,
  persistProgram,
} from '../../js/effects/programs.js';
import { createTestWorld } from '../helpers/testInterpreter.js';

const arbFn = fc.func(fc.integer());

describe('IO', () => {
  it('is lazy: nothing runs before run()', () => {
    const spy = vi.fn(() => 1);
    const io = IO.map((x) => x + 1)(IO.IO(spy));
    expect(spy).not.toHaveBeenCalled();
    expect(io.run()).toBe(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('monad laws (observed through run)', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, arbFn, (a, f, g) => {
        const fIO = (x) => IO.of(f(x));
        const gIO = (x) => IO.of(g(x));
        // left identity
        expect(IO.chain(fIO)(IO.of(a)).run()).toBe(fIO(a).run());
        // right identity
        expect(IO.chain(IO.of)(IO.of(a)).run()).toBe(a);
        // associativity
        expect(IO.chain(gIO)(IO.chain(fIO)(IO.of(a))).run()).toBe(
          IO.chain((x) => IO.chain(gIO)(fIO(x)))(IO.of(a)).run()
        );
      })
    );
  });
});

describe('Task', () => {
  it('composes in CPS and only runs on fork', () => {
    const results = [];
    const t = T.chain((x) => T.of(x * 2))(T.map((x) => x + 1)(T.of(1)));
    t.fork((x) => results.push(x));
    expect(results).toEqual([4]);
  });

  it('delayValue resolves after the timeout', () => {
    vi.useFakeTimers();
    const results = [];
    delayValue(50, 'later').fork((x) => results.push(x));
    expect(results).toEqual([]);
    vi.advanceTimersByTime(50);
    expect(results).toEqual(['later']);
    vi.useRealTimers();
  });
});

describe('trampoline', () => {
  it('runs deep recursion without stack overflow', () => {
    const countDown = (n) =>
      n === 0 ? done('end') : bounce(() => countDown(n - 1));
    expect(trampoline(countDown(1_000_000))).toBe('end');
  });
});

describe('Free', () => {
  const countingStep = () => {
    let n = 0;
    return () => ++n;
  };

  it('monad laws under interpretation', () => {
    fc.assert(
      fc.property(fc.integer(), arbFn, arbFn, (a, f, g) => {
        const run = Free.runFree(() => 0);
        const fF = (x) => Free.of(f(x));
        const gF = (x) => Free.of(g(x));
        expect(run(Free.chain(fF)(Free.of(a)))).toBe(run(fF(a)));
        expect(run(Free.chain(Free.of)(Free.of(a)))).toBe(a);
        expect(run(Free.chain(gF)(Free.chain(fF)(Free.of(a))))).toBe(
          run(Free.chain((x) => Free.chain(gF)(fF(x)))(Free.of(a)))
        );
      })
    );
  });

  it('is stack-safe for 100k sequenced instructions (left-nested)', () => {
    let program = Free.liftF({ tag: 'Tick' });
    for (let i = 0; i < 100_000; i++) {
      program = Free.chain(() => Free.liftF({ tag: 'Tick' }))(program);
    }
    expect(Free.runFree(countingStep())(program)).toBe(100_001);
  });

  it('is stack-safe for deeply right-nested programs', () => {
    const build = (n) =>
      n === 0
        ? Free.of(0)
        : Free.chain((x) => Free.map((y) => x + y)(Free.liftF({ tag: 'One' })))(
            build(n - 1)
          );
    // build itself is recursive, keep n moderate; interpretation is the
    // part under test
    const program = build(5_000);
    expect(Free.runFree(() => 1)(program)).toBe(5_000);
  });

  it('interprets instructions in program order', () => {
    const seen = [];
    const program = Free.chain(() => storageGet('b'))(storageGet('a'));
    Free.runFree((ins) => {
      seen.push(ins.key);
      return null;
    })(program);
    expect(seen).toEqual(['a', 'b']);
  });
});

describe('ioResult (ResultT over IO)', () => {
  it('chains through Ok and short-circuits on Err without running later effects', () => {
    const later = vi.fn(() => Ok('unreachable'));
    const errPipeline = ioResult.chain(() => IO.IO(later))(IO.of(Err('boom')));
    expect(errPipeline.run()).toEqual(Err('boom'));
    expect(later).not.toHaveBeenCalled();

    const okPipeline = ioResult.chain((x) => ioResult.of(x + 1))(
      ioResult.of(1)
    );
    expect(okPipeline.run()).toEqual(Ok(2));
  });

  it('getOrElse folds Err to the fallback', () => {
    expect(
      ioResult
        .getOrElse('fb')(IO.of(Err('x')))
        .run()
    ).toBe('fb');
    expect(
      ioResult
        .getOrElse('fb')(IO.of(Ok('v')))
        .run()
    ).toBe('v');
  });
});

describe('effect programs under the pure test interpreter', () => {
  it('bootProgram: missing key -> null', () => {
    const { run } = createTestWorld({});
    expect(run(bootProgram('k'))).toBe(null);
  });

  it('bootProgram: corrupt JSON degrades to null instead of throwing', () => {
    const { run } = createTestWorld({ k: '{not json' });
    expect(run(bootProgram('k'))).toBe(null);
  });

  it('bootProgram: valid JSON passes through', () => {
    const { run } = createTestWorld({ k: JSON.stringify({ boards: [] }) });
    expect(run(bootProgram('k'))).toEqual({ boards: [] });
  });

  it('importProgram: valid JSON saves the RAW value then reloads, yields true', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (data) => {
        const { world, run } = createTestWorld({});
        const outcome = run(importProgram('k', JSON.stringify(data)));
        expect(outcome).toBe(true);
        expect(world.reloaded).toBe(true);
        // JSON normalization (e.g. -0 -> 0) is part of the contract
        expect(JSON.parse(world.storage.get('k'))).toEqual(
          JSON.parse(JSON.stringify(data))
        );
        expect(world.log.map((e) => e.tag)).toEqual(['StoragePut', 'Reload']);
      })
    );
  });

  it('importProgram: malformed JSON performs no effects and yields false', () => {
    const { world, run } = createTestWorld({ k: 'existing' });
    expect(run(importProgram('k', '{oops'))).toBe(false);
    expect(world.reloaded).toBe(false);
    expect(world.storage.get('k')).toBe('existing');
    expect(world.log).toEqual([]);
  });

  it('exportProgram downloads pretty-printed JSON', () => {
    const { world, run } = createTestWorld({});
    run(exportProgram('backup.json', { a: 1 }));
    expect(world.downloads).toEqual([
      { filename: 'backup.json', text: JSON.stringify({ a: 1 }, null, 2) },
    ]);
  });

  it('persistProgram round-trips state through storage', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (state) => {
        const { world, run } = createTestWorld({});
        const r = run(persistProgram('k', state));
        expect(isOk(r)).toBe(true);
        expect(JSON.parse(world.storage.get('k'))).toEqual(
          JSON.parse(JSON.stringify(state))
        );
      })
    );
  });
});
