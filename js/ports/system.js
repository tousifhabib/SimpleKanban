import { IO } from '../fp/io.js';

export const createSystem = (win) =>
  Object.freeze({
    reload: IO(() => win.location.reload()),

    download: (filename, text) =>
      IO(() => {
        const doc = win.document;
        const anchor = doc.createElement('a');
        anchor.href = URL.createObjectURL(
          new Blob([text], { type: 'application/json' })
        );
        anchor.download = filename;
        anchor.click();
      }),
  });
