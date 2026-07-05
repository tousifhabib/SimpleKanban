// IO: a lazy description of a synchronous effect. Nothing happens until
// run() is called — and run() is only ever called at the edges (ports,
// composition root, interpreters).

export const IO = (run) => Object.freeze({ tag: 'IO', run });

export const of = (x) => IO(() => x);

export const map = (fn) => (io) => IO(() => fn(io.run()));

export const chain = (fn) => (io) => IO(() => fn(io.run()).run());

export const ap = (ioFn) => (io) => IO(() => ioFn.run()(io.run()));

export const fromThunk = IO;
