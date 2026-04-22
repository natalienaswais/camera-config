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

// ── Tab 1: Camera details ──────────────────────────────────────

const TabDetails = ({ cfg, FieldRow }) => {
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

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Set the camera name, channels and vehicle assignment, or continue configuring camera settings.
      </p>

      {F('brand', <CfgInput value={cfg.draftValue('brand')} readOnly />)}
      {F('vehicle', (
        <CfgSelect value={cfg.draftValue('vehicle')} onChange={v => cfg.updateDraft('vehicle', v)} options={FIELD_META.vehicle.options} />
      ))}
      {F('cameraName', (
        <CfgInput value={cfg.draftValue('cameraName')} onChange={v => cfg.updateDraft('cameraName', v)} placeholder="e.g. Mercedes 123" />
      ))}

      {/* Channel 1 row: name + toggle in one row, shared label handled below */}
      <ChannelRow
        cfg={cfg} FieldRow={FieldRow}
        nameKey="channel1Name" enabledKey="channel1Enabled" label="Channel 1 · Outside"
      />
      <ChannelRow
        cfg={cfg} FieldRow={FieldRow}
        nameKey="channel2Name" enabledKey="channel2Enabled" label="Channel 2 · Inside cab"
      />

      <FieldRow
        fieldKey="remoteAccess"
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i data-lucide="info" style={{ width: 14, height: 14, color: '#BBBEC0' }} />
            Remote recording access for authorised admins
          </span>
        }
        status={cfg.fieldStatus('remoteAccess')}
        liveText={formatValue('remoteAccess', cfg.liveValue('remoteAccess'))}
        draftText={formatValue('remoteAccess', cfg.draftValue('remoteAccess'))}
        pendingText={cfg.pendingValue('remoteAccess') != null ? formatValue('remoteAccess', cfg.pendingValue('remoteAccess')) : null}
        failureReason={cfg.failureReason('remoteAccess')}
        stackLabel
      >
        <CfgCheckbox
          checked={cfg.draftValue('remoteAccess')}
          onChange={v => cfg.updateDraft('remoteAccess', v)}
          label="Enable"
        />
      </FieldRow>
    </div>
  );
};

const ChannelRow = ({ cfg, FieldRow, nameKey, enabledKey, label }) => {
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

const TabSettings = ({ cfg, FieldRow }) => {
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

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Configure and save camera settings.
      </p>

      <CfgSectionTitle title="Timezone" info />
      {F('timezone', (
        <CfgSelect value={cfg.draftValue('timezone')} onChange={v => cfg.updateDraft('timezone', v)} options={FIELD_META.timezone.options} />
      ))}

      <CfgSectionTitle title="Audio recording" info />
      {F('audioRecording', (
        <CfgToggle checked={cfg.draftValue('audioRecording')} onChange={v => cfg.updateDraft('audioRecording', v)} />
      ))}

      <CfgSectionTitle title="Text-to-speech voice language" info />
      {F('ttsLanguage', (
        <CfgSelect value={cfg.draftValue('ttsLanguage')} onChange={v => cfg.updateDraft('ttsLanguage', v)} options={FIELD_META.ttsLanguage.options} />
      ))}

      <CfgSectionTitle title="Camera rotation" info />
      <RotationRow cfg={cfg} FieldRow={FieldRow} k="channel1Rotation" />
      <RotationRow cfg={cfg} FieldRow={FieldRow} k="channel2Rotation" />

      <CfgSectionTitle title="Wi-Fi" info />
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
    </div>
  );
};

const RotationRow = ({ cfg, FieldRow, k }) => (
  <FieldRow
    fieldKey={k}
    label={FIELD_META[k].label}
    status={cfg.fieldStatus(k)}
    liveText={formatValue(k, cfg.liveValue(k))}
    draftText={formatValue(k, cfg.draftValue(k))}
    pendingText={cfg.pendingValue(k) != null ? formatValue(k, cfg.pendingValue(k)) : null}
    failureReason={cfg.failureReason(k)}
  >
    <div style={{ display: 'flex', gap: 20 }}>
      {FIELD_META[k].options.map(([val, lbl]) => (
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

// ── Tab 3: Camera security ─────────────────────────────────────

const TabSecurity = ({ cfg, FieldRow }) => {
  const F = (key, render, opts = {}) => (
    <FieldRow
      key={key}
      fieldKey={key}
      label={FIELD_META[key].label}
      status={cfg.fieldStatus(key)}
      liveText={formatValue(key, cfg.liveValue(key))}
      draftText={formatValue(key, cfg.draftValue(key))}
      pendingText={cfg.pendingValue(key) != null ? formatValue(key, cfg.pendingValue(key)) : null}
      failureReason={cfg.failureReason(key)}
      {...opts}
    >
      {render}
    </FieldRow>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: '#797F82', marginBottom: 12 }}>
        Configure the camera's safety and privacy features.
      </p>

      <CfgSectionTitle title="Disable camera notifications" info />
      {F('disableNotifications', (
        <CfgToggle checked={cfg.draftValue('disableNotifications')} onChange={v => cfg.updateDraft('disableNotifications', v)} />
      ))}

      <CfgSectionTitle title="Privacy mode" info />
      {F('driverPrivacy', (
        <CfgToggle checked={cfg.draftValue('driverPrivacy')} onChange={v => cfg.updateDraft('driverPrivacy', v)} />
      ))}

      <CfgSectionTitle title="DMS events" info />
      {F('dmsEvents', (
        <CfgToggle checked={cfg.draftValue('dmsEvents')} onChange={v => cfg.updateDraft('dmsEvents', v)} />
      ))}
      {['dmsYawning','dmsPhone','dmsSmoking','dmsEyesClosed'].map(k => F(k, (
        <CfgToggle
          checked={cfg.draftValue(k)}
          onChange={v => cfg.updateDraft(k, v)}
          disabled={!cfg.draftValue('dmsEvents')}
        />
      ), { indent: true }))}

      <CfgSectionTitle title="ADAS events" info />
      {F('adasEvents', (
        <CfgToggle checked={cfg.draftValue('adasEvents')} onChange={v => cfg.updateDraft('adasEvents', v)} />
      ))}
      {F('adasForwardCollision', (
        <CfgToggle
          checked={cfg.draftValue('adasForwardCollision')}
          onChange={v => cfg.updateDraft('adasForwardCollision', v)}
          disabled={!cfg.draftValue('adasEvents')}
        />
      ), { indent: true })}
    </div>
  );
};

Object.assign(window, { TabDetails, TabSettings, TabSecurity, NoteBanner });
