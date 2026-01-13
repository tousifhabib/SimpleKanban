export default {
  header: {
    title: 'Kanban dinámico',
    import: '📥 Importar',
    export: '📤 Exportar',
    labels: '🏷️ Etiquetas',
    addColumn: '+ Añadir columna',
    titles: {
      addBoard: 'Crear nuevo tablero',
      renameBoard: 'Renombrar tablero',
      deleteBoard: 'Eliminar tablero',
    },
  },
  board: {
    selectPlaceholder: 'Seleccionar tablero...',
    confirmDeleteColumn: '¿Eliminar esta columna y todas sus tarjetas?',
    confirmDeleteCard: '¿Eliminar?',
    confirmDeleteLabel: '¿Eliminar etiqueta?',
    promptLabelName: 'Introduce el nuevo nombre de la etiqueta:',
    promptLabelColor: 'Introduce el nuevo color (hex):',
  },
  card: {
    addTitle: 'Introduce el título de la tarjeta...',
    btnAdd: 'Añadir tarjeta',
    btnCancel: 'Cancelar',
    addBtnText: '+ Añadir una tarjeta',
    meta: {
      updated: 'Actualizado {time}',
      justNow: 'ahora mismo',
      minsAgo: 'hace {m} min',
      hoursAgo: 'hace {h} h',
      daysAgo: 'hace {d} d',
    },
    detail: {
      placeholderTitle: 'Título de la tarjeta',
      placeholderDesc: 'Añade una descripción más detallada...',
      placeholderLog: 'Añade una actualización de progreso...',
      labels: 'Etiquetas',
      startDate: 'Fecha de inicio',
      dueDate: 'Fecha límite',
      effort: 'Esfuerzo (h)',
      priority: 'Prioridad',
      description: 'Descripción',
      workLog: 'Registro de trabajo',
      addEntry: 'Añadir entrada',
      save: 'Guardar',
      cancel: 'Cancelar',
    },
    priorities: {
      none: 'Ninguna',
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
    },
    dueStatus: {
      overdue: 'Atrasada',
      today: 'Vence hoy',
      soon: 'Vence pronto',
    },
  },
  modals: {
    createBoard: {
      title: 'Crear nuevo tablero',
      placeholder: 'Nombre del tablero',
      templateLabel: 'Plantilla',
      btnCreate: 'Crear',
      btnCancel: 'Cancelar',
      templates: {
        empty: 'Tablero vacío',
        basic: 'Kanban básico (Por hacer, En curso, Hecho)',
        software: 'Desarrollo de software',
        sales: 'Embudo de ventas',
      },
    },
    renameBoard: {
      title: 'Renombrar tablero',
      placeholder: 'Nombre del tablero',
      btnSave: 'Guardar',
      btnCancel: 'Cancelar',
    },
    deleteBoard: {
      title: 'Eliminar tablero',
      warning:
        'Esto eliminará permanentemente "{boardName}" y todas sus columnas/tarjetas.',
      btnDelete: 'Eliminar',
      btnCancel: 'Cancelar',
    },
    addColumn: {
      title: 'Añadir nueva columna',
      placeholder: 'Título de la columna',
      btnAdd: 'Añadir columna',
      btnCancel: 'Cancelar',
    },
    manageLabels: {
      title: 'Administrar etiquetas',
      placeholderName: 'Nombre de etiqueta',
      btnAdd: 'Añadir',
    },
  },
  templates: {
    empty: {
      labels: {
        important: 'Importante',
        optional: 'Opcional',
      },
    },
    basic: {
      columns: {
        todo: 'Por hacer',
        doing: 'En curso',
        done: 'Hecho',
      },
      labels: {
        highPriority: 'Alta prioridad',
        blocked: 'Bloqueado',
        waiting: 'En espera',
        quickWin: 'Victoria rápida',
      },
    },
    software: {
      columns: {
        backlog: 'Backlog',
        ready: 'Listo',
        inProgress: 'En progreso',
        review: 'Revisión',
        done: 'Hecho',
      },
      labels: {
        bug: 'Error',
        feature: 'Funcionalidad',
        techDebt: 'Deuda técnica',
        blocked: 'Bloqueado',
        needsReview: 'Necesita revisión',
        documentation: 'Documentación',
      },
    },
    sales: {
      columns: {
        lead: 'Prospecto',
        contacted: 'Contactado',
        proposal: 'Propuesta',
        closed: 'Cerrado',
      },
      labels: {
        hotLead: 'Prospecto caliente',
        followUp: 'Seguimiento',
        qualified: 'Calificado',
        budgetConfirmed: 'Presupuesto confirmado',
        stalled: 'Estancado',
      },
    },
  },
};
