// Camera configuration — data model
// Three tabs, each with a flat field schema so the state machine can diff them.

const DEFAULTS = {
  // Camera details
  brand: 'Quicklink',
  vehicle: 'KP 2356',
  cameraName: 'Mercedes 123',
  channel1Name: 'Custom name 1',
  channel1Enabled: true,
  channel2Name: 'Driver cabin',
  channel2Enabled: false,
  remoteAccess: false,

  // Camera settings
  timezone: 'Etc/GMT (+00:00)',
  audioRecording: true,
  ttsLanguage: 'English (UK)',
  channel1Rotation: 'none',      // 'none' | 'vertical'
  channel2Rotation: 'none',
  wifiEnabled: true,
  wifiSsid: 'Mapon-Cam-3333',
  wifiPassword: '',

  // Camera security
  disableNotifications: false,
  driverPrivacy: false,
  dmsEvents: false,
  dmsYawning: false,
  dmsPhone: false,
  dmsSmoking: false,
  dmsEyesClosed: false,
  adasEvents: false,
  adasForwardCollision: false,
};

// Field metadata — used to render diff chips, pending summaries, etc.
const FIELD_META = {
  brand: { label: 'Camera brand', tab: 'details', type: 'text', readOnly: true },
  vehicle: { label: 'Assigned vehicle', tab: 'details', type: 'select', options: ['KP 2356', 'KP 2357', 'AB 1234', 'CD 5678'] },
  cameraName: { label: 'Camera name', tab: 'details', type: 'text' },
  channel1Name: { label: 'Channel 1 · Outside', tab: 'details', type: 'text' },
  channel1Enabled: { label: 'Channel 1 · Outside', tab: 'details', type: 'toggle' },
  channel2Name: { label: 'Channel 2 · Inside', tab: 'details', type: 'text' },
  channel2Enabled: { label: 'Channel 2 · Inside', tab: 'details', type: 'toggle' },
  remoteAccess: { label: 'Remote recording access for admins', tab: 'details', type: 'checkbox' },

  timezone: { label: 'Timezone', tab: 'settings', type: 'select', options: ['Etc/GMT (+00:00)', 'Europe/Riga (+02:00)', 'Europe/Helsinki (+02:00)', 'Pacific/Niue (-11:00)', 'America/New_York (-05:00)'] },
  audioRecording: { label: 'Audio recording', tab: 'settings', type: 'toggle' },
  ttsLanguage: { label: 'Voice alert language', tab: 'settings', type: 'select', options: ['English (UK)', 'English (US)', 'Latviešu', 'Eesti', 'Suomi', 'Русский'] },
  channel1Rotation: { label: 'Channel 1 rotation', tab: 'settings', type: 'radio', options: [['none','No rotation'], ['vertical','Vertical flip']] },
  channel2Rotation: { label: 'Channel 2 rotation', tab: 'settings', type: 'radio', options: [['none','No rotation'], ['vertical','Vertical flip']] },
  wifiEnabled: { label: 'Enable Wi-Fi', tab: 'settings', type: 'toggle' },
  wifiSsid: { label: 'SSID', tab: 'settings', type: 'text' },
  wifiPassword: { label: 'Password', tab: 'settings', type: 'password' },

  disableNotifications: { label: 'Disable camera notifications', tab: 'security', type: 'toggle' },
  driverPrivacy: { label: 'Enable driver privacy mode', tab: 'security', type: 'toggle' },
  dmsEvents: { label: 'DMS events', tab: 'security', type: 'toggle', group: true },
  dmsYawning: { label: 'Yawning', tab: 'security', type: 'toggle', parent: 'dmsEvents' },
  dmsPhone: { label: 'Phone use', tab: 'security', type: 'toggle', parent: 'dmsEvents' },
  dmsSmoking: { label: 'Smoking', tab: 'security', type: 'toggle', parent: 'dmsEvents' },
  dmsEyesClosed: { label: 'Eyes closed', tab: 'security', type: 'toggle', parent: 'dmsEvents' },
  adasEvents: { label: 'ADAS events', tab: 'security', type: 'toggle', group: true },
  adasForwardCollision: { label: 'Forward collision warning', tab: 'security', type: 'toggle', parent: 'adasEvents' },
};

// Format a value for display. Handles booleans, rotation enums, etc.
function formatValue(key, value) {
  const meta = FIELD_META[key];
  if (!meta) return String(value);
  if (meta.type === 'toggle' || meta.type === 'checkbox') return value ? 'On' : 'Off';
  if (meta.type === 'radio') {
    const opt = (meta.options || []).find(([v]) => v === value);
    return opt ? opt[1] : String(value);
  }
  if (meta.type === 'password') return value ? '••••••••' : '—';
  return value === '' ? '—' : String(value);
}

// Activity history — static but realistic
const ACTIVITY = [
  { id: 1, title: 'Timezone changed', diff: 'Europe/Riga → Pacific/Niue', when: '13 Nov, 11:26', status: 'applied' },
  { id: 2, title: 'DMS events updated', diff: 'Yawning: Off → On', when: '13 Nov, 11:26', status: 'applied' },
  { id: 3, title: 'Privacy mode enabled', diff: 'Off → On', when: '13 Nov, 11:26', status: 'applied' },
  { id: 4, title: 'Wi-Fi SSID changed', diff: 'Mapon-Cam-2 → Mapon-Cam-3333', when: '12 Nov, 09:04', status: 'applied' },
  { id: 5, title: 'Audio recording enabled', diff: 'Off → On', when: '08 Nov, 14:12', status: 'applied' },
];

Object.assign(window, { DEFAULTS, FIELD_META, formatValue, ACTIVITY });
