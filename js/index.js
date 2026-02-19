import BoardController from './views/board/BoardController.js';
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

  new BoardController();
});
