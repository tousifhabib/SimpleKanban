// The app's effect language: the instruction ADT for Free programs.
// Smart constructors produce frozen tagged records; liftF lifts each into
// a one-instruction program. Meaning is assigned only by interpreters —
// js/effects/browserInterpreter.js for real effects, the pure state-threaded
// interpreter in tests/helpers/ for verification.

import { liftF } from '../fp/free.js';

export const storageGet = (key) => liftF({ tag: 'StorageGet', key });

export const storagePut = (key, value) =>
  liftF({ tag: 'StoragePut', key, value });

export const reload = () => liftF({ tag: 'Reload' });

export const download = (filename, text) =>
  liftF({ tag: 'Download', filename, text });
