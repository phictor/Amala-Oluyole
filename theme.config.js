/** @type {const} */
const themeColors = {
  // Brand colours from the Àmàlà Olúyòlé logo
  // Primary  = deep navy-indigo (#1E1060) — pot, border, wordmark
  // Red      = vivid red (#D02010)        — chef apron / CTA
  // Gold     = golden yellow (#F0C000)    — chef hat / badges
  primary:    { light: '#1E1060', dark: '#3D2FA0' },   // logo navy-indigo
  background: { light: '#FFFFFF', dark: '#0E0B2A' },   // white / deep navy night
  surface:    { light: '#F0EEF9', dark: '#1A1640' },   // light lavender / dark navy card
  foreground: { light: '#1E1060', dark: '#EDE9FF' },   // navy text / near-white
  muted:      { light: '#6B6490', dark: '#9B94C4' },   // muted navy-purple
  border:     { light: '#D8D4EE', dark: '#2E2860' },   // soft lavender border
  success:    { light: '#22C55E', dark: '#4ADE80' },
  warning:    { light: '#F0C000', dark: '#F5D020' },   // logo golden yellow
  error:      { light: '#D02010', dark: '#E8321F' },   // logo red
  accent:     { light: '#D02010', dark: '#E8321F' },   // logo red (apron) — CTA colour
  gold:       { light: '#F0C000', dark: '#F5D020' },   // logo golden yellow
  card:       { light: '#FFFFFF', dark: '#1A1640' },
};

module.exports = { themeColors };
