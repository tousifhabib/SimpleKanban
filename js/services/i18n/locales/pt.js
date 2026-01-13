export default {
  header: {
    title: 'Kanban dinâmico',
    import: '📥 Importar',
    export: '📤 Exportar',
    labels: '🏷️ Etiquetas',
    addColumn: '+ Adicionar coluna',
    titles: {
      addBoard: 'Criar novo quadro',
      renameBoard: 'Renomear quadro',
      deleteBoard: 'Excluir quadro',
    },
  },
  board: {
    selectPlaceholder: 'Selecionar quadro...',
    confirmDeleteColumn: 'Excluir esta coluna e todos os seus cartões?',
    confirmDeleteCard: 'Excluir?',
    confirmDeleteLabel: 'Excluir etiqueta?',
    promptLabelName: 'Digite o novo nome da etiqueta:',
    promptLabelColor: 'Digite a nova cor (hex):',
  },
  card: {
    addTitle: 'Digite o título do cartão...',
    btnAdd: 'Adicionar cartão',
    btnCancel: 'Cancelar',
    addBtnText: '+ Adicionar um cartão',
    meta: {
      updated: 'Atualizado {time}',
      justNow: 'agora mesmo',
      minsAgo: 'há {m} min',
      hoursAgo: 'há {h} h',
      daysAgo: 'há {d} d',
    },
    detail: {
      placeholderTitle: 'Título do cartão',
      placeholderDesc: 'Adicione uma descrição mais detalhada...',
      placeholderLog: 'Adicione uma atualização de progresso...',
      labels: 'Etiquetas',
      startDate: 'Data de início',
      dueDate: 'Data de entrega',
      effort: 'Esforço (h)',
      priority: 'Prioridade',
      workLog: 'Registro de trabalho',
      addEntry: 'Adicionar entrada',
      save: 'Salvar',
      cancel: 'Cancelar',
    },
    priorities: {
      none: 'Nenhuma',
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
    },
    dueStatus: {
      overdue: 'Atrasado',
      today: 'Vence hoje',
      soon: 'Vence em breve',
    },
  },
  modals: {
    createBoard: {
      title: 'Criar novo quadro',
      placeholder: 'Nome do quadro',
      templateLabel: 'Modelo',
      btnCreate: 'Criar',
      btnCancel: 'Cancelar',
      templates: {
        empty: 'Quadro vazio',
        basic: 'Kanban básico (A fazer, Fazendo, Feito)',
        software: 'Desenvolvimento de software',
        sales: 'Funil de vendas',
      },
    },
    renameBoard: {
      title: 'Renomear quadro',
      placeholder: 'Nome do quadro',
      btnSave: 'Salvar',
      btnCancel: 'Cancelar',
    },
    deleteBoard: {
      title: 'Excluir quadro',
      warning:
        'Isso excluirá permanentemente "{boardName}" e todas as suas colunas/cartões.',
      btnDelete: 'Excluir',
      btnCancel: 'Cancelar',
    },
    addColumn: {
      title: 'Adicionar nova coluna',
      placeholder: 'Título da coluna',
      btnAdd: 'Adicionar coluna',
      btnCancel: 'Cancelar',
    },
    manageLabels: {
      title: 'Gerenciar etiquetas',
      placeholderName: 'Nome da etiqueta',
      btnAdd: 'Adicionar',
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
        todo: 'A fazer',
        doing: 'Fazendo',
        done: 'Feito',
      },
      labels: {
        highPriority: 'Alta prioridade',
        blocked: 'Bloqueado',
        waiting: 'Aguardando',
        quickWin: 'Vitória rápida',
      },
    },
    software: {
      columns: {
        backlog: 'Backlog',
        ready: 'Pronto',
        inProgress: 'Em progresso',
        review: 'Revisão',
        done: 'Feito',
      },
      labels: {
        bug: 'Bug',
        feature: 'Funcionalidade',
        techDebt: 'Dívida técnica',
        blocked: 'Bloqueado',
        needsReview: 'Precisa de revisão',
        documentation: 'Documentação',
      },
    },
    sales: {
      columns: {
        lead: 'Lead',
        contacted: 'Contatado',
        proposal: 'Proposta',
        closed: 'Fechado',
      },
      labels: {
        hotLead: 'Lead quente',
        followUp: 'Follow-up',
        qualified: 'Qualificado',
        budgetConfirmed: 'Orçamento confirmado',
        stalled: 'Estagnado',
      },
    },
  },
};
