// The browser interpreter: gives the effect language its production
// meaning by delegating each instruction to the corresponding env port.

import { runFree } from '../fp/free.js';
import { match } from '../fp/match.js';

export const browserStep = (env) =>
  match({
    StorageGet: ({ key }) => env.storage.load(key).run(),
    StoragePut: ({ key, value }) => env.storage.save(key, value).run(),
    Reload: () => env.system.reload.run(),
    Download: ({ filename, text }) => env.system.download(filename, text).run(),
  });

export const runInBrowser = (env) => runFree(browserStep(env));
