(() => {
  'use strict';

  const COLLECTIONS = {
    categories: 'categories',
    accounts: 'accounts',
    budgets: 'budgets',
    budgetTemplate: 'budget_template',
    transactions: 'transactions',
    goals: 'goals'
  };

  const STATUS = {
    loading: ['Connexion…', 'Vérification du cloud', 'loading'],
    saving: ['Enregistrement…', 'Envoi des modifications', 'saving'],
    synced: ['Synchronisé', 'Données à jour', 'synced'],
    offline: ['Hors connexion', 'Modifications conservées localement', 'offline'],
    error: ['Erreur de synchronisation', 'Nouvelle tentative automatique', 'error']
  };

  let adapter;
  let client;
  let currentSession = null;
  let membership = null;
  let household = null;
  let snapshot = null;
  let ready = false;
  let saveTimer = null;
  let reloadTimer = null;
  let saving = false;
  let saveAgain = false;
  let realtimeChannels = [];
  let ignoreRealtimeUntil = 0;
  let uiBound = false;
  let appStarted = false;
  let handlingSession = false;
  let lastHandledUserId = null;

  const $ = selector => document.querySelector(selector);
  const deepClone = value => value == null ? value : structuredClone(value);
  const stable = value => JSON.stringify(value);
  const same = (a, b) => stable(a) === stable(b);
  const normalizeCode = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const baseUrl = () => `${location.origin}${location.pathname}`;
  const config = () => window.BUDGET_DUO_CONFIG || {};

  function isConfigured() {
    const { supabaseUrl, supabasePublishableKey } = config();
    return Boolean(
      supabaseUrl && supabasePublishableKey &&
      !supabaseUrl.includes('YOUR_PROJECT') &&
      !supabasePublishableKey.includes('YOUR_PUBLISHABLE') &&
      /^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl)
    );
  }

  function isReady() {
    return ready;
  }

  function showGatePanel(panelId) {
    $('#cloudGate')?.classList.remove('hidden');
    ['cloudLoadingPanel', 'cloudConfigPanel', 'cloudAuthPanel', 'cloudWorkspacePanel'].forEach(id => {
      $(`#${id}`)?.classList.toggle('hidden', id !== panelId);
    });
    $('#app')?.classList.add('cloud-locked');
  }

  function hideGate() {
    $('#cloudGate')?.classList.add('hidden');
    $('#app')?.classList.remove('cloud-locked');
  }

  function setPanelMessage(id, message = '', kind = '') {
    const node = $(`#${id}`);
    if (!node) return;
    node.textContent = message;
    node.className = `cloud-message${kind ? ` ${kind}` : ''}`;
  }

  function setSyncStatus(key, detailOverride = '') {
    const [label, detail, className] = STATUS[key] || STATUS.loading;
    const pill = $('#syncPill');
    if (pill) pill.dataset.status = className;
    if ($('#syncLabel')) $('#syncLabel').textContent = label;
    if ($('#syncDetail')) $('#syncDetail').textContent = detailOverride || detail;
    if ($('#cloudSettingsStatus')) {
      $('#cloudSettingsStatus').textContent = label;
      $('#cloudSettingsStatus').dataset.status = className;
    }
  }

  function switchAuthTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
    $('#cloudLoginForm')?.classList.toggle('hidden', tab !== 'login');
    $('#cloudSignupForm')?.classList.toggle('hidden', tab !== 'signup');
    if ($('#cloudAuthTitle')) $('#cloudAuthTitle').textContent = tab === 'login' ? 'Se connecter' : 'Créer un compte';
    setPanelMessage('cloudAuthMessage');
  }

  function switchWorkspaceTab(tab) {
    document.querySelectorAll('[data-workspace-tab]').forEach(button => button.classList.toggle('active', button.dataset.workspaceTab === tab));
    $('#cloudCreateHouseholdForm')?.classList.toggle('hidden', tab !== 'create');
    $('#cloudJoinHouseholdForm')?.classList.toggle('hidden', tab !== 'join');
    setPanelMessage('cloudWorkspaceMessage');
  }

  function bindUI() {
    if (uiBound) return;
    uiBound = true;

    document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => switchAuthTab(button.dataset.authTab)));
    document.querySelectorAll('[data-workspace-tab]').forEach(button => button.addEventListener('click', () => switchWorkspaceTab(button.dataset.workspaceTab)));

    $('#cloudLoginForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      setPanelMessage('cloudAuthMessage', 'Connexion en cours…');
      const { error } = await client.auth.signInWithPassword({
        email: $('#cloudLoginEmail').value.trim(),
        password: $('#cloudLoginPassword').value
      });
      if (error) setPanelMessage('cloudAuthMessage', translateError(error), 'error');
    });

    $('#cloudSignupForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      setPanelMessage('cloudAuthMessage', 'Création du compte…');
      const displayName = $('#cloudSignupName').value.trim();
      const { data, error } = await client.auth.signUp({
        email: $('#cloudSignupEmail').value.trim(),
        password: $('#cloudSignupPassword').value,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: baseUrl()
        }
      });
      if (error) {
        setPanelMessage('cloudAuthMessage', translateError(error), 'error');
        return;
      }
      if (!data.session) {
        setPanelMessage('cloudAuthMessage', 'Compte créé. Confirme ton adresse courriel, puis reviens te connecter.', 'success');
      } else {
        setPanelMessage('cloudAuthMessage', 'Compte créé. Préparation de ton espace…', 'success');
      }
    });

    $('#cloudCreateHouseholdForm')?.addEventListener('submit', createHousehold);
    $('#cloudJoinHouseholdForm')?.addEventListener('submit', joinHousehold);
    $('#cloudWorkspaceSignOut')?.addEventListener('click', signOut);
    $('#cloudSignOut')?.addEventListener('click', signOut);
    $('#cloudCopyInvite')?.addEventListener('click', copyInvite);
    $('#cloudRotateInvite')?.addEventListener('click', rotateInvite);
    $('#cloudReloadData')?.addEventListener('click', async () => {
      setSyncStatus('loading', 'Rechargement demandé');
      await reloadFromCloud({ preserveLocal: true, announce: true });
    });

    window.addEventListener('online', () => {
      if (!ready) return;
      setSyncStatus('loading', 'Connexion retrouvée');
      queueSave(adapter.getState(), 50);
      reloadFromCloud({ preserveLocal: true }).catch(console.warn);
    });
    window.addEventListener('offline', () => ready && setSyncStatus('offline'));
  }

  function translateError(error) {
    const text = String(error?.message || error || 'Erreur inconnue');
    const translations = [
      [/Invalid login credentials/i, 'Adresse courriel ou mot de passe incorrect.'],
      [/Email not confirmed/i, 'Confirme d’abord ton adresse courriel.'],
      [/User already registered/i, 'Un compte existe déjà avec cette adresse.'],
      [/Password should be at least/i, 'Le mot de passe est trop court.'],
      [/already belongs to a household/i, 'Ce compte appartient déjà à un espace.'],
      [/Household is full/i, 'Cet espace contient déjà ses deux membres.'],
      [/Invalid invitation code/i, 'Ce code d’invitation est invalide.'],
      [/Invitation code not found/i, 'Ce code d’invitation est introuvable.']
    ];
    for (const [pattern, replacement] of translations) if (pattern.test(text)) return replacement;
    return text;
  }

  async function start(appAdapter) {
    adapter = appAdapter;
    bindUI();
    setSyncStatus('loading');

    if (!isConfigured() || !window.supabase?.createClient) {
      showGatePanel('cloudConfigPanel');
      return;
    }

    const { supabaseUrl, supabasePublishableKey } = config();
    client = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    client.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      if (event === 'SIGNED_OUT') {
        handleSession(null).catch(console.error);
        return;
      }
      if (session && session.user.id !== lastHandledUserId) {
        setTimeout(() => handleSession(session).catch(console.error), 0);
      }
    });

    const { data, error } = await client.auth.getSession();
    if (error) {
      showGatePanel('cloudAuthPanel');
      setPanelMessage('cloudAuthMessage', translateError(error), 'error');
      return;
    }
    await handleSession(data.session);
  }

  async function handleSession(session) {
    if (handlingSession) return;
    handlingSession = true;
    try {
      currentSession = session;
      if (!session) {
        ready = false;
        lastHandledUserId = null;
        membership = null;
        household = null;
        snapshot = null;
        stopRealtime();
        showGatePanel('cloudAuthPanel');
        switchAuthTab('login');
        setSyncStatus('offline', 'Non connecté');
        return;
      }

      lastHandledUserId = session.user.id;
      showGatePanel('cloudLoadingPanel');
      if ($('#cloudLoadingText')) $('#cloudLoadingText').textContent = 'Recherche de votre espace partagé…';

      const memberResult = await client
        .from('household_members')
        .select('household_id, user_id, slot, role, display_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (memberResult.error) throw memberResult.error;
      if (!memberResult.data) {
        ready = false;
        membership = null;
        household = null;
        showWorkspaceSetup(session.user);
        return;
      }

      membership = memberResult.data;
      await loadConnectedHousehold();
    } catch (error) {
      console.error(error);
      showGatePanel('cloudAuthPanel');
      setPanelMessage('cloudAuthMessage', `Connexion impossible : ${translateError(error)}`, 'error');
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      handlingSession = false;
    }
  }

  function showWorkspaceSetup(user) {
    showGatePanel('cloudWorkspacePanel');
    const suggestedName = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
    if ($('#cloudCreatorName') && !$('#cloudCreatorName').value) $('#cloudCreatorName').value = suggestedName;
    if ($('#cloudJoinName') && !$('#cloudJoinName').value) $('#cloudJoinName').value = suggestedName;
    const hasLocal = Boolean(adapter.getLegacyState());
    $('#cloudImportLocalRow')?.classList.toggle('hidden', !hasLocal);
    if ($('#cloudImportLocal')) $('#cloudImportLocal').checked = hasLocal;

    const invite = normalizeCode(new URLSearchParams(location.search).get('invite'));
    if (invite) {
      switchWorkspaceTab('join');
      $('#cloudInviteCode').value = invite;
    } else {
      switchWorkspaceTab('create');
    }
    setSyncStatus('offline', 'Aucun espace sélectionné');
  }

  async function createHousehold(event) {
    event.preventDefault();
    setPanelMessage('cloudWorkspaceMessage', 'Création de l’espace…');
    const name = $('#cloudHouseholdName').value.trim();
    const creatorName = $('#cloudCreatorName').value.trim();
    const partnerName = $('#cloudPartnerName').value.trim();

    const { data, error } = await client.rpc('create_household', {
      p_name: name,
      p_display_name: creatorName
    });
    if (error) {
      setPanelMessage('cloudWorkspaceMessage', translateError(error), 'error');
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    membership = {
      household_id: result.household_id,
      user_id: currentSession.user.id,
      slot: 'la',
      role: 'owner',
      display_name: creatorName
    };
    household = {
      id: result.household_id,
      name,
      invite_code: result.invite_code,
      settings: {},
      updated_by: currentSession.user.id
    };

    const importLocal = $('#cloudImportLocal')?.checked;
    let initial = importLocal ? adapter.getLegacyState() : null;
    initial = adapter.migrateState(initial ? initial : adapter.buildEmptyState({ la: creatorName, partner: partnerName }));
    initial.version = 4;
    initial.household.name = name;
    initial.household.members[0].name = creatorName;
    initial.household.members[0].initials = initialsFor(creatorName);
    initial.household.members[1].name = partnerName;
    initial.household.members[1].initials = initialsFor(partnerName);

    try {
      await writeFullState(initial);
      setPanelMessage('cloudWorkspaceMessage', 'Espace créé. Chargement des données…', 'success');
      await loadConnectedHousehold();
      adapter.showToast('Espace partagé créé. Tu peux maintenant inviter ton partenaire.');
    } catch (writeError) {
      console.error(writeError);
      setPanelMessage('cloudWorkspaceMessage', `Espace créé, mais les données n’ont pas pu être importées : ${translateError(writeError)}`, 'error');
    }
  }

  async function joinHousehold(event) {
    event.preventDefault();
    const displayName = $('#cloudJoinName').value.trim();
    const code = normalizeCode($('#cloudInviteCode').value);
    setPanelMessage('cloudWorkspaceMessage', 'Connexion à l’espace…');

    const { data, error } = await client.rpc('join_household', {
      p_invite_code: code,
      p_display_name: displayName
    });
    if (error) {
      setPanelMessage('cloudWorkspaceMessage', translateError(error), 'error');
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    membership = {
      household_id: result.household_id,
      user_id: currentSession.user.id,
      slot: result.slot,
      role: 'member',
      display_name: displayName
    };
    await loadConnectedHousehold();

    const current = adapter.getState();
    const target = current.household.members.find(member => member.id === result.slot);
    if (target && target.name !== displayName) {
      target.name = displayName;
      target.initials = initialsFor(displayName);
      adapter.saveState();
    }
    adapter.showToast('Tu as rejoint l’espace partagé.');
  }

  async function loadConnectedHousehold() {
    showGatePanel('cloudLoadingPanel');
    if ($('#cloudLoadingText')) $('#cloudLoadingText').textContent = 'Téléchargement du budget partagé…';

    const [householdResult, documentsResult] = await Promise.all([
      client.from('households').select('id, name, invite_code, settings, schema_version, created_by, updated_by, updated_at').eq('id', membership.household_id).single(),
      client.from('documents').select('household_id, collection, item_id, data, updated_by, updated_at').eq('household_id', membership.household_id)
    ]);
    if (householdResult.error) throw householdResult.error;
    if (documentsResult.error) throw documentsResult.error;

    household = householdResult.data;
    const shouldPersistMigration = Number(household.settings?.schemaVersion || 3) < 4;
    const remoteState = stateFromCloud(household, documentsResult.data);
    if (shouldPersistMigration) {
      await writeFullState(remoteState);
      household.settings = sharedHouseholdSettings(remoteState);
      household.schema_version = 4;
    }
    snapshot = deepClone(remoteState);
    adapter.replaceState(remoteState, adapter.cloudCacheKey(household.id));
    ready = true;
    updateAccountUI();
    startRealtime();
    hideGate();
    if (!appStarted) {
      adapter.activate({ showOnboarding: false });
      appStarted = true;
    } else {
      adapter.render();
    }
    setSyncStatus(navigator.onLine ? 'synced' : 'offline');
  }

  function stateFromCloud(householdRow, rows) {
    const cached = readCachedState(householdRow.id);
    const localPrefs = adapter.localPreferencesFrom(cached || adapter.getState());
    const base = adapter.buildEmptyState();
    base.version = 4;
    base.household = {
      ...base.household,
      ...(householdRow.settings || {}),
      name: householdRow.name || householdRow.settings?.name || 'Notre budget',
      ...localPrefs
    };

    Object.entries(COLLECTIONS).forEach(([stateKey, collection]) => {
      base[stateKey] = rows
        .filter(row => row.collection === collection)
        .map(row => row.data)
        .filter(Boolean);
    });
    return adapter.migrateState(base);
  }

  function readCachedState(householdId) {
    try {
      const raw = localStorage.getItem(adapter.cloudCacheKey(householdId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function sharedHouseholdSettings(state) {
    const h = state.household || {};
    return {
      name: h.name || household?.name || 'Notre budget',
      baseCurrency: h.baseCurrency || 'CAD',
      secondaryCurrency: h.secondaryCurrency || 'EUR',
      showSecondary: Boolean(h.showSecondary),
      members: deepClone(h.members || []),
      defaultSplit: deepClone(h.defaultSplit || { la: 50, partner: 50 }),
      categorySplits: deepClone(h.categorySplits || {}),
      openingBalance: h.openingBalance ?? null,
      openingBalanceDate: h.openingBalanceDate || '',
      schemaVersion: 4
    };
  }

  function collectionMap(state, stateKey) {
    return new Map((state?.[stateKey] || []).map(item => [String(item.id), item]));
  }

  function calculateDirty(localState, baseState) {
    const dirty = {
      household: !same(sharedHouseholdSettings(localState), sharedHouseholdSettings(baseState)),
      changed: {},
      deleted: {}
    };
    Object.keys(COLLECTIONS).forEach(stateKey => {
      const localMap = collectionMap(localState, stateKey);
      const baseMap = collectionMap(baseState, stateKey);
      dirty.changed[stateKey] = [...localMap.entries()]
        .filter(([id, value]) => !baseMap.has(id) || !same(value, baseMap.get(id)))
        .map(([, value]) => value);
      dirty.deleted[stateKey] = [...baseMap.keys()].filter(id => !localMap.has(id));
    });
    dirty.hasChanges = dirty.household || Object.values(dirty.changed).some(items => items.length) || Object.values(dirty.deleted).some(items => items.length);
    return dirty;
  }

  function applyDirty(remoteState, localState, dirty) {
    const merged = deepClone(remoteState);
    if (dirty.household) {
      const localShared = sharedHouseholdSettings(localState);
      merged.household = { ...merged.household, ...localShared, ...adapter.localPreferencesFrom(localState) };
    } else {
      merged.household = { ...merged.household, ...adapter.localPreferencesFrom(localState) };
    }

    Object.keys(COLLECTIONS).forEach(stateKey => {
      const map = collectionMap(merged, stateKey);
      dirty.deleted[stateKey].forEach(id => map.delete(id));
      dirty.changed[stateKey].forEach(item => map.set(String(item.id), deepClone(item)));
      merged[stateKey] = [...map.values()];
    });
    return adapter.migrateState(merged);
  }

  function queueSave(nextState, delay = 450) {
    if (!ready || !currentSession || !household) return;
    localStorage.setItem(adapter.cloudCacheKey(household.id), JSON.stringify(nextState));
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, delay);
  }

  async function flushSave() {
    if (!ready || !currentSession || !household || !snapshot) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (saving) {
      saveAgain = true;
      return;
    }

    const localState = deepClone(adapter.getState());
    const dirty = calculateDirty(localState, snapshot);
    if (!dirty.hasChanges) {
      setSyncStatus('synced');
      return;
    }

    saving = true;
    saveAgain = false;
    setSyncStatus('saving');
    ignoreRealtimeUntil = Date.now() + 1800;

    try {
      if (dirty.household) {
        const shared = sharedHouseholdSettings(localState);
        const { error } = await client.from('households').update({
          name: shared.name,
          settings: shared,
          schema_version: 4,
          updated_by: currentSession.user.id
        }).eq('id', household.id);
        if (error) throw error;
        household.name = shared.name;
        household.settings = shared;
      }

      for (const [stateKey, collection] of Object.entries(COLLECTIONS)) {
        const changed = dirty.changed[stateKey];
        if (changed.length) {
          const rows = changed.map(item => ({
            household_id: household.id,
            collection,
            item_id: String(item.id),
            data: item,
            updated_by: currentSession.user.id
          }));
          const { error } = await client.from('documents').upsert(rows, { onConflict: 'household_id,collection,item_id' });
          if (error) throw error;
        }

        const deleted = dirty.deleted[stateKey];
        if (deleted.length) {
          const { error } = await client.from('documents')
            .delete()
            .eq('household_id', household.id)
            .eq('collection', collection)
            .in('item_id', deleted);
          if (error) throw error;
        }
      }

      snapshot = deepClone(localState);
      updateAccountUI();
      setSyncStatus('synced');
    } catch (error) {
      console.error('Supabase save failed', error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      setTimeout(() => queueSave(adapter.getState(), 50), 4000);
    } finally {
      saving = false;
      if (saveAgain) queueSave(adapter.getState(), 50);
    }
  }

  async function writeFullState(fullState) {
    const shared = sharedHouseholdSettings(fullState);
    const householdUpdate = await client.from('households').update({
      name: shared.name,
      settings: shared,
      schema_version: 4,
      updated_by: currentSession.user.id
    }).eq('id', household.id);
    if (householdUpdate.error) throw householdUpdate.error;

    const rows = [];
    Object.entries(COLLECTIONS).forEach(([stateKey, collection]) => {
      (fullState[stateKey] || []).forEach(item => rows.push({
        household_id: household.id,
        collection,
        item_id: String(item.id),
        data: item,
        updated_by: currentSession.user.id
      }));
    });

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await client.from('documents').upsert(rows.slice(i, i + 500), { onConflict: 'household_id,collection,item_id' });
      if (error) throw error;
    }
  }

  async function fetchRemoteState() {
    const [householdResult, documentsResult] = await Promise.all([
      client.from('households').select('id, name, invite_code, settings, schema_version, created_by, updated_by, updated_at').eq('id', household.id).single(),
      client.from('documents').select('household_id, collection, item_id, data, updated_by, updated_at').eq('household_id', household.id)
    ]);
    if (householdResult.error) throw householdResult.error;
    if (documentsResult.error) throw documentsResult.error;
    household = householdResult.data;
    return stateFromCloud(householdResult.data, documentsResult.data);
  }

  async function reloadFromCloud({ preserveLocal = true, announce = false } = {}) {
    if (!ready || !household || !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    try {
      const localState = deepClone(adapter.getState());
      const dirty = snapshot ? calculateDirty(localState, snapshot) : null;
      const remote = await fetchRemoteState();
      const merged = preserveLocal && dirty?.hasChanges ? applyDirty(remote, localState, dirty) : remote;
      snapshot = deepClone(remote);
      adapter.replaceState(merged, adapter.cloudCacheKey(household.id));
      updateAccountUI();
      setSyncStatus('synced');
      if (dirty?.hasChanges) queueSave(merged, 80);
      if (announce) adapter.showToast('Données rechargées depuis Supabase.');
    } catch (error) {
      console.error('Remote reload failed', error);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
      if (announce) adapter.showToast(`Rechargement impossible : ${translateError(error)}`);
    }
  }

  function startRealtime() {
    stopRealtime();
    const filter = `household_id=eq.${household.id}`;
    const documentsChannel = client.channel(`budget-documents-${household.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter }, handleRealtimePayload)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') setSyncStatus('error');
      });

    const householdChannel = client.channel(`budget-household-${household.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${household.id}` }, handleRealtimePayload)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') setSyncStatus('error');
      });

    realtimeChannels = [documentsChannel, householdChannel];
  }

  function stopRealtime() {
    if (!client) return;
    realtimeChannels.forEach(channel => client.removeChannel(channel));
    realtimeChannels = [];
  }

  function handleRealtimePayload(payload) {
    if (!ready) return;
    const updatedBy = payload.new?.updated_by || payload.old?.updated_by;
    if (updatedBy === currentSession?.user?.id && Date.now() < ignoreRealtimeUntil) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => reloadFromCloud({ preserveLocal: true }), 350);
  }

  function updateAccountUI() {
    if (!currentSession || !household) return;
    if ($('#cloudAccountEmail')) $('#cloudAccountEmail').textContent = currentSession.user.email || 'Compte connecté';
    if ($('#cloudHouseholdLabel')) $('#cloudHouseholdLabel').textContent = household.name || 'Notre budget';
    const members = adapter.getState()?.household?.members || [];
    if ($('#cloudMembersLabel')) $('#cloudMembersLabel').textContent = members.map(member => member.name).join(' + ');
    if ($('#cloudInviteLabel')) $('#cloudInviteLabel').textContent = household.invite_code || '—';
    const link = `${baseUrl()}?invite=${encodeURIComponent(household.invite_code || '')}`;
    if ($('#cloudInviteLink')) $('#cloudInviteLink').value = link;
  }

  async function copyInvite() {
    if (!household?.invite_code) return;
    const link = `${baseUrl()}?invite=${encodeURIComponent(household.invite_code)}`;
    const message = `Rejoins mon espace Trace avec ce lien : ${link}\nCode : ${household.invite_code}`;
    try {
      await navigator.clipboard.writeText(message);
      adapter.showToast('Lien et code d’invitation copiés.');
    } catch {
      $('#cloudInviteLink')?.select();
      adapter.showToast('Sélectionne puis copie le lien d’invitation.');
    }
  }

  async function rotateInvite() {
    if (!confirm('Créer un nouveau code ? L’ancien lien ne fonctionnera plus.')) return;
    const { data, error } = await client.rpc('rotate_household_invite', { p_household_id: household.id });
    if (error) {
      adapter.showToast(`Impossible de créer un nouveau code : ${translateError(error)}`);
      return;
    }
    household.invite_code = typeof data === 'string' ? data : data?.invite_code || data;
    updateAccountUI();
    adapter.showToast('Nouveau code d’invitation créé.');
  }

  async function signOut() {
    ready = false;
    stopRealtime();
    clearTimeout(saveTimer);
    await client.auth.signOut();
  }

  function initialsFor(name = '') {
    return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  window.BudgetDuoCloud = {
    start,
    queueSave,
    isReady,
    isConfigured,
    reloadFromCloud,
    getCurrentMemberSlot: () => membership?.slot || null,
    getCurrentUserEmail: () => currentSession?.user?.email || null
  };
})();
