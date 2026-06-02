// Camera configuration — state machine
// Manages: live (what the camera actually has), draft (unsaved user edits),
// pending (submitted but not yet synced), lastResult (applied/failed per key).

const { useState, useMemo, useCallback } = React;

// Initial states per sync scenario (used by Tweaks)
function buildScenario(scenario) {
  const live = { ...DEFAULTS };
  switch (scenario) {
    case 'in-sync':
      return { live, draft: { ...live }, pending: null, syncStatus: 'idle' };
    case 'unsaved':
      return {
        live, draft: { ...live, cameraName: 'Mercedes Actros 456', ch2_audio: true },
        pending: null, syncStatus: 'idle',
      };
    case 'queued': {
      // Edits to ONE event's parameters — demonstrates the brand split: Howen bundles
      // these into a single dms-events row, Queclink fans them out to GTDSS + GTREC + GTVOL.
      const pend = {
        ...live, ch1_audio: true, timezone: 'Europe/Riga (+02:00)',
        dmsEvents: true, dms_yawning_enabled: true,
        dms_yawning_sensitivity: 'high', dms_yawning_uploadFormat: 'Video', dms_yawning_inCabinAudio: 'Beep',
      };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'queued' };
    }
    case 'syncing': {
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', ch1_audio: true, wifiSsid: 'Fleet-Cam-New' };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'syncing' };
    }
    case 'partial': {
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', ch1_audio: true, wifiSsid: 'Fleet-Cam-New', dmsEvents: true, dms_yawning_enabled: true };
      // audio and ssid applied; timezone + dms failed
      const applied = { ...live, ch1_audio: true, wifiSsid: 'Fleet-Cam-New' };
      return {
        live: applied, draft: { ...pend }, pending: pend,
        syncStatus: 'partial',
        lastResult: {
          timezone: { status: 'failed', reason: 'Camera rejected value' },
          dmsEvents: { status: 'failed', reason: 'Feature not licensed' },
          dms_yawning_enabled: { status: 'failed', reason: 'Feature not licensed' },
          ch1_audio: { status: 'applied' },
          wifiSsid: { status: 'applied' },
        },
      };
    }
    case 'long-values': {
      // Edge case — long values test inline diff truncation.
      const pend = {
        ...live,
        cameraName: 'Mercedes-Benz Actros 1853 Long-Haul Prime Mover',
        wifiSsid: 'Fleet-Corporate-LT-Depot-3-Extended',
        vehicle: 'CD 5678',
        timezone: 'America/New_York (-05:00)',
        ttsLanguage: 'Latviešu',
      };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'queued' };
    }
    case 'failed': {
      // timezone + audio + two DMS events. On Howen the DMS pair collapses into ONE
      // failed row (dms-events); on Queclink they become TWO failed AT+GTDSS rows.
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', ch1_audio: true, dmsEvents: true, dms_yawning_enabled: true, dms_smoking_enabled: true };
      return {
        live, draft: { ...pend }, pending: pend, syncStatus: 'failed',
        lastResult: {
          timezone: { status: 'failed', reason: 'Sync timed out' },
          ch1_audio: { status: 'failed', reason: 'Sync timed out' },
          dmsEvents: { status: 'failed', reason: 'Sync timed out' },
          dms_yawning_enabled: { status: 'failed', reason: 'Sync timed out' },
          dms_smoking_enabled: { status: 'failed', reason: 'Sync timed out' },
        },
      };
    }
    default:
      return { live, draft: { ...live }, pending: null, syncStatus: 'idle' };
  }
}

function buildInitialLog(s, brand) {
  if (!s.pending) return [];
  const router = routerFor(brand);
  const keys = Object.keys(s.pending).filter(k => !deepEq(s.pending[k], DEFAULTS[k]));
  if (keys.length === 0) return [];

  // Fan out by the brand's command router; platform-only fields (route === null)
  // are skipped. Fields that route to the same command key merge into one entry.
  const groups = {};
  for (const k of keys) {
    const route = router.routeField(k);
    if (!route) continue;
    if (!groups[route.key]) groups[route.key] = { route, keys: [] };
    groups[route.key].keys.push(k);
  }
  if (Object.keys(groups).length === 0) return [];

  return Object.values(groups).map(({ route, keys: cmdKeys }) => {
    const changes = cmdKeys.map(k => ({
      label: FIELD_META[k]?.label || k,
      diff: `${formatValue(k, DEFAULTS[k])} → ${formatValue(k, s.pending[k])}`,
    }));
    // Per-command status derived from lastResult (each command succeeds or fails independently).
    let status;
    if (s.syncStatus === 'queued') {
      status = 'queued';
    } else if (s.lastResult) {
      const results = cmdKeys.map(k => s.lastResult[k]).filter(Boolean);
      const hasFailed = results.some(r => r.status === 'failed');
      const allApplied = results.length > 0 && results.every(r => r.status === 'applied');
      status = hasFailed ? 'failed' : allApplied ? 'applied' : 'pending';
    } else {
      status = 'pending';
    }
    return { id: `init-${route.key}`, title: route.title, protocol: route.protocol, changes, when: 'just now', status };
  });
}

// Stamp the camera's brand onto every state slice so the read-only brand field and
// the per-brand router both see the right manufacturer.
function applyBrand(s, brand) {
  if (!brand) return s;
  const slices = [s.live, s.draft, s.pending].filter(Boolean);
  for (const sl of slices) sl.brand = brand;
  // Some brands (Queclink) start channels unnamed — show the placeholder, not "Ch1".
  if (brandUI(brand).clearChannelNames) {
    for (const sl of slices) {
      for (let i = 1; i <= MAX_CHANNELS; i++) sl[channelKey(i, 'name')] = '';
    }
  }
  // When a brand's DMS/ADAS/Harsh events are read-only (Queclink), they reflect the
  // device's current config — not user edits. Reset those fields to defaults so a seeded
  // scenario never shows them as pending/dirty on a read-only section.
  if (!brandUI(brand).eventsEditable) {
    const readonlySys = new Set(['dms', 'adas', 'harsh']);
    for (const sl of slices) {
      for (const k of Object.keys(sl)) {
        if (readonlySys.has(FIELD_META[k]?.route?.sys)) sl[k] = DEFAULTS[k];
      }
    }
  }
  return s;
}

function useCameraConfig(scenario = 'in-sync', brand = DEFAULT_BRAND) {
  const [state, setState] = useState(() => {
    const s = applyBrand(buildScenario(scenario), brand);
    return { ...s, submissionLog: buildInitialLog(s, brand) };
  });

  // Re-seed state when scenario or brand changes (tweaks panel / opening a camera)
  React.useEffect(() => {
    const s = applyBrand(buildScenario(scenario), brand);
    setState({ ...s, submissionLog: buildInitialLog(s, brand) });
  }, [scenario, brand]);

  // Diff helpers ----------------------------------------------------

  // "dirty" = draft differs from what the user last submitted (pending) or
  // from live if nothing is pending. This is what drives the "unsaved
  // changes" bar at the bottom of the form.
  const baseline = state.pending || state.live;
  const dirtyKeys = useMemo(
    () => Object.keys(state.draft).filter(k => !deepEq(state.draft[k], baseline[k])),
    [state.draft, baseline]
  );

  // "pending" = what was submitted but is not yet confirmed applied.
  const pendingKeys = useMemo(
    () => state.pending ? Object.keys(state.pending).filter(k => !deepEq(state.pending[k], state.live[k])) : [],
    [state.pending, state.live]
  );

  // Failed keys from last sync attempt
  const failedKeys = useMemo(
    () => Object.entries(state.lastResult || {}).filter(([, r]) => r.status === 'failed').map(([k]) => k),
    [state.lastResult]
  );

  // ── Actions -----------------------------------------------------

  const updateDraft = useCallback((key, value) => {
    setState(s => ({ ...s, draft: { ...s.draft, [key]: value } }));
  }, []);

  // Update several draft keys at once (used for parent/children event toggles).
  const updateDraftMany = useCallback((patch) => {
    setState(s => ({ ...s, draft: { ...s.draft, ...patch } }));
  }, []);

  const discard = useCallback(() => {
    setState(s => ({ ...s, draft: { ...(s.pending || s.live) } }));
  }, []);

  const submit = useCallback((isOnline = true) => {
    // Decide up-front whether this save involves any DEVICE command. Only device commands
    // have a sync lifecycle, so only they should schedule the "mark applied" timer —
    // a platform-only save (e.g. renaming the camera) must not touch device sync state.
    const baseNow = state.pending || state.live;
    const dirtyNow = Object.keys(state.draft).filter(k => !deepEq(state.draft[k], baseNow[k]));
    const failedNow = Object.keys(state.lastResult || {}).filter(k => state.lastResult[k].status === 'failed');
    const hasDevice = [...new Set([...dirtyNow, ...failedNow])].some(k => routerFor(brand).routeField(k));

    setState(s => {
      const baseline = s.pending || s.live;
      // Dirty keys (new edits) + any currently-failed keys being retried together
      const dirtyKeys = Object.keys(s.draft).filter(k => !deepEq(s.draft[k], baseline[k]));
      const failedRetryKeys = Object.keys(s.lastResult || {}).filter(k => s.lastResult[k].status === 'failed');
      const allKeys = [...new Set([...dirtyKeys, ...failedRetryKeys])];
      if (allKeys.length === 0) return s;

      // Fan out into log entries. Device fields (have a route) group by command and
      // follow the sync lifecycle (Scheduled → Applied). Platform-only fields (route ===
      // null — camera name, vehicle, channels, events restriction, remote access, privacy)
      // are Mapon-side changes: they commit instantly and log as "Applied" rows with no
      // command code, grouped by the tab they live on.
      const router = routerFor(brand);
      const groups = {};
      const platformByTab = {};
      for (const k of allKeys) {
        const route = router.routeField(k);
        if (route) {
          if (!groups[route.key]) groups[route.key] = { route, keys: [] };
          groups[route.key].keys.push(k);
        } else {
          const tab = FIELD_META[k]?.tab || 'details';
          (platformByTab[tab] = platformByTab[tab] || []).push(k);
        }
      }

      const batchId = Date.now();
      const entryStatus = isOnline ? 'pending' : 'queued';
      const deviceEntries = Object.values(groups).map(({ route, keys: cmdKeys }) => ({
        id: `log-${batchId}-${route.key}`, title: route.title, protocol: route.protocol,
        changes: cmdKeys.map(k => ({
          label: FIELD_META[k]?.label || k,
          diff: `${formatValue(k, s.live[k])} → ${formatValue(k, s.draft[k])}`,
        })),
        when: 'just now', status: entryStatus,
      }));

      // Instant Mapon-side rows (one per tab; titled by the field when it's a single change).
      const PLATFORM_TITLES = { details: 'Camera details', settings: 'Camera settings', security: 'Camera safety' };
      const platformEntries = Object.entries(platformByTab).map(([tab, keys]) => ({
        id: `log-${batchId}-platform-${tab}`,
        title: keys.length === 1 ? (FIELD_META[keys[0]]?.label || PLATFORM_TITLES[tab]) : (PLATFORM_TITLES[tab] || 'Mapon settings'),
        protocol: null,
        changes: keys.map(k => ({
          label: FIELD_META[k]?.label || k,
          diff: `${formatValue(k, s.live[k])} → ${formatValue(k, s.draft[k])}`,
        })),
        when: 'just now', status: 'applied',
      }));

      if (deviceEntries.length === 0 && platformEntries.length === 0) return s;

      // Platform changes commit to `live` immediately (no device round-trip).
      const platformKeys = Object.values(platformByTab).flat();
      const newLive = { ...s.live };
      platformKeys.forEach(k => { newLive[k] = s.draft[k]; });

      // Failed entries are subsumed by this new batch — remove them to avoid duplicates
      const filteredLog = (s.submissionLog || []).filter(e => e.status !== 'failed');
      return {
        ...s,
        live: newLive,
        pending: deviceEntries.length ? { ...s.draft } : s.pending,
        syncStatus: deviceEntries.length ? (isOnline ? 'syncing' : 'queued') : s.syncStatus,
        lastResult: deviceEntries.length ? null : s.lastResult,
        submissionLog: [...platformEntries, ...deviceEntries, ...filteredLog],
      };
    });
    if (isOnline && hasDevice) {
      setTimeout(() => {
        setState(s => ({
          ...s, live: { ...s.draft }, pending: null, syncStatus: 'idle',
          lastResult: Object.fromEntries(Object.keys(s.draft).map(k => [k, { status: 'applied' }])),
          submissionLog: (s.submissionLog || []).map(e => (e.status === 'pending' || e.status === 'failed') ? { ...e, status: 'applied' } : e),
        }));
      }, 2200);
    }
  }, [brand, state]);

  const retryAll = useCallback((isOnline = true) => {
    if (!isOnline) {
      setState(s => ({ ...s, syncStatus: 'queued', lastResult: null }));
      return;
    }
    // Update existing failed/queued entries in-place → pending (no new duplicates)
    setState(s => ({
      ...s, syncStatus: 'syncing', lastResult: null,
      submissionLog: (s.submissionLog || []).map(e =>
        (e.status === 'failed' || e.status === 'queued') ? { ...e, status: 'pending', when: 'just now' } : e
      ),
    }));
    setTimeout(() => {
      setState(s => ({
        ...s, live: { ...(s.pending || s.draft) }, pending: null, syncStatus: 'idle',
        lastResult: Object.fromEntries(Object.keys(s.draft).map(k => [k, { status: 'applied' }])),
        submissionLog: (s.submissionLog || []).map(e =>
          (e.status === 'pending' || e.status === 'failed') ? { ...e, status: 'applied', when: 'just now' } : e
        ),
      }));
    }, 1800);
  }, []);

  const cancelPending = useCallback(() => {
    setState(s => ({
      ...s, pending: null, draft: { ...s.live }, syncStatus: 'idle', lastResult: null,
      submissionLog: (s.submissionLog || []).filter(e => e.status !== 'pending' && e.status !== 'queued' && e.status !== 'failed'),
    }));
  }, []);

  // ── Per-field status ───────────────────────────────────────────
  // 'applied' | 'pending' | 'failed' | 'dirty' | null
  const fieldStatus = useCallback((key) => {
    if (dirtyKeys.includes(key)) return 'dirty';
    if (failedKeys.includes(key)) return 'failed';
    if (pendingKeys.includes(key)) return 'pending';
    return null;
  }, [dirtyKeys, failedKeys, pendingKeys]);

  const liveValue = useCallback((key) => state.live[key], [state.live]);
  const draftValue = useCallback((key) => state.draft[key], [state.draft]);
  const pendingValue = useCallback((key) => state.pending ? state.pending[key] : null, [state.pending]);
  const failureReason = useCallback((key) => (state.lastResult && state.lastResult[key] && state.lastResult[key].reason) || null, [state.lastResult]);

  return {
    state, updateDraft, updateDraftMany, discard, submit, retryAll, cancelPending,
    dirtyKeys, pendingKeys, failedKeys,
    fieldStatus, liveValue, draftValue, pendingValue, failureReason,
    submissionLog: state.submissionLog || [],
  };
}

function deepEq(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return false;
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

// ── Status chips ─────────────────────────────────────────────────

const StatusChip = ({ status, compact, liveLabel, pendingLabel, failureReason }) => {
  if (!status) return null;
  const map = {
    dirty:   { color: '#FFB300', bg: 'rgba(255,198,82,.25)', icon: 'circle-dot', label: 'Unsaved' },
    pending: { color: '#1087D2', bg: 'rgba(16,135,210,.1)', icon: 'clock', label: 'Pending sync' },
    failed:  { color: '#F23E44', bg: 'rgba(242,62,68,.1)', icon: 'alert-circle', label: 'Failed' },
    applied: { color: '#65B200', bg: 'rgba(101,178,0,.1)', icon: 'check', label: 'Applied' },
  };
  const m = map[status];
  return (
    <span title={failureReason || undefined} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
      color: m.color, background: m.bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>
      <Icon name={m.icon} style={{ width: 11, height: 11 }} />
      {!compact && m.label}
    </span>
  );
};

// Live → Pending inline diff (variation 1)
const DiffChip = ({ liveText, pendingText, tone = 'pending' }) => {
  const colors = tone === 'failed'
    ? { bg: 'rgba(242,62,68,.1)', border: 'rgba(242,62,68,.25)', liveColor: '#797F82', pendColor: '#F23E44', arrow: '#F23E44' }
    : tone === 'dirty'
    ? { bg: 'rgba(255,198,82,.15)', border: 'rgba(255,198,82,.5)', liveColor: '#797F82', pendColor: '#FFB300', arrow: '#FFB300' }
    : { bg: 'rgba(16,135,210,.08)', border: 'rgba(16,135,210,.3)', liveColor: '#797F82', pendColor: '#1F292F', arrow: '#797F82' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
      background: colors.bg, border: `1px solid ${colors.border}`,
      padding: '2px 8px', borderRadius: 4, fontFamily: 'ui-monospace, Menlo, monospace',
    }}>
      <span style={{ color: colors.liveColor, textDecoration: 'line-through' }}>{liveText}</span>
      <Icon name="arrow-right" style={{ width: 10, height: 10, color: colors.arrow }} />
      <span style={{ color: colors.pendColor, fontWeight: 600 }}>{pendingText}</span>
    </span>
  );
};

Object.assign(window, { useCameraConfig, StatusChip, DiffChip, buildScenario });
