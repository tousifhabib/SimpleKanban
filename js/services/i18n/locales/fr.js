export default {
  header: {
    title: 'Kanban dynamique',
    search: 'Rechercher...',
    import: '📥 Importer',
    export: '📤 Exporter',
    labels: '🏷️ Étiquettes',
    addColumn: '+ Ajouter une colonne',
    titles: {
      addBoard: 'Créer un nouveau tableau',
      renameBoard: 'Renommer le tableau',
      deleteBoard: 'Supprimer le tableau',
    },
  },
  board: {
    selectPlaceholder: 'Sélectionner un tableau...',
    confirmDeleteColumn: 'Supprimer cette colonne et toutes ses cartes ?',
    confirmDeleteCard: 'Supprimer ?',
    confirmDeleteLabel: 'Supprimer l’étiquette ?',
    promptLabelName: 'Entrez le nouveau nom de l’étiquette :',
    promptLabelColor: 'Entrez la nouvelle couleur (hex) :',
  },
  card: {
    addTitle: 'Entrez le titre de la carte...',
    btnAdd: 'Ajouter une carte',
    btnCancel: 'Annuler',
    addBtnText: '+ Ajouter une carte',
    meta: {
      updated: 'Mis à jour {time}',
      justNow: 'à l’instant',
      minsAgo: 'il y a {m} min',
      hoursAgo: 'il y a {h} h',
      daysAgo: 'il y a {d} j',
    },
    detail: {
      placeholderTitle: 'Titre de la carte',
      placeholderDesc: 'Ajoutez une description plus détaillée...',
      placeholderLog: 'Ajoutez une mise à jour...',
      labels: 'Étiquettes',
      startDate: 'Date de début',
      dueDate: 'Échéance',
      effort: 'Effort (h)',
      priority: 'Priorité',
      description: 'Description',
      workLog: 'Journal de travail',
      addEntry: 'Ajouter une entrée',
      save: 'Enregistrer',
      cancel: 'Annuler',
    },
    priorities: {
      none: 'Aucune',
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
    },
    dueStatus: {
      overdue: 'En retard',
      today: 'À faire aujourd’hui',
      soon: 'Bientôt',
    },
  },
  modals: {
    createBoard: {
      title: 'Créer un nouveau tableau',
      placeholder: 'Nom du tableau',
      templateLabel: 'Modèle',
      btnCreate: 'Créer',
      btnCancel: 'Annuler',
      templates: {
        empty: 'Tableau vide',
        basic: 'Kanban basique (To Do, Doing, Done)',
        software: 'Dév logiciel',
        sales: 'Pipeline commercial',
      },
    },
    renameBoard: {
      title: 'Renommer le tableau',
      placeholder: 'Nom du tableau',
      btnSave: 'Enregistrer',
      btnCancel: 'Annuler',
    },
    deleteBoard: {
      title: 'Supprimer le tableau',
      warning:
        'Cela supprimera définitivement "{boardName}" et toutes ses colonnes/cartes.',
      btnDelete: 'Supprimer',
      btnCancel: 'Annuler',
    },
    addColumn: {
      title: 'Ajouter une colonne',
      placeholder: 'Titre de la colonne',
      btnAdd: 'Ajouter',
      btnCancel: 'Annuler',
    },
    manageLabels: {
      title: 'Gérer les étiquettes',
      placeholderName: 'Nom de l’étiquette',
      btnAdd: 'Ajouter',
    },
  },
  templates: {
    empty: {
      labels: {
        important: 'Important',
        optional: 'Optionnel',
      },
    },
    basic: {
      columns: {
        todo: 'À faire',
        doing: 'En cours',
        done: 'Terminé',
      },
      labels: {
        highPriority: 'Haute priorité',
        blocked: 'Bloqué',
        waiting: 'En attente',
        quickWin: 'Gain rapide',
      },
    },
    software: {
      columns: {
        backlog: 'Backlog',
        ready: 'Prêt',
        inProgress: 'En cours',
        review: 'Revue',
        done: 'Terminé',
      },
      labels: {
        bug: 'Bug',
        feature: 'Fonctionnalité',
        techDebt: 'Dette technique',
        blocked: 'Bloqué',
        needsReview: 'Besoin de revue',
        documentation: 'Documentation',
      },
    },
    sales: {
      columns: {
        lead: 'Prospect',
        contacted: 'Contacté',
        proposal: 'Proposition',
        closed: 'Conclu',
      },
      labels: {
        hotLead: 'Prospect chaud',
        followUp: 'Relance',
        qualified: 'Qualifié',
        budgetConfirmed: 'Budget confirmé',
        stalled: 'Bloqué',
      },
    },
  },
};
