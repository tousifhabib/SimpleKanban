// Monad-transformer helpers for the stacked type IO<Result<E, A>> —
// the shape of every storage operation. Composes the IO and Result layers
// so pipelines read as one monad.

import * as IO from './io.js';
import * as R from './result.js';

export const ioResult = {
  of: (x) => IO.of(R.Ok(x)),

  fromIO: (io) => IO.map(R.Ok)(io),

  fromResult: (r) => IO.of(r),

  map: (fn) => IO.map(R.map(fn)),

  mapErr: (fn) => IO.map(R.mapErr(fn)),

  // chain: (A -> IO<Result<E, B>>) -> IO<Result<E, A>> -> IO<Result<E, B>>
  chain: (fn) => (iora) =>
    IO.IO(() => {
      const r = iora.run();
      return R.isOk(r) ? fn(r.value).run() : r;
    }),

  // Collapse the Result layer with handlers for both cases.
  fold: (onErr, onOk) => (iora) => IO.IO(() => R.fold(onErr, onOk)(iora.run())),

  getOrElse: (fallback) => (iora) =>
    IO.IO(() => R.getOrElse(fallback)(iora.run())),
};
