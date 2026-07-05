// Composition root: the only place that news up the world. Static DOM is
// rendered, the environment (all browser capabilities) is created once,
// and the app shell wires the pure core to it.

import { createEnv } from './ports/env.js';
import { createApp } from './app/createApp.js';
import { renderHeader } from './views/layout/Header.js';
import { renderMainLayout } from './views/layout/MainLayout.js';
import {
  renderCreateBoardModal,
  renderRenameBoardModal,
  renderDeleteBoardModal,
} from './views/modals/BoardModals.js';
import { renderColumnModal } from './views/modals/ColumnModal.js';
import { renderCardDetailModal } from './views/modals/CardDetailModal.js';
import { renderLabelModal } from './views/modals/LabelModal.js';
import { renderOptionsModal } from './views/modals/OptionsModal.js';
import { renderRandomPickerModal } from './views/modals/RandomPickerModal.js';

document.addEventListener('DOMContentLoaded', () => {
  document.body.prepend(
    renderHeader(),
    ...renderMainLayout(),
    renderCreateBoardModal(),
    renderRenameBoardModal(),
    renderDeleteBoardModal(),
    renderColumnModal(),
    renderCardDetailModal(),
    renderLabelModal(),
    renderOptionsModal(),
    renderRandomPickerModal()
  );

  createApp({ env: createEnv(window), doc: document });
});
