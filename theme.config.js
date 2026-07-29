/** @type {const} */
const themeColors = {
  // ── Àmàlà Olúyòlé brand palette (from logo) ─────────────────────────────
  // Navy   #201060  — pot, border frame, wordmark (dominant brand colour)
  // Red    #D02010  — chef apron (CTA / accent)
  // Yellow #F0F000  — chef hat (badge / highlight)
  // White  #FFFFFF  — logo background (app background)

  primary:    { light: '#201060', dark: '#3D2FA0' },   // logo navy — buttons, active tabs, headings
  background: { light: '#FFFFFF', dark: '#0D0A2E' },   // white / deep navy night
  surface:    { light: '#F4F3FB', dark: '#1A1640' },   // very light lavender card / dark navy card
  foreground: { light: '#201060', dark: '#EDE9FF' },   // navy text on white / near-white on dark
  muted:      { light: '#6B6490', dark: '#9B94C4' },   // muted navy-purple for secondary text
  border:     { light: '#D8D4EE', dark: '#2E2860' },   // soft lavender border
  success:    { light: '#22C55E', dark: '#4ADE80' },
  warning:    { light: '#F0C000', dark: '#F5D020' },   // logo yellow — badges, highlights
  error:      { light: '#D02010', dark: '#E8321F' },   // logo red — errors
  accent:     { light: '#D02010', dark: '#E8321F' },   // logo red — primary CTA buttons
  gold:       { light: '#F0C000', dark: '#F5D020' },   // logo yellow
  card:       { light: '#FFFFFF', dark: '#1A1640' },
  tint:       { light: '#D02010', dark: '#E8321F' },   // tab bar active tint = logo red
};

module.exports = { themeColors };

