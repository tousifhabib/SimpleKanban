export default {
  header: {
    title: 'كانبان ديناميكي',
    search: 'بحث...',
    import: '📥 استيراد',
    export: '📤 تصدير',
    labels: '🏷️ ملصقات',
    addColumn: '+ إضافة عمود',
    titles: {
      addBoard: 'إنشاء لوحة جديدة',
      renameBoard: 'إعادة تسمية اللوحة',
      deleteBoard: 'حذف اللوحة',
    },
  },
  board: {
    selectPlaceholder: 'اختر لوحة...',
    confirmDeleteColumn: 'حذف هذا العمود وجميع بطاقاته؟',
    confirmDeleteCard: 'حذف؟',
    confirmDeleteLabel: 'حذف الملصق؟',
    promptLabelName: 'أدخل اسم الملصق الجديد:',
    promptLabelColor: 'أدخل اللون الجديد (hex):',
  },
  card: {
    addTitle: 'أدخل عنوان البطاقة...',
    btnAdd: 'إضافة بطاقة',
    btnCancel: 'إلغاء',
    addBtnText: '+ إضافة بطاقة',
    meta: {
      updated: 'تم التحديث {time}',
      justNow: 'الآن',
      minsAgo: 'قبل {m} د',
      hoursAgo: 'قبل {h} س',
      daysAgo: 'قبل {d} ي',
    },
    detail: {
      placeholderTitle: 'عنوان البطاقة',
      placeholderDesc: 'أضف وصفاً أكثر تفصيلاً...',
      placeholderLog: 'أضف تحديثاً للتقدم...',
      labels: 'الملصقات',
      startDate: 'تاريخ البدء',
      dueDate: 'تاريخ الاستحقاق',
      effort: 'الجهد (h)',
      priority: 'الأولوية',
      description: 'الوصف',
      workLog: 'سجل العمل',
      addEntry: 'إضافة إدخال',
      save: 'حفظ',
      cancel: 'إلغاء',
    },
    priorities: {
      none: 'بدون',
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
    },
    dueStatus: {
      overdue: 'متأخر',
      today: 'مستحق اليوم',
      soon: 'قريباً',
    },
  },
  modals: {
    createBoard: {
      title: 'إنشاء لوحة جديدة',
      placeholder: 'اسم اللوحة',
      templateLabel: 'القالب',
      btnCreate: 'إنشاء',
      btnCancel: 'إلغاء',
      templates: {
        empty: 'لوحة فارغة',
        basic: 'كانبان أساسي (To Do, Doing, Done)',
        software: 'تطوير برمجيات',
        sales: 'مسار المبيعات',
      },
    },
    renameBoard: {
      title: 'إعادة تسمية اللوحة',
      placeholder: 'اسم اللوحة',
      btnSave: 'حفظ',
      btnCancel: 'إلغاء',
    },
    deleteBoard: {
      title: 'حذف اللوحة',
      warning: 'سيتم حذف "{boardName}" وجميع الأعمدة/البطاقات نهائياً.',
      btnDelete: 'حذف',
      btnCancel: 'إلغاء',
    },
    addColumn: {
      title: 'إضافة عمود جديد',
      placeholder: 'عنوان العمود',
      btnAdd: 'إضافة عمود',
      btnCancel: 'إلغاء',
    },
    manageLabels: {
      title: 'إدارة الملصقات',
      placeholderName: 'اسم الملصق',
      btnAdd: 'إضافة',
    },
  },
  templates: {
    empty: {
      labels: {
        important: 'مهم',
        optional: 'اختياري',
      },
    },
    basic: {
      columns: {
        todo: 'للقيام',
        doing: 'جارٍ العمل',
        done: 'تم',
      },
      labels: {
        highPriority: 'أولوية عالية',
        blocked: 'محجوب',
        waiting: 'بانتظار',
        quickWin: 'سريع',
      },
    },
    software: {
      columns: {
        backlog: 'قائمة العمل',
        ready: 'جاهز',
        inProgress: 'قيد التنفيذ',
        review: 'مراجعة',
        done: 'تم',
      },
      labels: {
        bug: 'خطأ',
        feature: 'ميزة',
        techDebt: 'دين تقني',
        blocked: 'محجوب',
        needsReview: 'يحتاج مراجعة',
        documentation: 'توثيق',
      },
    },
    sales: {
      columns: {
        lead: 'عميل محتمل',
        contacted: 'تم التواصل',
        proposal: 'عرض',
        closed: 'مغلق',
      },
      labels: {
        hotLead: 'عميل ساخن',
        followUp: 'متابعة',
        qualified: 'مؤهل',
        budgetConfirmed: 'تم تأكيد الميزانية',
        stalled: 'متوقف',
      },
    },
  },
};
