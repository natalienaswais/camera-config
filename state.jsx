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
        live, draft: { ...live, cameraName: 'Mercedes Actros 456', channel2Enabled: true },
        pending: null, syncStatus: 'idle',
      };
    case 'queued': {
      const pend = { ...live, audioRecording: false, timezone: 'Europe/Riga (+02:00)', driverPrivacy: true };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'queued' };
    }
    case 'syncing': {
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', audioRecording: false, wifiSsid: 'brand-Cam-New' };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'syncing' };
    }
    case 'partial': {
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', audioRecording: false, wifiSsid: 'brand-Cam-New', dmsYawning: true };
      // audio and ssid applied; timezone + dms failed
      const applied = { ...live, audioRecording: false, wifiSsid: 'brand-Cam-New' };
      return {
        live: applied, draft: { ...pend }, pending: pend,
        syncStatus: 'partial',
        lastResult: {
          timezone: { status: 'failed', reason: 'Camera rejected value' },
          dmsYawning: { status: 'failed', reason: 'Feature not licensed' },
          audioRecording: { status: 'applied' },
          wifiSsid: { status: 'applied' },
        },
      };
    }
    case 'long-values': {
      // Edge case — long values test inline diff truncation.
      const pend = {
        ...live,
        cameraName: 'Mercedes-Benz Actros 1853 Long-Haul Prime Mover',
        wifiSsid: 'brand-Fleet-Corporate-LT-Depot-3-Extended',
        vehicle: 'CD 5678',
        timezone: 'America/New_York (-05:00)',
        ttsLanguage: 'Latviešu',
      };
      return { live, draft: { ...pend }, pending: pend, syncStatus: 'queued' };
    }
    case 'failed': {
      const pend = { ...live, timezone: 'Europe/Riga (+02:00)', audioRecording: false, driverPrivacy: true };
      return {
        live, draft: { ...pend }, pending: pend, syncStatus: 'failed',
        lastResult: {
          timezone: { status: 'failed', reason: 'Sync timed out' },
          audioRecording: { status: 'failed', reason: 'Sync timed out' },
          driverPrivacy: { status: 'failed', reason: 'Sync timed out' },
        },
      };
    }
    default:
      return { live, draft: { ...live }, pending: null, syncStatus: 'idle' };
  }
}

function useCameraConfig(scenario = 'in-sync') {
  const [state, setState] = useState(() => buildScenario(scenario));

  // Re-seed state when scenario changes (tweaks panel)
  React.useEffect(() => { setState(buildScenario(scenario)); }, [scenario]);

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

  const discard = useCallback(() => {
    setState(s => ({ ...s, draft: { ...(s.pending || s.live) } }));
  }, []);

  const submit = useCallback(() => {
    setState(s => ({ ...s, pending: { ...s.draft }, syncStatus: 'syncing', lastResult: null }));
    // simulate sync
    setTimeout(() => {
      setState(s => ({ ...s, live: { ...s.draft }, pending: null, syncStatus: 'idle',
        lastResult: Object.fromEntries(Object.keys(s.draft).map(k => [k, { status: 'applied' }])) }));
    }, 2200);
  }, []);

  const retryAll = useCallback(() => {
    setState(s => ({ ...s, syncStatus: 'syncing', lastResult: null }));
    setTimeout(() => {
      setState(s => ({ ...s, live: { ...(s.pending || s.draft) }, pending: null, syncStatus: 'idle',
        lastResult: Object.fromEntries(Object.keys(s.draft).map(k => [k, { status: 'applied' }])) }));
    }, 1800);
  }, []);

  const cancelPending = useCallback(() => {
    setState(s => ({ ...s, pending: null, draft: { ...s.live }, syncStatus: 'idle', lastResult: null }));
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
    state, updateDraft, discard, submit, retryAll, cancelPending,
    dirtyKeys, pendingKeys, failedKeys,
    fieldStatus, liveValue, draftValue, pendingValue, failureReason,
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
      <i data-lucide={m.icon} style={{ width: 11, height: 11 }} />
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
      <i data-lucide="arrow-right" style={{ width: 10, height: 10, color: colors.arrow }} />
      <span style={{ color: colors.pendColor, fontWeight: 600 }}>{pendingText}</span>
    </span>
  );
};

Object.assign(window, { useCameraConfig, StatusChip, DiffChip, buildScenario });
