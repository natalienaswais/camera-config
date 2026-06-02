// Camera configuration — data model
// Three tabs, each with a flat field schema so the state machine can diff them.

const DEFAULTS = {
  // Camera details (per-channel name/enabled fields are generated below)
  brand: 'Howen',
  vehicle: 'OC-04-HOWEN-3ch',
  cameraName: '28166286',
  eventsRestriction: false,
  remoteAccess: true,

  // Camera settings (per-channel audio + rotation generated below).
  // Wi-Fi and voice/TTS are Queclink-only features — rendered only for that brand.
  timezone: 'Etc/GMT (+00:00)',
  ttsLanguage: 'English (UK)',
  wifiEnabled: true,
  wifiSsid: 'Fleet-Cam-3333',
  wifiPassword: '',

  // Camera security — master toggles only. The per-event fields (one block of
  // sub-parameters per DMS/ADAS event) are generated below and merged in.
  disableNotifications: false,
  driverPrivacy: false,
  dmsEvents: false,
  adasEvents: false,
};

// Cameras expose 1–N channels; the prototype generates fields up to MAX_CHANNELS and
// each screen renders only as many as the opened camera reports. Channel role labels
// are dynamic per model — here Inward / Outward, then a "Channel N" fallback (matching
// the BE note about per-model channel naming).
const MAX_CHANNELS = 6;

// Camera-rotation choices. Howen exposes four flips; Queclink only two.
const ROTATION_OPTIONS = [
  ['none', 'No flip'],
  ['horizontal', 'Horizontal flip'],
  ['vertical', 'Vertical flip'],
  ['both', 'Horizontal and vertical flip'],
];
const ROTATION_OPTIONS_2 = [
  ['none', 'No flip'],
  ['vertical', 'Vertical flip'],
];

// Channel role label per brand (Howen: Inward/Outward; Queclink: Outward/Inward),
// falling back to "Channel N". Used for the row label in details / rotation.
const channelRole = (brand, i) => {
  const roles = (BRAND_UI[brand] || BRAND_UI[DEFAULT_BRAND]).channelRoles;
  return roles[i - 1] || `Channel ${i}`;
};

// Field metadata — used to render diff chips, pending summaries, etc.
//
// `route` = brand-agnostic semantic descriptor consumed by the per-brand command
// router (see BRANDS below). The SAME field is routed to a different device command
// depending on the camera manufacturer — that is the whole point of this model.
//   route.sys   — which camera subsystem the field belongs to
//                 ('timezone' | 'audio' | 'rotation' | 'dms' | 'adas' | 'wifi' | 'tts')
//   route.event — for dms/adas only: the specific event key. Queclink fans these out
//                 into one AT+GTDSS command PER event; Howen bundles them all into one
//                 SET_CONFIG. This is the field that makes the two brands diverge.
//
// Fields WITHOUT a `route` are Mapon-platform-only (camera name, vehicle assignment,
// remote access, privacy mode, notification suppression). They never produce a device
// command and never appear in the device activity log — they only update Mapon's side.
const FIELD_META = {
  brand:            { label: 'Camera brand',  tab: 'details', type: 'text',   readOnly: true },
  vehicle:          { label: 'Assign to vehicle', tab: 'details', type: 'select', options: ['OC-04-HOWEN-3ch', 'KP 2356', 'KP 2357', 'AB 1234', 'CD 5678'] },
  cameraName:       { label: 'Camera name',   tab: 'details', type: 'text' },
  // Platform-only details (no device command): events restriction + remote access.
  eventsRestriction:{ label: 'Events restriction', tab: 'details', type: 'checkbox', checkboxLabel: 'Blocked', info: true },
  remoteAccess:     { label: 'Remote access to recordings for authorized company', tab: 'details', type: 'checkbox', checkboxLabel: 'Enable', info: true },

  timezone:    { label: 'Timezone',  tab: 'settings', type: 'select',   options: ['Etc/GMT (+00:00)', 'Europe/Riga (+02:00)', 'Europe/Helsinki (+02:00)', 'Pacific/Niue (-11:00)', 'America/New_York (-05:00)'], route: { sys: 'timezone' } },
  // Single audio-recording toggle — used by Queclink (Howen uses the per-channel ch*_audio).
  audioRecording: { label: 'Audio recording', tab: 'settings', type: 'toggle', route: { sys: 'audio' } },
  // Queclink-only (rendered only for that brand; Howen has neither in its spec/UI).
  ttsLanguage: { label: 'Voice Alert Language', tab: 'settings', type: 'select', options: ['English (UK)', 'English (US)', 'Latviešu', 'Eesti', 'Suomi', 'Português'], route: { sys: 'tts' } },
  wifiEnabled: { label: 'Enable WiFi', tab: 'settings', type: 'toggle',  route: { sys: 'wifi' } },
  wifiSsid:    { label: 'SSID',         tab: 'settings', type: 'text',    route: { sys: 'wifi' } },
  wifiPassword:{ label: 'Password',     tab: 'settings', type: 'password',route: { sys: 'wifi' } },

  // "Turn off camera events": a device command on Queclink (AT+GTREC) but platform-only
  // on Howen (the router decides). Driver privacy is platform-only on both.
  disableNotifications: { label: 'Turn off',                       tab: 'security', type: 'toggle', route: { sys: 'turnoff' } },
  driverPrivacy:        { label: 'Enable Driver Privacy Mode',     tab: 'security', type: 'toggle' },

  // Overspeed alarm (Queclink only) — master toggle + params, configurable.
  overspeedEnabled:     { label: 'Overspeed alarm',                tab: 'security', type: 'toggle', group: true, route: { sys: 'overspeed', event: 'overspeed', param: 'master' } },

  dmsEvents:            { label: 'DMS events',                     tab: 'security', type: 'toggle',  group: true,  route: { sys: 'dms',  event: 'master', param: 'master' } },
  adasEvents:           { label: 'ADAS events',                    tab: 'security', type: 'toggle',  group: true,  route: { sys: 'adas', event: 'master', param: 'master' } },
  harshEvents:          { label: 'Harsh events',                   tab: 'security', type: 'toggle',  group: true,  route: { sys: 'harsh', event: 'master', param: 'master' } },
};

// ── Per-event DMS / ADAS schema ──────────────────────────────────
// Each driver-monitoring event is an expandable block with the same set of
// sub-parameters. The KEY thing for command routing: on Queclink a single event's
// parameters fan out across THREE commands (AT+GTDSS / AT+GTREC / AT+GTVOL), while
// Howen bundles every event and every parameter into one SET_CONFIG. The `param`
// on each field's `route` is what lets the brand router make that split.
const DMS_EVENTS = [
  { key: 'yawning',         label: 'Yawning' },
  { key: 'phone',           label: 'Phone usage' },
  { key: 'smoking',         label: 'Smoking' },
  { key: 'eyesClosed',      label: 'Eyes closed' },
  { key: 'distracted',      label: 'Distracted' },
  { key: 'seatbelt',        label: 'Seatbelt unfastened' },
];
const ADAS_EVENTS = [
  { key: 'pedestrian',      label: 'Pedestrian detection alert' },
  { key: 'headway',         label: 'Headway monitoring warning detection' },
  { key: 'forwardCollision',label: 'Forward collision warning detection' },
];
// Sub-parameters of every DMS/ADAS event, in display order. `param` matches the keys
// the brand routers switch on. Post-event duration is Queclink-only (the brand profile's
// `eventParams` decides which of these actually render).
const EVENT_PARAMS = [
  { param: 'sensitivity',  label: 'Sensitivity',               type: 'sensitivity', default: 'medium' },
  { param: 'uploadFormat', label: 'Event upload format',       type: 'select', options: ['Picture & Video', 'Video', 'Picture', 'None'], default: 'None' },
  { param: 'inCabinAudio', label: 'In-cabin audio alerts',     type: 'select', options: ['None', 'Beep', 'Voice alert'], default: 'None' },
  { param: 'triggerSpeed', label: 'Trigger speed (km/h)',      type: 'select', options: ['0', '10', '20', '30', '50', '70', '90'], default: '30' },
  { param: 'preEvent',     label: 'Pre-event duration (sec)',  type: 'select', options: ['5', '10', '15', '20', '25', '30'], default: '5' },
  { param: 'postEvent',    label: 'Post-event duration (sec)', type: 'select', options: ['5', '10', '15', '20', '25', '30'], default: '5' },
];
// Harsh-event parameters: a threshold (cm/s²) plus the recording params.
const HARSH_PARAMS = [
  { param: 'threshold',    label: 'Threshold',                 type: 'select', options: ['100 cm/s²', '150 cm/s²', '200 cm/s²', '250 cm/s²', '300 cm/s²', '350 cm/s²', '400 cm/s²'], default: '200 cm/s²' },
  { param: 'uploadFormat', label: 'Event upload format',       type: 'select', options: ['Picture & Video', 'Video', 'Picture', 'None'], default: 'None' },
  { param: 'inCabinAudio', label: 'In-cabin audio alerts',     type: 'select', options: ['None', 'Beep', 'Voice alert'], default: 'None' },
  { param: 'preEvent',     label: 'Pre-event duration (sec)',  type: 'select', options: ['5', '10', '15', '20', '25', '30'], default: '5' },
  { param: 'postEvent',    label: 'Post-event duration (sec)', type: 'select', options: ['5', '10', '15', '20', '25', '30'], default: '5' },
];
// "Basic Settings" block under Harsh events — six speed/threshold dropdowns.
const BASIC_SETTINGS_PARAMS = [
  { param: 'highBraking', label: 'High Speed Braking Threshold',     type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
  { param: 'highAccel',   label: 'High Speed Acceleration Threshold',type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
  { param: 'medBraking',  label: 'Medium Speed Braking Threshold',   type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
  { param: 'medAccel',    label: 'Medium Speed Acceleration Threshold',type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
  { param: 'lowBraking',  label: 'Low Speed Braking Threshold',      type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
  { param: 'lowAccel',    label: 'Low Speed Acceleration Threshold', type: 'select', options: ['Disabled', '0.20g', '0.30g', '0.40g', '0.50g'], default: 'Disabled' },
];
// Harsh-driving events (Queclink only; read-only in the UI). "Basic Settings" is a
// special item with its own parameter set and is on by default.
const HARSH_EVENTS = [
  { key: 'acceleration',  label: 'Harsh Acceleration', params: HARSH_PARAMS },
  { key: 'braking',       label: 'Harsh Braking',      params: HARSH_PARAMS },
  { key: 'cornering',     label: 'Harsh Cornering',    params: HARSH_PARAMS },
  { key: 'basicSettings', label: 'Basic Settings',     params: BASIC_SETTINGS_PARAMS, defaultOn: true },
];
// Overspeed alarm parameters (Queclink only; configurable).
const OVERSPEED_PARAMS = [
  { param: 'overSpeed',    label: 'Over Speed (km/h)',         type: 'select', options: ['40', '50', '60', '70', '80', '90', '100'], default: '60' },
  { param: 'validTime',    label: 'Valid Time (sec)',          type: 'select', options: ['30', '60', '90', '120'], default: '60' },
  { param: 'uploadFormat', label: 'Event upload format',       type: 'select', options: ['Picture & Video', 'Video', 'Picture', 'None'], default: 'None' },
  { param: 'inCabinAudio', label: 'In-cabin audio alerts',     type: 'select', options: ['None', 'Beep', 'Voice alert'], default: 'None' },
  { param: 'preEvent',     label: 'Pre-event duration (sec)',  type: 'select', options: ['5', '10', '15'], default: '5' },
  { param: 'postEvent',    label: 'Post-event duration (sec)', type: 'select', options: ['5', '10', '15'], default: '5' },
];

// Field-key builders: `dms_yawning_enabled`, `dms_yawning_sensitivity`, …
const eventEnabledKey = (sys, ev) => `${sys}_${ev}_enabled`;
const eventParamKey   = (sys, ev, param) => `${sys}_${ev}_${param}`;

// Per-channel field-key builders: `ch1_name`, `ch1_enabled`, `ch1_audio`, `ch1_rotation`.
const channelKey = (i, field) => `ch${i}_${field}`;

// Generate per-channel fields for every channel up to MAX_CHANNELS.
//   details:  name (text), enabled (toggle)  — platform-only, no device command
//   settings: audio (toggle), rotation (radio) — routed to audio / rotation subsystems
(function generateChannelFields() {
  for (let i = 1; i <= MAX_CHANNELS; i++) {
    // Role label is brand-specific (rendered in the UI); FIELD_META keeps a neutral label.
    DEFAULTS[channelKey(i, 'name')] = `Ch${i}`;
    DEFAULTS[channelKey(i, 'enabled')] = true;
    DEFAULTS[channelKey(i, 'audio')] = false;
    DEFAULTS[channelKey(i, 'rotation')] = 'none';

    FIELD_META[channelKey(i, 'name')]    = { label: `Channel ${i}`, tab: 'details', type: 'text', channelIndex: i };
    FIELD_META[channelKey(i, 'enabled')] = { label: `Channel ${i}`, tab: 'details', type: 'toggle', channelIndex: i };
    FIELD_META[channelKey(i, 'audio')]   = { label: `Ch${i}`, tab: 'settings', type: 'toggle', channelIndex: i, route: { sys: 'audio' } };
    FIELD_META[channelKey(i, 'rotation')]= { label: `Ch${i}`, tab: 'settings', type: 'radio', options: ROTATION_OPTIONS, channelIndex: i, route: { sys: 'rotation' } };
  }
})();

// Generate the flat field schema + defaults for every event × parameter.
(function generateEventFields() {
  const groups = [
    { sys: 'dms',   master: 'dmsEvents',   events: DMS_EVENTS,   params: EVENT_PARAMS },
    { sys: 'adas',  master: 'adasEvents',  events: ADAS_EVENTS,  params: EVENT_PARAMS },
    { sys: 'harsh', master: 'harshEvents', events: HARSH_EVENTS, params: HARSH_PARAMS },
  ];
  for (const g of groups) {
    for (const ev of g.events) {
      const enKey = eventEnabledKey(g.sys, ev.key);
      DEFAULTS[enKey] = ev.defaultOn || false;
      FIELD_META[enKey] = {
        label: ev.label, tab: 'security', type: 'toggle',
        parent: g.master, event: ev.key, isEventToggle: true,
        route: { sys: g.sys, event: ev.key, param: 'enabled' },
      };
      for (const p of (ev.params || g.params)) {
        const pKey = eventParamKey(g.sys, ev.key, p.param);
        DEFAULTS[pKey] = p.default;
        FIELD_META[pKey] = {
          label: `${ev.label} · ${p.label}`, tab: 'security', type: p.type,
          options: p.options, parent: enKey, event: ev.key, paramLabel: p.label,
          route: { sys: g.sys, event: ev.key, param: p.param },
        };
      }
    }
  }

  // Overspeed alarm — a single flat block (master toggle + params), Queclink only.
  for (const p of OVERSPEED_PARAMS) {
    const pKey = `overspeed_${p.param}`;
    DEFAULTS[pKey] = p.default;
    FIELD_META[pKey] = {
      label: p.label, tab: 'security', type: p.type, options: p.options,
      parent: 'overspeedEnabled', paramLabel: p.label,
      route: { sys: 'overspeed', event: 'overspeed', param: p.param },
    };
  }
})();

// Human labels for the per-event keys (used in Queclink's per-event AT+GTDSS titles).
const EVENT_LABELS = { master: 'All events', overspeed: 'Overspeed alarm' };
[...DMS_EVENTS, ...ADAS_EVENTS, ...HARSH_EVENTS].forEach(e => { EVENT_LABELS[e.key] = e.label; });

// ── Per-brand command routing ────────────────────────────────────
// The backend does NOT send one monolithic update on Save. It inspects which fields
// changed and emits one outbound command per command-group that contains at least one
// changed field. Each command = exactly one row in the activity history.
//
// `routeField(key)` returns the command a changed field belongs to, or null if the
// field is platform-only. Two fields that return the SAME `key` merge into ONE history
// row; different keys produce separate rows. The router is where Howen and Queclink
// diverge:
//
//   Howen    — SET_TIMEZONE (clock only) + one SET_CONFIG per subsystem. All DMS
//              events bundle into ONE dms-events command no matter how many were touched.
//   Queclink — AT-command protocol. AT+GTDSS is emitted once PER driver-safety event
//              type, so touching N events produces N rows. AT+GTREC conversely MERGES
//              recording, rotation and audio into a single row.
//
// NOTE: the prototype field set only exposes the on/off toggles for each event (not the
// per-event sensitivity / upload-format / pre-event sub-parameters from the full spec),
// so each event maps cleanly to a single command. The full spec would split a single
// event's sub-parameters across GTDSS + GTREC + GTVOL — see handoff.md.
const BRANDS = {
  Howen: {
    label: 'Howen',
    protocolFamily: 'SET_CONFIG / SET_TIMEZONE',
    deviceExample: 'https://mapon.com/partner/gbox_list/view/28245645',
    routeField(key) {
      const r = FIELD_META[key]?.route;
      if (!r) return null;
      switch (r.sys) {
        case 'timezone': return { key: 'set-timezone',    title: 'Camera clock update', protocol: 'SET_TIMEZONE' };
        case 'audio':    return { key: 'audio-recording', title: 'Audio recording',     protocol: 'SET_CONFIG · audio-recording' };
        case 'rotation': return { key: 'camera-rotation', title: 'Camera rotation',     protocol: 'SET_CONFIG · camera-rotation' };
        // All DMS / ADAS events — master + every sub-event — collapse to ONE command each.
        case 'dms':      return { key: 'dms-events',      title: 'DMS events',          protocol: 'SET_CONFIG · dms-events' };
        case 'adas':     return { key: 'adas-events',     title: 'ADAS events',         protocol: 'SET_CONFIG · adas-events' };
        // Wi-Fi, TTS, turn-off-events, overspeed and harsh are Queclink-only on this
        // prototype — Howen has no command for them.
        case 'wifi':     return null;
        case 'tts':      return null;
        case 'turnoff':  return null;
        case 'overspeed':return null;
        case 'harsh':    return null;
        default:         return null;
      }
    },
  },
  Queclink: {
    label: 'Queclink',
    protocolFamily: 'AT+GTxxx',
    deviceExample: 'https://mapon.com/partner/gbox_list/view/28432367',
    routeField(key) {
      const r = FIELD_META[key]?.route;
      if (!r) return null;
      switch (r.sys) {
        case 'timezone': return { key: 'gttma', title: 'Time adjustment',    protocol: 'AT+GTTMA' };
        // Recording, rotation and audio all MERGE into a single AT+GTREC row.
        case 'audio':
        case 'rotation': return { key: 'gtrec', title: 'Recording settings', protocol: 'AT+GTREC' };
        case 'wifi':     return { key: 'gtwfs', title: 'Wi-Fi settings',     protocol: 'AT+GTWFS' };
        case 'tts':      return { key: 'gtvol', title: 'Volume & voice',     protocol: 'AT+GTVOL' };
        case 'turnoff':  return { key: 'gtrec', title: 'Recording settings', protocol: 'AT+GTREC' };
        case 'harsh':    return { key: 'gthbm', title: 'Harsh behaviour',    protocol: 'AT+GTHBM' };
        case 'overspeed': {
          // Overspeed alarm splits like the safety events: alarm/speed/valid-time →
          // AT+GTOSP; upload/durations → AT+GTREC; in-cabin audio → AT+GTVOL.
          if (r.param === 'inCabinAudio') return { key: 'gtvol', title: 'Volume & voice', protocol: 'AT+GTVOL' };
          if (r.param === 'uploadFormat' || r.param === 'preEvent' || r.param === 'postEvent') {
            return { key: 'gtrec', title: 'Recording settings', protocol: 'AT+GTREC' };
          }
          return { key: 'gtosp', title: 'Overspeed alarm', protocol: 'AT+GTOSP' };
        }
        case 'dms':
        case 'adas': {
          // The master switch rides along with the recording command (turn-off-events).
          if (r.event === 'master' || r.param === 'master') return { key: 'gtrec', title: 'Recording settings', protocol: 'AT+GTREC' };
          // A SINGLE event's parameters split across three commands:
          //   in-cabin audio                       → AT+GTVOL  (merged across all events)
          //   upload format / pre-/post-event      → AT+GTREC  (merged across all events)
          //   enabled / sensitivity / trigger speed → AT+GTDSS  (one row PER event type)
          if (r.param === 'inCabinAudio') return { key: 'gtvol', title: 'Volume & voice', protocol: 'AT+GTVOL' };
          if (r.param === 'uploadFormat' || r.param === 'preEvent' || r.param === 'postEvent') {
            return { key: 'gtrec', title: 'Recording settings', protocol: 'AT+GTREC' };
          }
          const lbl = EVENT_LABELS[r.event] || r.event;
          return { key: `gtdss:${r.event}`, title: `Driver safety · ${lbl}`, protocol: 'AT+GTDSS' };
        }
        default: return null;
      }
    },
  },
};

const DEFAULT_BRAND = 'Howen';
const routerFor = (brand) => BRANDS[brand] || BRANDS[DEFAULT_BRAND];

// ── Per-brand UI shape ───────────────────────────────────────────
// Everything that differs between manufacturers in how the form RENDERS lives here,
// so the tab components stay declarative. (Command routing lives in BRANDS above.)
const BRAND_UI = {
  Howen: {
    channelRoles: ['Inward', 'Outward'],     // index → role label; beyond → "Channel N"
    channelNamePlaceholder: 'Custom name',
    clearChannelNames: false,
    audioPerChannel: true,                   // one audio toggle per channel
    rotationOptions: ROTATION_OPTIONS,       // 4 flips
    rotationLabel: 'channel',                // "Ch1", "Ch2"…
    showEventsRestriction: true,
    showVideoSharingBanner: false,
    showTts: false,
    showWifi: false,
    showOverspeed: false,
    showHarsh: false,
    eventsEditable: true,                    // DMS/ADAS toggles + params editable
    eventParams: ['sensitivity', 'uploadFormat', 'inCabinAudio', 'triggerSpeed', 'preEvent'], // no post-event
    dmsEvents: ['yawning', 'phone', 'smoking', 'eyesClosed', 'distracted', 'seatbelt'],
    adasEvents: ['pedestrian', 'headway', 'forwardCollision'],
    harshEvents: [],
  },
  Queclink: {
    channelRoles: ['Outward', 'Inward'],
    channelNamePlaceholder: 'Enter channel name',
    clearChannelNames: true,                 // names start empty (placeholder shown)
    audioPerChannel: false,                  // a single "Audio recording" toggle
    rotationOptions: ROTATION_OPTIONS_2,     // 2 flips
    rotationLabel: 'role',                   // "Outward", "Inward"
    showEventsRestriction: false,
    showVideoSharingBanner: true,
    showTts: true,
    showWifi: true,
    showOverspeed: true,
    showHarsh: true,
    eventsEditable: false,                   // DMS/ADAS/Harsh are read-only on Queclink
    eventParams: ['sensitivity', 'uploadFormat', 'inCabinAudio', 'triggerSpeed', 'preEvent', 'postEvent'],
    dmsEvents: ['yawning', 'phone', 'smoking', 'eyesClosed'],
    adasEvents: ['forwardCollision', 'headway'],
    harshEvents: ['acceleration', 'braking', 'cornering', 'basicSettings'],
  },
};
const brandUI = (brand) => BRAND_UI[brand] || BRAND_UI[DEFAULT_BRAND];

// Format a value for display. Handles booleans, rotation enums, etc.
function formatValue(key, value) {
  const meta = FIELD_META[key];
  if (!meta) return String(value);
  if (meta.type === 'toggle' || meta.type === 'checkbox') return value ? 'On' : 'Off';
  if (meta.type === 'sensitivity') return ({ low: 'Low', medium: 'Medium', high: 'High' })[value] || String(value);
  if (meta.type === 'radio') {
    const opt = (meta.options || []).find(([v]) => v === value);
    return opt ? opt[1] : String(value);
  }
  if (meta.type === 'password') return value ? '••••••••' : '—';
  return value === '' ? '—' : String(value);
}

// Activity history — static but realistic, structured around real device commands.
// Each entry = one outbound command (one Save can fan out into several entries at the
// same timestamp). `protocol` = the actual command string sent to the camera.
//
// Both lists describe the SAME user action — opening DMS ▸ Yawning and changing its
// Sensitivity, Event upload format and In-cabin audio alerts, plus enabling Phone usage,
// plus a timezone change — so the brand difference is obvious side-by-side:
//   • Howen: ALL of it collapses into ONE SET_CONFIG · dms-events row (+ the clock row).
//   • Queclink: that ONE event (Yawning) alone splits across THREE commands
//     (AT+GTDSS sensitivity, AT+GTREC upload format, AT+GTVOL audio); Phone usage is a
//     second AT+GTDSS; the clock is AT+GTTMA. Same intent, very different history.
const ACTIVITY_BY_BRAND = {
  Howen: [
    // ── 28 May: one save → 2 commands (Howen bundles every DMS field) ──────────
    {
      id: 'hw-1',
      title: 'DMS events',
      protocol: 'SET_CONFIG · dms-events',
      changes: [
        { label: 'Yawning',                       diff: 'Off → On' },
        { label: 'Yawning · Sensitivity',         diff: 'Medium → High' },
        { label: 'Yawning · Event upload format', diff: 'Picture & Video → Video' },
        { label: 'Yawning · In-cabin audio alerts', diff: 'None → Beep' },
        { label: 'Phone usage',                   diff: 'Off → On' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },
    {
      id: 'hw-2',
      title: 'Camera clock update',
      protocol: 'SET_TIMEZONE',
      changes: [
        { label: 'Timezone', diff: 'Etc/GMT (+00:00) → Europe/Riga (+02:00)' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },

    // ── 24 May: one save → 1 command ──────────────────────────────────────────
    {
      id: 'hw-3',
      title: 'ADAS events',
      protocol: 'SET_CONFIG · adas-events',
      changes: [
        { label: 'Pedestrian detection alert',               diff: 'Off → On' },
        { label: 'Pedestrian detection alert · Sensitivity', diff: 'Medium → High' },
        { label: 'Pedestrian detection alert · Trigger speed (km/h)', diff: '30 → 70' },
      ],
      when: '24 May, 14:12',
      status: 'applied',
    },

    // ── 19 May: one save → 1 command ──────────────────────────────────────────
    {
      id: 'hw-4',
      title: 'Audio recording',
      protocol: 'SET_CONFIG · audio-recording',
      changes: [
        { label: 'Ch1', diff: 'On → Off' },
      ],
      when: '19 May, 08:44',
      status: 'applied',
    },
  ],

  Queclink: [
    // ── 28 May: SAME user action as Howen above → 5 commands ───────────────────
    // ONE event (Yawning) splits across GTDSS + GTREC + GTVOL; Phone usage is its own GTDSS.
    {
      id: 'qc-1',
      title: 'Driver safety · Yawning',
      protocol: 'AT+GTDSS',
      changes: [
        { label: 'Yawning',     diff: 'Off → On' },
        { label: 'Sensitivity', diff: 'Medium → High' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },
    {
      id: 'qc-2',
      title: 'Driver safety · Phone usage',
      protocol: 'AT+GTDSS',
      changes: [
        { label: 'Phone usage', diff: 'Off → On' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },
    {
      // Upload format / pre-event durations of ALL events merge here.
      id: 'qc-3',
      title: 'Recording settings',
      protocol: 'AT+GTREC',
      changes: [
        { label: 'Yawning · Event upload format', diff: 'Picture & Video → Video' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },
    {
      // In-cabin audio alerts of ALL events merge here.
      id: 'qc-4',
      title: 'Volume & voice',
      protocol: 'AT+GTVOL',
      changes: [
        { label: 'Yawning · In-cabin audio alerts', diff: 'None → Beep' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },
    {
      id: 'qc-5',
      title: 'Time adjustment',
      protocol: 'AT+GTTMA',
      changes: [
        { label: 'Timezone', diff: 'Etc/GMT (+00:00) → Europe/Riga (+02:00)' },
      ],
      when: '28 May, 11:26',
      status: 'applied',
    },

    // ── 25 May: one save → 1 command ──────────────────────────────────────────
    {
      id: 'qc-6',
      title: 'Wi-Fi settings',
      protocol: 'AT+GTWFS',
      changes: [
        { label: 'SSID', diff: 'Fleet-Cam-2 → Fleet-Cam-3333' },
      ],
      when: '25 May, 09:04',
      status: 'applied',
    },

    // ── 20 May: one save → 1 command (TTS lives in the volume command) ─────────
    {
      id: 'qc-7',
      title: 'Volume & voice',
      protocol: 'AT+GTVOL',
      changes: [
        { label: 'Voice alert language', diff: 'English (UK) → Latviešu' },
      ],
      when: '20 May, 16:30',
      status: 'applied',
    },
  ],
};

// Default activity list (used where no brand is supplied, e.g. shell defaults).
const ACTIVITY = ACTIVITY_BY_BRAND[DEFAULT_BRAND];

Object.assign(window, {
  DEFAULTS, FIELD_META, EVENT_LABELS, BRANDS, DEFAULT_BRAND, routerFor, BRAND_UI, brandUI,
  DMS_EVENTS, ADAS_EVENTS, HARSH_EVENTS, EVENT_PARAMS, HARSH_PARAMS, OVERSPEED_PARAMS, BASIC_SETTINGS_PARAMS,
  eventEnabledKey, eventParamKey,
  MAX_CHANNELS, channelRole, channelKey, ROTATION_OPTIONS, ROTATION_OPTIONS_2,
  formatValue, ACTIVITY, ACTIVITY_BY_BRAND,
});
