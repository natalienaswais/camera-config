// Camera configuration — app chrome (sidebar, topbar, activity history)
// and form primitives (Field, Toggle, Select, TextInput, Radio, Checkbox).

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
          <i data-lucide={i} style={{ width: 18, height: 18 }} />
        </div>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.55)' }}>
          <i data-lucide="settings" style={{ width: 18, height: 18 }} />
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
        <i data-lucide="book-open" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <i data-lucide="users" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <i data-lucide="help-circle" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <button style={{ ...cfgIconBtn, border: 'none', background: 'transparent' }}>
        <i data-lucide="bell" style={{ width: 18, height: 18, color: '#797F82' }} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E4E5E6', display: 'grid', placeItems: 'center', color: '#797F82' }}>
          <i data-lucide="user" style={{ width: 16, height: 16 }} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600, color: '#1F292F' }}>John Snow</div>
          <div style={{ fontSize: 11, color: '#797F82' }}> Company</div>
        </div>
        <i data-lucide="more-vertical" style={{ width: 16, height: 16, color: '#797F82' }} />
      </div>
    </div>
  </div>
);

const CfgPageHeader = ({ cameraId = '3333', cameraBrand = 'Quicklink', statusBadge, connectivity, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
    <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: '#384045', display: 'grid', placeItems: 'center' }}>
      <i data-lucide="chevron-left" style={{ width: 20, height: 20 }} />
    </button>
    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1F292F', letterSpacing: '-0.01em' }}>{cameraId}</h1>
    <span style={{
      fontSize: 12, fontWeight: 500, color: '#384045', background: '#E4E5E6',
      padding: '3px 10px', borderRadius: 999,
    }}>{cameraBrand}</span>
    {statusBadge}
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
    pill = { label: `${pendingCount} queued`, color: '#1087D2', bg: 'rgba(16,135,210,.1)', icon: 'clock', spin: false };
  } else {
    pill = { label: 'Applied', color: '#65B200', bg: 'rgba(101,178,0,.1)', icon: 'check', spin: false };
  }

  // Connectivity sub-line: distinct offline styling so the camera status is unmistakable.
  // key={online} forces React to re-create the <i> node so lucide can inject the
  // correct SVG — without the key, lucide leaves the stale SVG from last render.
  const connectivityLine = online ? (
    <div key="conn-on" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#797F82', lineHeight: 1.35 }}>
      <i data-lucide="wifi" style={{ width: 14, height: 14, color: '#65B200' }} />
      <span>Online — last seen {lastSeen}</span>
    </div>
  ) : (
    <div key="conn-off" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#F23E44', fontWeight: 600, lineHeight: 1.35 }}>
      <i data-lucide="cloud-off" style={{ width: 14, height: 14, color: '#F23E44' }} />
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
        <i data-lucide={pill.icon} style={{ width: 12, height: 12, ...(pill.spin ? { animation: 'spin 1.2s linear infinite' } : {}) }} />
        {pill.label}
      </span>
      {connectivityLine}
    </div>
  );
};

const CfgActivityItem = ({ title, diff, when, status }) => {
  const tone = {
    applied: { color: '#65B200', bg: 'rgba(101,178,0,.1)', label: 'Applied', icon: 'check' },
    pending: { color: '#1087D2', bg: 'rgba(16,135,210,.1)', label: 'Pending', icon: 'clock' },
    failed:  { color: '#F23E44', bg: 'rgba(242,62,68,.1)',  label: 'Failed',  icon: 'x' },
  }[status] || {};
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F4F4F4' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F292F', marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: '#797F82', fontFamily: 'ui-monospace, Menlo, monospace' }}>{diff}</div>
          <div style={{ fontSize: 11, color: '#BBBEC0', marginTop: 4 }}>{when}</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          color: tone.color, background: tone.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap',
        }}>
          <i data-lucide={tone.icon} style={{ width: 11, height: 11 }} />
          {tone.label}
        </span>
      </div>
    </div>
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
    <i data-lucide={online ? 'wifi' : 'cloud-off'} style={{ width: 14, height: 14, color: online ? '#65B200' : '#F23E44' }} />
    <span>{online ? 'Online' : 'Offline'} — last seen {lastSeen}</span>
  </div>
);

const CfgActivityPanel = ({ online = true, lastSeen = '2 minutes ago', activity = ACTIVITY, syncStatus, pendingCount, failedCount, hideStatusPill = false }) => {
  const [expanded, setExpanded] = React.useState(false);
  const visibleItems = expanded ? activity : activity.slice(0, 5);
  const hasMore = activity.length > 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {hideStatusPill
        ? <CfgConnectivityCard online={online} lastSeen={lastSeen} />
        : <CfgStatusCard online={online} lastSeen={lastSeen} syncStatus={syncStatus} pendingCount={pendingCount} failedCount={failedCount} />}
      <div style={{ background: '#fff', border: '1px solid #E4E5E6', borderRadius: 4, padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1F292F', marginBottom: 6 }}>Activity history</div>
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
        fontFamily: 'inherit', fontSize: 13, color: '#1F292F',
        background: '#fff', appearance: 'none', cursor: 'pointer',
      }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <i data-lucide="chevron-down" style={{ position: 'absolute', right: 10, top: 10, width: 16, height: 16, color: '#797F82', pointerEvents: 'none' }} />
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

const CfgCheckbox = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#1F292F' }}>
    <span style={{
      width: 16, height: 16, borderRadius: 3,
      border: `2px solid ${checked ? '#65B200' : '#BBBEC0'}`,
      background: checked ? '#65B200' : '#fff',
      display: 'grid', placeItems: 'center',
    }}>
      {checked && <i data-lucide="check" style={{ width: 11, height: 11, color: '#fff' }} />}
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
    {info && <i data-lucide="info" style={{ width: 14, height: 14, color: '#BBBEC0' }} />}
  </div>
);

const CfgTabs = ({ tabs, active, onChange, pendingByTab = {}, failedByTab = {} }) => (
  <div className="tabs-row" style={{ display: 'flex', gap: 28, borderBottom: '1px solid #E4E5E6', marginBottom: 24 }}>
    {tabs.map(t => {
      const isActive = active === t.key;
      const p = pendingByTab[t.key] || 0;
      const f = failedByTab[t.key] || 0;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            border: 'none', background: 'transparent', padding: '12px 0',
            fontFamily: 'inherit', fontSize: 14, fontWeight: isActive ? 700 : 500,
            color: isActive ? '#1F292F' : '#797F82', cursor: 'pointer',
            borderBottom: `2px solid ${isActive ? '#65B200' : 'transparent'}`,
            marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
          {t.label}
          {f > 0 && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#F23E44' }} />}
          {f === 0 && p > 0 && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#1087D2' }} />}
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
  CfgSidebarIcons, CfgTopBar, CfgPageHeader,
  CfgActivityPanel, CfgActivityItem, CfgStatusCard, CfgConnectivityCard,
  CfgToggle, CfgInput, CfgSelect, CfgRadio, CfgCheckbox,
  CfgField, CfgSectionTitle, CfgTabs, CfgButton,
});
