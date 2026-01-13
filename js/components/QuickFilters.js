import {
  DUE_STATUS,
  COMPLETION_STATUS,
  AGING_OPTIONS,
} from '../managers/FilterManager.js';
import { i18n } from '../services/i18n/i18nService.js';

export const QUICK_FILTERS = {
  overdue: {
    id: 'overdue',
    icon: '🔥',
    labelKey: 'filters.quick.overdue',
    defaultLabel: 'Overdue',
    apply: (fm) => {
      fm.clearAll();
      fm.setDueDate({ status: DUE_STATUS.OVERDUE });
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  dueToday: {
    id: 'dueToday',
    icon: '📅',
    labelKey: 'filters.quick.dueToday',
    defaultLabel: 'Due Today',
    apply: (fm) => {
      fm.clearAll();
      fm.setDueDate({ status: DUE_STATUS.DUE_TODAY });
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  dueThisWeek: {
    id: 'dueThisWeek',
    icon: '📆',
    labelKey: 'filters.quick.dueThisWeek',
    defaultLabel: 'Due This Week',
    apply: (fm) => {
      fm.clearAll();
      fm.setDueDate({ status: DUE_STATUS.DUE_THIS_WEEK });
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  highPriority: {
    id: 'highPriority',
    icon: '🚨',
    labelKey: 'filters.quick.highPriority',
    defaultLabel: 'High Priority',
    apply: (fm) => {
      fm.clearAll();
      fm.setPriorities(['high']);
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  needsAttention: {
    id: 'needsAttention',
    icon: '⚠️',
    labelKey: 'filters.quick.needsAttention',
    defaultLabel: 'Needs Attention',
    description: 'Stale cards that need action',
    apply: (fm) => {
      fm.clearAll();
      fm.setAging(AGING_OPTIONS.STALE);
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  abandoned: {
    id: 'abandoned',
    icon: '💀',
    labelKey: 'filters.quick.abandoned',
    defaultLabel: 'Abandoned',
    description: 'Cards untouched for 14+ days',
    apply: (fm) => {
      fm.clearAll();
      fm.setAging(AGING_OPTIONS.ABANDONED);
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  recentlyUpdated: {
    id: 'recentlyUpdated',
    icon: '✨',
    labelKey: 'filters.quick.recentlyUpdated',
    defaultLabel: 'Recently Updated',
    apply: (fm) => {
      fm.clearAll();
      fm.setAging(AGING_OPTIONS.FRESH);
    },
  },
  completed: {
    id: 'completed',
    icon: '✅',
    labelKey: 'filters.quick.completed',
    defaultLabel: 'Completed',
    apply: (fm) => {
      fm.clearAll();
      fm.setCompletion(COMPLETION_STATUS.COMPLETED);
    },
  },
  noDueDate: {
    id: 'noDueDate',
    icon: '❓',
    labelKey: 'filters.quick.noDueDate',
    defaultLabel: 'No Due Date',
    apply: (fm) => {
      fm.clearAll();
      fm.setDueDate({ status: DUE_STATUS.NO_DUE_DATE });
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  highEffort: {
    id: 'highEffort',
    icon: '💪',
    labelKey: 'filters.quick.highEffort',
    defaultLabel: 'High Effort (8h+)',
    apply: (fm) => {
      fm.clearAll();
      fm.setEffort(8, null);
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
  quickWins: {
    id: 'quickWins',
    icon: '⚡',
    labelKey: 'filters.quick.quickWins',
    defaultLabel: 'Quick Wins (<2h)',
    apply: (fm) => {
      fm.clearAll();
      fm.setEffort(0.5, 2);
      fm.setCompletion(COMPLETION_STATUS.INCOMPLETE);
    },
  },
};

export default class QuickFilters {
  constructor(container, filterManager, options = {}) {
    this.container = container;
    this.filterManager = filterManager;
    this.enabledFilters = options.enabledFilters || Object.keys(QUICK_FILTERS);
    this.onFilterApplied = options.onFilterApplied || (() => {});
    this.activeFilterId = null;

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'quick-filters';

    const wrapper = document.createElement('div');
    wrapper.className = 'quick-filters-wrapper';

    const label = document.createElement('span');
    label.className = 'quick-filters-label';
    label.textContent = i18n.t('filters.quickFiltersLabel') || 'Quick:';
    wrapper.appendChild(label);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'quick-filters-buttons';

    this.enabledFilters.forEach((filterId) => {
      const config = QUICK_FILTERS[filterId];
      if (!config) return;

      const btn = document.createElement('button');
      btn.className = 'quick-filter-btn';
      btn.dataset.filterId = filterId;
      btn.title =
        config.description || i18n.t(config.labelKey) || config.defaultLabel;
      btn.innerHTML = `
        <span class="quick-filter-icon">${config.icon}</span>
        <span class="quick-filter-label">${i18n.t(config.labelKey) || config.defaultLabel}</span>
      `;

      btn.addEventListener('click', () => this.applyFilter(filterId));
      buttonsContainer.appendChild(btn);
    });

    wrapper.appendChild(buttonsContainer);
    this.container.appendChild(wrapper);

    this.updateActiveState();
  }

  applyFilter(filterId) {
    const config = QUICK_FILTERS[filterId];
    if (!config) return;

    if (this.activeFilterId === filterId) {
      this.filterManager.clearAll();
      this.activeFilterId = null;
    } else {
      config.apply(this.filterManager);
      this.activeFilterId = filterId;
    }

    this.updateActiveState();
    this.onFilterApplied(filterId);
  }

  updateActiveState() {
    const buttons = this.container.querySelectorAll('.quick-filter-btn');
    buttons.forEach((btn) => {
      btn.classList.toggle(
        'active',
        btn.dataset.filterId === this.activeFilterId
      );
    });
  }

  clearActive() {
    this.activeFilterId = null;
    this.updateActiveState();
  }

  setEnabled(filterIds) {
    this.enabledFilters = filterIds;
    this.render();
  }
}

// CSS for QuickFilters (can be added to filterPanel.css)
export const QUICK_FILTERS_STYLES = `
.quick-filters {
  padding: 8px 16px;
  background: var(--panel-bg, #0f172a);
  border-bottom: 1px solid var(--border-color, #334155);
}

.quick-filters-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.quick-filters-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
}

.quick-filters-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}

.quick-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--btn-bg, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 20px;
  color: var(--text-color, #e2e8f0);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.quick-filter-btn:hover {
  background: var(--btn-hover-bg, #334155);
  border-color: var(--primary-color, #3b82f6);
}

.quick-filter-btn.active {
  background: var(--primary-color, #3b82f6);
  border-color: var(--primary-color, #3b82f6);
  color: white;
}

.quick-filter-icon {
  font-size: 1rem;
}

.quick-filter-label {
  display: none;
}

@media (min-width: 768px) {
  .quick-filter-label {
    display: inline;
  }
}

/* Hide scrollbar but keep functionality */
.quick-filters-wrapper::-webkit-scrollbar {
  height: 4px;
}

.quick-filters-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.quick-filters-wrapper::-webkit-scrollbar-thumb {
  background: var(--border-color, #334155);
  border-radius: 2px;
}
`;
