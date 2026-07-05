// Pure test interpreter for the effect language: threads a fixture world
// through a program and records every instruction, so entire effectful
// flows are verified with no DOM and no mocks.

import { runFree } from '../../js/fp/free.js';
import { match } from '../../js/fp/match.js';
import { Ok, Err } from '../../js/fp/result.js';

export const createTestWorld = (storageFixture = {}) => {
  const world = {
    storage: new Map(Object.entries(storageFixture)),
    log: [],
    reloaded: false,
    downloads: [],
  };

  const step = match({
    StorageGet: ({ key }) => {
      world.log.push({ tag: 'StorageGet', key });
      if (!world.storage.has(key)) return Ok(null);
      const raw = world.storage.get(key);
      try {
        return Ok(JSON.parse(raw));
      } catch (e) {
        return Err(e);
      }
    },
    StoragePut: ({ key, value }) => {
      world.log.push({ tag: 'StoragePut', key });
      world.storage.set(key, JSON.stringify(value));
      return Ok(undefined);
    },
    Reload: () => {
      world.log.push({ tag: 'Reload' });
      world.reloaded = true;
    },
    Download: ({ filename, text }) => {
      world.log.push({ tag: 'Download', filename });
      world.downloads.push({ filename, text });
    },
  });

  return { world, run: runFree(step) };
};
