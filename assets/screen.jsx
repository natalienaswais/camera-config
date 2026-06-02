// Complete camera configuration screen — composes chrome + tabs + activity
// with a chosen variation (FieldRow / TopBanner pair).

const TABS = [
  { key: 'details', label: 'Camera details' },
  { key: 'settings', label: 'Camera settings' },
  { key: 'security', label: 'Camera safety' },
];

const StatusBadge = ({ status, pendingCount, failedCount }) => {
  if (status === 'idle') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#65B200', background: 'rgba(101,178,0,.1)', padding: '3px 9px', borderRadius: 999 }}>
        <Icon name="check" style={{ width: 11, height: 11 }} /> In sync
      </span>
    );
  }
  if (status === 'syncing') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#1087D2', background: 'rgba(180,199,255,.25)', padding: '3px 9px', borderRadius: 999 }}>
        <Icon name="refresh-cw" style={{ width: 11, height: 11, animation: 'spin 1.2s linear infinite' }} /> Syncing {pendingCount}
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#1087D2', background: 'rgba(16,135,210,.1)', padding: '3px 9px', borderRadius: 999 }}>
        <Icon name="clock" style={{ width: 11, height: 11 }} /> {pendingCount} scheduled
      </span>
    );
  }
  if (status === 'partial' || status === 'failed') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#F23E44', background: 'rgba(242,62,68,.1)', padding: '3px 9px', borderRadius: 999 }}>
        <Icon name="alert-circle" style={{ width: 11, height: 11 }} /> {failedCount} failed
      </span>
    );
  }
  return null;
};

// Bigger status pill — used when statusPlacement='header'
const StatusBadgeLarge = ({ status, pendingCount, failedCount }) => {
  let pill;
  if ((status === 'partial' || status === 'failed') && failedCount > 0) {
    pill = { label: `${failedCount} change${failedCount === 1 ? '' : 's'} failed`, color: '#F23E44', bg: 'rgba(242,62,68,.1)', border: 'rgba(242,62,68,.25)', icon: 'alert-circle', spin: false };
  } else if (status === 'syncing') {
    pill = { label: `Syncing ${pendingCount}…`, color: '#1087D2', bg: 'rgba(180,199,255,.25)', border: '#B4C7FF', icon: 'refresh-cw', spin: true };
  } else if (status === 'queued') {
    pill = { label: `${pendingCount} scheduled`, color: '#1087D2', bg: 'rgba(16,135,210,.1)', border: 'rgba(16,135,210,.3)', icon: 'clock', spin: false };
  } else {
    pill = { label: 'In sync', color: '#65B200', bg: 'rgba(101,178,0,.12)', border: 'rgba(101,178,0,.3)', icon: 'check', spin: false };
  }
  return (
    <span key={`hdr-pill-${status}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 600,
      color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`,
      padding: '5px 10px', borderRadius: 999,
    }}>
      <Icon name={pill.icon} style={{ width: 13, height: 13, ...(pill.spin ? { animation: 'spin 1.2s linear infinite' } : {}) }} />
      {pill.label}
    </span>
  );
};

const ConnectivityIndicator = ({ online, lastSeen }) => {
  if (online) {
    return (
      <div key="hdr-on" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#797F82' }}>
        <Icon name="wifi" style={{ width: 14, height: 14, color: '#65B200' }} />
        <span>Online · synced {lastSeen}</span>
      </div>
    );
  }
  return (
    <div key="hdr-off" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
      color: '#F23E44', background: 'rgba(242,62,68,.1)', border: '1px solid rgba(242,62,68,.25)',
      padding: '3px 10px', borderRadius: 999,
    }}>
      <Icon name="wifi-off" style={{ width: 13, height: 13 }} />
      <span>Offline · last seen {lastSeen}</span>
    </div>
  );
};

// ── Main screen ──────────────────────────────────────────────

const CameraConfigScreen = ({ scenario = 'in-sync', variation = 'inline', online = true, lastSeen = '2 minutes ago', cameraId = '3333', cameraBrand = DEFAULT_BRAND, cameraChannels = 3, onBack }) => {
  const cfg = useCameraConfig(scenario, cameraBrand);
  const [tab, setTab] = React.useState('details');
  const V = VARIATIONS[variation] || VARIATIONS.inline;
  const FieldRow = V.FieldRow;
  const TopBanner = V.TopBanner;

  React.useEffect(() => {
    const r = () => window.lucide && window.lucide.createIcons();
    r();
    setTimeout(r, 30);
    setTimeout(r, 200);
  });

  // Per-tab counts for tab badges
  const pendingByTab = React.useMemo(() => {
    const m = { details: 0, settings: 0, security: 0 };
    cfg.pendingKeys.forEach(k => { const t = FIELD_META[k]?.tab; if (t) m[t]++; });
    return m;
  }, [cfg.pendingKeys]);

  const dirtyByTab = React.useMemo(() => {
    const m = { details: 0, settings: 0, security: 0 };
    cfg.dirtyKeys.forEach(k => { const t = FIELD_META[k]?.tab; if (t && !cfg.pendingKeys.includes(k)) m[t]++; });
    return m;
  }, [cfg.dirtyKeys, cfg.pendingKeys]);

  const failedByTab = React.useMemo(() => {
    const m = { details: 0, settings: 0, security: 0 };
    cfg.failedKeys.forEach(k => { const t = FIELD_META[k]?.tab; if (t) m[t]++; });
    return m;
  }, [cfg.failedKeys]);

  // Activity history: chronological log of all submitted changes + static historical
  // entries for THIS camera's brand (Howen and Queclink fan out very differently).
  const activity = React.useMemo(() => {
    const brandHistory = ACTIVITY_BY_BRAND[cameraBrand] || ACTIVITY_BY_BRAND[DEFAULT_BRAND];
    return [...cfg.submissionLog, ...brandHistory];
  }, [cfg.submissionLog, cameraBrand]);

  const unsavedCount = cfg.dirtyKeys.length;

  return (
    <div className="app-shell" style={{ background: '#F4F4F4', fontFamily: 'Inter, system-ui, sans-serif', color: '#1F292F' }}>
      <CfgTopBar />
      <div className="app-body">
        <div className="icon-sidebar" style={{ flexShrink: 0 }}><CfgSidebarIcons /></div>
        <div className="app-main">
          <CfgPageHeader
            cameraId={cameraId}
            cameraBrand={cameraBrand}
            onBack={onBack}
          />

          <div className="app-columns">
            <div className="activity-col">
              <CfgActivityPanel
                online={online}
                lastSeen={lastSeen}
                activity={activity}
                syncStatus={cfg.state.syncStatus}
                pendingCount={cfg.pendingKeys.length}
                failedCount={cfg.failedKeys.length}
                hideStatusPill={true}
                cameraId={cameraId}
              />
            </div>

            <div className="form-col">
              <TopBanner cfg={cfg} online={online} />

              <CfgTabs tabs={TABS} active={tab} onChange={setTab} pendingByTab={pendingByTab} failedByTab={failedByTab} dirtyByTab={dirtyByTab} />

              <TabBody>
                {tab === 'details'  && <TabDetails  cfg={cfg} FieldRow={FieldRow} brand={cameraBrand} channelCount={cameraChannels} />}
                {tab === 'settings' && <TabSettings cfg={cfg} FieldRow={FieldRow} brand={cameraBrand} channelCount={cameraChannels} />}
                {tab === 'security' && <TabSecurity cfg={cfg} FieldRow={FieldRow} brand={cameraBrand} />}
              </TabBody>

              {unsavedCount > 0 && (() => {
                const failedCount = cfg.failedKeys.length;
                const totalCount = unsavedCount + failedCount;
                const hasFailed = failedCount > 0;
                return (
                  <div style={{
                    marginTop: 20, paddingTop: 16, borderTop: '1px solid #F4F4F4',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ fontSize: 13, color: '#797F82', flex: '1 1 240px', minWidth: 0, lineHeight: 1.45 }}>
                      {hasFailed ? (
                        <>
                          <span style={{ fontWeight: 600, color: '#1F292F' }}>{unsavedCount}</span> new change{unsavedCount === 1 ? '' : 's'} +{' '}
                          <span style={{ fontWeight: 600, color: '#F23E44' }}>{failedCount}</span> failed change{failedCount === 1 ? '' : 's'} will be submitted together.{' '}
                          Discarding removes only your new edits — failed changes will still be retried.
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 600, color: '#1F292F' }}>{unsavedCount}</span> unsaved change{unsavedCount === 1 ? '' : 's'} across all tabs.{' '}
                          {online
                            ? <>Saving will push every change to the camera.</>
                            : <>Camera is offline — changes will be scheduled and sent when it comes online.</>}
                        </>
                      )}
                    </div>
                    <CfgButton variant="danger" size="sm" onClick={cfg.discard}>
                      {hasFailed ? 'Discard new edits' : 'Discard changes'}
                    </CfgButton>
                    <CfgButton variant="primary" size="sm" onClick={() => cfg.submit(online)}>
                      {hasFailed
                        ? (online ? `Save all (${totalCount})` : `Schedule all (${totalCount})`)
                        : (online ? `Save (${unsavedCount}) change${unsavedCount === 1 ? '' : 's'}` : `Schedule (${unsavedCount}) change${unsavedCount === 1 ? '' : 's'}`)}
                    </CfgButton>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CameraConfigScreen, TABS });
