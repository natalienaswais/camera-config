// Camera configuration — app chrome (sidebar, topbar, activity history)
// and form primitives (Field, Toggle, Select, TextInput, Radio, Checkbox).

// Lucide replaces <i data-lucide> with <svg> directly in the DOM, which breaks
// React's reconciliation. This component owns the span; the inner SVG is
// managed imperatively so React never tries to remove a node it doesn't know.
const Icon = ({ name, style }) => {
  const ref = React.useRef();
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = `<i data-lucide="${name}"></i>`;
    if (window.lucide) window.lucide.createIcons({ nodes: el.querySelectorAll('[data-lucide]') });
    const svg = el.querySelector('svg');
    if (svg) { svg.style.display = 'block'; svg.style.width = '100%'; svg.style.height = '100%'; }
  });
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 0, ...style }} />;
};

// ── App chrome ─────────────────────────────────────────────────

const cfgIconBtn = {
  width: 36, height: 36, borderRadius: 4, border: '1px solid #E4E5E6',
  background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
  color: '#384045',
};

const CfgSidebarIcons = () => {
  const items = [
    'book-open', 'layout-dashboard', 'map-pin', 'file-text', 'alert-triangle',
    'truck', 'fuel', 'car', 'wallet', 'user', 'calendar', 'clipboard', 'keyboard',
    'video', 'users', 'store',
  ];
  return (
    <aside style={{
      width: 52, background: '#1F292F', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '12px 0', gap: 6, flexShrink: 0, alignSelf: 'stretch',
    }}>
      {items.map((i, idx) => (
        <div key={i+idx} style={{
          width: 36, height: 36, display: 'grid', placeItems: 'center',
          color: idx === 4 ? '#98CA02' : 'rgba(255,255,255,.55)',
          cursor: 'pointer', borderRadius: 4,
        }}>
          <Icon name={i} style={{ width: 18, height: 18 }} />
        </div>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.55)' }}>
          <Icon name="settings" style={{ width: 18, height: 18 }} />
        </div>
      </div>
    </aside>
  );
};

const CfgTopBar = () => (
  <div style={{
    height: 56, background: '#fff', borderBottom: '1px solid #E4E5E6',
    display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0,
  }}>
    <div style={{ flex: 1 }} />
    <div className="topbar-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <Icon name="book-open" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <Icon name="users" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <Icon name="help-circle" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <Icon name="bell" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E4E5E6', display: 'grid', placeItems: 'center', color: '#797F82' }}>
          <Icon name="user" style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, color: '#1F292F' }}>John Snow</div>
          <div style={{ fontSize: 11, color: '#797F82' }}>Company</div>
        </div>
        <Icon name="more-vertical" style={{ width: 16, height: 16, color: '#797F82' }} />
      </div>
    </div>
  </div>
);

const CfgPageHeader = ({ cameraId = '3333', cameraBrand = 'Howen', connectivity, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
    <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: '#384045', display: 'grid', placeItems: 'center' }}>
      <Icon name="chevron-left" style={{ width: 20, height: 20 }} />
    </button>
    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1F292F', letterSpacing: '-0.01em' }}>{cameraId}</h1>
    <span style={{
      fontSize: 12, fontWeight: 500, color: '#384045', background: '#E4E5E6',
      padding: '3px 10px', borderRadius: 999,
    }}>{cameraBrand}</span>
    <div className="page-header-connectivity" style={{ marginLeft: 'auto' }}>{connectivity}</div>
  </div>
);

// ── Activity history panel ─────────────────────────────────────

const CfgStatusCard = ({ online = true, lastSeen = '2 minutes ago', syncStatus = 'idle', pendingCount = 0, failedCount = 0 }) => {
  // Determine status pill: failed > partial > syncing > queued > unsaved > applied
  let pill;
  if (failedCount > 0 && (syncStatus === 'partial' || syncStatus === 'failed')) {
    pill = { label: `${failedCount} failed`, color: '#F23E44', bg: 'rgba(242,62,68,.1)', icon: 'alert-circle', spin: false };
  } else if (syncStatus === 'syncing') {
    pill = { label: `Syncing ${pendingCount}`, color: '#1087D2', bg: 'rgba(180,199,255,.25)', icon: 'refresh-cw', spin: true };
  } else if (syncStatus === 'queued') {
    pill = { label: `${pendingCount} scheduled`, color: '#1087D2', bg: 'rgba(16,135,210,.1)', icon: 'clock', spin: false };
  } else {
    pill = { label: 'Applied', color: '#65B200', bg: 'rgba(101,178,0,.1)', icon: 'check', spin: false };
  }

  // Connectivity sub-line: distinct offline styling so the camera status is unmistakable.
  // key={online} forces React to re-create the <i> node so lucide can inject the
  // correct SVG — without the key, lucide leaves the stale SVG from last render.
  const connectivityLine = online ? (
    <div key="conn-on" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#797F82', lineHeight: 1.35 }}>
      <Icon name="wifi" style={{ width: 14, height: 14, color: '#65B200' }} />
      <span>Online — last seen {lastSeen}</span>
    </div>
  ) : (
    <div key="conn-off" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#F23E44', fontWeight: 600, lineHeight: 1.35 }}>
      <Icon name="cloud-off" style={{ width: 14, height: 14, color: '#F23E44' }} />
      <span>Offline — last seen {lastSeen}</span>
    </div>
  );

  return (
    <div style={{
      background: '#fff',
      border: online ? '1px solid #E4E5E6' : '1px solid rgba(242,62,68,.25)',
      borderRadius: 4, padding: '10px 14px',
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
        color: pill.color, background: pill.bg, padding: '3px 8px', borderRadius: 999,
      }}>
        <Icon name={pill.icon} style={{ width: 12, height: 12, ...(pill.spin ? { animation: 'spin 1.2s linear infinite' } : {}) }} />
        {pill.label}
      </span>
      {connectivityLine}
    </div>
  );
};

const ACTIVITY_SHOW_COUNT = 2; // rows visible in the list before "View all" link

// ── Change row — used in both the list preview and the modal ──────────────────

const CfgChangeRow = ({ c, isSingle, wrap = false }) => (
  <div style={{
    display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: 3,
    overflow: wrap ? 'visible' : 'hidden',
  }}>
    {!isSingle && (
      <>
        <span
          title={wrap ? undefined : c.label}
          style={{
            fontSize: 12, color: '#1F292F', flexShrink: 1, minWidth: 0,
            ...(wrap
              ? { wordBreak: 'break-word' }
              : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '52%' }
            ),
          }}
        >{c.label}</span>
        <span style={{ fontSize: 12, color: '#BBBEC0', flexShrink: 0, margin: '0 4px' }}>·</span>
      </>
    )}
    <span
      title={wrap ? undefined : (isSingle ? c.diff : `${c.label} · ${c.diff}`)}
      style={{
        fontSize: 12, color: '#797F82', fontFamily: 'ui-monospace, Menlo, monospace',
        flexShrink: wrap ? 0 : 1, minWidth: 0,
        ...(wrap ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
      }}
    >{c.diff}</span>
  </div>
);

// ── Modal — rendered via portal so it always sits on top ─────────────────────

const CfgPackageModal = ({ title, changes, when, status, protocol, onClose }) => {
  const tone = {
    applied: { color: '#65B200', bg: 'rgba(101,178,0,.1)', border: 'rgba(101,178,0,.25)', label: 'Applied', icon: 'check' },
    pending: { color: '#1087D2', bg: 'rgba(16,135,210,.1)', border: 'rgba(16,135,210,.3)', label: 'Pending', icon: 'clock' },
    queued:  { color: '#1087D2', bg: 'rgba(16,135,210,.1)', border: 'rgba(16,135,210,.3)', label: 'Scheduled', icon: 'clock' },
    failed:  { color: '#F23E44', bg: 'rgba(242,62,68,.1)',  border: 'rgba(242,62,68,.25)', label: 'Failed',  icon: 'alert-circle' },
  }[status] || {};

  // Close on Escape
  React.useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(31,41,47,0.45)', backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 8,
          width: 520, maxWidth: '92vw', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px 14px', borderBottom: '1px solid #F4F4F4',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1F292F', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#797F82' }}>{when}</div>
          </div>
          {tone.label && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600,
              color: tone.color, background: tone.bg, border: `1px solid ${tone.border}`,
              padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <Icon name={tone.icon} style={{ width: 12, height: 12 }} />
              {tone.label}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: -2,
              color: '#797F82', display: 'flex', alignItems: 'center', flexShrink: 0,
              borderRadius: 4,
            }}
          >
            <Icon name="x" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Change list — scrollable */}
        <div style={{ overflowY: 'auto', padding: '4px 20px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#BBBEC0', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 10px' }}>
            {changes.length} {changes.length === 1 ? 'change' : 'changes'}
          </div>
          {changes.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 16, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid #F4F4F4',
            }}>
              <span style={{ fontSize: 13, color: '#1F292F', flexShrink: 1, minWidth: 0, lineHeight: 1.4 }}>
                {c.label}
              </span>
              <span style={{
                fontSize: 12, color: '#797F82', fontFamily: 'ui-monospace, Menlo, monospace',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {c.diff}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Activity item ─────────────────────────────────────────────────────────────

const CfgActivityItem = ({ title, changes = [], when, status, protocol }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const tone = {
    applied: { color: '#65B200', bg: 'rgba(101,178,0,.1)', label: 'Applied', icon: 'check' },
    pending: { color: '#1087D2', bg: 'rgba(16,135,210,.1)', label: 'Pending', icon: 'clock' },
    queued:  { color: '#1087D2', bg: 'rgba(16,135,210,.1)', label: 'Scheduled', icon: 'clock' },
    failed:  { color: '#F23E44', bg: 'rgba(242,62,68,.1)',  label: 'Failed',  icon: 'alert-circle' },
  }[status] || {};

  const isSingle = changes.length <= 1;
  const preview = changes.slice(0, ACTIVITY_SHOW_COUNT);
  const hasMore = changes.length > ACTIVITY_SHOW_COUNT;

  return (
    <>
      <div style={{ padding: '12px 0', borderBottom: '1px solid #F4F4F4' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1F292F', marginBottom: 5 }}>{title}</div>

            {preview.map((c, i) => <CfgChangeRow key={i} c={c} isSingle={isSingle} />)}

            {hasMore && (
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  background: 'none', border: 'none', padding: 0, marginTop: 4,
                  cursor: 'pointer', fontSize: 12, color: '#1087D2',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                View all ({changes.length})
              </button>
            )}

            <div style={{ fontSize: 11, color: '#BBBEC0', marginTop: 5 }}>{when}</div>
          </div>

          {tone.label && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
              color: tone.color, background: tone.bg, padding: '2px 7px', borderRadius: 999,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <Icon name={tone.icon} style={{ width: 11, height: 11 }} />
              {tone.label}
            </span>
          )}
        </div>
      </div>

      {modalOpen && (
        <CfgPackageModal
          title={title} changes={changes} when={when} status={status} protocol={protocol}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

const CfgConnectivityCard = ({ online, lastSeen }) => (
  <div key={`conn-card-${online}`} style={{
    background: '#fff',
    border: online ? '1px solid #E4E5E6' : '1px solid rgba(242,62,68,.25)',
    borderRadius: 4, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12, lineHeight: 1.35,
    color: online ? '#797F82' : '#F23E44',
    fontWeight: online ? 500 : 600,
  }}>
    <Icon name={online ? 'wifi' : 'cloud-off'} style={{ width: 14, height: 14, color: online ? '#65B200' : '#F23E44' }} />
    <span>{online ? 'Online' : 'Offline'} — last seen {lastSeen}</span>
  </div>
);

// ── Export popover ────────────────────────────────────────────────────────────

const EXPORT_RANGES = [
  { label: 'Today',          value: 'today' },
  { label: 'Last 7 days',    value: '7d' },
  { label: 'Last 3 months',  value: '3m' },
  { label: 'Last year',      value: '1y' },
  { label: 'All time',       value: 'all' },
];

function buildActivityCSV(activity) {
  // `Command` (the raw device protocol, e.g. AT+GTREC) is intentionally NOT shown in
  // the UI — it's noise for end users — but kept here so support can trace a sync issue
  // back to the exact command sent to the camera.
  const header = ['Date', 'Status', 'Summary', 'Command', 'Field', 'Change'];
  const rows = [];
  for (const item of activity) {
    const changes = item.changes || [];
    if (changes.length === 0) {
      rows.push([item.when, item.status, item.title, item.protocol || '', '', '']);
    } else {
      for (const c of changes) {
        rows.push([item.when, item.status, item.title, item.protocol || '', c.label, c.diff]);
      }
    }
  }
  return [header, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const CfgExportPopover = ({ activity, cameraId, onClose }) => {
  const [selected, setSelected] = React.useState('3m');
  const [downloading, setDownloading] = React.useState(false);

  // Close on outside click
  const ref = React.useRef();
  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    // slight delay so the open-click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  const handleDownload = () => {
    setDownloading(true);
    // Simulate brief async (real impl would call BE with date range)
    setTimeout(() => {
      const rangeLabel = EXPORT_RANGES.find(r => r.value === selected)?.label.replace(/\s+/g, '-').toLowerCase();
      const csv = buildActivityCSV(activity);
      downloadCSV(csv, `camera-${cameraId}-activity-${rangeLabel}.csv`);
      setDownloading(false);
      onClose();
    }, 600);
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
      background: '#fff', border: '1px solid #E4E5E6', borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)', width: 210, overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #F4F4F4' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1F292F' }}>Export history</div>
        <div style={{ fontSize: 11, color: '#797F82', marginTop: 2 }}>Download as CSV</div>
      </div>
      <div style={{ padding: '6px 0' }}>
        {EXPORT_RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setSelected(r.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '7px 14px', border: 'none',
              cursor: 'pointer', textAlign: 'left',
              background: selected === r.value ? 'rgba(16,135,210,.07)' : 'none',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${selected === r.value ? '#1087D2' : '#BBBEC0'}`,
              background: selected === r.value ? '#1087D2' : 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {selected === r.value && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'block' }} />}
            </span>
            <span style={{ fontSize: 13, color: '#1F292F' }}>{r.label}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid #F4F4F4' }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 4, border: 'none',
            background: downloading ? '#E4E5E6' : '#1087D2',
            color: downloading ? '#797F82' : '#fff',
            fontSize: 13, fontWeight: 600, cursor: downloading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Icon name={downloading ? 'loader' : 'download'} style={{ width: 13, height: 13, ...(downloading ? { animation: 'spin 1s linear infinite' } : {}) }} />
          {downloading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>
    </div>
  );
};

// ── Activity panel ────────────────────────────────────────────────────────────

const CfgActivityPanel = ({ online = true, lastSeen = '2 minutes ago', activity = ACTIVITY, syncStatus, pendingCount, failedCount, hideStatusPill = false, cameraId = '' }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const visibleItems = expanded ? activity : activity.slice(0, 5);
  const hasMore = activity.length > 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {hideStatusPill
        ? <CfgConnectivityCard online={online} lastSeen={lastSeen} />
        : <CfgStatusCard online={online} lastSeen={lastSeen} syncStatus={syncStatus} pendingCount={pendingCount} failedCount={failedCount} />}
      <div style={{ background: '#fff', border: '1px solid #E4E5E6', borderRadius: 4, padding: '16px 18px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1F292F' }}>Activity history</div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setExportOpen(o => !o)}
              title="Export activity history"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: exportOpen ? '#F4F4F4' : 'none',
                border: '1px solid #E4E5E6', borderRadius: 4,
                padding: '4px 9px', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, color: '#797F82',
              }}
            >
              <Icon name="download" style={{ width: 12, height: 12 }} />
              Export
            </button>
            {exportOpen && (
              <CfgExportPopover
                activity={activity}
                cameraId={cameraId}
                onClose={() => setExportOpen(false)}
              />
            )}
          </div>
        </div>

        {visibleItems.map(a => <CfgActivityItem key={a.id} {...a} />)}
        {hasMore && (
          <div style={{ paddingTop: 10 }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: '#65B200', fontWeight: 600, cursor: 'pointer' }}
            >
              {expanded ? 'Show less' : `View all (${activity.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Form primitives ────────────────────────────────────────────

const CfgToggle = ({ checked, onChange, disabled, size = 'md' }) => {
  const w = size === 'sm' ? 32 : 38;
  const h = size === 'sm' ? 18 : 22;
  const d = h - 4;
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: w, height: h, borderRadius: h, border: 'none', padding: 0,
        background: checked ? '#65B200' : '#E4E5E6',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
        transition: 'background .15s',
      }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? w - d - 2 : 2,
        width: d, height: d, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,.2)', transition: 'left .15s',
      }} />
    </button>
  );
};

const CfgInput = ({ value, onChange, placeholder, type = 'text', disabled, readOnly, style }) => (
  <input
    type={type}
    value={value ?? ''}
    readOnly={readOnly}
    disabled={disabled}
    placeholder={placeholder}
    onChange={e => onChange && onChange(e.target.value)}
    style={{
      width: '100%', height: 36, padding: '0 12px',
      border: '1px solid #E4E5E6', borderRadius: 4,
      fontFamily: 'inherit', fontSize: 13, color: readOnly ? '#797F82' : '#1F292F',
      background: readOnly ? '#F4F4F4' : '#fff',
      outline: 'none',
      ...style,
    }}
    onFocus={e => { if (!readOnly) e.target.style.borderColor = '#65B200'; }}
    onBlur={e => { e.target.style.borderColor = '#E4E5E6'; }}
  />
);

const CfgSelect = ({ value, onChange, options = [], disabled, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange && onChange(e.target.value)}
      style={{
        width: '100%', height: 36, padding: '0 36px 0 12px',
        border: '1px solid #E4E5E6', borderRadius: 4,
        fontFamily: 'inherit', fontSize: 13, color: disabled ? '#797F82' : '#1F292F',
        background: disabled ? '#F4F4F4' : '#fff', appearance: 'none',
        cursor: disabled ? 'default' : 'pointer',
      }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevron-down" style={{ position: 'absolute', right: 10, top: 10, width: 16, height: 16, color: '#797F82', pointerEvents: 'none' }} />
  </div>
);

const CfgRadio = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#1F292F' }}>
    <span style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2px solid ${checked ? '#65B200' : '#BBBEC0'}`,
      display: 'grid', placeItems: 'center',
    }}>
      {checked && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#65B200' }} />}
    </span>
    <input type="radio" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    {label}
  </label>
);

// Low / Medium / High sensitivity slider (3 discrete stops).
const CfgSensitivity = ({ value, onChange, disabled }) => {
  const stops = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];
  const idx = stops.findIndex(([v]) => v === value);
  return (
    <div style={{ opacity: disabled ? 0.5 : 1, maxWidth: 360 }}>
      <div style={{ position: 'relative', height: 6, margin: '8px 9px 0' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, borderRadius: 999, background: '#E4E5E6' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
          {stops.map(([v, l], i) => (
            <button
              key={v}
              onClick={() => !disabled && onChange(v)}
              disabled={disabled}
              title={l}
              style={{
                width: 18, height: 18, marginTop: -6, borderRadius: '50%', border: 'none', padding: 0,
                cursor: disabled ? 'default' : 'pointer',
                background: i === idx ? '#65B200' : '#BBBEC0',
                transform: i === idx ? 'scale(1.1)' : 'none',
                boxShadow: i === idx ? '0 1px 3px rgba(0,0,0,.2)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12 }}>
        {stops.map(([v, l]) => (
          <span key={v} style={{ color: v === value ? '#1F292F' : '#797F82', fontWeight: v === value ? 600 : 400 }}>{l}</span>
        ))}
      </div>
    </div>
  );
};

const CfgCheckbox = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#1F292F' }}>
    <span style={{
      width: 16, height: 16, borderRadius: 3,
      border: `2px solid ${checked ? '#65B200' : '#BBBEC0'}`,
      background: checked ? '#65B200' : '#fff',
      display: 'grid', placeItems: 'center',
    }}>
      {checked && <Icon name="check" style={{ width: 11, height: 11, color: '#fff' }} />}
    </span>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    {label}
  </label>
);

const CfgField = ({ label, children, hint, badge, style }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 16, alignItems: 'center', padding: '10px 0', ...style }}>
    <label style={{ fontSize: 13, color: '#384045', fontWeight: 500 }}>{label}</label>
    <div style={{ minWidth: 0 }}>{children}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 22, justifyContent: 'flex-end' }}>{badge}</div>
  </div>
);

const CfgSectionTitle = ({ title, info }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '18px 0 4px' }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F292F', margin: 0 }}>{title}</h2>
    {info && <Icon name="info" style={{ width: 14, height: 14, color: '#BBBEC0' }} />}
  </div>
);

const CfgTabs = ({ tabs, active, onChange, pendingByTab = {}, failedByTab = {}, dirtyByTab = {} }) => (
  <div className="tabs-row" style={{ display: 'flex', gap: 28, borderBottom: '1px solid #E4E5E6', marginBottom: 24 }}>
    {tabs.map(t => {
      const isActive = active === t.key;
      const p = pendingByTab[t.key] || 0;
      const f = failedByTab[t.key] || 0;
      const d = dirtyByTab[t.key] || 0;
      const statusLabel = f > 0 ? `${f} failed` : p > 0 ? `${p} pending` : d > 0 ? `${d} unsaved` : '';
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          aria-label={statusLabel ? `${t.label}, ${statusLabel}` : t.label}
          style={{
            border: 'none', background: 'transparent', padding: '12px 0',
            fontFamily: 'inherit', fontSize: 14, fontWeight: isActive ? 700 : 500,
            color: isActive ? '#1F292F' : '#797F82', cursor: 'pointer',
            borderBottom: `2px solid ${isActive ? '#65B200' : 'transparent'}`,
            marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          {t.label}
          {f > 0 && <Icon name="alert-circle" style={{ width: 11, height: 11, color: '#F23E44', flexShrink: 0 }} />}
          {f === 0 && p > 0 && <Icon name="clock" style={{ width: 11, height: 11, color: '#1087D2', flexShrink: 0 }} />}
          {f === 0 && p === 0 && d > 0 && <Icon name="pencil" style={{ width: 11, height: 11, color: '#FFB300', flexShrink: 0 }} />}
        </button>
      );
    })}
  </div>
);

// Pill button (primary / secondary / danger)
const CfgButton = ({ variant = 'primary', children, onClick, disabled, size = 'md', style }) => {
  const base = {
    fontFamily: 'inherit', fontWeight: 700, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
    padding: size === 'sm' ? '6px 14px' : '8px 18px', fontSize: size === 'sm' ? 12 : 13,
    transition: 'all .15s', opacity: disabled ? 0.5 : 1, border: '1px solid transparent',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    ...style,
  };
  const variants = {
    primary: { background: '#65B200', color: '#fff' },
    secondary: { background: '#fff', color: '#384045', border: '1px solid #E4E5E6' },
    danger: { background: '#fff', color: '#F23E44', border: '1px solid rgba(242,62,68,.25)' },
    ghost: { background: 'transparent', color: '#384045' },
    dark: { background: '#1F292F', color: '#fff' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
};

Object.assign(window, {
  Icon,
  CfgSidebarIcons, CfgTopBar, CfgPageHeader,
  CfgActivityPanel, CfgActivityItem, CfgStatusCard, CfgConnectivityCard,
  CfgToggle, CfgInput, CfgSelect, CfgRadio, CfgCheckbox, CfgSensitivity,
  CfgField, CfgSectionTitle, CfgTabs, CfgButton,
});
