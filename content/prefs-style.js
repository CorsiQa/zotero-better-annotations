/* Better Annotations – styles of the settings page
 *
 * Injected by PaneController.injectStyle(). Colors use Zotero's theme
 * variables, so light and dark mode follow Zotero.
 */

/* global BetterAnnotations */

BetterAnnotations.PREFS_CSS = `
#bac-root { position: relative; max-width: 760px;
  --bac-border: var(--fill-quinary, rgba(127,127,127,.28));
  /* Lines of cards and rows: visible in light and dark mode */
  --bac-line: color-mix(in srgb, var(--fill-primary, #000) 15%, transparent);
  /* Head of a card: a lighter gray than the window, darker than the body */
  --bac-head: color-mix(in srgb, var(--fill-primary, #000) 2.5%, var(--material-background, #fff));
  --bac-pad: 14px;
  --bac-muted: var(--fill-secondary, #777);
  --bac-bg: var(--material-background, #fff);
  --bac-raise: var(--material-sidepane, #f6f6f6);
  --bac-accent: var(--accent-blue, #2e7bd1); }
#bac-root .bac-section { margin-bottom: 14px; }
#bac-root .bac-intro { margin: 0 0 10px; color: var(--bac-muted); line-height: 1.45; }
#bac-root .bac-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 8px; }
#bac-root .bac-bar > button, #bac-root .bac-bar > menulist, #bac-root .bac-logrow > button, #bac-root .bac-opt > menulist { margin: 0; }
#bac-root .bac-end { justify-content: flex-end; }
#bac-root .bac-text { width: 12em; font: inherit; padding: 2px 5px; }
#bac-root.bac-busy, #bac-root.bac-busy * { cursor: progress !important; }
#bac-root .bac-logrow { display: flex; align-items: center; gap: 8px; }
#bac-root .bac-logtext { flex: 1; min-width: 0; line-height: 1.4; }
#bac-root .bac-undone .bac-logtext { opacity: .55; text-decoration: line-through; }
#bac-root .bac-undone-label { margin: 0; }
#bac-root .bac-popover { position: absolute; z-index: 20; width: 340px; padding: 6px; border-radius: 6px; box-sizing: border-box;
  background: var(--bac-raise); border: 1px solid var(--bac-border); box-shadow: 0 10px 30px rgba(0,0,0,.25); }
#bac-root .bac-pal-row { display: flex; align-items: center; gap: 10px; padding: 5px 6px; border-radius: 5px; cursor: pointer; }
#bac-root .bac-pal-row:hover { background: color-mix(in srgb, var(--bac-accent) 14%, transparent); }
#bac-root .bac-pal-title { width: 6em; flex: none; }
#bac-root .bac-mini { display: flex; gap: 2px; }
#bac-root .bac-mini > span { width: 14px; height: 14px; border-radius: 3px; box-sizing: border-box; border: 1px solid rgba(0,0,0,.15); }
#bac-root .bac-pop-hint { margin: 6px 6px 2px; }
#bac-root .bac-order { justify-content: space-between; }
#bac-root .bac-order .bac-pal-name { margin: 0; }
#bac-root .bac-segs { display: inline-flex; border: 1px solid var(--bac-border); border-radius: 6px; overflow: hidden; }
#bac-root .bac-seg { -moz-appearance: none; appearance: none; border: none; margin: 0; min-width: 0; padding: 2px 9px; font: inherit; font-size: 11px;
  background: transparent; color: inherit; cursor: pointer; }
#bac-root .bac-seg-on { background: var(--bac-accent); color: #fff; }
#bac-root .bac-palettes { display: flex; flex-direction: column; gap: 6px; }
#bac-root .bac-profile-menu { min-width: 240px; margin-inline-start: 0; }
#bac-root .bac-notice { margin: 4px 0 8px; padding: 7px 10px; border-radius: 6px; line-height: 1.4;
  background: color-mix(in srgb, var(--bac-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--bac-accent) 30%, transparent); }
#bac-root .bac-list { position: relative; display: flex; flex-direction: column; gap: 3px; }
#bac-root .bac-row { position: relative; display: flex; align-items: flex-start; gap: 8px; padding: 3px 6px;
  border-radius: 5px; border: 1px solid transparent; background: var(--bac-bg); box-sizing: border-box;
  transition: opacity 180ms ease, height 180ms ease, margin 180ms ease, padding 180ms ease, box-shadow 160ms ease; }
#bac-root .bac-row:hover { border-color: var(--bac-border); }
#bac-root .bac-row.bac-sub-start { margin-top: 13px; }
#bac-root .bac-row.bac-sub-start::before { content: ""; position: absolute; left: 4px; right: 4px; top: -9px;
  border-top: 1px solid var(--bac-border); pointer-events: none; }
#bac-root .bac-row.bac-off .bac-swatch { opacity: .35; }
#bac-root .bac-row.bac-off .bac-label:not(:focus):not(.bac-empty) { color: var(--bac-muted); text-decoration: line-through; }
#bac-root .bac-row.bac-dragging { z-index: 5; border-color: var(--bac-accent); box-shadow: 0 8px 22px rgba(0,0,0,.22);
  background: var(--bac-raise); }
#bac-root .bac-row.bac-enter { opacity: 0; transform: translateY(-6px); }
#bac-root .bac-row.bac-removing { opacity: 0; height: 0 !important; padding-top: 0; padding-bottom: 0; margin-top: -3px; overflow: hidden; }
#bac-root .bac-row.bac-duplicate .bac-swatch { outline: 2px solid #d14; outline-offset: 1px; }
#bac-root .bac-handle { cursor: grab; user-select: none; color: var(--bac-muted); font-size: 16px; line-height: 1; padding: 2px; touch-action: none; }
#bac-root .bac-dragging .bac-handle { cursor: grabbing; }
#bac-root .bac-visible { margin: 0; }
#bac-root .bac-pos { width: 1.5em; text-align: right; color: var(--bac-muted); font-variant-numeric: tabular-nums; font-size: 12px; }
#bac-root .bac-swatch, #bac-root .bac-preset { -moz-appearance: none !important; appearance: none !important;
  background-image: none !important; padding: 0 !important; margin: 0; cursor: pointer; flex: none; box-sizing: border-box;
  border: 1px solid rgba(0,0,0,.2) !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); min-width: 0; min-height: 0; }
#bac-root .bac-swatch { width: 30px; height: 22px; border-radius: 5px; }
#bac-root .bac-swatch:hover, #bac-root .bac-preset:hover { transform: scale(1.1); }
#bac-root .bac-label { flex: 1; min-width: 0; font: inherit; height: 24px; min-height: 0; box-sizing: border-box; padding: 0 7px; line-height: 22px; border-radius: 5px; margin: 0;
  border: 1px solid var(--bac-border); background: var(--bac-bg); color: inherit; }
#bac-root .bac-label.bac-empty:not(:focus) { background: transparent; }
#bac-root .bac-label::placeholder { color: var(--bac-muted); opacity: .6; font-style: italic; }
#bac-root .bac-label:focus::placeholder { color: transparent; }
#bac-root .bac-label:focus { outline: 2px solid color-mix(in srgb, var(--bac-accent) 55%, transparent); outline-offset: 0; }
#bac-root .bac-handle, #bac-root .bac-pos, #bac-root .bac-usage { height: 24px; box-sizing: border-box; display: inline-flex; align-items: center; }
#bac-root .bac-pos, #bac-root .bac-usage { justify-content: flex-end; }
#bac-root .bac-visible { margin-top: 5px !important; }
#bac-root .bac-swatch { margin-top: 1px !important; }
#bac-root .bac-del { margin-top: 0 !important; }
#bac-root .bac-labelcol { flex: 1; min-width: 0; display: flex; flex-direction: column; }
#bac-root .bac-labelcol .bac-label { flex: none; }
#bac-root .bac-desc { display: block; box-sizing: border-box; width: 100%; min-height: 0; margin: 2px 0 0; padding: 3px 7px;
  resize: none; overflow: hidden; border: 1px solid transparent; border-radius: 5px; background: transparent;
  color: var(--bac-muted); font: inherit; font-size: 12px; line-height: 1.4; }
#bac-root .bac-desc:not(:focus) { max-height: calc(3 * 1.4em + 8px); }
#bac-root .bac-desc::placeholder { color: var(--bac-muted); font-style: italic; opacity: .75; }
#bac-root .bac-desc:hover { border-color: var(--bac-border); }
#bac-root .bac-desc:focus { color: inherit; background: var(--bac-bg); border-color: var(--bac-border);
  outline: 2px solid color-mix(in srgb, var(--bac-accent) 55%, transparent); outline-offset: 0; }
#bac-root .bac-indent { padding-inline-start: 22px; }
/* Other profiles with this color; fixed width, so all label fields are equally wide */
#bac-root .bac-shared { height: 24px; width: 2.4em; flex: none; display: inline-flex; align-items: center; justify-content: flex-end; gap: 2px; margin-inline-start: -2px;
  font-size: 11px; color: var(--bac-muted); font-variant-numeric: tabular-nums; }
#bac-root .bac-shared[hidden] { display: inline-flex; visibility: hidden; }
#bac-root .bac-usage { gap: 2px; font-size: 11px; color: var(--bac-muted); width: 2.6em; text-align: right; font-variant-numeric: tabular-nums; }
#bac-root .bac-del { -moz-appearance: none; appearance: none; border: none; background: transparent; color: var(--bac-muted);
  cursor: pointer; font-size: 12px; width: 24px; height: 24px; border-radius: 50%; padding: 0; margin: 0; min-width: 0; }
#bac-root .bac-del:hover:not(:disabled) { background: rgba(220,40,60,.12); color: #d14; }
#bac-root .bac-del:disabled { opacity: .25; cursor: default; }
#bac-root .bac-actions { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--bac-border); }
#bac-root .bac-savebar:not(.bac-actions-dirty) { display: none; }
#bac-root .bac-savebar.bac-actions-dirty { position: sticky; bottom: 0; z-index: 4; flex-wrap: nowrap; margin: 4px 0 0; padding: 8px 15px;
  border-radius: 6px; background: var(--bac-head); border: 1px solid var(--bac-line); box-shadow: 0 -4px 14px rgba(0,0,0,.12); }
#bac-root .bac-actions-dirty .bac-spacer { min-width: 0; }
#bac-root .bac-actions-dirty .bac-status { font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#bac-root .bac-actions-dirty .bac-save { -moz-appearance: none; appearance: none; background: var(--bac-accent); color: #fff;
  border: 1px solid transparent; border-radius: 5px; padding: 3px 12px; }
#bac-root .bac-actions-dirty .bac-save:hover { background: color-mix(in srgb, var(--bac-accent) 85%, #000); }
#bac-root .bac-spacer { flex: 1; }
#bac-root .bac-status { color: #c77700; font-size: 12px; margin-inline-end: 4px; }
#bac-root .bac-opt { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 4px 0; }
#bac-root .bac-number { width: 4.5em; font: inherit; padding: 2px 4px; }
#bac-root .bac-hint { color: var(--bac-muted); font-size: 12px; margin: 0 0 6px; line-height: 1.45; }
#bac-root .bac-path { user-select: text; font-size: 11px; word-break: break-all; }
#bac-root .bac-picker { position: absolute; z-index: 20; width: 264px; padding: 10px; border-radius: 6px;
  background: var(--bac-raise); border: 1px solid var(--bac-border); box-shadow: 0 10px 30px rgba(0,0,0,.25);
  display: flex; flex-direction: column; gap: 8px; }
#bac-root .bac-sv { position: relative; height: 140px; border-radius: 6px; cursor: crosshair; touch-action: none;
  background-image: linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)); }
#bac-root .bac-hue { position: relative; height: 12px; border-radius: 6px; cursor: pointer; touch-action: none;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
#bac-root .bac-knob { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.4); pointer-events: none; box-sizing: border-box; }
#bac-root .bac-hue .bac-knob { top: 50%; }
#bac-root .bac-prow { display: flex; align-items: center; gap: 6px; }
#bac-root .bac-preview { display: flex; width: 38px; height: 24px; border-radius: 5px; overflow: hidden; border: 1px solid rgba(0,0,0,.18); flex: none; }
#bac-root .bac-preview > span { flex: 1; }
#bac-root .bac-hexin { flex: 1; min-width: 0; font-family: ui-monospace, Menlo, Consolas, monospace; padding: 3px 6px; margin: 0;
  border-radius: 5px; border: 1px solid var(--bac-border); background: var(--bac-bg); color: inherit; }
#bac-root .bac-pal-name { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--bac-muted); margin-bottom: 3px; }
#bac-root .bac-presets { display: grid; grid-template-columns: repeat(12, 18px); gap: 3px; }
#bac-root .bac-preset { width: 18px; height: 18px; border-radius: 4px; }
#bac-root .bac-preset.bac-current { outline: 2px solid var(--bac-accent); outline-offset: 1px; }
#bac-root .bac-warn { color: #d14; font-size: 11px; }
#bac-root .bac-native { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
#bac-root { max-width: 820px; }
#bac-root .bac-header { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 12px; border-radius: 6px;
  border: 1px solid var(--bac-line);
  background: linear-gradient(135deg, color-mix(in srgb, #ffd400 14%, var(--bac-bg)), color-mix(in srgb, #2ea8e5 12%, var(--bac-bg)) 55%, color-mix(in srgb, #e56eee 12%, var(--bac-bg))); }
#bac-root .bac-logo { width: 46px; height: 46px; flex: none; }
#bac-root .bac-head-main { flex: 1; min-width: 0; }
#bac-root .bac-head-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
#bac-root .bac-name { font-size: 16px; font-weight: 700; }
#bac-root .bac-version { font-size: 12px; padding: 1px 7px; border-radius: 10px; background: var(--bac-raise); border: 1px solid var(--bac-border);
  font-variant-numeric: tabular-nums; }
#bac-root .bac-badge { font-size: 11px; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
#bac-root .bac-badge[hidden] { display: none; }
#bac-root .bac-badge-ok { background: color-mix(in srgb, #2f9e44 18%, transparent); color: #237032; }
#bac-root .bac-badge-warn { background: color-mix(in srgb, #f08c00 20%, transparent); color: #a35f00; }
#bac-root .bac-badge-err { background: color-mix(in srgb, #e03131 16%, transparent); color: #b02525; }
#bac-root .bac-badge-busy { background: color-mix(in srgb, var(--bac-accent) 16%, transparent); color: var(--bac-accent); }
#bac-root .bac-tagline { color: var(--bac-muted); margin-top: 3px; }
#bac-root .bac-head-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
#bac-root .bac-head-side > button { margin: 0; }
#bac-root .bac-lang-row { display: flex; align-items: center; gap: 4px; color: var(--bac-muted); }
#bac-root .bac-lang { margin: 0; min-width: 0; }
#bac-root .bac-tabs { display: flex; gap: 4px; padding: 4px; margin-bottom: 12px; border-radius: 6px; background: var(--bac-head);
  border: 1px solid var(--bac-line); }
#bac-root .bac-tab { -moz-appearance: none; appearance: none; flex: 1; margin: 0; min-width: 0; padding: 6px 10px; border: none; border-radius: 4px;
  background: transparent; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#bac-root .bac-tab:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
#bac-root .bac-tab-on { background: var(--bac-bg); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
#bac-root .bac-tab-dirty::after { content: " ●"; color: #c77700; }
#bac-root .bac-panel[hidden] { display: none; }
/* Cards: framed all around, radius as in Zotero (5px); head in a light gray
   with title, “i” and a short description; rows with lines across the width */
#bac-root .bac-card { position: relative; margin-bottom: 12px; border-radius: 6px; border: 1px solid var(--bac-line);
  background: var(--material-background, #fff); overflow: hidden; }
#bac-root .bac-card-head { padding: 9px var(--bac-pad); background: var(--bac-head); }
#bac-root .bac-card-title { display: flex; align-items: center; gap: 6px; min-height: 20px; }
#bac-root .bac-card-title h3 { margin: 0; font-size: 13px; font-weight: 700; }
#bac-root .bac-card-desc { margin-top: 2px; color: var(--bac-muted); font-size: 12px; line-height: 1.4; }
#bac-root .bac-card-body { padding: 0 var(--bac-pad) 2px; }
#bac-root .bac-card-body[hidden] { display: none; }
/* Rows: every element of the body (and of boxes and option lists) except hints */
#bac-root .bac-card-body > :not(.bac-hint):not(.bac-box):not(.bac-notice):not(.bac-library),
#bac-root .bac-box > :not(.bac-hint):not(.bac-notice),
#bac-root .bac-hint-row {
  margin: 0 calc(-1 * var(--bac-pad)); padding: 8px var(--bac-pad); border-top: 1px solid var(--bac-line); box-sizing: border-box; }
#bac-root .bac-box { display: block; margin: 0; padding: 0; }
#bac-root .bac-optrow { display: block; }
/* Several bars that belong together: one row, no line between them */
#bac-root .bac-stack { display: flex; flex-direction: column; gap: 6px; }
#bac-root .bac-stack > .bac-bar { margin: 0; padding: 0; border: 0; }
#bac-root .bac-spacer { flex: 1; }
#bac-root .bac-optrow > checkbox, #bac-root .bac-optrow > button, #bac-root .bac-optrow > menulist { margin: 0; }
/* Options that belong together: one row, no lines between them */
#bac-root .bac-checks { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
#bac-root .bac-checks > * { margin: 0; }
#bac-root .bac-checks > .bac-hint { margin: -3px 0 2px; padding-inline-start: 22px; }
/* A text of several paragraphs: one row */
#bac-root .bac-prose > p { margin: 0 0 6px; }
#bac-root .bac-prose > :last-child { margin-bottom: 0; }
/* A hint explains the row above it */
#bac-root .bac-card-body > .bac-hint:not(.bac-hint-row), #bac-root .bac-box > .bac-hint:not(.bac-hint-row) { margin: -4px 0 0; padding-bottom: 8px; }
#bac-root .bac-card .bac-bar { flex-wrap: wrap; }
#bac-root .bac-card-body .bac-notice { margin: 8px 0; }
#bac-root .bac-card-body .bac-library { margin: 8px 0; }
#bac-root .bac-card-body > .bac-credits { list-style: none; }
#bac-root .bac-credits > li { margin: 2px 0; }
/* Label left, control right-aligned with one width for all menus (like the
   settings of the operating systems) */
#bac-root .bac-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; --bac-ctl: 220px; }
#bac-root .bac-field-label { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
#bac-root .bac-field > menulist, #bac-root .bac-field > .bac-slot { justify-self: end; width: var(--bac-ctl); max-width: 100%; margin: 0; min-width: 0; }
#bac-root .bac-field > .bac-slot > menulist { width: 100%; margin: 0; min-width: 0; }
#bac-root .bac-field > .bac-stepper, #bac-root .bac-field > input { justify-self: end; margin: 0; }
#bac-root .bac-inline { display: flex; align-items: center; justify-content: flex-end; gap: 6px; min-width: 0; }
#bac-root .bac-inline > menulist { width: var(--bac-ctl); min-width: 0; margin: 0; }
#bac-root .bac-inline > button { margin: 0; }
#bac-root .bac-scope > checkbox { justify-self: end; }
/* Number with − and +: one framed control in the colors of the cards */
#bac-root .bac-stepper { display: inline-flex; align-items: stretch; height: 24px; box-sizing: border-box; border-radius: 5px; overflow: hidden;
  border: 1px solid var(--bac-line); background: var(--material-background, #fff); }
#bac-root .bac-stepper:focus-within { outline: 2px solid var(--bac-accent); outline-offset: 1px; }
#bac-root .bac-step-btn { -moz-appearance: none; appearance: none; display: inline-flex; align-items: center; justify-content: center;
  width: 24px; min-width: 0; height: auto; min-height: 0; margin: 0; padding: 0; border: none; border-radius: 0;
  background: var(--bac-head); color: inherit; cursor: pointer; }
#bac-root .bac-step-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--fill-primary, #000) 8%, var(--material-background, #fff)); }
#bac-root .bac-step-btn:disabled { color: var(--bac-muted); opacity: .45; cursor: default; }
#bac-root .bac-step-val { -moz-appearance: textfield; appearance: textfield; width: 3.2ch; height: auto; min-height: 0; margin: 0; padding: 0 4px;
  line-height: 22px; border: none; border-radius: 0; box-sizing: content-box;
  border-inline: 1px solid var(--bac-line); text-align: center; font: inherit; font-variant-numeric: tabular-nums; background: transparent; color: inherit; outline: none; }
#bac-root .bac-scope > checkbox { margin: 0; }
/* Small, quiet “i”; stronger on hover and focus */
#bac-root .bac-info { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 13px; height: 13px; flex: none;
  box-sizing: border-box; border-radius: 50%; border: 1px solid currentColor; color: var(--bac-muted);
  font: italic 700 8.5px/1 Georgia, serif; cursor: help; user-select: none; }
#bac-root .bac-info:hover, #bac-root .bac-info:focus { color: var(--bac-accent); outline: none; }
#bac-root .bac-info:focus-visible { outline: 2px solid var(--bac-accent); outline-offset: 1px; }
#bac-root .bac-info-pop { display: none; position: fixed; z-index: 1000; width: 330px; padding: 10px 12px;
  border-radius: 6px; background: var(--bac-raise); color: var(--fill-primary, CanvasText); border: 1px solid var(--bac-border);
  box-shadow: 0 6px 20px rgba(0,0,0,.22); font: 12px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; font-style: normal; font-weight: normal;
  cursor: default; white-space: normal; text-align: left; }
#bac-root .bac-info:hover .bac-info-pop, #bac-root .bac-info:focus .bac-info-pop { display: block; }
#bac-root .bac-info-par { display: block; white-space: pre-line; }
#bac-root .bac-info-par + .bac-info-par { margin-top: 7px; }
#bac-root .bac-sub { margin-top: 8px; }
#bac-root .bac-about-text { margin: 0 0 6px; line-height: 1.5; }
#bac-root .bac-credits { margin: 4px 0 0; padding-inline-start: 20px; line-height: 1.6; }
#bac-root .bac-credits a { color: var(--bac-accent); cursor: pointer; }
#bac-root .bac-library { margin: 6px 0 8px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--bac-border);
  background: color-mix(in srgb, var(--bac-accent) 4%, var(--bac-bg)); }
#bac-root .bac-library-title { font-weight: 700; margin-bottom: 4px; }
#bac-root .bac-chip.bac-chip-empty { border-style: dashed; color: var(--bac-muted); font-style: italic; }
#bac-root .bac-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; margin-top: 8px; }
#bac-root .bac-tpl { display: flex; flex-direction: column; gap: 5px; padding: 10px; border-radius: 6px; border: 1px solid var(--bac-border); background: var(--bac-bg); }
#bac-root .bac-tpl-name { font-weight: 600; }
#bac-root .bac-tpl.bac-tpl-builtin { border-color: color-mix(in srgb, var(--bac-accent) 55%, var(--bac-border)); }
#bac-root .bac-tpl-source { font-size: 11px; color: var(--bac-muted); font-style: italic; }
#bac-root .bac-tpl-desc { font-size: 12px; line-height: 1.4; }
#bac-root .bac-chips { display: flex; flex-wrap: wrap; gap: 4px; }
#bac-root .bac-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px 1px 4px; border-radius: 10px; font-size: 11px;
  border: 1px solid var(--bac-border); background: var(--bac-raise); }
#bac-root .bac-chip-dot { width: 10px; height: 10px; border-radius: 3px; flex: none; border: 1px solid rgba(0,0,0,.15); }
#bac-root .bac-tpl-actions { margin: auto 0 0; padding: 0; }
#bac-root .bac-community { margin: 10px 0 0; padding: 0; }
#bac-root .bac-notice-top { margin: 0 0 10px; }
#bac-root .bac-scope .bac-bar { flex-wrap: nowrap; }
#bac-root .bac-scope-menu { flex: 1; min-width: 0; }
#bac-root .bac-scope .bac-sub { margin-top: 0; }
#bac-root .bac-recolor-grid { display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 6px 10px; margin: 6px 0; }
#bac-root .bac-recolor-grid menulist { width: 100%; margin: 0; }
#bac-root .bac-update-hint .bac-bar { margin: 6px 0 0; padding: 0; }
#bac-root .bac-update-hint { margin-top: 6px; padding: 7px 10px; border-radius: 6px; font-size: 12px; line-height: 1.4;
  background: color-mix(in srgb, var(--bac-accent) 10%, var(--bac-bg)); border: 1px solid color-mix(in srgb, var(--bac-accent) 30%, transparent); }
#bac-root .bac-grow { flex: 1; margin: 0; }
#bac-root .bac-empty-slot { background: transparent !important; border: 1px dashed var(--bac-border) !important; box-shadow: none; cursor: default; }
#bac-root .bac-empty-slot:hover { transform: none; }
#bac-root .bac-pal-row.bac-disabled { opacity: .5; cursor: default; }
#bac-root .bac-pal-row.bac-disabled:hover { background: transparent; }
#bac-root .bac-recent-hint { margin: 3px 0 0; font-size: 11px; }
/* Same left edge for everything in a card: text, checkboxes, menus, buttons */
#bac-root .bac-card checkbox { margin-inline: 0; }
#bac-root .bac-subhead { margin: 0; }
#bac-root .bac-subhead-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
#bac-root .bac-subsec > :last-child { margin-bottom: 0; }
/* On/off switch in the head of a card: light gray track and white knob when
   off (the grays of the cards), accent color when on */
#bac-root .bac-switch { -moz-appearance: none; appearance: none; position: relative; flex: none; margin: 0; margin-inline-start: auto;
  width: 30px; height: 17px; padding: 0; border-radius: 9px; box-sizing: border-box; cursor: pointer;
  border: 1px solid var(--bac-line); background: color-mix(in srgb, var(--fill-primary, #000) 10%, var(--material-background, #fff));
  transition: background-color .12s ease; }
#bac-root .bac-switch:hover { background: color-mix(in srgb, var(--fill-primary, #000) 16%, var(--material-background, #fff)); }
#bac-root .bac-switch-knob { position: absolute; top: 1px; inset-inline-start: 1px; width: 13px; height: 13px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: inset-inline-start .12s ease; }
#bac-root .bac-switch[aria-checked="true"] { background: var(--bac-accent); border-color: var(--bac-accent); }
#bac-root .bac-switch[aria-checked="true"]:hover { background: color-mix(in srgb, var(--bac-accent) 88%, #000); }
#bac-root .bac-switch[aria-checked="true"] .bac-switch-knob { inset-inline-start: 14px; }
#bac-root .bac-switch:focus-visible { outline: 2px solid var(--bac-accent); outline-offset: 2px; }
/* A card that is off: only head and description, the title muted */
#bac-root .bac-card-off .bac-card-title h3 { color: var(--bac-muted); }
@media (prefers-reduced-motion: reduce) { #bac-root * { transition: none !important; } }
#bac-root .bac-steps { margin: 4px 0 8px; padding-inline-start: 22px; color: var(--bac-muted); line-height: 1.45; }
#bac-root .bac-subhead { margin: 0 0 6px; font-size: 1em; font-weight: 600; }
#bac-root .bac-rules { display: flex; flex-direction: column; gap: 2px; margin: 0 0 4px; }
/* Rule: number, collection → profile, ↑ ↓ ✕ in one line; “with subcollections” below. Fixed columns, so nothing wraps */
#bac-root .bac-rule { display: grid; grid-template-columns: 1.4em minmax(0, 3fr) auto minmax(0, 2fr) 24px 24px 24px;
  align-items: center; gap: 2px 6px; padding: 6px 0; border-bottom: 1px solid var(--bac-line); }
#bac-root .bac-rule menulist { margin: 0; min-width: 0; }
#bac-root .bac-rule-sub { grid-column: 2 / -1; justify-self: start; }
#bac-root .bac-rule-no { color: var(--bac-muted); font-variant-numeric: tabular-nums; }
#bac-root .bac-rule-arrow { color: var(--bac-muted); }
#bac-root .bac-icon-btn { -moz-appearance: none; appearance: none; width: 24px; height: 24px; padding: 0; border: none; border-radius: 5px;
  background: transparent; color: var(--bac-muted); font: inherit; line-height: 1; }
#bac-root .bac-icon-btn:hover:not(:disabled) { background: var(--bac-border); color: inherit; }
#bac-root .bac-icon-btn:disabled { opacity: .3; }
#bac-root .bac-icon-btn:focus-visible { outline: 2px solid var(--bac-accent); outline-offset: -1px; }
#bac-root .bac-profile-row { justify-content: space-between; }
#bac-root .bac-profile-row > .bac-profile-menu { flex: 1 1 240px; max-width: 360px; }
#bac-root .bac-group { display: inline-flex; flex: none; flex-wrap: nowrap; align-items: center; gap: 6px; }
#bac-root .bac-group > button { margin: 0; }
#bac-root .bac-tab-intro { margin: 0 4px 10px; }
#bac-root .bac-switch-body { margin-top: 4px; }
#bac-root .bac-switch-body[hidden] { display: none; }
`;
