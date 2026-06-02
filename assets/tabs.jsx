// Camera configuration — tab forms
// Each tab renders Fields, consuming the shared config state (live/draft/pending).
// The variation-specific "how do we show live vs pending" is done via a FieldRow
// wrapper injected by the parent (variations.jsx).

// FieldRow is a RENDER PROP: variations pass their own wrapper, and we call it
// with { key, label, children, status, liveText, pendingText, failureReason }.
// This keeps forms variation-agnostic.

const NoteBanner = ({ children, tone = 'info' }) => {
  const styles = {
    info:    { bg: '#F2F7FD', border: '#B4C7FF', color: '#1087D2' },
    warning: { bg: '#FFF8E6', border: '#FFB300', color: '#FFB300' },
    error:   { bg: 'rgba(242,62,68,.08)', border: 'rgba(242,62,68,.25)', color: '#F23E44' },
  }[tone];
  return (
    <div style={{
      background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color,
      padding: '10px 14px', borderRadius: 4, fontSize: 13, marginBottom: 18, lineHeight: 1.5,
    }}>{children}</div>
  );
};

// Shared static warning shown on the Settings / Safety tabs.
const OverrideWarning = () => (
  <NoteBanner>Be aware that any changes to the camera settings will override the current configurations.</NoteBanner>
);

// ── Tab 1: Camera details ──────────────────────────────────────

const TabDetails = ({ cfg, FieldRow, brand = DEFAULT_BRAND, channelCount = 3 }) => {
  const ui = brandUI(brand);
  const F = (key, render) => (
    <FieldRow
      key={key}
      fieldKey={key}
      label={FIELD_META[key].label}
      status={cfg.fieldStatus(key)}
      liveText={formatValue(key, cfg.liveValue(key))}
      draftText={formatValue(key, cfg.draftValue(key))}
      pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
      failureReason={cfg.failureReason(key)}
    >
      {render}
    </FieldRow>
  );

  // Checkbox row with an info icon (Events restriction / Remote access).
  const checkboxRow = (key) => {
    const m = FIELD_META[key];
    return (
      <FieldRow
        key={key}
        fieldKey={key}
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {m.info && <Icon name="info" style={{ width: 14, height: 14, color: '#BBBEC0' }} />}
            {m.label}
          </span>
        }
        status={cfg.fieldStatus(key)}
        liveText={formatValue(key, cfg.liveValue(key))}
        draftText={formatValue(key, cfg.draftValue(key))}
        pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
        failureReason={cfg.failureReason(key)}
      >
        <CfgCheckbox
          checked={cfg.draftValue(key)}
          onChange={v => cfg.updateDraft(key, v)}
          label={m.checkboxLabel || 'Enable'}
        />
      </FieldRow>
    );
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Set the camera's name, channels, and vehicle assignment, or continue with configuring the camera settings.
      </p>

      {F('brand', <CfgInput value={cfg.draftValue('brand')} readOnly />)}
      {F('vehicle', (
        <CfgSelect value={cfg.draftValue('vehicle')} onChange={v => cfg.updateDraft('vehicle', v)} options={FIELD_META.vehicle.options} />
      ))}
      {F('cameraName', (
        <CfgInput value={cfg.draftValue('cameraName')} onChange={v => cfg.updateDraft('cameraName', v)} placeholder="e.g. 28166286" />
      ))}

      {/* One row per channel: role label + editable name + enable toggle */}
      {Array.from({ length: channelCount }, (_, idx) => (
        <ChannelRow key={idx} cfg={cfg} FieldRow={FieldRow} index={idx + 1} brand={brand} />
      ))}

      {ui.showEventsRestriction && checkboxRow('eventsRestriction')}
      {checkboxRow('remoteAccess')}

      {ui.showVideoSharingBanner && cfg.draftValue('remoteAccess') && (
        <div style={{ marginTop: 12 }}>
          <NoteBanner>Video sharing is enabled and will remain active until manually disabled or permissions are revoked.</NoteBanner>
        </div>
      )}
    </div>
  );
};

const ChannelRow = ({ cfg, FieldRow, index, brand = DEFAULT_BRAND }) => {
  const nameKey = channelKey(index, 'name');
  const enabledKey = channelKey(index, 'enabled');
  const label = channelRole(brand, index);
  const placeholder = brandUI(brand).channelNamePlaceholder;

  // Compose a joint status so the row shows a single chip.
  const nameStatus = cfg.fieldStatus(nameKey);
  const enabledStatus = cfg.fieldStatus(enabledKey);
  const priority = ['failed', 'pending', 'dirty', 'applied'];
  const joint = priority.find(p => p === nameStatus || p === enabledStatus) || null;
  const jointFailure = cfg.failureReason(nameKey) || cfg.failureReason(enabledKey);

  const liveText = `${formatValue(nameKey, cfg.liveValue(nameKey))} · ${formatValue(enabledKey, cfg.liveValue(enabledKey))}`;
  const draftText = `${formatValue(nameKey, cfg.draftValue(nameKey))} · ${formatValue(enabledKey, cfg.draftValue(enabledKey))}`;
  const pendingText = cfg.pendingValue(nameKey) != null
    ? `${formatValue(nameKey, cfg.pendingValue(nameKey))} · ${formatValue(enabledKey, cfg.pendingValue(enabledKey))}`
    : null;

  return (
    <FieldRow
      fieldKey={nameKey}
      label={label}
      status={joint}
      liveText={liveText}
      draftText={draftText}
      pendingText={pendingText}
      failureReason={jointFailure}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <CfgInput
          value={cfg.draftValue(nameKey)}
          onChange={v => cfg.updateDraft(nameKey, v)}
          disabled={!cfg.draftValue(enabledKey)}
          placeholder={placeholder}
        />
        <CfgToggle
          checked={cfg.draftValue(enabledKey)}
          onChange={v => cfg.updateDraft(enabledKey, v)}
        />
      </div>
    </FieldRow>
  );
};

// ── Tab 2: Camera settings ─────────────────────────────────────

const TabSettings = ({ cfg, FieldRow, brand = DEFAULT_BRAND, channelCount = 3 }) => {
  const ui = brandUI(brand);
  const F = (key, render, label) => (
    <FieldRow
      key={key}
      fieldKey={key}
      label={label || FIELD_META[key].label}
      status={cfg.fieldStatus(key)}
      liveText={formatValue(key, cfg.liveValue(key))}
      draftText={formatValue(key, cfg.draftValue(key))}
      pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
      failureReason={cfg.failureReason(key)}
    >
      {render}
    </FieldRow>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Configure and save new device settings.
      </p>
      <OverrideWarning />

      <CfgSectionTitle title="Time zone" info />
      {F('timezone', (
        <CfgSelect value={cfg.draftValue('timezone')} onChange={v => cfg.updateDraft('timezone', v)} options={FIELD_META.timezone.options} />
      ))}

      {/* Audio recording — per-channel toggles (Howen) or a single toggle (Queclink) */}
      <CfgSectionTitle title="Audio recording" info />
      {ui.audioPerChannel
        ? Array.from({ length: channelCount }, (_, idx) => {
            const k = channelKey(idx + 1, 'audio');
            return F(k, <CfgToggle checked={cfg.draftValue(k)} onChange={v => cfg.updateDraft(k, v)} />);
          })
        : F('audioRecording', <CfgToggle checked={cfg.draftValue('audioRecording')} onChange={v => cfg.updateDraft('audioRecording', v)} />)}

      {ui.showTts && (
        <>
          <CfgSectionTitle title="Text To Speech Language" info />
          {F('ttsLanguage', (
            <CfgSelect value={cfg.draftValue('ttsLanguage')} onChange={v => cfg.updateDraft('ttsLanguage', v)} options={FIELD_META.ttsLanguage.options} />
          ))}
        </>
      )}

      {/* Camera rotation — option set + labels are brand-specific */}
      <CfgSectionTitle title="Camera rotation" info />
      {Array.from({ length: channelCount }, (_, idx) => (
        <RotationRow
          key={idx}
          cfg={cfg}
          FieldRow={FieldRow}
          k={channelKey(idx + 1, 'rotation')}
          options={ui.rotationOptions}
          label={ui.rotationLabel === 'role' ? channelRole(brand, idx + 1) : FIELD_META[channelKey(idx + 1, 'rotation')].label}
        />
      ))}

      {ui.showWifi && (
        <>
          <CfgSectionTitle title="WiFi mode" info />
          {F('wifiEnabled', (
            <CfgToggle checked={cfg.draftValue('wifiEnabled')} onChange={v => cfg.updateDraft('wifiEnabled', v)} />
          ))}
          {cfg.draftValue('wifiEnabled') && (
            <>
              {F('wifiSsid', (
                <CfgInput value={cfg.draftValue('wifiSsid')} onChange={v => cfg.updateDraft('wifiSsid', v)} placeholder="Network name" />
              ))}
              {F('wifiPassword', (
                <CfgInput type="password" value={cfg.draftValue('wifiPassword')} onChange={v => cfg.updateDraft('wifiPassword', v)} placeholder="••••••••" />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

const RotationRow = ({ cfg, FieldRow, k, options, label }) => (
  <FieldRow
    fieldKey={k}
    label={label || FIELD_META[k].label}
    status={cfg.fieldStatus(k)}
    liveText={formatValue(k, cfg.liveValue(k))}
    draftText={formatValue(k, cfg.draftValue(k))}
    pendingText={cfg.pendingValue(k) != null ? formatValue(k, cfg.pendingValue(k)) : null}
    failureReason={cfg.failureReason(k)}
  >
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
      {(options || FIELD_META[k].options).map(([val, lbl]) => (
        <CfgRadio
          key={val}
          checked={cfg.draftValue(k) === val}
          onChange={() => cfg.updateDraft(k, val)}
          label={lbl}
        />
      ))}
    </div>
  </FieldRow>
);

// ── Tab 3: Camera safety ───────────────────────────────────────

// Master on/off header for an event group (bold title + info + toggle).
// Toggling the master cascades to every sub-event (childKeys): on → all on, off → all off.
const EventGroupHeader = ({ cfg, masterKey, title, readOnly, childKeys = [] }) => {
  const status = cfg.fieldStatus(masterKey);
  const onMaster = (v) => {
    const patch = { [masterKey]: v };
    childKeys.forEach(k => { patch[k] = v; });
    cfg.updateDraftMany(patch);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: '1px solid #E4E5E6' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1F292F' }}>{title}</h2>
      <Icon name="info" style={{ width: 14, height: 14, color: '#BBBEC0' }} />
      {status && <StatusChip status={status} compact failureReason={cfg.failureReason(masterKey)} />}
      <div style={{ marginLeft: 'auto' }}>
        <CfgToggle checked={cfg.draftValue(masterKey)} disabled={readOnly} onChange={onMaster} />
      </div>
    </div>
  );
};

// One expandable event block: header (chevron + label + toggle), expanding to its
// per-event sub-parameters. `readOnly` (Queclink) shows everything but disables editing;
// the block still expands so the configuration is visible.
const EventAccordion = ({ cfg, FieldRow, sys, event, masterKey, params = EVENT_PARAMS, readOnly = false, siblingKeys = [] }) => {
  const [open, setOpen] = React.useState(false);
  const masterOn = cfg.draftValue(masterKey);
  const enKey = eventEnabledKey(sys, event.key);
  const enabled = cfg.draftValue(enKey);
  const canExpand = readOnly || masterOn;          // read-only events can still be viewed
  const labelLit = readOnly || masterOn;           // dark label when viewable

  // Toggling a sub-event off: if it was the last one on, switch the master group off too.
  const onToggle = (v) => {
    if (v) { cfg.updateDraft(enKey, true); return; }
    const anyOtherOn = siblingKeys.some(k => k !== enKey && cfg.draftValue(k));
    if (anyOtherOn) cfg.updateDraft(enKey, false);
    else cfg.updateDraftMany({ [enKey]: false, [masterKey]: false });
  };

  const allKeys = [enKey, ...params.map(p => eventParamKey(sys, event.key, p.param))];
  const agg = ['failed', 'pending', 'dirty'].find(s => allKeys.some(k => cfg.fieldStatus(k) === s)) || null;

  return (
    <div style={{ borderBottom: '1px solid #F4F4F4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
        <button
          onClick={() => canExpand && setOpen(o => !o)}
          disabled={!canExpand}
          aria-expanded={open}
          style={{ background: 'none', border: 'none', padding: 0, color: canExpand ? '#384045' : '#BBBEC0', cursor: canExpand ? 'pointer' : 'default', display: 'grid', placeItems: 'center' }}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ flex: 1, fontSize: 15, color: labelLit ? '#1F292F' : '#797F82', minWidth: 0 }}>{event.label}</span>
        {agg && !open && <StatusChip status={agg} compact />}
        <CfgToggle checked={enabled} disabled={readOnly || !masterOn} onChange={onToggle} />
      </div>

      {open && (
        <div style={{ paddingBottom: 8 }}>
          {params.map(p => {
            const k = eventParamKey(sys, event.key, p.param);
            const disabled = readOnly || !enabled;
            return (
              <FieldRow
                key={k}
                fieldKey={k}
                label={p.label}
                indent
                status={cfg.fieldStatus(k)}
                liveText={formatValue(k, cfg.liveValue(k))}
                draftText={formatValue(k, cfg.draftValue(k))}
                pendingText={cfg.pendingValue(k) != null ? formatValue(k, cfg.pendingValue(k)) : null}
                failureReason={cfg.failureReason(k)}
              >
                {p.type === 'sensitivity'
                  ? <CfgSensitivity value={cfg.draftValue(k)} onChange={v => cfg.updateDraft(k, v)} disabled={disabled} />
                  : <CfgSelect value={cfg.draftValue(k)} onChange={v => cfg.updateDraft(k, v)} options={p.options} disabled={disabled} />}
              </FieldRow>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Overspeed alarm — a flat configurable block (master toggle + params).
const OverspeedSection = ({ cfg, FieldRow }) => {
  const on = cfg.draftValue('overspeedEnabled');
  const row = (key, render) => (
    <FieldRow
      key={key}
      fieldKey={key}
      label={FIELD_META[key].label}
      status={cfg.fieldStatus(key)}
      liveText={formatValue(key, cfg.liveValue(key))}
      draftText={formatValue(key, cfg.draftValue(key))}
      pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
      failureReason={cfg.failureReason(key)}
    >
      {render}
    </FieldRow>
  );
  return (
    <div style={{ marginTop: 22 }}>
      <CfgSectionTitle title="Overspeed alarm events" info />
      {row('overspeedEnabled', <CfgToggle checked={on} onChange={v => cfg.updateDraft('overspeedEnabled', v)} />)}
      {OVERSPEED_PARAMS.map(p => {
        const k = `overspeed_${p.param}`;
        return row(k, <CfgSelect value={cfg.draftValue(k)} onChange={v => cfg.updateDraft(k, v)} options={p.options} disabled={!on} />);
      })}
    </div>
  );
};

const TabSecurity = ({ cfg, FieldRow, brand = DEFAULT_BRAND }) => {
  const ui = brandUI(brand);
  const readOnly = !ui.eventsEditable;

  const F = (key, render) => (
    <FieldRow
      key={key}
      fieldKey={key}
      label={FIELD_META[key].label}
      status={cfg.fieldStatus(key)}
      liveText={formatValue(key, cfg.liveValue(key))}
      draftText={formatValue(key, cfg.draftValue(key))}
      pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
      failureReason={cfg.failureReason(key)}
    >
      {render}
    </FieldRow>
  );

  const pickEvents = (catalog, keys) => keys.map(k => catalog.find(e => e.key === k)).filter(Boolean);
  // DMS/ADAS render the brand's param subset (Howen omits Post-event duration).
  const dmsParams = EVENT_PARAMS.filter(p => ui.eventParams.includes(p.param));

  const dmsList = pickEvents(DMS_EVENTS, ui.dmsEvents);
  const adasList = pickEvents(ADAS_EVENTS, ui.adasEvents);
  const harshList = pickEvents(HARSH_EVENTS, ui.harshEvents);
  const dmsChildKeys = dmsList.map(ev => eventEnabledKey('dms', ev.key));
  const adasChildKeys = adasList.map(ev => eventEnabledKey('adas', ev.key));
  const harshChildKeys = harshList.map(ev => eventEnabledKey('harsh', ev.key));

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Configure and save new device settings.
      </p>
      <OverrideWarning />

      <CfgSectionTitle title="Turn off camera events" info />
      {F('disableNotifications', (
        <CfgToggle checked={cfg.draftValue('disableNotifications')} onChange={v => cfg.updateDraft('disableNotifications', v)} />
      ))}

      <CfgSectionTitle title="Privacy Mode" info />
      {F('driverPrivacy', (
        <CfgToggle checked={cfg.draftValue('driverPrivacy')} onChange={v => cfg.updateDraft('driverPrivacy', v)} />
      ))}

      {ui.showOverspeed && <OverspeedSection cfg={cfg} FieldRow={FieldRow} />}

      <div style={{ marginTop: 22 }}>
        <EventGroupHeader cfg={cfg} masterKey="dmsEvents" title="DMS Events" readOnly={readOnly} childKeys={dmsChildKeys} />
        {dmsList.map(ev => (
          <EventAccordion key={ev.key} cfg={cfg} FieldRow={FieldRow} sys="dms" event={ev} masterKey="dmsEvents" params={dmsParams} readOnly={readOnly} siblingKeys={dmsChildKeys} />
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <EventGroupHeader cfg={cfg} masterKey="adasEvents" title="ADAS Events" readOnly={readOnly} childKeys={adasChildKeys} />
        {adasList.map(ev => (
          <EventAccordion key={ev.key} cfg={cfg} FieldRow={FieldRow} sys="adas" event={ev} masterKey="adasEvents" params={dmsParams} readOnly={readOnly} siblingKeys={adasChildKeys} />
        ))}
      </div>

      {ui.showHarsh && (
        <div style={{ marginTop: 28 }}>
          <EventGroupHeader cfg={cfg} masterKey="harshEvents" title="Harsh Events" readOnly={readOnly} childKeys={harshChildKeys} />
          {harshList.map(ev => (
            <EventAccordion key={ev.key} cfg={cfg} FieldRow={FieldRow} sys="harsh" event={ev} masterKey="harshEvents" params={ev.params || HARSH_PARAMS} readOnly={readOnly} siblingKeys={harshChildKeys} />
          ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { TabDetails, TabSettings, TabSecurity, NoteBanner });
