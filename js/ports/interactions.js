import { IO } from '../fp/io.js';
import { fromNullable, filter } from '../fp/maybe.js';

// Blocking user dialogs. prompt yields Maybe<string> — Nothing on cancel
// or blank input.

export const createInteractions = (win) =>
  Object.freeze({
    confirm: (message) => IO(() => win.confirm(message)),

    prompt: (message, defaultValue) =>
      IO(() =>
        filter((s) => s.trim() !== '')(
          fromNullable(win.prompt(message, defaultValue))
        )
      ),
  });
