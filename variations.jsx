// Three variations of "live vs pending" — each exports a FieldRow render-fn
// and a top-of-form banner. A variation is chosen via Tweaks.

// ── Variation A: Inline diff chip next to each changed field ─────
// Safe default. Value shown in input = draft. When pending or failed,
// a small "Live: X → Pending: Y" chip appears to the right of the row.

// Column widths: label | input (fixed 360px) | diff (fixed 280px).
// Controls NEVER shift when a diff chip appears; the diff column is always
// reserved, just empty when clean.
// On narrow containers (<900px) the diff chip wraps to a second line under
// the input; on very narrow (<640px) the label stacks above, too.
const ROW_LABEL_W = 220;
const ROW_INPUT_W = 360;
const ROW_DIFF_W = 280;

// Watch an element's width and return a breakpoint bucket.
const useContainerBreakpoint = () => {
  const ref = React.useRef(null);
  const [bp, setBp] = React.useState('wide'); // 'wide' | 'mid' | 'narrow'
  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setBp(w < 560 ? 'narrow' : w < 900 ? 'mid' : 'wide');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, bp];
};

// Context: all rows inside a TabBody share the same breakpoint
const RowBpContext = React.createContext('wide');

const TabBody = ({ children }) => {
  const [ref, bp] = useContainerBreakpoint();
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <RowBpContext.Provider value={bp}>{children}</RowBpContext.Provider>
    </div>
  );
};

const DiffChipStable = ({ liveText, pendingText, tone = 'pending', failureReason }) => {
  const colors = tone === 'failed'
    ? { bg: 'rgba(242,62,68,.1)', border: 'rgba(242,62,68,.25)', liveColor: '#797F82', pendColor: '#F23E44', arrow: '#F23E44' }
    : tone === 'dirty'
    ? { bg: 'rgba(255,198,82,.15)', border: 'rgba(255,198,82,.5)', liveColor: '#797F82', pendColor: '#FFB300', arrow: '#FFB300' }
    : { bg: 'rgba(16,135,210,.08)', border: 'rgba(16,135,210,.3)', liveColor: '#797F82', pendColor: '#1F292F', arrow: '#797F82' };

  // Always single-line. Long values truncate via flex + ellipsis; full
  // text remains accessible through the native title tooltip. This keeps
  // every row at a fixed height so the form never shifts vertically.
  return (
    <span
      title={failureReason ? `Failed — ${failureReason}\n${liveText} → ${pendingText}` : `${liveText} → ${pendingText}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
        background: colors.bg, border: `1px solid ${colors.border}`,
        padding: '3px 8px', borderRadius: 4,
        fontFamily: 'ui-monospace, Menlo, monospace',
        maxWidth: '100%', width: '100%', boxSizing: 'border-box',
        lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden',
      }}
    >
      <span style={{
        color: colors.liveColor, textDecoration: 'line-through',
        overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '0 1 auto',
      }}>{liveText}</span>
      <i data-lucide="arrow-right" style={{ width: 10, height: 10, color: colors.arrow, flexShrink: 0 }} />
      <span style={{
        color: colors.pendColor, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: '1 1 auto',
      }}>{pendingText}</span>
    </span>
  );
};

const FieldRow_A = ({ fieldKey, label, children, status, liveText, pendingText, draftText, failureReason, indent, stackLabel }) => {
  const bp = React.useContext(RowBpContext);
  const showDiff = status === 'pending' || status === 'failed' || (status === 'dirty' && draftText !== liveText);
  const displayedLive = liveText;
  const displayedPending = status === 'dirty' ? draftText : (pendingText || draftText);

  // Responsive grid:
  //  wide   — label | input(360) | diff(280) on one row, fixed 56px
  //  mid    — label | input | diff below input (wraps), auto height
  //  narrow — label stacked above input, diff below, auto height
  let gridCols, rowHeight;
  if (stackLabel) {
    gridCols = '1fr auto'; rowHeight = 'auto';
  } else if (bp === 'wide') {
    gridCols = `${ROW_LABEL_W}px minmax(0, ${ROW_INPUT_W}px) minmax(0, ${ROW_DIFF_W}px)`;
    rowHeight = 56;
  } else if (bp === 'mid') {
    gridCols = `${ROW_LABEL_W}px minmax(0, 1fr)`;
    rowHeight = 'auto';
  } else {
    gridCols = '1fr';
    rowHeight = 'auto';
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      columnGap: 16, rowGap: 6,
      alignItems: bp === 'wide' ? 'center' : 'start',
      padding: bp === 'wide' ? '0' : '10px 0 10px 0',
      paddingLeft: indent ? (bp === 'narrow' ? 16 : 32) : 0,
      height: stackLabel ? 'auto' : rowHeight,
      minHeight: bp === 'wide' ? 56 : 0,
      borderBottom: status === 'failed' ? '1px solid rgba(242,62,68,.08)' : 'none',
    }}>
      <label style={{ fontSize: 13, color: '#384045', fontWeight: 500, paddingTop: bp === 'wide' ? 0 : 4 }}>{label}</label>
      {!stackLabel && (
        <div style={{ minWidth: 0, maxWidth: bp === 'wide' ? ROW_INPUT_W : '100%' }}>{children}</div>
      )}
      {!stackLabel && showDiff && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          minWidth: 0,
          maxWidth: bp === 'wide' ? ROW_DIFF_W : '100%',
          gridColumn: bp === 'wide' ? 'auto' : (bp === 'mid' ? '2' : '1'),
          overflow: 'hidden',
        }}>
          <DiffChipStable
            liveText={displayedLive}
            pendingText={displayedPending}
            tone={status === 'failed' ? 'failed' : status === 'dirty' ? 'dirty' : 'pending'}
            failureReason={failureReason}
          />
          {status === 'failed' && (
            <span title={failureReason} style={{ color: '#F23E44', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <i data-lucide="alert-circle" style={{ width: 14, height: 14 }} />
            </span>
          )}
        </div>
      )}
      {!stackLabel && !showDiff && bp === 'wide' && <div />}
      {stackLabel && <div style={{ gridColumn: '1 / -1' }}>{children}</div>}
    </div>
  );
};

const TopBanner_A = ({ cfg }) => {
  if (cfg.state.syncStatus === 'idle' && cfg.dirtyKeys.length === 0) return null;
  const s = cfg.state.syncStatus;
  const banners = {
    queued:   { bg: 'rgba(16,135,210,.08)', border: 'rgba(16,135,210,.3)', icon: 'clock',        text: `${cfg.pendingKeys.length} change(s) queued — waiting for camera to come online` },
    syncing:  { bg: 'rgba(180,199,255,.2)', border: '#B4C7FF',              icon: 'refresh-cw',   text: `Syncing ${cfg.pendingKeys.length} change(s) to camera…` },
    partial:  { bg: 'rgba(242,62,68,.1)',  border: 'rgba(242,62,68,.25)',              icon: 'alert-circle', text: `${cfg.failedKeys.length} change(s) failed to sync — review highlighted fields` },
    failed:   { bg: 'rgba(242,62,68,.1)',  border: 'rgba(242,62,68,.25)',              icon: 'alert-circle', text: `Sync failed — ${cfg.failedKeys.length} change(s) could not be applied` },
  };
  const b = banners[s];
  if (!b) return null;

  return (
    <div style={{ background: b.bg, border: `1px solid ${b.border}`, borderRadius: 4, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
      <i data-lucide={b.icon} style={{ width: 16, height: 16, color: '#1F292F', ...(s === 'syncing' ? { animation: 'spin 1.2s linear infinite' } : {}) }} />
      <div style={{ fontSize: 13, color: '#1F292F', flex: 1 }}>{b.text}</div>
      {(s === 'partial' || s === 'failed') && (
        <>
          <CfgButton variant="secondary" size="sm" onClick={cfg.cancelPending}>Cancel</CfgButton>
          <CfgButton variant="primary" size="sm" onClick={cfg.retryAll}>
            <i data-lucide="refresh-cw" style={{ width: 12, height: 12 }} /> Retry all
          </CfgButton>
        </>
      )}
      {s === 'queued' && (
        <CfgButton variant="secondary" size="sm" onClick={cfg.cancelPending}>Cancel queue</CfgButton>
      )}
    </div>
  );
};

// ── Variation B: Pending badge on field; hover/click shows live value ──
// Minimal. Only a small dot + "Live: X" tooltip-like hint under the field.

const FieldRow_B = ({ fieldKey, label, children, status, liveText, pendingText, draftText, failureReason, indent, stackLabel }) => {
  const bp = React.useContext(RowBpContext);
  const showHint = status === 'pending' || status === 'failed';
  const cols = stackLabel
    ? '1fr auto'
    : bp === 'narrow' ? '1fr' : bp === 'mid' ? '180px 1fr' : '220px 1fr auto';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 16, alignItems: 'start', padding: '12px 0',
      paddingLeft: indent ? (bp === 'narrow' ? 16 : 32) : 0,
    }}>
      <label style={{ fontSize: 13, color: '#384045', fontWeight: 500, paddingTop: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {label}
          {status === 'pending' && <span title="Pending sync" style={{ width: 8, height: 8, borderRadius: 4, background: '#1087D2' }} />}
          {status === 'failed' && <span title={failureReason} style={{ width: 8, height: 8, borderRadius: 4, background: '#F23E44' }} />}
          {status === 'dirty' && <span title="Unsaved" style={{ width: 8, height: 8, borderRadius: 4, background: '#BBBEC0' }} />}
        </span>
      </label>
      {!stackLabel && (
        <div style={{ minWidth: 0 }}>
          <div style={{
            border: status === 'failed' ? '1px solid rgba(242,62,68,.25)' : 'none',
            borderRadius: 4, padding: status === 'failed' ? 1 : 0,
          }}>{children}</div>
          {showHint && (
            <div style={{ fontSize: 11, color: '#797F82', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {status === 'failed' ? (
                <>
                  <i data-lucide="alert-circle" style={{ width: 11, height: 11, color: '#F23E44' }} />
                  <span style={{ color: '#F23E44' }}>Failed — {failureReason}.</span>
                  <span>Camera is still using <strong style={{ color: '#384045' }}>{liveText}</strong></span>
                </>
              ) : (
                <>
                  <i data-lucide="clock" style={{ width: 11, height: 11, color: '#1087D2' }} />
                  <span>Camera currently uses <strong style={{ color: '#384045' }}>{liveText}</strong> — will update when synced</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div />
      {stackLabel && <div style={{ gridColumn: '1 / -1' }}>{children}</div>}
    </div>
  );
};

const TopBanner_B = TopBanner_A; // same banner works fine

// ── Variation D: Diff chip BELOW field (side-by-side with A for comparison) ─
// Each row reserves a fixed 24px slot under the input for the diff chip.
// When there's no pending/failed change, the slot is empty but still
// occupies space — rows never shift vertically.

const DIFF_SLOT_H = 24;

const FieldRow_D = ({ fieldKey, label, children, status, liveText, pendingText, draftText, failureReason, indent, stackLabel }) => {
  const bp = React.useContext(RowBpContext);
  const showDiff = status === 'pending' || status === 'failed' || (status === 'dirty' && draftText !== liveText);
  const displayedLive = liveText;
  const displayedPending = status === 'dirty' ? draftText : (pendingText || draftText);

  // Grid: label on left, right column holds input + diff-slot stacked.
  const cols = stackLabel
    ? '1fr auto'
    : bp === 'narrow' ? '1fr' : bp === 'mid' ? '180px minmax(0, 1fr)' : `${ROW_LABEL_W}px minmax(0, 1fr)`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols,
      columnGap: 16, rowGap: 6,
      alignItems: 'start',
      padding: '12px 0 10px',
      paddingLeft: indent ? (bp === 'narrow' ? 16 : 32) : 0,
      borderBottom: status === 'failed' ? '1px solid rgba(242,62,68,.08)' : 'none',
    }}>
      <label style={{
        fontSize: 13, color: '#384045', fontWeight: 500,
        paddingTop: 8,
      }}>{label}</label>

      {!stackLabel && (
        <div style={{ minWidth: 0, maxWidth: bp === 'wide' ? ROW_INPUT_W : '100%' }}>
          {children}
          {/* Fixed-height diff slot — always reserved, so rows don't shift */}
          <div style={{
            height: DIFF_SLOT_H, marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 0, overflow: 'hidden',
          }}>
            {showDiff ? (
              <>
                <div style={{
                  flex: '1 1 auto', minWidth: 0,
                  maxWidth: bp === 'wide' ? ROW_INPUT_W : '100%',
                }}>
                  <DiffChipStable
                    liveText={displayedLive}
                    pendingText={displayedPending}
                    tone={status === 'failed' ? 'failed' : status === 'dirty' ? 'dirty' : 'pending'}
                    failureReason={failureReason}
                  />
                </div>
                {status === 'failed' && (
                  <span title={failureReason} style={{ color: '#F23E44', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i data-lucide="alert-circle" style={{ width: 14, height: 14 }} />
                  </span>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {stackLabel && (
        <div style={{ gridColumn: '1 / -1' }}>
          {children}
          <div style={{
            height: DIFF_SLOT_H, marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 0, overflow: 'hidden',
          }}>
            {showDiff && (
              <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%' }}>
                <DiffChipStable
                  liveText={displayedLive}
                  pendingText={displayedPending}
                  tone={status === 'failed' ? 'failed' : status === 'dirty' ? 'dirty' : 'pending'}
                  failureReason={failureReason}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Variation B: Pending badge on field; hover/click shows live value ──
// Minimal. Only a small dot + "Live: X" tooltip-like hint under the field.

// ── Variation C: Two-column Live | Pending review mode ─────────
// When there are pending/failed changes, a slide-out "Changes summary" card
// appears at the top showing a compact table (Live | Pending | Status).
// Field rows themselves show a subtle left-border stripe when in non-idle state.

const FieldRow_C = ({ fieldKey, label, children, status, liveText, pendingText, draftText, failureReason, indent, stackLabel }) => {
  const bp = React.useContext(RowBpContext);
  const stripeColor = status === 'failed' ? '#F23E44' : status === 'pending' ? '#1087D2' : status === 'dirty' ? '#BBBEC0' : 'transparent';
  const cols = stackLabel
    ? '1fr auto'
    : bp === 'narrow' ? '1fr' : bp === 'mid' ? '180px 1fr' : '220px 1fr auto';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols,
      gap: 16, alignItems: bp === 'narrow' ? 'start' : 'center',
      padding: '10px 0 10px 10px',
      paddingLeft: indent ? (bp === 'narrow' ? 22 : 42) : 10,
      borderLeft: `3px solid ${stripeColor}`,
      marginLeft: indent ? 0 : -10,
    }}>
      <label style={{ fontSize: 13, color: '#384045', fontWeight: 500 }}>{label}</label>
      {!stackLabel && <div style={{ minWidth: 0 }}>{children}</div>}
      <div style={{ minHeight: 22 }} />
      {stackLabel && <div style={{ gridColumn: '1 / -1' }}>{children}</div>}
    </div>
  );
};

const TopBanner_C = ({ cfg }) => {
  const [ref, bp] = useContainerBreakpoint();
  const hasPending = cfg.pendingKeys.length > 0 || cfg.failedKeys.length > 0;
  if (!hasPending && cfg.dirtyKeys.length === 0 && cfg.state.syncStatus === 'idle') return null;

  const allKeys = Array.from(new Set([
    ...cfg.failedKeys,
    ...cfg.pendingKeys,
    ...cfg.dirtyKeys.filter(k => !cfg.pendingKeys.includes(k) && !cfg.failedKeys.includes(k)),
  ]));
  if (allKeys.length === 0) return null;

  const statusFor = (k) => cfg.fieldStatus(k);
  const tone = {
    dirty:   { color: '#797F82', label: 'Unsaved', bg: '#F7F8F8' },
    pending: { color: '#1087D2', label: 'Pending', bg: 'rgba(16,135,210,.1)' },
    failed:  { color: '#F23E44', label: 'Failed',  bg: 'rgba(242,62,68,.1)' },
  };

  const headline = cfg.state.syncStatus === 'syncing'
    ? `Syncing ${cfg.pendingKeys.length} change(s)…`
    : cfg.failedKeys.length > 0
    ? `${cfg.failedKeys.length} change(s) failed — camera is still using the old values`
    : cfg.pendingKeys.length > 0
    ? `${cfg.pendingKeys.length} change(s) queued for sync`
    : `${cfg.dirtyKeys.length} unsaved change(s)`;

  const tableCols = bp === 'narrow' ? '1fr' : bp === 'mid' ? '1.2fr 1fr 100px' : '1.5fr 1fr 1fr 110px';

  return (
    <div ref={ref} style={{
      background: '#fff', border: '1px solid #E4E5E6', borderRadius: 4, marginBottom: 18, overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F4F4F4', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <i data-lucide={cfg.state.syncStatus === 'syncing' ? 'refresh-cw' : cfg.failedKeys.length ? 'alert-circle' : 'git-pull-request'}
           style={{ width: 16, height: 16, color: cfg.failedKeys.length ? '#F23E44' : '#384045', ...(cfg.state.syncStatus === 'syncing' ? { animation: 'spin 1.2s linear infinite' } : {}) }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1F292F', flex: '1 1 200px', minWidth: 0 }}>{headline}</div>
        {cfg.failedKeys.length > 0 && (
          <>
            <CfgButton variant="secondary" size="sm" onClick={cfg.cancelPending}>Cancel</CfgButton>
            <CfgButton variant="primary" size="sm" onClick={cfg.retryAll}>
              <i data-lucide="refresh-cw" style={{ width: 12, height: 12 }} /> Retry all
            </CfgButton>
          </>
        )}
        {cfg.state.syncStatus === 'queued' && (
          <CfgButton variant="secondary" size="sm" onClick={cfg.cancelPending}>Cancel queue</CfgButton>
        )}
      </div>
      {bp !== 'narrow' && (
        <div style={{ fontSize: 12, color: '#797F82', padding: '8px 16px 0', display: 'grid', gridTemplateColumns: tableCols, gap: 12 }}>
          <span>Setting</span>
          <span>Live value</span>
          {bp === 'wide' && <span>New value</span>}
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>
      )}
      <div style={{ padding: '4px 16px 12px' }}>
        {allKeys.map(k => {
          const st = statusFor(k);
          const t = tone[st] || tone.pending;
          const newVal = cfg.pendingValue(k) != null ? cfg.pendingValue(k) : cfg.draftValue(k);
          if (bp === 'narrow') {
            return (
              <div key={k} style={{ padding: '8px 0', borderBottom: '1px solid #F7F8F8', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#384045', fontWeight: 600 }}>{FIELD_META[k]?.label || k}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: t.color, background: t.bg, padding: '2px 8px', borderRadius: 999, fontWeight: 600, fontSize: 11 }}>
                    {st === 'failed' && <i data-lucide="alert-circle" style={{ width: 11, height: 11 }} />}
                    {st === 'pending' && <i data-lucide="clock" style={{ width: 11, height: 11 }} />}
                    {st === 'dirty' && <i data-lucide="circle-dot" style={{ width: 11, height: 11 }} />}
                    {t.label}
                  </span>
                </div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#797F82' }}>
                  <span style={{ textDecoration: 'line-through' }}>{formatValue(k, cfg.liveValue(k))}</span>
                  {' → '}
                  <span style={{ color: '#1F292F', fontWeight: 600 }}>{formatValue(k, newVal)}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: tableCols, gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F7F8F8', fontSize: 12 }}>
              <span style={{ color: '#384045' }}>{FIELD_META[k]?.label || k}</span>
              <span style={{ color: '#797F82', fontFamily: 'ui-monospace, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatValue(k, cfg.liveValue(k))}</span>
              {bp === 'wide' && <span style={{ color: '#1F292F', fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatValue(k, newVal)}</span>}
              <span style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 4, color: t.color, background: t.bg, padding: '2px 8px', borderRadius: 999, fontWeight: 600, fontSize: 11 }}>
                {st === 'failed' && <i data-lucide="alert-circle" style={{ width: 11, height: 11 }} />}
                {st === 'pending' && <i data-lucide="clock" style={{ width: 11, height: 11 }} />}
                {st === 'dirty' && <i data-lucide="circle-dot" style={{ width: 11, height: 11 }} />}
                {t.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VARIATIONS = {
  inline:   { name: 'Inline diff chip',    FieldRow: FieldRow_A, TopBanner: TopBanner_A, blurb: 'Unsaved / pending / failed fields show a compact "old → new" chip in the right gutter. Low visual weight, always scannable.' },
  below:    { name: 'Diff below field',    FieldRow: FieldRow_D, TopBanner: TopBanner_A, blurb: 'The "old → new" chip sits directly under the input. Every field reserves the space, so rows never shift when a chip appears.' },
  hint:     { name: 'Subtle field hints',  FieldRow: FieldRow_B, TopBanner: TopBanner_B, blurb: 'The input shows the new value; a colored dot on the label and a secondary line tell the user what the camera currently uses.' },
  summary:  { name: 'Changes summary bar', FieldRow: FieldRow_C, TopBanner: TopBanner_C, blurb: 'A review strip at the top of the form lists every change with Live vs New side-by-side. Field rows stay clean with just a colored left stripe.' },
};

Object.assign(window, { VARIATIONS, FieldRow_A, FieldRow_B, FieldRow_C, FieldRow_D, TabBody });
