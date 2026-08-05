(() => {
  'use strict';

  const STORAGE_KEY = 'budgetDuoStateV1';
  const CLOUD_CACHE_PREFIX = 'budgetDuoCloudStateV3:';
  const RATE_CACHE_KEY = 'budgetDuoRatesV1';
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const TRACE_SCHEMA_VERSION = 4;
  const TRACE_ACTIVE_CATEGORY_IDS = new Set(['salary','bonus','other_income','rent','groceries','restaurants','transport','vacation','medical','sport','subscriptions','phone','shopping','gifts','taxes','other_expense','settlement']);
  let currentMemberSlot = 'la';

  const money = (value, currency = 'CAD', digits = 0) => new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits
  }).format(Number(value || 0));
  const number = (value, digits = 0) => new Intl.NumberFormat('fr-CA', { maximumFractionDigits: digits }).format(Number(value || 0));
  const monthLabel = month => new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`));
  const shortMonth = month => new Intl.DateTimeFormat('fr-CA', { month: 'short' }).format(new Date(`${month}-15T12:00:00`)).replace('.', '');
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const categories = [
    { id: 'salary', type: 'income', group: 'Revenus', name: 'Salaire', icon: '↗' },
    { id: 'bonus', type: 'income', group: 'Revenus', name: 'Prime et bonus', icon: '★' },
    { id: 'freelance', type: 'income', group: 'Revenus', name: 'Travail autonome', icon: '◇' },
    { id: 'other_income', type: 'income', group: 'Revenus', name: 'Autres revenus', icon: '＋' },
    { id: 'rent', type: 'expense', group: 'Logement', name: 'Loyer', icon: '⌂' },
    { id: 'electricity', type: 'expense', group: 'Logement', name: 'Électricité', icon: 'ϟ' },
    { id: 'housing_insurance', type: 'expense', group: 'Logement', name: 'Assurance habitation', icon: '▣' },
    { id: 'internet', type: 'expense', group: 'Logement', name: 'Internet', icon: '⌁' },
    { id: 'phone', type: 'expense', group: 'Logement', name: 'Téléphone', icon: '◫' },
    { id: 'housing', type: 'expense', group: 'Logement', name: 'Entretien et mobilier', icon: '⌂' },
    { id: 'subscriptions', type: 'expense', group: 'Loisirs', name: 'Abonnements numériques', icon: '▶' },
    { id: 'groceries', type: 'expense', group: 'Alimentation', name: 'Épicerie', icon: '◉' },
    { id: 'lunches', type: 'expense', group: 'Alimentation', name: 'Repas du midi', icon: '☕' },
    { id: 'restaurants', type: 'expense', group: 'Alimentation', name: 'Restaurants', icon: '◇' },
    { id: 'delivery', type: 'expense', group: 'Alimentation', name: 'Livraison et plats à emporter', icon: '➜' },
    { id: 'cafes', type: 'expense', group: 'Alimentation', name: 'Cafés', icon: '☕' },
    { id: 'bars', type: 'expense', group: 'Loisirs', name: 'Sorties et verres', icon: '◌' },
    { id: 'public_transport', type: 'expense', group: 'Transport', name: 'Transport collectif', icon: '▤' },
    { id: 'communauto', type: 'expense', group: 'Transport', name: 'Communauto et location', icon: '▰' },
    { id: 'fuel', type: 'expense', group: 'Transport', name: 'Essence', icon: '●' },
    { id: 'taxi', type: 'expense', group: 'Transport', name: 'Taxi et VTC', icon: '➜' },
    { id: 'parking', type: 'expense', group: 'Transport', name: 'Stationnement', icon: 'P' },
    { id: 'transport', type: 'expense', group: 'Transport', name: 'Autres transports', icon: '➜' },
    { id: 'vacation', type: 'expense', group: 'Voyage', name: 'Vacances et voyages', icon: '✈' },
    { id: 'entertainment', type: 'expense', group: 'Loisirs', name: 'Cinéma, événements et activités', icon: '◎' },
    { id: 'sport', type: 'expense', group: 'Santé et sport', name: 'Abonnement sportif', icon: '△' },
    { id: 'race_fees', type: 'expense', group: 'Santé et sport', name: 'Inscriptions sportives', icon: '⚑' },
    { id: 'sport_gear', type: 'expense', group: 'Santé et sport', name: 'Équipement sportif', icon: '△' },
    { id: 'medical', type: 'expense', group: 'Santé et sport', name: 'Médical et pharmacie', icon: '✚' },
    { id: 'dental', type: 'expense', group: 'Santé et sport', name: 'Dentaire et soins', icon: '＋' },
    { id: 'shopping', type: 'expense', group: 'Achats personnels', name: 'Vêtements et shopping', icon: '▱' },
    { id: 'technology', type: 'expense', group: 'Achats personnels', name: 'Technologie', icon: '▦' },
    { id: 'beauty', type: 'expense', group: 'Achats personnels', name: 'Beauté et soins personnels', icon: '✦' },
    { id: 'gifts', type: 'expense', group: 'Achats personnels', name: 'Cadeaux', icon: '□' },
    { id: 'savings', type: 'expense', group: 'Épargne', name: 'Épargne et objectifs', icon: '◆' },
    { id: 'bank_fees', type: 'expense', group: 'Autres', name: 'Frais bancaires', icon: '$' },
    { id: 'taxes', type: 'expense', group: 'Autres', name: 'Impôts et frais administratifs', icon: '§' },
    { id: 'donations', type: 'expense', group: 'Autres', name: 'Dons', icon: '♡' },
    { id: 'unexpected', type: 'expense', group: 'Autres', name: 'Imprévus', icon: '!' },
    { id: 'other_expense', type: 'expense', group: 'Autres', name: 'Autres dépenses', icon: '•••' },
    { id: 'settlement', type: 'transfer', group: 'Transferts', name: 'Remboursement entre nous', icon: '⇄' }
  ];

  function buildDefaultBudgets(month) {
    const entries = [
      ['salary', 'la', 3650], ['salary', 'partner', 3250], ['other_income', 'la', 150],
      ['rent', 'couple', 1900], ['housing', 'couple', 210], ['phone', 'la', 80], ['phone', 'partner', 65],
      ['subscriptions', 'couple', 55], ['groceries', 'couple', 650], ['lunches', 'la', 160], ['lunches', 'partner', 140],
      ['restaurants', 'couple', 320], ['transport', 'la', 190], ['transport', 'partner', 160],
      ['vacation', 'couple', 450], ['sport', 'la', 180], ['sport', 'partner', 90], ['medical', 'la', 60], ['medical', 'partner', 60],
      ['shopping', 'la', 150], ['shopping', 'partner', 150], ['gifts', 'couple', 80], ['savings', 'la', 450], ['savings', 'partner', 350],
      ['other_expense', 'couple', 150]
    ];
    return entries.map(([categoryId, scope, amount]) => ({ id: uid('b'), month, categoryId, scope, amount }));
  }

  function monthOffset(baseMonth, offset) {
    const [y, m] = baseMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function seedTransactions() {
    const month = currentMonth;
    const year = Number(month.slice(0, 4));
    const m = Number(month.slice(5, 7));
    const date = day => `${year}-${String(m).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`;
    return [
      { id: uid('t'), name: 'Salaire du mois', type: 'income', date: date(1), amountOriginal: 3650, currency: 'CAD', rate: 1, amountCAD: 3650, categoryId: 'salary', payerId: 'la', beneficiary: 'la', split: { la: 100, partner: 0 }, accountId: 'la_checking', merchant: 'Employeur', note: '', status: 'confirmed', recurring: true },
      { id: uid('t'), name: 'Salaire du mois', type: 'income', date: date(1), amountOriginal: 3250, currency: 'CAD', rate: 1, amountCAD: 3250, categoryId: 'salary', payerId: 'partner', beneficiary: 'partner', split: { la: 0, partner: 100 }, accountId: 'partner_checking', merchant: 'Employeur', note: '', status: 'confirmed', recurring: true },
      { id: uid('t'), name: 'Loyer août', type: 'expense', date: date(1), amountOriginal: 1900, currency: 'CAD', rate: 1, amountCAD: 1900, categoryId: 'rent', payerId: 'la', beneficiary: 'couple', split: { la: 55, partner: 45 }, accountId: 'la_checking', merchant: 'Propriétaire', note: '', status: 'confirmed', recurring: true },
      { id: uid('t'), name: 'Épicerie de la semaine', type: 'expense', date: date(2), amountOriginal: 142.36, currency: 'CAD', rate: 1, amountCAD: 142.36, categoryId: 'groceries', payerId: 'partner', beneficiary: 'couple', split: { la: 50, partner: 50 }, accountId: 'partner_card', merchant: 'Métro', note: '', status: 'confirmed', recurring: false },
      { id: uid('t'), name: 'Passe mensuelle STM', type: 'expense', date: date(2), amountOriginal: 104.5, currency: 'CAD', rate: 1, amountCAD: 104.5, categoryId: 'transport', payerId: 'la', beneficiary: 'la', split: { la: 100, partner: 0 }, accountId: 'la_card', merchant: 'STM', note: '', status: 'confirmed', recurring: true },
      { id: uid('t'), name: 'Souper avec des amis', type: 'expense', date: date(3), amountOriginal: 116.2, currency: 'CAD', rate: 1, amountCAD: 116.2, categoryId: 'restaurants', payerId: 'partner', beneficiary: 'couple', split: { la: 50, partner: 50 }, accountId: 'partner_card', merchant: 'Le Majestique', note: '', status: 'confirmed', recurring: false },
      { id: uid('t'), name: 'Inscription trail', type: 'expense', date: date(4), amountOriginal: 129.99, currency: 'CAD', rate: 1, amountCAD: 129.99, categoryId: 'sport', payerId: 'la', beneficiary: 'la', split: { la: 100, partner: 0 }, accountId: 'la_card', merchant: 'Race Roster', note: '', status: 'confirmed', recurring: false },
      { id: uid('t'), name: 'Téléphone', type: 'expense', date: date(5), amountOriginal: 80, currency: 'CAD', rate: 1, amountCAD: 80, categoryId: 'phone', payerId: 'la', beneficiary: 'la', split: { la: 100, partner: 0 }, accountId: 'la_card', merchant: 'Fournisseur mobile', note: '', status: 'pending', recurring: true },
      { id: uid('t'), name: 'Acompte hôtel Vancouver', type: 'expense', date: date(5), amountOriginal: 180, currency: 'USD', rate: 1.37, amountCAD: 246.6, categoryId: 'vacation', payerId: 'la', beneficiary: 'couple', split: { la: 50, partner: 50 }, accountId: 'la_card', merchant: 'Hôtel', note: 'Montant final à confirmer sur la carte', status: 'confirmed', recurring: false }
    ];
  }

  function buildInitialState(names = {}) {
    const budgets = [];
    for (let i = 0; i < 12; i++) {
      const month = `${today.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
      budgets.push(...buildDefaultBudgets(month));
    }
    return {
      version: 2,
      household: {
        name: 'Notre espace', baseCurrency: 'CAD', secondaryCurrency: 'EUR', showSecondary: true,
        theme: 'light', lastRoute: 'dashboard', lastScope: 'household', pin: '',
        members: [
          { id: 'la', name: names.la || 'Louis-Antoine', initials: initialsFor(names.la || 'Louis-Antoine') },
          { id: 'partner', name: names.partner || 'Élise', initials: initialsFor(names.partner || 'Élise') }
        ],
        defaultSplit: { la: 50, partner: 50 },
        categorySplits: { rent: { la: 55, partner: 45 }, groceries: { la: 50, partner: 50 }, restaurants: { la: 50, partner: 50 }, vacation: { la: 50, partner: 50 } }
      },
      categories: categories.map(c => ({ ...c })),
      accounts: defaultAccounts(names),
      budgets,
      budgetTemplate: buildDefaultBudgets('template').map(b => ({ ...b, month: 'template' })),
      transactions: seedTransactions(),
      goals: [
        { id: uid('g'), name: 'Fonds d’urgence', target: 10000, current: 4200, date: `${today.getFullYear() + 1}-06-30`, owner: 'couple' },
        { id: uid('g'), name: 'Voyage au Japon', target: 6500, current: 1750, date: `${today.getFullYear() + 1}-10-01`, owner: 'couple' },
        { id: uid('g'), name: 'Équipement trail', target: 800, current: 310, date: `${today.getFullYear()}-12-01`, owner: 'la' }
      ]
    };
  }

  function initialsFor(name) {
    return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  function defaultAccounts(names = {}) {
    const la = names.la || 'Louis-Antoine';
    const partner = names.partner || 'Élise';
    return [
      { id: 'la_checking', name: `${la} — Compte courant`, owner: 'la' },
      { id: 'la_card', name: `${la} — Carte`, owner: 'la' },
      { id: 'partner_checking', name: `${partner} — Compte courant`, owner: 'partner' },
      { id: 'partner_card', name: `${partner} — Carte`, owner: 'partner' },
      { id: 'cash', name: 'Espèces', owner: 'household' }
    ];
  }

  function buildEmptyState(names = {}) {
    return {
      version: 2,
      household: {
        name: 'Notre espace', baseCurrency: 'CAD', secondaryCurrency: 'EUR', showSecondary: true,
        theme: 'light', lastRoute: 'dashboard', lastScope: 'household', pin: '',
        members: [
          { id: 'la', name: names.la || 'Membre 1', initials: initialsFor(names.la || 'Membre 1') },
          { id: 'partner', name: names.partner || 'Membre 2', initials: initialsFor(names.partner || 'Membre 2') }
        ],
        defaultSplit: { la: 50, partner: 50 }, categorySplits: {}
      },
      categories: categories.map(c => ({ ...c })), accounts: defaultAccounts(names), budgets: [], budgetTemplate: [], transactions: [], goals: []
    };
  }

  function migrateState(parsed) {
    parsed.version = 2;
    parsed.household ||= buildEmptyState().household;
    parsed.household.categorySplits ||= {};
    parsed.household.defaultSplit ||= { la: 50, partner: 50 };
    parsed.household.members ||= buildEmptyState().household.members;
    parsed.categories ||= [];
    const savedById = new Map(parsed.categories.map(c => [c.id, c]));
    parsed.categories = categories.map(c => ({ ...c, ...(savedById.get(c.id) || {}) }));
    parsed.categories.push(...[...savedById.values()].filter(c => !categories.some(base => base.id === c.id)));
    parsed.accounts ||= defaultAccounts({ la: parsed.household.members[0]?.name, partner: parsed.household.members[1]?.name });
    parsed.budgets ||= []; parsed.budgetTemplate ||= []; parsed.transactions ||= []; parsed.goals ||= [];
    return parsed;
  }

  let firstLaunch = false;
  let state;
  let balanceMonthlyOnly = false;
  let activeStorageKey = STORAGE_KEY;
  let suppressCloudSave = false;
  let appActivated = false;
  let eventsBound = false;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        firstLaunch = true;
        return buildEmptyState({ la: 'Louis-Antoine', partner: 'Élise' });
      }
      const parsed = JSON.parse(saved);
      if (!parsed.version) throw new Error('Format non reconnu');
      return migrateState(parsed);
    } catch (error) {
      console.warn('Impossible de charger les données, création d’un espace vide.', error);
      firstLaunch = true;
      return buildEmptyState({ la: 'Louis-Antoine', partner: 'Élise' });
    }
  }

  state = loadState();

  function saveState() {
    localStorage.setItem(activeStorageKey, JSON.stringify(state));
    if (!suppressCloudSave && window.BudgetDuoCloud?.queueSave) {
      window.BudgetDuoCloud.queueSave(state);
    }
  }

  function replaceState(nextState, storageKey = activeStorageKey) {
    suppressCloudSave = true;
    activeStorageKey = storageKey || STORAGE_KEY;
    state = migrateState(structuredClone(nextState));
    localStorage.setItem(activeStorageKey, JSON.stringify(state));
    suppressCloudSave = false;
    if (appActivated) {
      applyTheme();
      setupDateInputs();
      renderAll();
      const route = location.hash.replace('#','') || state.household.lastRoute || 'dashboard';
      navigate(route);
    }
  }

  function localPreferencesFrom(source = state) {
    return {
      theme: source?.household?.theme || 'light',
      lastRoute: source?.household?.lastRoute || 'dashboard',
      lastScope: source?.household?.lastScope || 'household',
      pin: source?.household?.pin || ''
    };
  }

  function cloudCacheKey(householdId) {
    return `${CLOUD_CACHE_PREFIX}${householdId}`;
  }

  function getLegacyState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return migrateState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  function member(id) { return state.household.members.find(m => m.id === id) || { name: id, initials: '?' }; }
  function category(id) { return state.categories.find(c => c.id === id) || { name: 'Sans catégorie', icon: '?' }; }
  function account(id) { return state.accounts.find(a => a.id === id) || { name: 'Non précisé' }; }

  function txSignedAmount(tx) {
    if (tx.type === 'expense') return -Number(tx.amountCAD || 0);
    if (tx.type === 'refund' || tx.type === 'income') return Number(tx.amountCAD || 0);
    return 0;
  }

  function isInScope(tx, scope) {
    if (scope === 'household') return true;
    if (scope === 'couple') return tx.beneficiary === 'couple';
    if (scope === 'la' || scope === 'partner') {
      return tx.beneficiary === scope || tx.beneficiary === 'couple';
    }
    return true;
  }

  function splitShareAmount(tx, scope) {
    const amount = Number(tx.amountCAD || 0);
    if (tx.splitMode === 'amount' && tx.splitAmounts && Number.isFinite(Number(tx.splitAmounts[scope]))) {
      const total = Number(tx.splitAmounts.la || 0) + Number(tx.splitAmounts.partner || 0);
      if (Math.abs(total - amount) <= 0.05) return Number(tx.splitAmounts[scope] || 0);
    }
    return amount * Number(tx.split?.[scope] ?? state.household.defaultSplit[scope]) / 100;
  }

  function allocatedAmount(tx, scope) {
    const amount = Number(tx.amountCAD || 0);
    if (scope === 'household' || scope === 'couple') return amount;
    if (tx.beneficiary === scope) return amount;
    if (tx.beneficiary === 'couple') return splitShareAmount(tx, scope);
    return 0;
  }

  function budgetAmount(entry, scope) {
    const amount = Number(entry.amount || 0);
    if (scope === 'household') return amount;
    if (scope === 'couple') return entry.scope === 'couple' ? amount : 0;
    if (entry.scope === scope) return amount;
    if (entry.scope === 'couple') {
      const split = state.household.categorySplits[entry.categoryId] || state.household.defaultSplit;
      return amount * Number(split[scope] || 0) / 100;
    }
    return 0;
  }

  function monthTransactions(month, scope = 'household') {
    return state.transactions.filter(tx => tx.date.startsWith(month) && isInScope(tx, scope));
  }

  function summaryFor(month, scope) {
    const txs = monthTransactions(month, scope).filter(tx => tx.status === 'confirmed');
    const budgets = state.budgets.filter(b => b.month === month);
    let incomeActual = 0, expenseActual = 0, refundActual = 0;
    txs.forEach(tx => {
      const amount = allocatedAmount(tx, scope);
      if (tx.type === 'income') incomeActual += amount;
      if (tx.type === 'expense') expenseActual += amount;
      if (tx.type === 'refund') refundActual += amount;
    });
    expenseActual = Math.max(0, expenseActual - refundActual);
    const incomeBudget = budgets.filter(b => category(b.categoryId).type === 'income').reduce((sum, b) => sum + budgetAmount(b, scope), 0);
    const expenseBudget = budgets.filter(b => category(b.categoryId).type === 'expense').reduce((sum, b) => sum + budgetAmount(b, scope), 0);
    const savingsActual = incomeActual - expenseActual;
    const availableBudget = incomeBudget - expenseBudget;
    return { incomeActual, expenseActual, refundActual, incomeBudget, expenseBudget, savingsActual, availableBudget };
  }

  function categorySummary(month, scope) {
    const expenseCategories = state.categories.filter(c => c.type === 'expense');
    return expenseCategories.map(cat => {
      const budget = state.budgets.filter(b => b.month === month && b.categoryId === cat.id).reduce((s, b) => s + budgetAmount(b, scope), 0);
      const txs = monthTransactions(month, scope).filter(tx => tx.categoryId === cat.id && tx.status === 'confirmed');
      const actual = txs.reduce((s, tx) => s + (tx.type === 'expense' ? allocatedAmount(tx, scope) : tx.type === 'refund' ? -allocatedAmount(tx, scope) : 0), 0);
      return { ...cat, budget, actual: Math.max(0, actual), percent: budget ? actual / budget * 100 : actual ? 999 : 0 };
    }).filter(item => item.budget || item.actual);
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.household.theme;
    $('#themeToggle').textContent = state.household.theme === 'dark' ? '☀' : '☾';
    document.querySelector('meta[name="theme-color"]').content = state.household.theme === 'dark' ? '#0c1429' : '#101c3d';
  }

  function setupDateInputs() {
    ['dashboardMonth','budgetMonth','transactionMonth','coupleMonth'].forEach(id => { if (!$('#' + id).value) $('#' + id).value = currentMonth; });
    $('#txDate').value = currentDate;
  }

  const pageInfo = {
    dashboard: ['Vue d’ensemble', 'Synthèse'], budget: ['Prévisionnel', 'Budget'], transactions: ['Opérations', 'Réel'],
    couple: ['Dépenses partagées', 'Couple'], goals: ['Projets à financer', 'Objectifs'], settings: ['Configuration', 'Paramètres']
  };

  function navigate(route) {
    route = pageInfo[route] ? route : 'dashboard';
    $$('.page').forEach(page => page.classList.toggle('active', page.dataset.page === route));
    $$('[data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === route));
    $('#pageEyebrow').textContent = pageInfo[route][0];
    $('#pageTitle').textContent = pageInfo[route][1];
    state.household.lastRoute = route;
    saveState();
    location.hash = route;
    if (route === 'dashboard') renderDashboard();
    if (route === 'budget') renderBudget();
    if (route === 'transactions') renderTransactions();
    if (route === 'couple') renderCouple();
    if (route === 'goals') renderGoals();
    if (route === 'settings') renderSettings();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderDashboard() {
    const month = $('#dashboardMonth').value || currentMonth;
    const scope = $('#dashboardScope').value || 'household';
    const mode = $('#dashboardMode').value;
    const s = summaryFor(month, scope);
    const expensePercent = s.expenseBudget ? s.expenseActual / s.expenseBudget * 100 : 0;
    const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
    const currentDay = month === currentMonth ? today.getDate() : daysInMonth;
    const projected = currentDay ? s.expenseActual / currentDay * daysInMonth : s.expenseActual;

    let heroValue, heroLabel, heroText, progressValue, progressTitle;
    if (mode === 'actual') {
      heroValue = s.incomeActual - s.expenseActual;
      heroLabel = 'Solde réel du mois';
      heroText = `${money(s.incomeActual)} encaissés moins ${money(s.expenseActual)} dépensés`;
      progressValue = s.incomeActual ? s.expenseActual / s.incomeActual * 100 : 0;
      progressTitle = 'Part des revenus dépensée';
    } else if (mode === 'budget') {
      heroValue = s.incomeBudget - s.expenseBudget;
      heroLabel = 'Solde prévu par le budget';
      heroText = `${money(s.incomeBudget)} de revenus prévus moins ${money(s.expenseBudget)} de dépenses prévues`;
      progressValue = s.incomeBudget ? s.expenseBudget / s.incomeBudget * 100 : 0;
      progressTitle = 'Part des revenus budgétée';
    } else {
      heroValue = s.expenseBudget - s.expenseActual;
      heroLabel = heroValue >= 0 ? 'Budget de dépenses encore disponible' : 'Dépassement du budget de dépenses';
      heroText = `Projection de fin de mois : ${money(projected)} de dépenses pour un budget de ${money(s.expenseBudget)}`;
      progressValue = expensePercent;
      progressTitle = 'Budget de dépenses consommé';
    }

    $('#heroLabel').textContent = heroLabel;
    $('#heroAvailable').textContent = money(heroValue);
    $('#heroAvailable').className = heroValue < 0 ? 'amount-negative' : '';
    $('#heroProjection').textContent = heroText;
    $('#heroProgressTitle').textContent = progressTitle;
    $('#heroPercent').textContent = `${number(progressValue)} %`;
    $('#heroProgress').style.width = `${clamp(progressValue, 0, 100)}%`;
    $('#heroProgress').style.background = progressValue > 100 ? 'var(--red)' : progressValue >= 80 ? 'var(--orange)' : '';

    $('#kpiIncomeLabel').textContent = mode === 'budget' ? 'Revenus budgétés' : 'Revenus réels';
    $('#kpiExpenseLabel').textContent = mode === 'budget' ? 'Dépenses budgétées' : 'Dépenses réelles';
    $('#kpiSavingsLabel').textContent = mode === 'budget' ? 'Épargne budgétée' : 'Épargne potentielle';
    $('#kpiIncomeActual').textContent = mode === 'budget' ? money(s.incomeBudget) : money(s.incomeActual);
    $('#kpiIncomeBudget').textContent = mode === 'actual' ? 'Revenus comptabilisés' : `Budget : ${money(s.incomeBudget)}`;
    $('#kpiExpenseActual').textContent = mode === 'budget' ? money(s.expenseBudget) : money(s.expenseActual);
    $('#kpiExpenseBudget').textContent = mode === 'actual' ? 'Dépenses comptabilisées' : `Budget : ${money(s.expenseBudget)}`;
    const variance = s.expenseBudget - s.expenseActual;
    $('#kpiVariance').textContent = money(Math.abs(variance));
    $('#kpiVariance').className = variance >= 0 ? 'amount-positive' : 'amount-negative';
    $('#kpiVarianceLabel').textContent = variance >= 0 ? 'Sous le budget' : 'Au-dessus du budget';
    const savings = mode === 'budget' ? s.incomeBudget - s.expenseBudget : s.savingsActual;
    $('#kpiSavings').textContent = money(savings);
    const incomeBase = mode === 'budget' ? s.incomeBudget : s.incomeActual;
    $('#kpiSavingsRate').textContent = `Taux : ${number(incomeBase ? savings / incomeBase * 100 : 0)} %`;

    state.household.lastScope = scope;
    saveState();
    renderCategoryChart(month, scope, mode);
    renderAlerts(month, scope);
    renderTrendChart(month, scope);
    renderRecentTransactions(month, scope);
  }

  function renderCategoryChart(month, scope, mode) {
    const items = categorySummary(month, scope).sort((a,b) => Math.max(b.actual,b.budget)-Math.max(a.actual,a.budget)).slice(0,8);
    const max = Math.max(...items.map(i => Math.max(i.budget, i.actual)), 1);
    $('#categoryChart').innerHTML = items.length ? items.map(item => {
      const value = mode === 'actual' ? money(item.actual) : mode === 'budget' ? money(item.budget) : `${money(item.actual)} / ${money(item.budget)}`;
      return `<div class="bar-row">
        <div class="bar-name" title="${item.name}">${item.name}</div>
        <div class="bar-stack">
          ${mode !== 'actual' ? `<div class="bar-bg"><div class="bar-budget" style="width:${item.budget / max * 100}%"></div></div>` : ''}
          ${mode !== 'budget' ? `<div class="bar-bg"><div class="bar-actual" style="width:${item.actual / max * 100}%;background:${item.percent > 100 ? 'var(--red)' : item.percent >= 80 ? 'var(--orange)' : 'var(--indigo)'}"></div></div>` : ''}
        </div><div class="bar-value">${value}</div></div>`;
    }).join('') : `<div class="empty-state"><strong>Aucune donnée</strong>Ajoute un budget ou une transaction pour ce mois.</div>`;
  }

  function renderAlerts(month, scope) {
    const pendingRecurring = monthTransactions(month, scope).filter(tx => tx.recurring && tx.status === 'pending');
    const categoryAlerts = categorySummary(month, scope).filter(i => i.percent >= 80).sort((a,b) => b.percent-a.percent);
    const alerts = [];
    pendingRecurring.slice(0, 3).forEach(tx => alerts.push({ kind:'pending', title:`${tx.name} à vérifier`, text:`Transaction récurrente de ${money(tx.amountCAD)} non encore comptabilisée.` }));
    categoryAlerts.slice(0, Math.max(1, 4-alerts.length)).forEach(item => alerts.push({ kind:item.percent>100?'danger':'warning', title:`${item.name} — ${number(item.percent)} %`, text:item.percent>100?`Dépassement de ${money(item.actual-item.budget)}`:`${money(item.budget-item.actual)} encore disponible` }));
    if (!alerts.length) {
      $('#alertsList').innerHTML = `<div class="alert-item success"><span class="alert-icon">✓</span><div><strong>Tout est sous contrôle</strong><p>Aucune transaction récurrente à vérifier et aucune catégorie au-dessus de 80 %.</p></div></div>`;
      return;
    }
    $('#alertsList').innerHTML = alerts.map(item => `<div class="alert-item ${item.kind==='danger'?'danger':''}"><span class="alert-icon">${item.kind==='pending'?'◷':item.kind==='danger'?'!':'◷'}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></div>`).join('');
  }

  function renderTrendChart(month, scope) {
    const year = month.slice(0,4);
    const months = Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
    const values = months.map(m => { const s = summaryFor(m,scope); return { month:m,budget:s.expenseBudget,actual:s.expenseActual }; });
    const max = Math.max(...values.flatMap(v=>[v.budget,v.actual]),1);
    $('#trendChart').innerHTML = values.map(v => `<div class="trend-month"><div class="trend-bars"><div class="trend-bar budget" title="Budget ${money(v.budget)}" style="height:${Math.max(2,v.budget/max*100)}%"></div><div class="trend-bar actual" title="Réel ${money(v.actual)}" style="height:${Math.max(2,v.actual/max*100)}%"></div></div><small>${shortMonth(v.month)}</small></div>`).join('');
  }

  function renderRecentTransactions(month, scope) {
    const items = monthTransactions(month,scope).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
    $('#recentTransactions').innerHTML = items.length ? items.map(tx => {
      const cat = category(tx.categoryId);
      return `<div class="transaction-mini"><span class="category-dot">${cat.icon}</span><div><strong>${escapeHtml(tx.name)}</strong><small>${cat.name} · ${formatDate(tx.date)}</small></div><strong class="${tx.type === 'expense' ? 'amount-negative' : tx.type === 'income' || tx.type === 'refund' ? 'amount-positive' : ''}">${tx.type === 'expense' ? '−' : tx.type === 'income' || tx.type === 'refund' ? '+' : ''}${money(tx.amountCAD)}</strong></div>`;
    }).join('') : `<div class="empty-state">Aucune transaction ce mois-ci.</div>`;
  }

  function renderBudget() {
    const month = $('#budgetMonth').value || currentMonth;
    const grouped = state.categories.filter(c => ['income','expense'].includes(c.type));
    const groups = [...new Set(grouped.map(c=>c.group))];
    let html = '';
    groups.forEach(group => {
      html += `<tr class="category-row"><td colspan="5">${group}</td></tr>`;
      grouped.filter(c=>c.group===group).forEach(cat => {
        const values = ['la','partner','couple'].map(scope => state.budgets.find(b=>b.month===month&&b.categoryId===cat.id&&b.scope===scope)?.amount || 0);
        html += `<tr data-category="${cat.id}"><td>${cat.icon} ${cat.name}</td>${['la','partner','couple'].map((scope,i)=>`<td><input class="budget-input" data-scope="${scope}" data-category="${cat.id}" type="number" min="0" step="1" value="${values[i]}"></td>`).join('')}<td class="budget-row-total">${money(values.reduce((a,b)=>a+Number(b),0))}</td></tr>`;
      });
    });
    $('#budgetTableBody').innerHTML = html;
    updateBudgetTotals();
    renderAnnualBudget();
  }

  function updateBudgetTotals() {
    let grand = 0;
    $$('.budget-table tr[data-category]').forEach(row => {
      const total = [...row.querySelectorAll('.budget-input')].reduce((s,input)=>s+Number(input.value||0),0);
      row.querySelector('.budget-row-total').textContent = money(total);
      grand += total;
    });
    $('#budgetGrandTotal').textContent = `Total : ${money(grand)}`;
  }

  function saveBudgetFromTable() {
    const month = $('#budgetMonth').value;
    $$('.budget-input').forEach(input => {
      const categoryId = input.dataset.category;
      const scope = input.dataset.scope;
      const amount = Number(input.value || 0);
      let entry = state.budgets.find(b=>b.month===month&&b.categoryId===categoryId&&b.scope===scope);
      if (entry) entry.amount = amount;
      else state.budgets.push({ id:uid('b'), month, categoryId, scope, amount });
    });
    saveState();
    renderBudget();
    renderDashboard();
    showToast(`Budget de ${monthLabel(month)} enregistré.`);
  }

  function renderAnnualBudget() {
    const scope = $('#annualScope').value || 'household';
    const year = ($('#budgetMonth').value || currentMonth).slice(0,4);
    const months = Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
    const monthly = months.map(m => ({ month:m, ...summaryFor(m,scope) }));
    $('#annualTableHead').innerHTML = `<tr><th>Catégorie</th>${months.map(m=>`<th>${shortMonth(m)}</th>`).join('')}<th>Total</th></tr>`;
    const items = state.categories.filter(c=>c.type==='expense');
    $('#annualTableBody').innerHTML = items.map(cat => {
      const vals = months.map(m=>state.budgets.filter(b=>b.month===m&&b.categoryId===cat.id).reduce((sum,b)=>sum+budgetAmount(b,scope),0));
      return `<tr><td>${cat.name}</td>${vals.map(v=>`<td>${money(v)}</td>`).join('')}<td><strong>${money(vals.reduce((a,b)=>a+b,0))}</strong></td></tr>`;
    }).join('');
    const annualBudget = monthly.reduce((sum,m)=>sum+m.expenseBudget,0);
    const annualActual = monthly.reduce((sum,m)=>sum+m.expenseActual,0);
    const projected = monthly.reduce((sum,m)=> {
      if(m.month < currentMonth) return sum+m.expenseActual;
      if(m.month === currentMonth) {
        const days=new Date(Number(m.month.slice(0,4)),Number(m.month.slice(5,7)),0).getDate();
        return sum+(m.expenseActual/Math.max(1,today.getDate())*days);
      }
      return sum+m.expenseBudget;
    },0);
    $('#annualSummary').innerHTML = `<div class="summary-chip"><span>Budget annuel</span><strong>${money(annualBudget)}</strong></div><div class="summary-chip"><span>Réel à ce jour</span><strong>${money(annualActual)}</strong></div><div class="summary-chip"><span>Projection annuelle</span><strong>${money(projected)}</strong></div>`;
    const max = Math.max(...monthly.flatMap(m=>[m.expenseBudget,m.expenseActual]),1);
    $('#annualVisual').innerHTML = `<div class="annual-chart-legend"><span><i class="legend-budget"></i> Budget</span><span><i class="legend-actual"></i> Réel</span></div><div class="annual-month-grid">${monthly.map(m=>{
      const pct=m.expenseBudget?m.expenseActual/m.expenseBudget*100:0;
      return `<div class="annual-month-card" title="${shortMonth(m.month)} : ${money(m.expenseActual)} sur ${money(m.expenseBudget)}"><div class="annual-bars"><span class="annual-budget-bar" style="height:${Math.max(3,m.expenseBudget/max*100)}%"></span><span class="annual-actual-bar" style="height:${Math.max(m.expenseActual?3:0,m.expenseActual/max*100)}%;background:${pct>100?'var(--red)':pct>=80?'var(--orange)':'var(--indigo)'}"></span></div><strong>${shortMonth(m.month)}</strong><small>${number(pct)} %</small></div>`;
    }).join('')}</div>`;
    const catAnnual = items.map(cat=>{
      let budget=0,actual=0;
      months.forEach(m=>{budget+=state.budgets.filter(b=>b.month===m&&b.categoryId===cat.id).reduce((sum,b)=>sum+budgetAmount(b,scope),0);actual+=categorySummary(m,scope).find(x=>x.id===cat.id)?.actual||0;});
      return {...cat,budget,actual,pct:budget?actual/budget*100:0};
    }).filter(c=>c.budget||c.actual).sort((a,b)=>Math.max(b.budget,b.actual)-Math.max(a.budget,a.actual)).slice(0,8);
    $('#annualCategoryCards').innerHTML = catAnnual.map(cat=>`<div class="annual-category-card"><div><span>${cat.icon}</span><strong>${cat.name}</strong></div><p>${money(cat.actual)} sur ${money(cat.budget)}</p><div class="mini-progress"><i style="width:${clamp(cat.pct,0,100)}%;background:${cat.pct>100?'var(--red)':cat.pct>=80?'var(--orange)':'var(--turquoise)'}"></i></div><small>${cat.pct>100?`Dépassement ${money(cat.actual-cat.budget)}`:`Reste ${money(Math.max(0,cat.budget-cat.actual))}`}</small></div>`).join('');
  }

  function filteredTransactions() {
    const month = $('#transactionMonth').value || currentMonth;
    const type = $('#transactionTypeFilter').value;
    const scope = $('#transactionScopeFilter').value;
    const search = $('#transactionSearch').value.trim().toLowerCase();
    return state.transactions.filter(tx => {
      const matchMonth = tx.date.startsWith(month);
      const matchType = type === 'all' || tx.type === type;
      const matchScope = scope === 'all' || tx.beneficiary === scope;
      const haystack = `${tx.name} ${tx.merchant||''} ${tx.note||''} ${category(tx.categoryId).name}`.toLowerCase();
      return matchMonth && matchType && matchScope && (!search || haystack.includes(search));
    }).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  }

  function renderTransactions() {
    const txs = filteredTransactions();
    $('#txCount').textContent = txs.length;
    $('#txExpenses').textContent = money(txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amountCAD),0));
    $('#txIncome').textContent = money(txs.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amountCAD),0));
    $('#txPending').textContent = txs.filter(t=>t.status==='pending').length;
    $('#transactionsTableBody').innerHTML = txs.length ? txs.map(tx=>transactionRow(tx)).join('') : `<tr><td colspan="8"><div class="empty-state"><strong>Aucune transaction</strong>Modifie les filtres ou ajoute une opération.</div></td></tr>`;
  }

  function transactionRow(tx) {
    const cat = category(tx.categoryId);
    const payer = member(tx.payerId);
    const beneficiary = tx.beneficiary === 'couple' ? {name:'Commun',initials:'2',id:'couple'} : member(tx.beneficiary);
    const sign = tx.type === 'expense' ? '−' : tx.type === 'income' || tx.type === 'refund' ? '+' : '';
    const amountClass = tx.type === 'expense' ? 'amount-negative' : tx.type === 'income' || tx.type === 'refund' ? 'amount-positive' : '';
    return `<tr>
      <td>${formatDate(tx.date)}</td><td><strong>${escapeHtml(tx.name)}</strong><br><small class="muted">${escapeHtml(tx.merchant || account(tx.accountId).name)}</small></td>
      <td>${cat.icon} ${cat.name}</td><td><span class="scope-chip"><span class="scope-avatar scope-${tx.payerId}">${payer.initials}</span>${payer.name}</span></td>
      <td><span class="scope-chip"><span class="scope-avatar scope-${beneficiary.id}">${beneficiary.initials}</span>${beneficiary.name}</span></td>
      <td><strong class="${amountClass}">${sign}${money(tx.amountCAD)}</strong>${tx.currency !== 'CAD' ? `<br><small class="muted">${money(tx.amountOriginal,tx.currency,2)}</small>` : ''}</td>
      <td><span class="badge badge-${tx.status}">${tx.status==='confirmed'?'Comptabilisé':'À vérifier'}</span></td>
      <td><div class="row-actions">${tx.status==='pending'?`<button class="row-action confirm-tx" data-id="${tx.id}" title="Comptabiliser" aria-label="Comptabiliser">✓</button>`:''}<button class="row-action edit-tx" data-id="${tx.id}" aria-label="Modifier">✎</button><button class="row-action delete-tx" data-id="${tx.id}" aria-label="Supprimer">×</button></div></td>
    </tr>`;
  }

  function calculateCouple(month = null, beforeMonth = null, throughMonth = null) {
    const txs = state.transactions.filter(tx => {
      if (tx.status !== 'confirmed') return false;
      if (month && !tx.date.startsWith(month)) return false;
      if (beforeMonth && tx.date >= `${beforeMonth}-01`) return false;
      if (throughMonth && tx.date > `${throughMonth}-31`) return false;
      return true;
    });
    let balanceLa = 0;
    const stats = { la: { paid:0, share:0 }, partner:{ paid:0, share:0 } };
    txs.forEach(tx => {
      const amount = Number(tx.amountCAD || 0);
      if (tx.type === 'expense' || tx.type === 'refund') {
        const sign = tx.type === 'expense' ? 1 : -1;
        const paidLa = tx.payerId === 'la' ? amount * sign : 0;
        const paidPartner = tx.payerId === 'partner' ? amount * sign : 0;
        let shareLa = 0, sharePartner = 0;
        if (tx.beneficiary === 'couple') {
          shareLa = splitShareAmount(tx, 'la') * sign;
          sharePartner = splitShareAmount(tx, 'partner') * sign;
        } else if (tx.beneficiary === 'la') shareLa = amount * sign;
        else if (tx.beneficiary === 'partner') sharePartner = amount * sign;
        balanceLa += paidLa - shareLa;
        stats.la.paid += paidLa; stats.partner.paid += paidPartner;
        stats.la.share += shareLa; stats.partner.share += sharePartner;
      } else if (tx.type === 'transfer') {
        if (tx.payerId === 'la' && tx.beneficiary === 'partner') balanceLa += amount;
        if (tx.payerId === 'partner' && tx.beneficiary === 'la') balanceLa -= amount;
      }
    });
    return { balanceLa, stats, txs };
  }

  function renderCouple() {
    const month = $('#coupleMonth').value || currentMonth;
    const cumulative = calculateCouple(null, null, month);
    const monthly = calculateCouple(month);
    const opening = calculateCouple(null, month, null);
    const chosen = balanceMonthlyOnly ? monthly : cumulative;
    const { balanceLa, stats } = chosen;
    const la = member('la'), partner = member('partner');
    const abs = Math.abs(balanceLa);
    const label = balanceMonthlyOnly ? `Variation de ${monthLabel(month)}` : `Solde cumulé à la fin de ${monthLabel(month)}`;
    if (abs < .01) {
      $('#settlementHero').className = 'settlement-hero neutral';
      $('#settlementHero').innerHTML = `<span>${label}</span><strong>Vous êtes à l’équilibre</strong><p>Les remboursements enregistrés et les dépenses partagées se compensent.</p>`;
    } else {
      const creditor = balanceLa > 0 ? la : partner;
      const debtor = balanceLa > 0 ? partner : la;
      $('#settlementHero').className = 'settlement-hero';
      $('#settlementHero').innerHTML = `<span>${label}</span><strong>${debtor.name} doit ${money(abs)} à ${creditor.name}</strong><p>Le solde se reporte automatiquement d’un mois à l’autre et diminue lorsqu’un remboursement est enregistré.</p>`;
    }
    $('#balanceBreakdown').innerHTML = `<div><span>Solde avant le mois</span><strong>${formatBalance(opening.balanceLa)}</strong></div><div><span>Mouvement du mois</span><strong>${formatBalance(monthly.balanceLa)}</strong></div><div><span>Solde cumulé</span><strong>${formatBalance(cumulative.balanceLa)}</strong></div>`;
    $('#showAllTimeBalance').textContent = balanceMonthlyOnly ? 'Revenir au solde cumulé' : 'Afficher uniquement le mois';
    $('#contributionCards').innerHTML = ['la','partner'].map(id => `<div class="contribution-card"><h3>${member(id).name}</h3><div class="contribution-line"><span>Total payé</span><strong>${money(stats[id].paid)}</strong></div><div class="contribution-line"><span>Part réelle</span><strong>${money(stats[id].share)}</strong></div><div class="contribution-line"><span>Avance nette</span><strong>${money(stats[id].paid-stats[id].share)}</strong></div></div>`).join('');
    renderSplitRules();
    const txs = state.transactions.filter(tx => tx.date.startsWith(month) && (tx.beneficiary==='couple'||tx.type==='transfer')).sort((a,b)=>b.date.localeCompare(a.date));
    $('#coupleTransactions').innerHTML = txs.length ? txs.map(tx => `<div class="couple-tx"><span class="category-dot">${category(tx.categoryId).icon}</span><div><strong>${escapeHtml(tx.name)}</strong><div class="payer-arrow">${member(tx.payerId).name} → ${tx.beneficiary==='couple'?'Commun':member(tx.beneficiary).name} · ${formatDate(tx.date)}</div></div><strong>${money(tx.amountCAD)}</strong></div>`).join('') : `<div class="empty-state">Aucune opération partagée pour cette période.</div>`;
  }

  function formatBalance(value) {
    if (Math.abs(value) < .01) return '0 $';
    return value > 0 ? `${member('partner').name} doit ${money(value)} à ${member('la').name}` : `${member('la').name} doit ${money(Math.abs(value))} à ${member('partner').name}`;
  }

  function renderSplitRules() {
    const month = $('#coupleMonth').value || currentMonth;
    const ids = [...new Set(['rent','groceries','restaurants','vacation', ...Object.keys(state.household.categorySplits || {})])].filter(id=>category(id).type==='expense');
    $('#splitRules').innerHTML = ids.map(id => {
      const split = state.household.categorySplits[id] || state.household.defaultSplit;
      const commonBudget = state.budgets.filter(b=>b.month===month&&b.categoryId===id&&b.scope==='couple').reduce((sum,b)=>sum+Number(b.amount||0),0);
      return `<div class="split-rule"><div><strong>${category(id).name}</strong><br><small>${member('la').name} / ${member('partner').name}</small></div><div class="split-rule-values"><strong>${number(split.la,2)} % / ${number(split.partner,2)} %</strong><small>${money(commonBudget*split.la/100)} / ${money(commonBudget*split.partner/100)} sur le budget commun</small></div></div>`;
    }).join('');
  }

  function renderSplitRulesEditor() {
    const month = $('#coupleMonth').value || currentMonth;
    const expenseCategories = state.categories.filter(c=>c.type==='expense');
    $('#splitRulesEditor').innerHTML = expenseCategories.map(cat=>{
      const split=state.household.categorySplits[cat.id]||state.household.defaultSplit;
      const commonBudget=state.budgets.filter(b=>b.month===month&&b.categoryId===cat.id&&b.scope==='couple').reduce((sum,b)=>sum+Number(b.amount||0),0);
      return `<div class="split-editor-row" data-category="${cat.id}"><div><strong>${cat.name}</strong><small>Budget commun : ${money(commonBudget)}</small></div><label>${member('la').name}<input class="rule-la" type="number" min="0" max="100" step="0.01" value="${split.la}"></label><label>${member('partner').name}<input class="rule-partner" type="number" min="0" max="100" step="0.01" value="${split.partner}"></label><span class="rule-amounts">${money(commonBudget*split.la/100)} / ${money(commonBudget*split.partner/100)}</span></div>`;
    }).join('');
  }

  function renderGoals() {
    $('#goalGrid').innerHTML = state.goals.length ? state.goals.map(goal => {
      const pct = clamp(goal.current/goal.target*100,0,100);
      const owner = goal.owner==='couple'?'Commun':member(goal.owner).name;
      return `<article class="goal-card"><div class="goal-card-header"><div><h3>${escapeHtml(goal.name)}</h3><p>${owner}${goal.date?` · Cible ${formatDate(goal.date)}`:''}</p></div><button class="row-action delete-goal" data-id="${goal.id}">×</button></div><div class="goal-progress-track"><div class="goal-progress-fill" style="width:${pct}%"></div></div><div class="goal-stats"><span>${money(goal.current)} accumulés</span><strong>${number(pct)} %</strong></div><div class="goal-stats"><span>Objectif</span><strong>${money(goal.target)}</strong></div></article>`;
    }).join('') : `<div class="empty-state"><strong>Aucun objectif</strong>Créez votre premier projet d’épargne.</div>`;
  }

  function renderSettings() {
    $('#memberLaName').value = member('la').name;
    $('#memberLaInitials').value = member('la').initials;
    $('#memberPartnerName').value = member('partner').name;
    $('#memberPartnerInitials').value = member('partner').initials;
    $('#defaultSplitLa').value = state.household.defaultSplit.la;
    $('#defaultSplitPartner').value = state.household.defaultSplit.partner;
    $('#baseCurrency').value = state.household.baseCurrency;
    $('#secondaryCurrency').value = state.household.secondaryCurrency;
    $('#showSecondaryCurrency').checked = state.household.showSecondary;
    const groups=[...new Set(state.categories.filter(c=>['income','expense'].includes(c.type)).map(c=>c.group))].sort();
    $('#categoryGroups').innerHTML=groups.map(group=>`<option value="${escapeHtml(group)}"></option>`).join('');
    $('#categoryManager').innerHTML=state.categories.filter(c=>['income','expense'].includes(c.type)).map(c=>`<div class="category-manager-row"><span>${c.icon}</span><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.group)} · ${c.type==='income'?'Revenu':'Dépense'}</small></div>${c.custom?`<button class="row-action delete-category" data-id="${c.id}" title="Supprimer">×</button>`:'<span class="locked-label">Incluse</span>'}</div>`).join('');
    updateRateLabel();
  }

  function populateSelects() {
    const memberOptions = state.household.members.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    $('#txPayer').innerHTML = memberOptions;
    $('#txAccount').innerHTML = state.accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
    $('#txBeneficiary').innerHTML = `<option value="couple">Commun — vous deux</option>${state.household.members.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('')}`;
    $('#dashboardScope').innerHTML = `<option value="household">Total du ménage</option><option value="couple">Dépenses communes</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#dashboardScope').value = state.household.lastScope || 'household';
    $('#annualScope').innerHTML = `<option value="household">Total du ménage</option><option value="couple">Dépenses communes</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#transactionScopeFilter').innerHTML = `<option value="all">Tous</option><option value="couple">Commun</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#goalOwner').innerHTML = `<option value="couple">Commun</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#splitLaLabel').textContent = member('la').name; $('#splitPartnerLabel').textContent = member('partner').name;
    $('#splitAmountLaLabel').textContent = member('la').name; $('#splitAmountPartnerLabel').textContent = member('partner').name;
    populateCategorySelect();
  }

  function populateCategorySelect() {
    const type = $('#txType').value || 'expense';
    const desiredType = type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'expense';
    const cats = state.categories.filter(c=>c.type===desiredType);
    $('#txCategory').innerHTML = cats.map(c=>`<option value="${c.id}">${c.group} — ${c.name}</option>`).join('');
  }

  function openTransactionDialog(tx = null, settlement = false) {
    $('#transactionForm').reset();
    $('#transactionId').value = tx?.id || '';
    $('#transactionDialogTitle').textContent = tx ? 'Modifier la transaction' : settlement ? 'Ajouter un remboursement' : 'Ajouter une transaction';
    $('#txDate').value = tx?.date || currentDate;
    $('#txType').value = tx?.type || (settlement ? 'transfer' : 'expense');
    populateCategorySelect();
    $('#txName').value = tx?.name || (settlement ? 'Remboursement entre nous' : '');
    $('#txAmount').value = tx?.amountOriginal || '';
    $('#txCurrency').value = tx?.currency || 'CAD';
    $('#txCategory').value = tx?.categoryId || (settlement ? 'settlement' : $('#txCategory').options[0]?.value);
    $('#txPayer').value = tx?.payerId || 'la';
    $('#txBeneficiary').value = tx?.beneficiary || (settlement ? 'partner' : 'couple');
    $('#txMerchant').value = tx?.merchant || '';
    $('#txAccount').value = tx?.accountId || 'la_card';
    $('#txRate').value = tx?.rate || 1;
    $('#txBankAmount').value = tx?.bankAmount || '';
    $('#txSplitLa').value = tx?.split?.la ?? state.household.defaultSplit.la;
    $('#txSplitPartner').value = tx?.split?.partner ?? state.household.defaultSplit.partner;
    const total=Number(tx?.amountCAD||0);
    $('#txSplitAmountLa').value = tx?.splitAmounts?.la ?? (total ? total*Number($('#txSplitLa').value)/100 : '');
    $('#txSplitAmountPartner').value = tx?.splitAmounts?.partner ?? (total ? total*Number($('#txSplitPartner').value)/100 : '');
    const mode=tx?.splitMode||'percent';
    document.querySelector(`input[name="splitMode"][value="${mode}"]`).checked=true;
    $('#txStatus').value = tx?.status || 'confirmed';
    $('#txRecurring').checked = Boolean(tx?.recurring);
    $('#txNote').value = tx?.note || '';
    setSplitMode(mode); updateTransactionFieldVisibility(); updateCurrencyHint(); updateSplitSummary();
    $('#transactionDialog').showModal(); setTimeout(()=>$('#txName').focus(),100);
  }

  function updateTransactionFieldVisibility() {
    const type = $('#txType').value;
    $('#payerLabel').firstChild.textContent = type === 'income' ? 'Reçu par *' : type === 'transfer' ? 'Envoyé par *' : type === 'refund' ? 'Remboursé à *' : 'Payé par *';
    const hints={expense:'Une dépense comptabilisée alimente immédiatement le réel.',income:'Un revenu comptabilisé alimente les revenus réels.',refund:'Un remboursement d’achat réduit les dépenses de la catégorie choisie.',transfer:'Un transfert entre vous modifie uniquement le solde partagé, sans fausser revenus ni dépenses.'};
    $('#transactionTypeHint').textContent=hints[type];
    $('.split-fieldset').classList.toggle('hidden', $('#txBeneficiary').value !== 'couple' || type === 'income' || type === 'transfer');
  }

  function formCadAmount() {
    return Number($('#txBankAmount').value||0) || Number($('#txAmount').value||0)*Number($('#txRate').value||1);
  }

  function setSplitMode(mode) {
    $('#splitPercentFields').classList.toggle('hidden',mode!=='percent');
    $('#splitAmountFields').classList.toggle('hidden',mode!=='amount');
    updateSplitSummary();
  }

  function syncSplitPercent(changed) {
    const other=changed==='la'?'partner':'la';
    $(`#txSplit${other==='la'?'La':'Partner'}`).value=clamp(100-Number($(`#txSplit${changed==='la'?'La':'Partner'}`).value||0),0,100).toFixed(2).replace(/\.00$/,'');
    const total=formCadAmount();
    $('#txSplitAmountLa').value=(total*Number($('#txSplitLa').value||0)/100).toFixed(2);
    $('#txSplitAmountPartner').value=(total*Number($('#txSplitPartner').value||0)/100).toFixed(2);
    updateSplitSummary();
  }

  function syncSplitAmount(changed) {
    const total=formCadAmount();
    const current=Number($(`#txSplitAmount${changed==='la'?'La':'Partner'}`).value||0);
    const other=Math.max(0,total-current);
    $(`#txSplitAmount${changed==='la'?'Partner':'La'}`).value=other.toFixed(2);
    const la=Number($('#txSplitAmountLa').value||0), partner=Number($('#txSplitAmountPartner').value||0);
    $('#txSplitLa').value=total?(la/total*100).toFixed(2):0; $('#txSplitPartner').value=total?(partner/total*100).toFixed(2):0;
    updateSplitSummary();
  }

  function updateSplitSummary() {
    const mode=document.querySelector('input[name="splitMode"]:checked')?.value||'percent';
    const total=formCadAmount();
    const la=mode==='amount'?Number($('#txSplitAmountLa').value||0):total*Number($('#txSplitLa').value||0)/100;
    const partner=mode==='amount'?Number($('#txSplitAmountPartner').value||0):total*Number($('#txSplitPartner').value||0)/100;
    $('#splitSummary').textContent=`${member('la').name} : ${money(la, 'CAD', 2)} · ${member('partner').name} : ${money(partner, 'CAD', 2)} · Total : ${money(total, 'CAD', 2)}`;
  }

  async function fetchRate(from, to='CAD', date=null) {
    if (from === to) return 1;
    const cache = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || '{}');
    const key = `${date||'latest'}_${from}_${to}`;
    const maxAge = 12 * 60 * 60 * 1000;
    if (cache[key] && Date.now()-cache[key].timestamp<maxAge) return cache[key].rate;
    const endpoint = date ? `https://api.frankfurter.app/${date}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Taux indisponible');
    const data = await response.json();
    const rate = Number(data.rates[to]);
    if (!rate) throw new Error('Taux introuvable');
    cache[key] = { rate, timestamp:Date.now() };
    localStorage.setItem(RATE_CACHE_KEY,JSON.stringify(cache));
    return rate;
  }

  async function updateCurrencyRate() {
    const currency = $('#txCurrency').value;
    if (currency === 'CAD') { $('#txRate').value = 1; updateCurrencyHint(); return; }
    $('#currencyHint').classList.remove('hidden');
    $('#currencyHint').textContent = 'Récupération du taux quotidien…';
    try {
      const rate = await fetchRate(currency,'CAD',$('#txDate').value || null);
      $('#txRate').value = rate.toFixed(6);
      updateCurrencyHint();
    } catch (error) {
      $('#currencyHint').textContent = 'Taux automatique indisponible. Saisis le taux ou le montant bancaire réel.';
    }
  }

  function updateCurrencyHint() {
    const currency = $('#txCurrency').value;
    const amount = Number($('#txAmount').value || 0);
    const rate = Number($('#txRate').value || 1);
    const bank = Number($('#txBankAmount').value || 0);
    if (currency === 'CAD') { $('#currencyHint').classList.add('hidden'); }
    else {
      $('#currencyHint').classList.remove('hidden');
      $('#currencyHint').textContent = `${money(amount,currency,2)} ≈ ${money(bank || amount*rate,'CAD',2)}. Le taux quotidien est chargé automatiquement; le montant bancaire réel a priorité.`;
    }
    if ((document.querySelector('input[name="splitMode"]:checked')?.value||'percent') === 'percent') syncSplitPercent('la'); else updateSplitSummary();
  }

  function saveTransaction(event) {
    event.preventDefault();
    const name = $('#txName').value.trim();
    const amountOriginal = Number($('#txAmount').value);
    const type = $('#txType').value;
    const beneficiary = $('#txBeneficiary').value;
    const currency = $('#txCurrency').value;
    const rate = Number($('#txRate').value || 1);
    const bankAmount = Number($('#txBankAmount').value || 0);
    const amountCAD = bankAmount || amountOriginal * rate;
    const splitMode=document.querySelector('input[name="splitMode"]:checked')?.value||'percent';
    let splitLa=Number($('#txSplitLa').value||0), splitPartner=Number($('#txSplitPartner').value||0);
    let splitAmounts={la:amountCAD*splitLa/100,partner:amountCAD*splitPartner/100};
    if (splitMode==='amount') {
      splitAmounts={la:Number($('#txSplitAmountLa').value||0),partner:Number($('#txSplitAmountPartner').value||0)};
      if (Math.abs(splitAmounts.la+splitAmounts.partner-amountCAD)>0.05) {showToast('Les montants répartis doivent égaler le montant final en CAD.');return;}
      splitLa=amountCAD?splitAmounts.la/amountCAD*100:0; splitPartner=amountCAD?splitAmounts.partner/amountCAD*100:0;
    }
    if (!name || !amountOriginal || amountOriginal <= 0) { showToast('Renseigne un nom et un montant valide.'); return; }
    if (beneficiary === 'couple' && !['income','transfer'].includes(type) && Math.abs(splitLa+splitPartner-100)>0.02) { showToast('La répartition doit totaliser 100 %.'); return; }
    const tx = {
      id: $('#transactionId').value || uid('t'), name, type, date: $('#txDate').value,
      amountOriginal, currency, rate, bankAmount: bankAmount || null, amountCAD,
      categoryId: $('#txCategory').value, payerId: $('#txPayer').value, beneficiary,
      split: beneficiary === 'couple' ? { la: splitLa, partner: splitPartner } : beneficiary === 'la' ? {la:100,partner:0} : {la:0,partner:100},
      splitMode: beneficiary==='couple'?splitMode:'percent', splitAmounts: beneficiary==='couple'?splitAmounts:null,
      accountId: $('#txAccount').value, merchant: $('#txMerchant').value.trim(), note: $('#txNote').value.trim(),
      status: $('#txStatus').value, recurring: $('#txRecurring').checked
    };
    const index = state.transactions.findIndex(item=>item.id===tx.id);
    if (index >= 0) state.transactions[index] = tx; else state.transactions.push(tx);
    saveState(); $('#transactionDialog').close(); renderAll();
    showToast(index >= 0 ? 'Transaction modifiée.' : tx.status==='confirmed'?'Transaction ajoutée au réel.':'Transaction ajoutée à vérifier.');
  }

  function renderAll() {
    populateSelects();
    renderDashboard(); renderBudget(); renderTransactions(); renderCouple(); renderGoals(); renderSettings();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    downloadBlob(blob,`trace-sauvegarde-${currentDate}.json`);
    showToast('Sauvegarde JSON téléchargée.');
  }

  function exportCsv() {
    const rows = [['Date','Nom','Type','Catégorie','Montant original','Devise','Taux CAD','Montant CAD','Payé/Reçu par','Concerne','Répartition LA','Répartition Partenaire','Commerçant','Compte','Statut','Note']];
    filteredTransactions().forEach(tx=>rows.push([tx.date,tx.name,tx.type,category(tx.categoryId).name,tx.amountOriginal,tx.currency,tx.rate,tx.amountCAD,member(tx.payerId).name,tx.beneficiary==='couple'?'Commun':member(tx.beneficiary).name,tx.split?.la??'',tx.split?.partner??'',tx.merchant||'',account(tx.accountId).name,tx.status,tx.note||'']));
    const csv = '\ufeff' + rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(';')).join('\n');
    downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`budget-duo-transactions-${$('#transactionMonth').value}.csv`);
    showToast('Export CSV téléchargé.');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function importJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.version || !Array.isArray(parsed.transactions)) throw new Error('Sauvegarde invalide');
      state = parsed; saveState(); applyTheme(); renderAll(); navigate('dashboard'); showToast('Sauvegarde restaurée.');
    } catch (error) { showToast(`Import impossible : ${error.message}`); }
  }

  function formatDate(date) { return new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`)); }
  function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch])); }

  function updateRateLabel() {
    const secondary = state.household.secondaryCurrency;
    if (!state.household.showSecondary) { $('#currentRateLabel').textContent = 'Affichage secondaire désactivé.'; return; }
    fetchRate('CAD',secondary).then(rate=>$('#currentRateLabel').textContent=`1 CAD = ${rate.toFixed(4)} ${secondary} · taux quotidien indicatif`).catch(()=>$('#currentRateLabel').textContent='Taux indisponible actuellement.');
  }

  function bindEvents() {
    $$('.modal button[value="cancel"]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
    $$('[data-route]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.route)));
    $('#themeToggle').addEventListener('click',()=>{ state.household.theme=state.household.theme==='dark'?'light':'dark'; saveState(); applyTheme(); });
    ['openQuickAdd','openQuickAdd2','openQuickAddMobile'].forEach(id=>$('#'+id).addEventListener('click',()=>openTransactionDialog()));
    $('#addSettlement').addEventListener('click',()=>openTransactionDialog(null,true));
    $('#transactionForm').addEventListener('submit',saveTransaction);
    $('#txType').addEventListener('change',()=>{ populateCategorySelect(); updateTransactionFieldVisibility(); });
    $('#txBeneficiary').addEventListener('change',updateTransactionFieldVisibility);
    $('#txCurrency').addEventListener('change',updateCurrencyRate); $('#txDate').addEventListener('change',updateCurrencyRate);
    ['txAmount','txRate','txBankAmount'].forEach(id=>$('#'+id).addEventListener('input',updateCurrencyHint));
    $('#txSplitLa').addEventListener('input',()=>syncSplitPercent('la')); $('#txSplitPartner').addEventListener('input',()=>syncSplitPercent('partner'));
    $('#txSplitAmountLa').addEventListener('input',()=>syncSplitAmount('la')); $('#txSplitAmountPartner').addEventListener('input',()=>syncSplitAmount('partner'));
    $$('input[name="splitMode"]').forEach(input=>input.addEventListener('change',()=>{setSplitMode(input.value); if(input.value==='amount')syncSplitPercent('la');}));

    ['dashboardMonth','dashboardScope','dashboardMode'].forEach(id=>$('#'+id).addEventListener('change',renderDashboard));
    $('#budgetMonth').addEventListener('change',renderBudget); $('#annualScope').addEventListener('change',renderAnnualBudget);
    $('#budgetTableBody').addEventListener('input',event=>{ if(event.target.classList.contains('budget-input')) updateBudgetTotals(); });
    $('#saveBudget').addEventListener('click',saveBudgetFromTable);
    $('#copyPreviousBudget').addEventListener('click',()=>{const month=$('#budgetMonth').value,prev=monthOffset(month,-1);state.budgets=state.budgets.filter(b=>b.month!==month);state.budgets.push(...state.budgets.filter(b=>b.month===prev).map(b=>({...b,id:uid('b'),month})));saveState();renderBudget();showToast(`Budget copié depuis ${monthLabel(prev)}.`);});
    $('#applyTemplateBudget').addEventListener('click',()=>{const month=$('#budgetMonth').value;state.budgets=state.budgets.filter(b=>b.month!==month);state.budgets.push(...state.budgetTemplate.map(b=>({...b,id:uid('b'),month})));saveState();renderBudget();showToast(state.budgetTemplate.length?'Mois type appliqué au mois sélectionné.':'Le mois type est vide. Définis d’abord un mois comme modèle.');});
    $('#saveAsTemplateBudget').addEventListener('click',()=>{const month=$('#budgetMonth').value;saveBudgetFromTable();state.budgetTemplate=state.budgets.filter(b=>b.month===month).map(b=>({...b,id:uid('b'),month:'template'}));saveState();showToast(`${monthLabel(month)} est maintenant votre mois type.`);});
    ['addCategoryButton','addCategoryButtonSettings'].forEach(id=>$('#'+id).addEventListener('click',()=>{$('#categoryForm').reset();$('#categoryIcon').value='＋';$('#categoryDialog').showModal();}));
    $('#categoryForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#categoryName').value.trim(),group=$('#categoryGroup').value.trim(),type=$('#categoryType').value;let id=`custom_${name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}_${Date.now().toString(36)}`;state.categories.push({id,type,group,name,icon:$('#categoryIcon').value.trim()||'＋',custom:true});saveState();$('#categoryDialog').close();renderAll();showToast('Catégorie ajoutée au budget et aux transactions.');});

    ['transactionMonth','transactionTypeFilter','transactionScopeFilter'].forEach(id=>$('#'+id).addEventListener('change',renderTransactions)); $('#transactionSearch').addEventListener('input',renderTransactions);
    $('#transactionsTableBody').addEventListener('click',event=>{const edit=event.target.closest('.edit-tx'),del=event.target.closest('.delete-tx'),confirmTx=event.target.closest('.confirm-tx');if(edit)openTransactionDialog(state.transactions.find(t=>t.id===edit.dataset.id));if(confirmTx){const tx=state.transactions.find(t=>t.id===confirmTx.dataset.id);if(tx){tx.status='confirmed';saveState();renderAll();showToast('Transaction comptabilisée dans le réel.');}}if(del&&confirm('Supprimer cette transaction ?')){state.transactions=state.transactions.filter(t=>t.id!==del.dataset.id);saveState();renderAll();showToast('Transaction supprimée.');}});
    $('#exportCsv').addEventListener('click',exportCsv);

    $('#coupleMonth').addEventListener('change',()=>{balanceMonthlyOnly=false;renderCouple();}); $('#showAllTimeBalance').addEventListener('click',()=>{balanceMonthlyOnly=!balanceMonthlyOnly;renderCouple();});
    $('#editSplitRules').addEventListener('click',()=>{renderSplitRulesEditor();$('#splitRulesDialog').showModal();});
    $('#splitRulesEditor').addEventListener('input',event=>{const row=event.target.closest('.split-editor-row');if(!row)return;const la=row.querySelector('.rule-la'),partner=row.querySelector('.rule-partner');if(event.target.classList.contains('rule-la'))partner.value=clamp(100-Number(la.value||0),0,100);else if(event.target.classList.contains('rule-partner'))la.value=clamp(100-Number(partner.value||0),0,100);const month=$('#coupleMonth').value||currentMonth,cat=row.dataset.category,budget=state.budgets.filter(b=>b.month===month&&b.categoryId===cat&&b.scope==='couple').reduce((sum,b)=>sum+Number(b.amount||0),0);row.querySelector('.rule-amounts').textContent=`${money(budget*Number(la.value||0)/100)} / ${money(budget*Number(partner.value||0)/100)}`;});
    $('#splitRulesForm').addEventListener('submit',event=>{event.preventDefault();$$('.split-editor-row').forEach(row=>{const la=Number(row.querySelector('.rule-la').value||0),partner=Number(row.querySelector('.rule-partner').value||0);if(Math.abs(la+partner-100)<=.02)state.household.categorySplits[row.dataset.category]={la,partner};});saveState();$('#splitRulesDialog').close();renderCouple();showToast('Règles de répartition enregistrées.');});

    $('#addGoal').addEventListener('click',()=>$('#goalDialog').showModal());
    $('#goalForm').addEventListener('submit',event=>{event.preventDefault();state.goals.push({id:uid('g'),name:$('#goalName').value.trim(),target:Number($('#goalTarget').value),current:Number($('#goalCurrent').value||0),date:$('#goalDate').value,owner:$('#goalOwner').value});saveState();$('#goalDialog').close();$('#goalForm').reset();renderGoals();showToast('Objectif créé.');});
    $('#goalGrid').addEventListener('click',event=>{const btn=event.target.closest('.delete-goal');if(btn&&confirm('Supprimer cet objectif ?')){state.goals=state.goals.filter(g=>g.id!==btn.dataset.id);saveState();renderGoals();}});

    $('#saveProfiles').addEventListener('click',()=>{state.household.members[0].name=$('#memberLaName').value.trim()||'Membre 1';state.household.members[0].initials=$('#memberLaInitials').value.trim().toUpperCase()||initialsFor(state.household.members[0].name);state.household.members[1].name=$('#memberPartnerName').value.trim()||'Membre 2';state.household.members[1].initials=$('#memberPartnerInitials').value.trim().toUpperCase()||initialsFor(state.household.members[1].name);saveState();populateSelects();renderAll();showToast('Profils mis à jour.');});
    $('#saveDefaultSplit').addEventListener('click',()=>{const la=Number($('#defaultSplitLa').value),partner=Number($('#defaultSplitPartner').value);if(Math.abs(la+partner-100)>.02){showToast('La répartition doit totaliser 100 %.');return;}state.household.defaultSplit={la,partner};saveState();renderAll();showToast('Répartition enregistrée.');});
    $('#categoryManager').addEventListener('click',event=>{const btn=event.target.closest('.delete-category');if(!btn)return;const used=state.transactions.some(t=>t.categoryId===btn.dataset.id)||state.budgets.some(b=>b.categoryId===btn.dataset.id&&Number(b.amount));if(used){showToast('Cette catégorie contient des données et ne peut pas être supprimée.');return;}state.categories=state.categories.filter(c=>c.id!==btn.dataset.id);saveState();renderAll();showToast('Catégorie supprimée.');});
    $('#secondaryCurrency').addEventListener('change',()=>{state.household.secondaryCurrency=$('#secondaryCurrency').value;saveState();updateRateLabel();}); $('#showSecondaryCurrency').addEventListener('change',()=>{state.household.showSecondary=$('#showSecondaryCurrency').checked;saveState();updateRateLabel();}); $('#refreshRate').addEventListener('click',()=>{localStorage.removeItem(RATE_CACHE_KEY);updateRateLabel();showToast('Actualisation du taux demandée.');});
    $('#savePin').addEventListener('click',()=>{const pin=$('#pinInput').value.trim();if(pin&&!/^\d{4,6}$/.test(pin)){showToast('Le PIN doit contenir 4 à 6 chiffres.');return;}state.household.pin=pin;saveState();$('#pinInput').value='';showToast(pin?'PIN local activé.':'PIN supprimé.');}); $('#lockApp').addEventListener('click',()=>{if(!state.household.pin){showToast('Définis d’abord un PIN.');return;}$('#unlockPin').value='';$('#pinError').textContent='';$('#pinDialog').showModal();}); $('#pinForm').addEventListener('submit',event=>{event.preventDefault();if($('#unlockPin').value===state.household.pin){$('#pinDialog').close();}else{$('#pinError').textContent='Code incorrect.';}});
    $('#exportJson').addEventListener('click',exportJson); $('#importJson').addEventListener('change',event=>event.target.files[0]&&importJson(event.target.files[0]));
    $('#resetDemo').addEventListener('click',()=>{
      const cloudActive = Boolean(window.BudgetDuoCloud?.isReady?.());
      const message = cloudActive ? 'Réinitialiser toutes les données de cet espace partagé ? Cette action sera synchronisée pour les deux membres.' : 'Réinitialiser toutes les données locales ?';
      if (!confirm(message)) return;
      const currentNames = { la: member('la').name || 'Membre 1', partner: member('partner').name || 'Membre 2' };
      state = buildEmptyState(currentNames);
      firstLaunch = !cloudActive;
      saveState();
      applyTheme(); setupDateInputs(); renderAll(); navigate('dashboard');
      if (!cloudActive) $('#onboardingDialog').showModal();
      else showToast('L’espace partagé a été réinitialisé.');
    });
    $('#onboardingForm').addEventListener('submit',event=>{event.preventDefault();const names={la:$('#onboardingName1').value.trim()||'Membre 1',partner:$('#onboardingName2').value.trim()||'Membre 2'};state=buildEmptyState(names);firstLaunch=false;saveState();$('#onboardingDialog').close();applyTheme();renderAll();navigate('dashboard');showToast('Votre espace vide est prêt.');});
    $('#startDemoButton').addEventListener('click',()=>{const names={la:$('#onboardingName1').value.trim()||'Membre 1',partner:$('#onboardingName2').value.trim()||'Membre 2'};state=buildInitialState(names);firstLaunch=false;saveState();$('#onboardingDialog').close();applyTheme();renderAll();navigate('dashboard');showToast('Données de démonstration chargées.');});
  }

  // =========================
  // TRACE V4 — compatibility layer and new features
  // =========================

  function localTodayString(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function addDate(dateString, frequency) {
    const [y,m,d] = String(dateString).split('-').map(Number);
    const date = new Date(y, m-1, d, 12);
    if (frequency === 'weekly') date.setDate(date.getDate()+7);
    if (frequency === 'biweekly') date.setDate(date.getDate()+14);
    if (frequency === 'monthly') date.setMonth(date.getMonth()+1);
    if (frequency === 'yearly') date.setFullYear(date.getFullYear()+1);
    return localTodayString(date);
  }

  function migrateState(parsed) {
    parsed ||= {};
    parsed.version = TRACE_SCHEMA_VERSION;
    parsed.household ||= {};
    const defaultMembers = [
      { id:'la', name:'Louis-Antoine', initials:'LA' },
      { id:'partner', name:'Élise', initials:'É' }
    ];
    parsed.household.name ||= 'Notre espace';
    parsed.household.baseCurrency ||= 'CAD';
    parsed.household.secondaryCurrency ||= 'EUR';
    parsed.household.showSecondary ??= true;
    parsed.household.theme ||= 'light';
    parsed.household.lastRoute ||= 'dashboard';
    parsed.household.lastScope = ['household','la','partner'].includes(parsed.household.lastScope) ? parsed.household.lastScope : 'household';
    parsed.household.pin ||= '';
    parsed.household.members ||= defaultMembers;
    parsed.household.members = parsed.household.members.map((m,i)=>({
      id: i===0 ? 'la' : 'partner',
      name: m?.name || defaultMembers[i].name,
      initials: m?.initials || initialsFor(m?.name || defaultMembers[i].name)
    }));
    parsed.household.defaultSplit ||= {la:50,partner:50};
    parsed.household.categorySplits ||= {};
    parsed.household.schemaVersion = TRACE_SCHEMA_VERSION;
    parsed.household.openingBalance = parsed.household.openingBalance === '' || parsed.household.openingBalance == null ? null : Number(parsed.household.openingBalance);
    parsed.household.openingBalanceDate ||= '';

    const rename = {
      salary:['Salaire','Revenus'], bonus:['Prime','Revenus'], other_income:['Autres revenus','Revenus'],
      rent:['Logement','Dépenses'], groceries:['Épicerie','Dépenses'], restaurants:['Restaurants et sorties','Dépenses'],
      transport:['Transport','Dépenses'], vacation:['Voyage et vacances','Dépenses'], medical:['Santé','Dépenses'],
      sport:['Sport','Dépenses'], subscriptions:['Abonnements','Dépenses'], phone:['Téléphone et Internet','Dépenses'],
      shopping:['Shopping','Dépenses'], gifts:['Cadeaux','Dépenses'], taxes:['Frais et impôts','Dépenses'],
      other_expense:['Autres dépenses','Dépenses']
    };
    parsed.categories ||= [];
    const savedById = new Map(parsed.categories.map(c=>[c.id,c]));
    parsed.categories = categories.map(base => {
      const saved = savedById.get(base.id) || {};
      const [newName,newGroup] = rename[base.id] || [saved.name || base.name, saved.group || base.group];
      const active = TRACE_ACTIVE_CATEGORY_IDS.has(base.id);
      return { ...base, ...saved, name:newName, group:newGroup, archived: saved.archived ?? !active };
    });
    parsed.categories.push(...[...savedById.values()].filter(c=>!categories.some(base=>base.id===c.id)).map(c=>({archived:false,...c})));

    parsed.accounts ||= defaultAccounts({la:parsed.household.members[0]?.name,partner:parsed.household.members[1]?.name});
    parsed.budgets ||= [];
    parsed.budgetTemplate ||= [];
    parsed.goals ||= [];
    parsed.transactions ||= [];
    parsed.transactions = parsed.transactions.map(tx => {
      const recurring = Boolean(tx.recurring || tx.recurrence?.enabled);
      const recurrence = tx.recurrence ? {...tx.recurrence} : {
        enabled: recurring,
        frequency: null,
        nextDate: null,
        endDate: null,
        autoConfirm: false,
        needsReview: recurring
      };
      recurrence.enabled = Boolean(recurrence.enabled);
      if (recurrence.enabled && !recurrence.frequency) recurrence.needsReview = true;
      const externalAmount = Math.max(0, Number(tx.externalAmount || 0));
      return {
        ...tx,
        amountCAD: Number(tx.amountCAD || (Number(tx.amountOriginal||0)*Number(tx.rate||1))),
        externalAmount,
        externalParticipants: Array.isArray(tx.externalParticipants) ? tx.externalParticipants : [],
        counterparty: tx.counterparty || '',
        recurrence,
        recurring
      };
    });
    return parsed;
  }

  function householdPortion(tx) {
    if (tx.type === 'external_refund' || tx.type === 'transfer') return 0;
    return Math.max(0, Number(tx.amountCAD || 0) - Math.max(0, Number(tx.externalAmount || 0)));
  }

  function txSignedAmount(tx) {
    const amount = Number(tx.amountCAD || 0);
    if (tx.type === 'expense' || tx.type === 'person_payment') return -amount;
    if (tx.type === 'refund' || tx.type === 'income' || tx.type === 'external_refund') return amount;
    return 0;
  }

  function isInScope(tx, scope) {
    if (scope === 'household' || scope === 'all') return true;
    if (scope === 'la' || scope === 'partner') return tx.beneficiary === scope || tx.beneficiary === 'couple';
    return true;
  }

  function splitShareAmount(tx, scope) {
    const amount = householdPortion(tx);
    if (tx.splitMode === 'amount' && tx.splitAmounts && Number.isFinite(Number(tx.splitAmounts[scope]))) {
      const total = Number(tx.splitAmounts.la || 0) + Number(tx.splitAmounts.partner || 0);
      if (Math.abs(total - amount) <= 0.05) return Number(tx.splitAmounts[scope] || 0);
    }
    return amount * Number(tx.split?.[scope] ?? state.household.defaultSplit[scope]) / 100;
  }

  function allocatedAmount(tx, scope) {
    const cashAmount = Number(tx.amountCAD || 0);
    const amount = ['expense','person_payment','refund'].includes(tx.type) ? householdPortion(tx) : cashAmount;
    if (scope === 'household') return amount;
    if (tx.beneficiary === scope) return amount;
    if (tx.beneficiary === 'couple') return splitShareAmount(tx, scope);
    return 0;
  }

  function summaryFor(month, scope) {
    const txs = monthTransactions(month, scope).filter(tx=>tx.status==='confirmed');
    const budgets = state.budgets.filter(b=>b.month===month);
    let incomeActual=0, expenseActual=0, refundActual=0;
    txs.forEach(tx=>{
      const amount=allocatedAmount(tx,scope);
      if(tx.type==='income') incomeActual+=amount;
      if(['expense','person_payment'].includes(tx.type)) expenseActual+=amount;
      if(tx.type==='refund') refundActual+=amount;
    });
    expenseActual=Math.max(0,expenseActual-refundActual);
    const incomeBudget=budgets.filter(b=>category(b.categoryId).type==='income').reduce((s,b)=>s+budgetAmount(b,scope),0);
    const expenseBudget=budgets.filter(b=>category(b.categoryId).type==='expense').reduce((s,b)=>s+budgetAmount(b,scope),0);
    return {incomeActual,expenseActual,refundActual,incomeBudget,expenseBudget,savingsActual:incomeActual-expenseActual,availableBudget:incomeBudget-expenseBudget};
  }

  function categorySummary(month, scope) {
    return state.categories.filter(c=>c.type==='expense').map(cat=>{
      const budget=state.budgets.filter(b=>b.month===month&&b.categoryId===cat.id).reduce((s,b)=>s+budgetAmount(b,scope),0);
      const actual=monthTransactions(month,scope).filter(tx=>tx.categoryId===cat.id&&tx.status==='confirmed').reduce((s,tx)=>{
        if(['expense','person_payment'].includes(tx.type)) return s+allocatedAmount(tx,scope);
        if(tx.type==='refund') return s-allocatedAmount(tx,scope);
        return s;
      },0);
      return {...cat,budget,actual:Math.max(0,actual),percent:budget?actual/budget*100:actual?999:0};
    }).filter(item=>item.budget||item.actual);
  }

  function projectionFor(month, scope) {
    const s=summaryFor(month,scope);
    const [year,monthNumber]=month.split('-').map(Number);
    const daysInMonth=new Date(year,monthNumber,0).getDate();
    if(month!==currentMonth) return {projected:s.expenseActual,pendingRecurring:0,variableDaily:0,daysRemaining:0};
    const elapsed=Math.max(1,today.getDate());
    const remaining=Math.max(0,daysInMonth-elapsed);
    const confirmed=monthTransactions(month,scope).filter(tx=>tx.status==='confirmed'&&['expense','person_payment'].includes(tx.type));
    const variableActual=confirmed.filter(tx=>!tx.recurrenceSourceId&&!tx.recurrence?.enabled).reduce((sum,tx)=>sum+allocatedAmount(tx,scope),0);
    const pendingRecurring=monthTransactions(month,scope).filter(tx=>tx.status==='pending'&&['expense','person_payment'].includes(tx.type)&&(tx.recurrenceSourceId||tx.recurrence?.enabled)).reduce((sum,tx)=>sum+allocatedAmount(tx,scope),0);
    const variableDaily=variableActual/elapsed;
    return {projected:s.expenseActual+pendingRecurring+variableDaily*remaining,pendingRecurring,variableDaily,daysRemaining:remaining};
  }

  function estimatedPosition() {
    const opening=Number(state.household.openingBalance);
    const start=state.household.openingBalanceDate;
    if(!Number.isFinite(opening)||!start) return null;
    const flow=state.transactions.filter(tx=>tx.status==='confirmed'&&tx.date>=start).reduce((sum,tx)=>sum+txSignedAmount(tx),0);
    return opening+flow;
  }

  function setupDateInputs() {
    ['dashboardMonth','budgetMonth','transactionMonth','coupleMonth'].forEach(id=>{if($('#'+id)&&!$('#'+id).value)$('#'+id).value=currentMonth;});
    if($('#txDate')&&!$('#txDate').value)$('#txDate').value=localTodayString();
  }

  function renderDashboard() {
    const month=$('#dashboardMonth').value||currentMonth;
    const scope=$('#dashboardScope').value||'household';
    const mode=$('#dashboardMode').value;
    const s=summaryFor(month,scope);
    const projection=projectionFor(month,scope);
    const expensePercent=s.expenseBudget?s.expenseActual/s.expenseBudget*100:0;
    let heroValue,heroLabel,heroText,progressValue,progressTitle;
    if(mode==='actual'){
      heroValue=s.incomeActual-s.expenseActual; heroLabel='Flux net du mois';
      heroText=`${money(s.incomeActual)} encaissés moins ${money(s.expenseActual)} dépensés`;
      progressValue=s.incomeActual?s.expenseActual/s.incomeActual*100:0; progressTitle='Part des revenus dépensée';
    } else if(mode==='budget'){
      heroValue=s.incomeBudget-s.expenseBudget; heroLabel='Marge prévue par le budget';
      heroText=`${money(s.incomeBudget)} de revenus prévus moins ${money(s.expenseBudget)} de dépenses prévues`;
      progressValue=s.incomeBudget?s.expenseBudget/s.incomeBudget*100:0; progressTitle='Part des revenus budgétée';
    } else {
      heroValue=s.expenseBudget-s.expenseActual; heroLabel=heroValue>=0?'Budget de dépenses encore disponible':'Dépassement du budget de dépenses';
      heroText=`Projection : ${money(projection.projected)} · ${money(projection.pendingRecurring)} de récurrences restantes incluses`;
      progressValue=expensePercent; progressTitle='Budget de dépenses consommé';
    }
    $('#heroLabel').textContent=heroLabel; $('#heroAvailable').textContent=money(heroValue); $('#heroAvailable').className=heroValue<0?'amount-negative':'';
    $('#heroProjection').textContent=heroText; $('#heroProgressTitle').textContent=progressTitle; $('#heroPercent').textContent=`${number(progressValue)} %`;
    $('#heroProgress').style.width=`${clamp(progressValue,0,100)}%`; $('#heroProgress').style.background=progressValue>100?'var(--red)':progressValue>=80?'var(--orange)':'';
    const position=estimatedPosition();
    $('#bankBalanceHint').textContent=scope==='household'&&position!=null?`Position estimée du ménage : ${money(position)} depuis le ${formatDate(state.household.openingBalanceDate)}. À rapprocher avec la banque.`:'';
    $('#kpiIncomeLabel').textContent=mode==='budget'?'Revenus budgétés':'Revenus réels'; $('#kpiExpenseLabel').textContent=mode==='budget'?'Dépenses budgétées':'Dépenses réelles'; $('#kpiSavingsLabel').textContent=mode==='budget'?'Épargne budgétée':'Épargne potentielle';
    $('#kpiIncomeActual').textContent=money(mode==='budget'?s.incomeBudget:s.incomeActual); $('#kpiIncomeBudget').textContent=mode==='actual'?'Revenus comptabilisés':`Budget : ${money(s.incomeBudget)}`;
    $('#kpiExpenseActual').textContent=money(mode==='budget'?s.expenseBudget:s.expenseActual); $('#kpiExpenseBudget').textContent=mode==='actual'?'Dépenses comptabilisées':`Budget : ${money(s.expenseBudget)}`;
    const variance=s.expenseBudget-s.expenseActual; $('#kpiVariance').textContent=money(Math.abs(variance)); $('#kpiVariance').className=variance>=0?'amount-positive':'amount-negative'; $('#kpiVarianceLabel').textContent=variance>=0?'Sous le budget':'Au-dessus du budget';
    const savings=mode==='budget'?s.incomeBudget-s.expenseBudget:s.savingsActual; const incomeBase=mode==='budget'?s.incomeBudget:s.incomeActual; $('#kpiSavings').textContent=money(savings); $('#kpiSavingsRate').textContent=`Taux : ${number(incomeBase?savings/incomeBase*100:0)} %`;
    state.household.lastScope=scope; saveState(); renderCategoryChart(month,scope,mode); renderAlerts(month,scope); renderTrendChart(month,scope); renderRecentTransactions(month,scope);
  }

  function activeCategories(type=null){return state.categories.filter(c=>!c.archived&&(!type||c.type===type));}

  function renderBudget() {
    const month=$('#budgetMonth').value||currentMonth;
    const owner=$('#budgetOwner').value||'la';
    const ownerLabel=owner==='couple'?'Ménage partagé':member(owner).name;
    $('#budgetPanelTitle').textContent=`Budget de ${ownerLabel} — ${monthLabel(month)}`;
    const visibleIds = new Set(state.budgets.filter(b=>b.month===month&&b.scope===owner&&Number(b.amount||0)>0).map(b=>b.categoryId));
    const cats=state.categories.filter(c=>['income','expense'].includes(c.type)&&(!c.archived||visibleIds.has(c.id)));
    const groups=[...new Set(cats.map(c=>c.group))];
    $('#budgetCards').innerHTML=groups.map(group=>{
      const cards=cats.filter(c=>c.group===group).map(cat=>{
        const value=state.budgets.filter(b=>b.month===month&&b.categoryId===cat.id&&b.scope===owner).reduce((s,b)=>s+Number(b.amount||0),0);
        return `<label class="budget-entry-card ${cat.type}" data-category="${cat.id}"><span class="budget-entry-icon">${cat.icon}</span><span class="budget-entry-name">${escapeHtml(cat.name)}<small>${cat.type==='income'?'Revenu':'Dépense'}</small></span><span class="money-input"><input class="budget-input" data-category="${cat.id}" type="number" min="0" step="1" inputmode="decimal" value="${value||''}" placeholder="0"><b>$</b></span></label>`;
      }).join('');
      return `<section class="budget-group"><h3>${escapeHtml(group)}</h3><div class="budget-group-grid">${cards}</div></section>`;
    }).join('')||'<div class="empty-state">Aucune catégorie active.</div>';
    updateBudgetTotals(); renderAnnualBudget();
  }

  function updateBudgetTotals(){
    const shown=$$('.budget-input').reduce((sum,input)=>sum+Number(input.value||0),0);
    const month=$('#budgetMonth').value||currentMonth;
    const household=state.budgets.filter(b=>b.month===month).reduce((sum,b)=>sum+Number(b.amount||0),0);
    $('#budgetGrandTotal').textContent=money(shown); $('#budgetHouseholdTotal').textContent=money(household);
  }

  function saveBudgetFromTable(){
    const month=$('#budgetMonth').value||currentMonth, owner=$('#budgetOwner').value||'la';
    state.budgets=state.budgets.filter(b=>!(b.month===month&&b.scope===owner));
    $$('.budget-input').forEach(input=>{const amount=Number(input.value||0);if(amount>0)state.budgets.push({id:uid('b'),month,categoryId:input.dataset.category,scope:owner,amount});});
    saveState(); updateBudgetTotals(); renderAnnualBudget(); showToast(`Budget de ${owner==='couple'?'ménage partagé':member(owner).name} enregistré.`);
  }

  function renderAnnualBudget(){
    const scope=$('#annualScope').value||'household'; const year=Number(($('#budgetMonth').value||currentMonth).slice(0,4));
    const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`); const summaries=months.map(m=>summaryFor(m,scope));
    const totals=summaries.reduce((a,s)=>({budget:a.budget+s.expenseBudget,actual:a.actual+s.expenseActual,income:a.income+s.incomeActual}),{budget:0,actual:0,income:0});
    $('#annualSummary').innerHTML=`<div><span>Budget annuel</span><strong>${money(totals.budget)}</strong></div><div><span>Réel annuel</span><strong>${money(totals.actual)}</strong></div><div><span>Écart</span><strong class="${totals.budget-totals.actual>=0?'amount-positive':'amount-negative'}">${money(Math.abs(totals.budget-totals.actual))}</strong></div>`;
    const max=Math.max(1,...summaries.flatMap(s=>[s.expenseBudget,s.expenseActual]));
    $('#annualVisual').innerHTML=months.map((m,i)=>`<div class="annual-month"><div class="annual-bars"><span class="annual-budget-bar" style="height:${summaries[i].expenseBudget/max*100}%"></span><span class="annual-actual-bar" style="height:${summaries[i].expenseActual/max*100}%"></span></div><strong>${shortMonth(m)}</strong><small>${money(summaries[i].expenseActual)}</small></div>`).join('');
    const catTotals=state.categories.filter(c=>c.type==='expense').map(cat=>{let budget=0,actual=0;months.forEach(m=>{const item=categorySummary(m,scope).find(x=>x.id===cat.id);budget+=item?.budget||0;actual+=item?.actual||0;});return{...cat,budget,actual};}).filter(x=>x.budget||x.actual).sort((a,b)=>b.actual-a.actual).slice(0,10);
    $('#annualCategoryCards').innerHTML=catTotals.map(x=>`<article class="annual-category-card"><div><span>${x.icon}</span><strong>${escapeHtml(x.name)}</strong></div><b>${money(x.actual)}</b><small>sur ${money(x.budget)} · ${number(x.budget?x.actual/x.budget*100:0)} %</small><div class="mini-track"><i style="width:${clamp(x.budget?x.actual/x.budget*100:0,0,100)}%"></i></div></article>`).join('');
    $('#annualTableHead').innerHTML=`<tr><th>Catégorie</th>${months.map(m=>`<th>${shortMonth(m)}</th>`).join('')}<th>Année</th></tr>`;
    $('#annualTableBody').innerHTML=catTotals.map(cat=>{const vals=months.map(m=>categorySummary(m,scope).find(x=>x.id===cat.id)?.actual||0);return`<tr><th>${cat.icon} ${escapeHtml(cat.name)}</th>${vals.map(v=>`<td>${money(v)}</td>`).join('')}<td><strong>${money(vals.reduce((a,b)=>a+b,0))}</strong></td></tr>`;}).join('');
  }

  function filteredTransactions(){
    const month=$('#transactionMonth').value||currentMonth,type=$('#transactionTypeFilter').value,scope=$('#transactionScopeFilter').value,query=$('#transactionSearch').value.trim().toLowerCase();
    return state.transactions.filter(tx=>tx.date.startsWith(month)).filter(tx=>type==='all'||tx.type===type).filter(tx=>scope==='all'||isInScope(tx,scope)).filter(tx=>!query||[tx.name,tx.note,tx.counterparty,category(tx.categoryId).name].join(' ').toLowerCase().includes(query)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)));
  }

  const typeLabels={expense:'Dépense',income:'Revenu',refund:'Remboursement achat',transfer:'Entre nous',person_payment:'Paiement à une personne',external_refund:'Remboursement reçu'};
  function transactionRow(tx){
    const beneficiary=tx.beneficiary==='couple'?'Ménage':member(tx.beneficiary).name; const positive=['income','refund','external_refund'].includes(tx.type); const external=Number(tx.externalAmount||0);
    return `<tr><td data-label="Date">${formatDate(tx.date)}</td><td data-label="Transaction"><div class="tx-name"><span class="category-dot">${category(tx.categoryId).icon}</span><div><strong>${escapeHtml(tx.name)}</strong><small>${typeLabels[tx.type]||tx.type}${tx.counterparty?` · ${escapeHtml(tx.counterparty)}`:''}${external?` · ${money(external)} à recevoir`:''}</small></div></div></td><td data-label="Catégorie">${escapeHtml(category(tx.categoryId).name)}</td><td data-label="Payé / reçu">${escapeHtml(member(tx.payerId).name)}</td><td data-label="Concerne">${escapeHtml(beneficiary)}</td><td data-label="Montant" class="${positive?'amount-positive':''}">${positive?'+':''}${money(tx.amountCAD,'CAD',2)}</td><td data-label="Statut"><span class="status-chip ${tx.status}">${tx.status==='confirmed'?'Comptabilisé':'À vérifier'}</span></td><td class="row-actions">${tx.status==='pending'?`<button class="row-action confirm-tx" data-id="${tx.id}" title="Comptabiliser">✓</button>`:''}<button class="row-action edit-tx" data-id="${tx.id}" title="Modifier">✎</button><button class="row-action delete-tx" data-id="${tx.id}" title="Supprimer">×</button></td></tr>`;
  }

  function renderTransactions(){
    const txs=filteredTransactions(); $('#txCount').textContent=txs.length;
    $('#txExpenses').textContent=money(txs.filter(t=>t.status==='confirmed'&&['expense','person_payment'].includes(t.type)).reduce((s,t)=>s+householdPortion(t),0));
    $('#txIncome').textContent=money(txs.filter(t=>t.status==='confirmed'&&t.type==='income').reduce((s,t)=>s+Number(t.amountCAD||0),0)); $('#txPending').textContent=txs.filter(t=>t.status==='pending').length;
    $('#transactionsTableBody').innerHTML=txs.length?txs.map(transactionRow).join(''):'<tr><td colspan="8"><div class="empty-state">Aucune transaction pour ces filtres.</div></td></tr>';
  }

  function calculateCouple(month=null,beforeMonth=null,throughMonth=null){
    let txs=state.transactions.filter(tx=>tx.status==='confirmed'); if(month)txs=txs.filter(tx=>tx.date.startsWith(month)); if(beforeMonth)txs=txs.filter(tx=>tx.date.slice(0,7)<beforeMonth); if(throughMonth)txs=txs.filter(tx=>tx.date.slice(0,7)<=throughMonth);
    let balanceLa=0; const stats={la:{paid:0,share:0},partner:{paid:0,share:0}};
    txs.forEach(tx=>{
      if(['expense','person_payment','refund'].includes(tx.type)){
        const amount=householdPortion(tx); const sign=tx.type==='refund'?-1:1; const paidLa=tx.payerId==='la'?amount*sign:0,payedPartner=tx.payerId==='partner'?amount*sign:0;
        let shareLa=0,sharePartner=0; if(tx.beneficiary==='couple'){shareLa=splitShareAmount(tx,'la')*sign;sharePartner=splitShareAmount(tx,'partner')*sign;}else if(tx.beneficiary==='la')shareLa=amount*sign;else if(tx.beneficiary==='partner')sharePartner=amount*sign;
        balanceLa+=paidLa-shareLa; stats.la.paid+=paidLa; stats.partner.paid+=payedPartner; stats.la.share+=shareLa; stats.partner.share+=sharePartner;
      } else if(tx.type==='transfer'){
        if(tx.payerId==='la'&&tx.beneficiary==='partner')balanceLa+=Number(tx.amountCAD||0); if(tx.payerId==='partner'&&tx.beneficiary==='la')balanceLa-=Number(tx.amountCAD||0);
      }
    }); return{balanceLa,stats,txs};
  }

  function externalReceivableTotal(){
    const advanced=state.transactions.filter(t=>t.status==='confirmed'&&['expense','person_payment'].includes(t.type)).reduce((s,t)=>s+Number(t.externalAmount||0),0);
    const received=state.transactions.filter(t=>t.status==='confirmed'&&t.type==='external_refund').reduce((s,t)=>s+Number(t.amountCAD||0),0);
    return Math.max(0,advanced-received);
  }

  function renderCouple(){
    const month=$('#coupleMonth').value||currentMonth,cumulative=calculateCouple(null,null,month),monthly=calculateCouple(month),opening=calculateCouple(null,month,null),chosen=balanceMonthlyOnly?monthly:cumulative,{balanceLa,stats}=chosen,la=member('la'),partner=member('partner'),abs=Math.abs(balanceLa),label=balanceMonthlyOnly?`Variation de ${monthLabel(month)}`:`Solde cumulé à la fin de ${monthLabel(month)}`;
    if(abs<.01){$('#settlementHero').className='settlement-hero neutral';$('#settlementHero').innerHTML=`<span>${label}</span><strong>Vous êtes à l’équilibre</strong><p>Les remboursements et les dépenses partagées se compensent.</p>`;}else{const creditor=balanceLa>0?la:partner,debtor=balanceLa>0?partner:la;$('#settlementHero').className='settlement-hero';$('#settlementHero').innerHTML=`<span>${label}</span><strong>${debtor.name} doit ${money(abs)} à ${creditor.name}</strong><p>Le solde se reporte automatiquement jusqu’au prochain remboursement.</p>`;}
    $('#balanceBreakdown').innerHTML=`<div><span>Avant le mois</span><strong>${formatBalance(opening.balanceLa)}</strong></div><div><span>Mouvement du mois</span><strong>${formatBalance(monthly.balanceLa)}</strong></div><div><span>Solde cumulé</span><strong>${formatBalance(cumulative.balanceLa)}</strong></div>`;
    $('#externalReceivable').innerHTML=`<span>À recevoir de personnes extérieures</span><strong>${money(externalReceivableTotal())}</strong><small>Remboursements d’amis non encore enregistrés</small>`;
    $('#showAllTimeBalance').textContent=balanceMonthlyOnly?'Revenir au solde cumulé':'Afficher uniquement le mois'; $('#contributionCards').innerHTML=['la','partner'].map(id=>`<div class="contribution-card"><h3>${member(id).name}</h3><div class="contribution-line"><span>Total payé pour le ménage</span><strong>${money(stats[id].paid)}</strong></div><div class="contribution-line"><span>Part réelle</span><strong>${money(stats[id].share)}</strong></div><div class="contribution-line"><span>Avance nette</span><strong>${money(stats[id].paid-stats[id].share)}</strong></div></div>`).join('');
    renderSplitRules(); const txs=state.transactions.filter(tx=>tx.date.startsWith(month)&&(tx.beneficiary==='couple'||tx.type==='transfer')).sort((a,b)=>b.date.localeCompare(a.date)); $('#coupleTransactions').innerHTML=txs.length?txs.map(tx=>`<div class="couple-tx"><span class="category-dot">${category(tx.categoryId).icon}</span><div><strong>${escapeHtml(tx.name)}</strong><div class="payer-arrow">${member(tx.payerId).name} → ${tx.beneficiary==='couple'?'Ménage':member(tx.beneficiary).name} · ${formatDate(tx.date)}</div></div><strong>${money(householdPortion(tx)||tx.amountCAD)}</strong></div>`).join(''):'<div class="empty-state">Aucune opération partagée pour cette période.</div>';
  }

  function renderSplitRulesEditor(){
    const month=$('#coupleMonth').value||currentMonth; const expenseCategories=activeCategories('expense');
    $('#splitRulesEditor').innerHTML=expenseCategories.map(cat=>{const split=state.household.categorySplits[cat.id]||state.household.defaultSplit;const budget=state.budgets.filter(b=>b.month===month&&b.categoryId===cat.id&&b.scope==='couple').reduce((s,b)=>s+Number(b.amount||0),0);return`<div class="split-editor-row" data-category="${cat.id}" data-budget="${budget}"><div><strong>${cat.name}</strong><small>Budget ménage : ${money(budget)}</small></div><label>${member('la').name} %<input class="rule-la" type="number" min="0" max="100" step="0.01" value="${split.la}"></label><label>${member('partner').name} %<input class="rule-partner" type="number" min="0" max="100" step="0.01" value="${split.partner}"></label><label>${member('la').name} $<input class="rule-amount-la" type="number" min="0" step="0.01" value="${(budget*split.la/100).toFixed(2)}"></label><label>${member('partner').name} $<input class="rule-amount-partner" type="number" min="0" step="0.01" value="${(budget*split.partner/100).toFixed(2)}"></label></div>`;}).join('');
  }

  function renderSettings(){
    $('#memberLaName').value=member('la').name;$('#memberLaInitials').value=member('la').initials;$('#memberPartnerName').value=member('partner').name;$('#memberPartnerInitials').value=member('partner').initials;$('#defaultSplitLa').value=state.household.defaultSplit.la;$('#defaultSplitPartner').value=state.household.defaultSplit.partner;$('#baseCurrency').value=state.household.baseCurrency;$('#secondaryCurrency').value=state.household.secondaryCurrency;$('#showSecondaryCurrency').checked=state.household.showSecondary;$('#openingBalance').value=state.household.openingBalance??'';$('#openingBalanceDate').value=state.household.openingBalanceDate||'';
    const groups=[...new Set(state.categories.filter(c=>['income','expense'].includes(c.type)).map(c=>c.group))].sort(); $('#categoryGroupSelect').innerHTML=groups.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')+'<option value="__new__">＋ Nouveau groupe</option>';
    $('#categoryManager').innerHTML=state.categories.filter(c=>['income','expense'].includes(c.type)).map(c=>{const used=state.transactions.some(t=>t.categoryId===c.id)||state.budgets.some(b=>b.categoryId===c.id&&Number(b.amount));return`<div class="category-manager-row ${c.archived?'archived':''}"><span>${c.icon}</span><div><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.group)} · ${c.type==='income'?'Revenu':'Dépense'}${c.archived?' · Archivée':''}</small></div><button class="row-action archive-category" data-id="${c.id}" title="${c.archived?'Réactiver':'Archiver'}">${c.archived?'↺':'—'}</button>${!used?`<button class="row-action delete-category" data-id="${c.id}" title="Supprimer">×</button>`:''}</div>`;}).join(''); updateRateLabel();
  }

  function populateSelects(){
    const memberOptions=state.household.members.map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join(''); $('#txPayer').innerHTML=memberOptions; $('#txBeneficiary').innerHTML=`<option value="couple">Ménage — vous deux</option>${memberOptions}`;
    $('#dashboardScope').innerHTML=`<option value="household">Total du ménage</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`; $('#dashboardScope').value=state.household.lastScope||'household';
    $('#annualScope').innerHTML=`<option value="household">Total du ménage</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#transactionScopeFilter').innerHTML=`<option value="all">Tous</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    $('#budgetOwner').innerHTML=`<option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option><option value="couple">Ménage partagé</option>`;
    $('#goalOwner').innerHTML=`<option value="couple">Ménage</option><option value="la">${escapeHtml(member('la').name)}</option><option value="partner">${escapeHtml(member('partner').name)}</option>`;
    ['splitLaLabel','splitAmountLaLabel'].forEach(id=>$('#'+id).textContent=member('la').name); ['splitPartnerLabel','splitAmountPartnerLabel'].forEach(id=>$('#'+id).textContent=member('partner').name); populateCategorySelect();
  }

  function populateCategorySelect(selectedId=''){
    const type=$('#txType').value||'expense'; const categoryType=type==='income'?'income':'expense'; let cats=activeCategories(categoryType); if(selectedId&&category(selectedId).id)cats=[...cats,...state.categories.filter(c=>c.id===selectedId&&!cats.some(x=>x.id===c.id))];
    $('#txCategory').innerHTML=cats.map(c=>`<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join(''); if(selectedId)$('#txCategory').value=selectedId;
  }

  function openTransactionDialog(tx=null,settlement=false){
    $('#transactionForm').reset(); const existing=tx||null; const slot=window.BudgetDuoCloud?.getCurrentMemberSlot?.()||currentMemberSlot||'la'; currentMemberSlot=slot;
    $('#transactionId').value=existing?.id||''; $('#transactionDialogTitle').textContent=existing?'Modifier la transaction':settlement?'Ajouter un remboursement':'Ajouter une transaction'; $('#txType').value=settlement?'transfer':existing?.type||'expense'; populateCategorySelect(existing?.categoryId||'');
    $('#txName').value=existing?.name||''; $('#txAmount').value=existing?.amountOriginal||''; $('#txDate').value=existing?.date||localTodayString(); $('#txCurrency').value=existing?.currency||'CAD'; $('#txRate').value=existing?.rate||1; $('#txBankAmount').value=existing?.bankAmount||'';
    $('#txPayer').value=existing?.payerId||slot; $('#txBeneficiary').value=existing?.beneficiary||(settlement?(slot==='la'?'partner':'la'):slot); $('#txCounterparty').value=existing?.counterparty||''; $('#txStatus').value=existing?.status||'confirmed'; $('#txNote').value=existing?.note||'';
    $('#txExternalEnabled').checked=Number(existing?.externalAmount||0)>0; $('#txExternalAmount').value=existing?.externalAmount||''; $('#txExternalNames').value=(existing?.externalParticipants||[]).map(p=>p.name).filter(Boolean).join(', '); $('#txExternalCount').value=Math.max(1,(existing?.externalParticipants||[]).length||2);
    const split=existing?.split||(existing?.beneficiary==='couple'?(state.household.categorySplits[existing.categoryId]||state.household.defaultSplit):existing?.beneficiary==='partner'?{la:0,partner:100}:{la:100,partner:0}); $('#txSplitLa').value=split.la;$('#txSplitPartner').value=split.partner; const splitMode=existing?.splitMode||'percent'; document.querySelector(`input[name="splitMode"][value="${splitMode}"]`).checked=true;
    const hhAmount=existing?householdPortion(existing):Number($('#txAmount').value||0); $('#txSplitAmountLa').value=existing?.splitAmounts?.la??(hhAmount*split.la/100).toFixed(2);$('#txSplitAmountPartner').value=existing?.splitAmounts?.partner??(hhAmount*split.partner/100).toFixed(2);
    const rec=existing?.recurrence||{}; $('#txRecurring').checked=Boolean(rec.enabled||existing?.recurring);$('#txRecurrenceFrequency').value=rec.frequency||'monthly';$('#txRecurrenceNextDate').value=rec.nextDate||'';$('#txRecurrenceEndDate').value=rec.endDate||'';$('#txRecurrenceAutoConfirm').checked=Boolean(rec.autoConfirm);
    updateTransactionFieldVisibility(); setSplitMode(splitMode); updateCurrencyHint(); $('#transactionDialog').showModal(); setTimeout(()=>$('#txName').focus(),100);
  }

  function updateTransactionFieldVisibility(){
    const type=$('#txType').value,beneficiary=$('#txBeneficiary').value; const hints={expense:'Une dépense alimente le réel et le budget.',income:'Un revenu augmente les revenus réels.',refund:'Un remboursement d’achat réduit la dépense de la catégorie.',transfer:'Un remboursement entre vous modifie uniquement le solde du couple.',person_payment:'Un paiement à une personne est traité comme une dépense.',external_refund:'Un remboursement reçu réduit le montant à recevoir des personnes extérieures.'};
    $('#transactionTypeHint').textContent=hints[type]||''; $('#counterpartyRow').classList.toggle('hidden',!['person_payment','external_refund'].includes(type)); $('#payerLabel').firstChild.textContent=['income','refund','external_refund'].includes(type)?'Reçu par *':'Payé par *';
    const splitVisible=beneficiary==='couple'&&['expense','refund','person_payment'].includes(type); $('.split-fieldset').classList.toggle('hidden',!splitVisible); $('.external-fieldset').classList.toggle('hidden',!['expense','person_payment'].includes(type));
    $('#externalFields').classList.toggle('hidden',!$('#txExternalEnabled').checked); $('#recurrenceFields').classList.toggle('hidden',!$('#txRecurring').checked); populateCategorySelect($('#txCategory').value);
  }

  function formCadAmount(){return Number($('#txBankAmount').value||0)||Number($('#txAmount').value||0)*Number($('#txRate').value||1);}
  function formHouseholdAmount(){return Math.max(0,formCadAmount()-($('#txExternalEnabled').checked?Number($('#txExternalAmount').value||0):0));}
  function setSplitMode(mode){$('#splitPercentFields').classList.toggle('hidden',mode!=='percent');$('#splitAmountFields').classList.toggle('hidden',mode!=='amount');updateSplitSummary();}
  function syncSplitPercent(changed){const other=changed==='la'?'partner':'la';$(`#txSplit${other==='la'?'La':'Partner'}`).value=clamp(100-Number($(`#txSplit${changed==='la'?'La':'Partner'}`).value||0),0,100).toFixed(2).replace(/\.00$/,'');const total=formHouseholdAmount();$('#txSplitAmountLa').value=(total*Number($('#txSplitLa').value||0)/100).toFixed(2);$('#txSplitAmountPartner').value=(total*Number($('#txSplitPartner').value||0)/100).toFixed(2);updateSplitSummary();}
  function syncSplitAmount(changed){const total=formHouseholdAmount(),current=Number($(`#txSplitAmount${changed==='la'?'La':'Partner'}`).value||0),other=Math.max(0,total-current);$(`#txSplitAmount${changed==='la'?'Partner':'La'}`).value=other.toFixed(2);const la=Number($('#txSplitAmountLa').value||0),partner=Number($('#txSplitAmountPartner').value||0);$('#txSplitLa').value=total?(la/total*100).toFixed(2):0;$('#txSplitPartner').value=total?(partner/total*100).toFixed(2):0;updateSplitSummary();}
  function updateSplitSummary(){const mode=document.querySelector('input[name="splitMode"]:checked')?.value||'percent',total=formHouseholdAmount(),la=mode==='amount'?Number($('#txSplitAmountLa').value||0):total*Number($('#txSplitLa').value||0)/100,partner=mode==='amount'?Number($('#txSplitAmountPartner').value||0):total*Number($('#txSplitPartner').value||0)/100;$('#splitSummary').textContent=`Part du ménage : ${money(total,'CAD',2)} · ${member('la').name} : ${money(la,'CAD',2)} · ${member('partner').name} : ${money(partner,'CAD',2)}`;updateExternalSummary();}
  function updateExternalSummary(){if(!$('#txExternalEnabled').checked){$('#externalSummary').textContent='';return;}const total=formCadAmount(),external=Number($('#txExternalAmount').value||0);$('#externalSummary').textContent=`Sortie totale : ${money(total,'CAD',2)} · Dépense du ménage : ${money(Math.max(0,total-external),'CAD',2)} · À recevoir : ${money(external,'CAD',2)}`;}

  function saveTransaction(event){
    event.preventDefault(); const existing=state.transactions.find(t=>t.id===$('#transactionId').value); const name=$('#txName').value.trim(),amountOriginal=Number($('#txAmount').value),type=$('#txType').value,currency=$('#txCurrency').value,rate=Number($('#txRate').value||1),bankAmount=Number($('#txBankAmount').value||0),amountCAD=bankAmount||amountOriginal*rate,payerId=$('#txPayer').value;
    let beneficiary=$('#txBeneficiary').value; if(type==='transfer')beneficiary=payerId==='la'?'partner':'la'; if(type==='external_refund')beneficiary=payerId;
    if(!name||!amountOriginal||amountOriginal<=0){showToast('Renseigne un nom et un montant valide.');return;} if(['person_payment','external_refund'].includes(type)&&!$('#txCounterparty').value.trim()){showToast('Indique la personne concernée.');return;}
    const externalAmount=$('#txExternalEnabled').checked?Number($('#txExternalAmount').value||0):0; if(externalAmount>amountCAD+.01){showToast('Le montant extérieur ne peut pas dépasser le montant total.');return;}
    const splitMode=document.querySelector('input[name="splitMode"]:checked')?.value||'percent';let splitLa=Number($('#txSplitLa').value||0),splitPartner=Number($('#txSplitPartner').value||0),splitAmounts={la:formHouseholdAmount()*splitLa/100,partner:formHouseholdAmount()*splitPartner/100};
    if(splitMode==='amount'){splitAmounts={la:Number($('#txSplitAmountLa').value||0),partner:Number($('#txSplitAmountPartner').value||0)};if(Math.abs(splitAmounts.la+splitAmounts.partner-formHouseholdAmount())>.05){showToast('Les montants du ménage doivent égaler la part du ménage.');return;}splitLa=formHouseholdAmount()?splitAmounts.la/formHouseholdAmount()*100:0;splitPartner=formHouseholdAmount()?splitAmounts.partner/formHouseholdAmount()*100:0;}
    if(beneficiary==='couple'&&['expense','refund','person_payment'].includes(type)&&Math.abs(splitLa+splitPartner-100)>.02){showToast('La répartition doit totaliser 100 %.');return;}
    const names=$('#txExternalNames').value.split(',').map(x=>x.trim()).filter(Boolean),count=Math.max(names.length,Number($('#txExternalCount').value||0));const externalParticipants=Array.from({length:count},(_,i)=>({name:names[i]||`Personne ${i+1}`,status:'pending'}));
    const recurrenceEnabled=$('#txRecurring').checked; const tx={...(existing||{}),id:existing?.id||uid('t'),name,type,date:$('#txDate').value||localTodayString(),amountOriginal,currency,rate,bankAmount:bankAmount||null,amountCAD,categoryId:$('#txCategory').value||'other_expense',payerId,beneficiary,split:beneficiary==='couple'?{la:splitLa,partner:splitPartner}:beneficiary==='la'?{la:100,partner:0}:{la:0,partner:100},splitMode:beneficiary==='couple'?splitMode:'percent',splitAmounts:beneficiary==='couple'?splitAmounts:null,status:$('#txStatus').value,note:$('#txNote').value.trim(),counterparty:$('#txCounterparty').value.trim(),externalAmount,externalParticipants,recurring:recurrenceEnabled,recurrence:{enabled:recurrenceEnabled,frequency:recurrenceEnabled?$('#txRecurrenceFrequency').value:null,nextDate:recurrenceEnabled?$('#txRecurrenceNextDate').value:null,endDate:recurrenceEnabled?$('#txRecurrenceEndDate').value:null,autoConfirm:recurrenceEnabled&&$('#txRecurrenceAutoConfirm').checked,needsReview:recurrenceEnabled&&!$('#txRecurrenceNextDate').value}};
    const idx=state.transactions.findIndex(t=>t.id===tx.id);if(idx>=0)state.transactions[idx]=tx;else state.transactions.push(tx);saveState();$('#transactionDialog').close();renderAll();showToast(idx>=0?'Transaction modifiée.':tx.status==='confirmed'?'Transaction ajoutée au réel.':'Transaction ajoutée à vérifier.');
  }

  function materializeRecurringTransactions(){
    const todayString=localTodayString();let changed=false;const sources=state.transactions.filter(tx=>tx.recurrence?.enabled&&tx.recurrence.frequency&&tx.recurrence.nextDate);
    sources.forEach(source=>{let next=source.recurrence.nextDate,guard=0;while(next&&next<=todayString&&guard++<60){if(source.recurrence.endDate&&next>source.recurrence.endDate)break;const exists=state.transactions.some(tx=>tx.recurrenceSourceId===source.id&&tx.date===next);if(!exists){state.transactions.push({...structuredClone(source),id:uid('t'),date:next,status:source.recurrence.autoConfirm?'confirmed':'pending',recurring:false,recurrence:{enabled:false},recurrenceSourceId:source.id,generatedFromRecurrence:true,name:source.name});changed=true;}next=addDate(next,source.recurrence.frequency);}if(next!==source.recurrence.nextDate){source.recurrence.nextDate=next;changed=true;}});if(changed)saveState();return changed;
  }

  function exportCsv(){const rows=[['Date','Nom','Type','Catégorie','Montant original','Devise','Montant CAD','Payé/Reçu par','Concerne','Part ménage','À recevoir extérieur','Personne','Statut','Note']];filteredTransactions().forEach(tx=>rows.push([tx.date,tx.name,typeLabels[tx.type]||tx.type,category(tx.categoryId).name,tx.amountOriginal,tx.currency,tx.amountCAD,member(tx.payerId).name,tx.beneficiary==='couple'?'Ménage':member(tx.beneficiary).name,householdPortion(tx),tx.externalAmount||0,tx.counterparty||'',tx.status,tx.note||'']));const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`trace-transactions-${$('#transactionMonth').value}.csv`);showToast('Export CSV téléchargé.');}
  async function importJson(file){try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.transactions))throw new Error('Sauvegarde invalide');state=migrateState(parsed);saveState();applyTheme();renderAll();navigate('dashboard');showToast('Sauvegarde restaurée.');}catch(error){showToast(`Import impossible : ${error.message}`);}}

  function bindEvents(){
    $$('.modal button[value="cancel"]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close())); $$('[data-route]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.route))); $('#themeToggle').addEventListener('click',()=>{state.household.theme=state.household.theme==='dark'?'light':'dark';saveState();applyTheme();});
    ['openQuickAdd','openQuickAdd2','openQuickAddMobile'].forEach(id=>$('#'+id).addEventListener('click',()=>openTransactionDialog()));$('#addSettlement').addEventListener('click',()=>openTransactionDialog(null,true));$('#transactionForm').addEventListener('submit',saveTransaction);
    $('#txType').addEventListener('change',updateTransactionFieldVisibility);$('#txBeneficiary').addEventListener('change',()=>{if($('#txBeneficiary').value==='couple'&&!$('#transactionId').value){const split=state.household.categorySplits[$('#txCategory').value]||state.household.defaultSplit;$('#txSplitLa').value=split.la;$('#txSplitPartner').value=split.partner;syncSplitPercent('la');}updateTransactionFieldVisibility();});$('#txCategory').addEventListener('change',()=>{if($('#txBeneficiary').value==='couple'&&!$('#transactionId').value){const split=state.household.categorySplits[$('#txCategory').value]||state.household.defaultSplit;$('#txSplitLa').value=split.la;$('#txSplitPartner').value=split.partner;syncSplitPercent('la');}});$('#txExternalEnabled').addEventListener('change',updateTransactionFieldVisibility);$('#txRecurring').addEventListener('change',updateTransactionFieldVisibility);$('#txCurrency').addEventListener('change',updateCurrencyRate);$('#txDate').addEventListener('change',updateCurrencyRate);
    ['txAmount','txRate','txBankAmount','txExternalAmount'].forEach(id=>$('#'+id).addEventListener('input',updateCurrencyHint));$('#calculateEqualExternal').addEventListener('click',()=>{const externalCount=Math.max(1,Number($('#txExternalCount').value||1)),householdPeople=$('#txBeneficiary').value==='couple'?2:1,total=formCadAmount();$('#txExternalAmount').value=(total*externalCount/(externalCount+householdPeople)).toFixed(2);syncSplitPercent('la');});
    $('#txSplitLa').addEventListener('input',()=>syncSplitPercent('la'));$('#txSplitPartner').addEventListener('input',()=>syncSplitPercent('partner'));$('#txSplitAmountLa').addEventListener('input',()=>syncSplitAmount('la'));$('#txSplitAmountPartner').addEventListener('input',()=>syncSplitAmount('partner'));$$('input[name="splitMode"]').forEach(input=>input.addEventListener('change',()=>{setSplitMode(input.value);if(input.value==='amount')syncSplitPercent('la');}));
    ['dashboardMonth','dashboardScope','dashboardMode'].forEach(id=>$('#'+id).addEventListener('change',renderDashboard));$('#projectionInfo').addEventListener('click',()=>showToast('Projection = dépenses comptabilisées + récurrences restantes + moyenne quotidienne des dépenses variables × jours restants.'));
    $('#budgetMonth').addEventListener('change',renderBudget);$('#budgetOwner').addEventListener('change',renderBudget);$('#annualScope').addEventListener('change',renderAnnualBudget);$('#budgetCards').addEventListener('input',event=>{if(event.target.classList.contains('budget-input'))updateBudgetTotals();});$('#saveBudget').addEventListener('click',saveBudgetFromTable);
    $('#copyPreviousBudget').addEventListener('click',()=>{const month=$('#budgetMonth').value,prev=monthOffset(month,-1),owner=$('#budgetOwner').value;state.budgets=state.budgets.filter(b=>!(b.month===month&&b.scope===owner));state.budgets.push(...state.budgets.filter(b=>b.month===prev&&b.scope===owner).map(b=>({...b,id:uid('b'),month})));saveState();renderBudget();showToast(`Budget copié depuis ${monthLabel(prev)}.`);});
    $('#applyTemplateBudget').addEventListener('click',()=>{const month=$('#budgetMonth').value,owner=$('#budgetOwner').value;state.budgets=state.budgets.filter(b=>!(b.month===month&&b.scope===owner));state.budgets.push(...state.budgetTemplate.filter(b=>b.scope===owner).map(b=>({...b,id:uid('b'),month})));saveState();renderBudget();showToast('Mois type appliqué à la personne sélectionnée.');});
    $('#saveAsTemplateBudget').addEventListener('click',()=>{saveBudgetFromTable();const month=$('#budgetMonth').value;state.budgetTemplate=state.budgets.filter(b=>b.month===month).map(b=>({...b,id:uid('b'),month:'template'}));saveState();showToast(`${monthLabel(month)} est maintenant votre mois type complet.`);});
    ['addCategoryButton','addCategoryButtonSettings'].forEach(id=>$('#'+id).addEventListener('click',()=>{$('#categoryForm').reset();$('#categoryIcon').value='＋';renderSettings();$('#customGroupRow').classList.add('hidden');$('#categoryDialog').showModal();}));$('#categoryGroupSelect').addEventListener('change',()=>$('#customGroupRow').classList.toggle('hidden',$('#categoryGroupSelect').value!=='__new__'));
    $('#categoryForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#categoryName').value.trim(),group=$('#categoryGroupSelect').value==='__new__'?$('#categoryGroupCustom').value.trim():$('#categoryGroupSelect').value,type=$('#categoryType').value;if(!group){showToast('Choisis ou crée un groupe.');return;}const id=`custom_${name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}_${Date.now().toString(36)}`;state.categories.push({id,type,group,name,icon:$('#categoryIcon').value.trim()||'＋',custom:true,archived:false});saveState();$('#categoryDialog').close();renderAll();showToast('Catégorie ajoutée.');});
    ['transactionMonth','transactionTypeFilter','transactionScopeFilter'].forEach(id=>$('#'+id).addEventListener('change',renderTransactions));$('#transactionSearch').addEventListener('input',renderTransactions);$('#transactionsTableBody').addEventListener('click',event=>{const edit=event.target.closest('.edit-tx'),del=event.target.closest('.delete-tx'),confirmTx=event.target.closest('.confirm-tx');if(edit)openTransactionDialog(state.transactions.find(t=>t.id===edit.dataset.id));if(confirmTx){const tx=state.transactions.find(t=>t.id===confirmTx.dataset.id);if(tx){tx.status='confirmed';saveState();renderAll();showToast('Transaction comptabilisée.');}}if(del&&confirm('Supprimer cette transaction ?')){state.transactions=state.transactions.filter(t=>t.id!==del.dataset.id);saveState();renderAll();showToast('Transaction supprimée.');}});$('#exportCsv').addEventListener('click',exportCsv);
    $('#coupleMonth').addEventListener('change',()=>{balanceMonthlyOnly=false;renderCouple();});$('#showAllTimeBalance').addEventListener('click',()=>{balanceMonthlyOnly=!balanceMonthlyOnly;renderCouple();});$('#editSplitRules').addEventListener('click',()=>{renderSplitRulesEditor();$('#splitRulesDialog').showModal();});
    $('#splitRulesEditor').addEventListener('input',event=>{const row=event.target.closest('.split-editor-row');if(!row)return;const budget=Number(row.dataset.budget||0),laPct=row.querySelector('.rule-la'),paPct=row.querySelector('.rule-partner'),laAmt=row.querySelector('.rule-amount-la'),paAmt=row.querySelector('.rule-amount-partner');if(event.target===laPct){paPct.value=clamp(100-Number(laPct.value||0),0,100);laAmt.value=(budget*Number(laPct.value||0)/100).toFixed(2);paAmt.value=(budget*Number(paPct.value||0)/100).toFixed(2);}else if(event.target===paPct){laPct.value=clamp(100-Number(paPct.value||0),0,100);laAmt.value=(budget*Number(laPct.value||0)/100).toFixed(2);paAmt.value=(budget*Number(paPct.value||0)/100).toFixed(2);}else if(event.target===laAmt){paAmt.value=Math.max(0,budget-Number(laAmt.value||0)).toFixed(2);laPct.value=budget?Number(laAmt.value||0)/budget*100:50;paPct.value=100-Number(laPct.value||0);}else if(event.target===paAmt){laAmt.value=Math.max(0,budget-Number(paAmt.value||0)).toFixed(2);paPct.value=budget?Number(paAmt.value||0)/budget*100:50;laPct.value=100-Number(paPct.value||0);}});
    $('#splitRulesForm').addEventListener('submit',event=>{event.preventDefault();$$('.split-editor-row').forEach(row=>{const la=Number(row.querySelector('.rule-la').value||0),partner=Number(row.querySelector('.rule-partner').value||0);if(Math.abs(la+partner-100)<=.02)state.household.categorySplits[row.dataset.category]={la,partner};});saveState();$('#splitRulesDialog').close();renderCouple();showToast('Règles enregistrées.');});
    $('#addGoal').addEventListener('click',()=>$('#goalDialog').showModal());$('#goalForm').addEventListener('submit',event=>{event.preventDefault();state.goals.push({id:uid('g'),name:$('#goalName').value.trim(),target:Number($('#goalTarget').value),current:Number($('#goalCurrent').value||0),date:$('#goalDate').value,owner:$('#goalOwner').value});saveState();$('#goalDialog').close();$('#goalForm').reset();renderGoals();showToast('Objectif créé.');});$('#goalGrid').addEventListener('click',event=>{const btn=event.target.closest('.delete-goal');if(btn&&confirm('Supprimer cet objectif ?')){state.goals=state.goals.filter(g=>g.id!==btn.dataset.id);saveState();renderGoals();}});
    $('#saveProfiles').addEventListener('click',()=>{state.household.members[0].name=$('#memberLaName').value.trim()||'Membre 1';state.household.members[0].initials=$('#memberLaInitials').value.trim().toUpperCase()||initialsFor(state.household.members[0].name);state.household.members[1].name=$('#memberPartnerName').value.trim()||'Membre 2';state.household.members[1].initials=$('#memberPartnerInitials').value.trim().toUpperCase()||initialsFor(state.household.members[1].name);saveState();populateSelects();renderAll();showToast('Profils mis à jour.');});
    $('#saveDefaultSplit').addEventListener('click',()=>{const la=Number($('#defaultSplitLa').value),partner=Number($('#defaultSplitPartner').value);if(Math.abs(la+partner-100)>.02){showToast('La répartition doit totaliser 100 %.');return;}state.household.defaultSplit={la,partner};saveState();renderAll();showToast('Répartition enregistrée.');});
    $('#saveOpeningBalance').addEventListener('click',()=>{const value=$('#openingBalance').value;state.household.openingBalance=value===''?null:Number(value);state.household.openingBalanceDate=$('#openingBalanceDate').value;saveState();renderDashboard();showToast('Solde de départ enregistré.');});
    $('#categoryManager').addEventListener('click',event=>{const archive=event.target.closest('.archive-category'),del=event.target.closest('.delete-category');if(archive){const cat=state.categories.find(c=>c.id===archive.dataset.id);if(cat){cat.archived=!cat.archived;saveState();renderAll();showToast(cat.archived?'Catégorie archivée.':'Catégorie réactivée.');}}if(del){const used=state.transactions.some(t=>t.categoryId===del.dataset.id)||state.budgets.some(b=>b.categoryId===del.dataset.id&&Number(b.amount));if(used){showToast('Cette catégorie est utilisée : archive-la plutôt.');return;}state.categories=state.categories.filter(c=>c.id!==del.dataset.id);saveState();renderAll();showToast('Catégorie supprimée.');}});
    $('#secondaryCurrency').addEventListener('change',()=>{state.household.secondaryCurrency=$('#secondaryCurrency').value;saveState();updateRateLabel();});$('#showSecondaryCurrency').addEventListener('change',()=>{state.household.showSecondary=$('#showSecondaryCurrency').checked;saveState();updateRateLabel();});$('#refreshRate').addEventListener('click',()=>{localStorage.removeItem(RATE_CACHE_KEY);updateRateLabel();showToast('Actualisation du taux demandée.');});
    $('#savePin').addEventListener('click',()=>{const pin=$('#pinInput').value.trim();if(pin&&!/^\d{4,6}$/.test(pin)){showToast('Le PIN doit contenir 4 à 6 chiffres.');return;}state.household.pin=pin;saveState();$('#pinInput').value='';showToast(pin?'PIN local activé.':'PIN supprimé.');});$('#lockApp').addEventListener('click',()=>{if(!state.household.pin){showToast('Définis d’abord un PIN.');return;}$('#unlockPin').value='';$('#pinError').textContent='';$('#pinDialog').showModal();});$('#pinForm').addEventListener('submit',event=>{event.preventDefault();if($('#unlockPin').value===state.household.pin)$('#pinDialog').close();else $('#pinError').textContent='Code incorrect.';});
    $('#exportJson').addEventListener('click',exportJson);$('#importJson').addEventListener('change',event=>event.target.files[0]&&importJson(event.target.files[0]));
    $('#resetDemo').addEventListener('click',()=>{if(!confirm('Réinitialiser toutes les données de cet espace partagé ?'))return;const names={la:member('la').name,partner:member('partner').name};state=migrateState(buildEmptyState(names));saveState();applyTheme();setupDateInputs();renderAll();navigate('dashboard');showToast('Espace réinitialisé.');});
    $('#onboardingForm').addEventListener('submit',event=>{event.preventDefault();const names={la:$('#onboardingName1').value.trim()||'Membre 1',partner:$('#onboardingName2').value.trim()||'Membre 2'};state=migrateState(buildEmptyState(names));firstLaunch=false;saveState();$('#onboardingDialog').close();applyTheme();renderAll();navigate('dashboard');});$('#startDemoButton').addEventListener('click',()=>{const names={la:$('#onboardingName1').value.trim()||'Membre 1',partner:$('#onboardingName2').value.trim()||'Membre 2'};state=migrateState(buildInitialState(names));firstLaunch=false;saveState();$('#onboardingDialog').close();applyTheme();renderAll();navigate('dashboard');});
    $('#applyUpdate').addEventListener('click',()=>{window.__traceWaitingWorker?.postMessage({type:'SKIP_WAITING'});});
  }


  function activateApp(options = {}) {
    const { showOnboarding = false } = options;
    if (!eventsBound) {
      bindEvents();
      eventsBound = true;
    }
    appActivated = true;
    document.querySelector('#app')?.classList.remove('cloud-locked');
    applyTheme(); setupDateInputs(); populateSelects();
    materializeRecurringTransactions();
    renderAll();
    const route = location.hash.replace('#','') || state.household.lastRoute || 'dashboard';
    navigate(route);
    if (showOnboarding && firstLaunch) setTimeout(()=>$('#onboardingDialog').showModal(),120);
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').then(registration => {
        const watch = worker => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.__traceWaitingWorker = registration.waiting || worker;
              $('#updateBanner')?.classList.remove('hidden');
            }
          });
        };
        watch(registration.installing);
        registration.addEventListener('updatefound', () => watch(registration.installing));
        if (registration.waiting) { window.__traceWaitingWorker = registration.waiting; $('#updateBanner')?.classList.remove('hidden'); }
      }).catch(console.warn);
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    }
  }

  async function init() {
    const adapter = {
      activate: activateApp,
      getState: () => state,
      replaceState,
      saveState,
      render: renderAll,
      migrateState,
      buildEmptyState,
      buildInitialState,
      getLegacyState,
      localPreferencesFrom,
      cloudCacheKey,
      showToast
    };

    if (window.BudgetDuoCloud?.start) {
      await window.BudgetDuoCloud.start(adapter);
    } else {
      document.querySelector('#cloudGate')?.classList.add('hidden');
      activateApp({ showOnboarding: true });
    }
  }

  document.addEventListener('DOMContentLoaded',init);
})();
