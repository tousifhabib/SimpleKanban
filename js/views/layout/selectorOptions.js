// Pure option-list renderers for the header selectors.

import { el } from '../../utils/domUtils.js';

export const renderBoardOptions = (boards, activeId) =>
  boards.map((board) =>
    el(
      'option',
      { value: board.id, selected: board.id === activeId },
      board.name
    )
  );

export const renderLangOptions = (current, supported, meta) =>
  [current, ...supported.filter((lang) => lang !== current)].map((lang) =>
    el(
      'option',
      { value: lang },
      `${meta[lang].flag} ${meta[lang].short || lang.toUpperCase()}`
    )
  );
