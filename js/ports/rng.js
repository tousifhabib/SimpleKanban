import { IO } from '../fp/io.js';

export const createRng = () =>
  Object.freeze({
    random: IO(() => Math.random()),
  });
