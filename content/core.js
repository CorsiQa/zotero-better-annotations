/* Better Annotations – core: constants, strings, profile store, helpers
 *
 * Loaded into the plugin scope by bootstrap.js. All modules attach
 * themselves to the object `BetterAnnotations`.
 */

/* global Zotero, ChromeUtils */

var BetterAnnotations = {
  id: null,
  version: null,
  rootURI: null,
  PANE_ID: "better-annotations-prefpane",
  DATA_DIR: "better-annotations",
  MAX_COLORS: 40,
  // Built-in, read-only profile. “Zotero+” is an ordinary profile since 1.0.0-beta.2
  // (created at the first start as an example; its ID stays “zoteroplus”).
  PRESET_IDS: ["standard"],

  /** Zotero's eight default colors (in reader order). */
  STOCK_COLORS: ["#ffd400", "#ff6666", "#5fb236", "#2ea8e5", "#a28ae5", "#e56eee", "#f19837", "#aaaaaa"],
  /** Four extra colors that fill gaps in the color wheel: teal, pink, indigo, lime. */
  PLUS_COLORS: ["#2bc4a9", "#ff85b8", "#6b7ff0", "#b4d334"],

  /**
   * Example palettes with 12 colors each. All use the same order as
   * Zotero+ (yellow, red, green, blue, purple, magenta, orange, gray,
   * teal, pink, indigo, lime), so colors can be mapped onto each other.
   * For display, all except Zotero+ can be sorted by hue.
   */
  get PALETTES() {
    return [
      { key: "palZoteroPlus", fixed: true, colors: [...this.STOCK_COLORS, ...this.PLUS_COLORS] },
      { key: "palPastel", colors: ["#ffe9a3", "#ffb8b8", "#bfe8b5", "#aedaf2", "#cfc2f5", "#f3bdf2", "#ffd0a6", "#d9d9d9", "#aeeadb", "#ffc6de", "#bcc6f7", "#dcefa6"] },
      { key: "palPastelBold", colors: ["#ffd966", "#ff8f8f", "#93d67f", "#7dc4ee", "#b29df2", "#eb8fe8", "#ffb26b", "#bdbdbd", "#73d9c1", "#ff9fc8", "#98a6f4", "#c8e36a"] },
      { key: "palNeon", colors: ["#ffff33", "#ff4d4d", "#39ff14", "#00e5ff", "#bf5fff", "#ff3fd2", "#ff9f1c", "#c8c8c8", "#00ffc6", "#ff6ec7", "#6e7bff", "#c6ff00"] },
      { key: "palStrong", colors: ["#fad51e", "#fa1e1e", "#1efa1e", "#1e9efa", "#6f1efa", "#dd1efa", "#fa851e", "#8c8c8c", "#1eface", "#fa1e8c", "#1e43fa", "#b8fa1e"] },
      { key: "palMuted", colors: ["#b8ae7d", "#b87d7d", "#7db87d", "#7d9fb8", "#927db8", "#b07db8", "#b8987d", "#a8a8a8", "#7db8ac", "#b87d9a", "#7d87b8", "#a6b87d"] },
      { key: "palEarth", colors: ["#d4a62a", "#c0613f", "#7a9a52", "#4f8a96", "#8d74a8", "#a35c8a", "#d9935f", "#a39b86", "#5f9e8f", "#c98a8a", "#5e6b9e", "#a3ad5a"] },
    ];
  },

  /**
   * Palettes that are no longer offered. Their colors still map onto the
   * slots of the other palettes when a palette is applied to a profile.
   */
  LEGACY_PALETTES: [
    ["#ede1a6", "#eda6a6", "#a6eda6", "#a6d0ed", "#c0a6ed", "#e4a6ed", "#edc7a6", "#d4d4d4", "#a6eddf", "#eda6ca", "#a6b2ed", "#d8eda6"],
  ],

  /** Index of the gray slot in every palette (it is always shown last when sorted). */
  GRAY_SLOT: 7,

  /** Colors of a palette in display order: Zotero order, or by hue with gray last. */
  paletteDisplay(pal, order) {
    if (pal.fixed || order !== "rainbow") {
      return pal.colors;
    }
    const gray = pal.colors[this.GRAY_SLOT];
    return [...this.rainbowSort(pal.colors.filter((c, i) => i !== this.GRAY_SLOT)), gray].filter(Boolean);
  },

  DEFAULT_SETTINGS: {
    language: "auto",
    instantTooltip: true,
    menuLimit: 8,
    popupLayout: "flow",
    popupColumns: 8,
    popupFixedColumns: 9,
    showMenuEntry: true,
    showPopupButton: true,
    hideProfileTags: true,
    showToolbarButton: true,
    // Zotero's tools in the reader toolbar above the middle of the document
    centerReaderTools: true,
    statsDescriptions: false,
    keepToolColor: true,
    showItemPaneSection: true,
    sidenavPlacement: "group", // "group": with Zotero's sections; "separate": own group with dividers
    statsSharedHint: true,
    panelSharedHint: true,
    panelShowOthers: false, // item pane: also list the other profiles of the document
    sectionDescriptions: true,
    popoutDescriptions: true,
    tagsEnabled: false,
    tagPrefix: "",
    paletteOrder: "rainbow",
    recentColors: [],
    scopeSubcollections: true,
    exportFormat: "xlsx",
    exportSort: "doc",
    exportImages: true,
    exportLabeledOnly: false,
    exportDescriptions: true,
    // Advanced functions, off by default (tab “Advanced”)
    descriptionsEnabled: false,
    profilesPerDocument: false,
    profileTagColor: true,
    profileFilterDefault: false,
    tipProfilesShown: false,
    // Request for feedback (see Feedback): first start, next date, done
    firstUse: "",
    feedbackDue: "",
    feedbackDone: false,
  },

  // ---------------------------------------------------------------------
  // Project and strings
  // ---------------------------------------------------------------------

  /** Links for “Help and Links”. repo, zoteroMin and zoteroMax are read from manifest.json at startup. */
  PROJECT: {
    repo: "https://github.com/CorsiQa/zotero-better-annotations",
    get docs() {
      return this.repo + "/blob/main/docs/README.md";
    },
    get releases() {
      return this.repo + "/releases";
    },
    get issues() {
      return this.repo + "/issues";
    },
    get community() {
      return this.repo + "/discussions";
    },
    get featureRequest() {
      return this.repo + "/issues/new?template=feature_request.yml";
    },
    get bugReport() {
      return this.repo + "/issues/new?template=bug_report.yml";
    },
    license: "AGPL-3.0-or-later",
    zoteroMin: "7",
    zoteroMax: "10",
    credits: [
      ["Just Enough Color", "MCXCC303", "https://github.com/MCXCC303/just-enough-color", "creditJEC"],
      ["Zotero Highlight Color Descriptions", "paulMrG2", "https://github.com/paulMrG2/zotero-highlight-descriptions", "creditHD"],
      ["Annotation Color Customizer", "aidecameron", "https://github.com/aidecameron/zotero-annotation-color-customizer", "creditACC"],
    ],
  },

  /** Strings per language, loaded from content/locale/*.js. */
  STRINGS: {},

  /** Language code, display name, locale for dates. */
  LANGUAGES: [
    ["auto", null],
    ["en", "English", "en-US"],
    ["de", "Deutsch", "de-DE"],
    ["es", "Español", "es-ES"],
    ["fr", "Français", "fr-FR"],
    ["it", "Italiano", "it-IT"],
    ["ja", "日本語", "ja-JP"],
    ["pl", "Polski", "pl-PL"],
    ["pt", "Português", "pt-BR"],
    ["ru", "Русский", "ru-RU"],
    ["zh", "简体中文", "zh-CN"],
    ["zh-TW", "繁體中文", "zh-TW"],
  ],

  /** Map a Zotero locale (e.g. "pt-BR", "zh-TW", "nn-NO") to a plugin language. */
  mapLocale(locale) {
    const l = String(locale || "en").replace("_", "-").toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(l)) {
      return "zh-TW";
    }
    return l.split("-")[0];
  },

  /** A list in the language of the plugin: “A, B und C”. */
  listText(items) {
    try {
      return new Intl.ListFormat(this.lang === "zh-TW" ? "zh-TW" : this.lang, { style: "long", type: "conjunction" }).format(items.map(String));
    }
    catch (e) {
      return items.join(", ");
    }
  },

  get lang() {
    let l = this.Store && this.Store.data && this.Store.data.settings.language;
    if (!l || l === "auto") {
      try {
        l = this.mapLocale(Zotero.locale);
      }
      catch (e) {
        l = "en";
      }
    }
    return this.STRINGS[l] ? l : "en";
  },

  get dateLocale() {
    const entry = this.LANGUAGES.find(([code]) => code === this.lang);
    return entry && entry[2] ? entry[2] : "en-US";
  },

  /** Get a translated string; {placeholders} are replaced. */
  S(key, args) {
    const table = this.STRINGS[this.lang] || this.STRINGS.en;
    let text = key in table ? table[key] : (this.STRINGS.en[key] ?? key);
    if (args && typeof text === "string") {
      for (const [k, v] of Object.entries(args)) {
        text = text.split("{" + k + "}").join(String(v));
      }
    }
    return text;
  },

  /**
   * State of a reader (annotations, tool, filter, read-only). Zotero keeps it
   * in the internal reader; older test setups had it on the reader itself.
   */
  readerState(reader) {
    try {
      const state = reader && reader._internalReader && reader._internalReader._state;
      if (state) {
        return state;
      }
    }
    catch (e) {}
    return (reader && reader._state) || null;
  },

  /** Are descriptions of labels used (tab “Advanced”)? */
  descriptionsOn() {
    return this.setting("descriptionsEnabled") === true;
  },

  setting(key) {
    const s = this.Store && this.Store.data ? this.Store.data.settings : {};
    return key in s ? s[key] : this.DEFAULT_SETTINGS[key];
  },

  formatDate(iso) {
    try {
      return new Date(iso).toLocaleString(this.dateLocale,
        { dateStyle: "medium", timeStyle: "short" });
    }
    catch (e) {
      return iso;
    }
  },

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------
  async startup({ id, version, rootURI }) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    Zotero.BetterAnnotations = this;

    await this.readManifest();
    await this.Store.init();
    try {
      await this.Profiles.init();
    }
    catch (e) {
      this.logError(e);
    }
    // Hook into the reader first: Zotero restores open tabs during startup
    this.Reader.register();
    try {
      await this.Library.init();
    }
    catch (e) {
      this.logError(e);
    }
    try {
      this.Panel.init();
    }
    catch (e) {
      this.logError(e);
    }

    try {
      await Zotero.PreferencePanes.register({
        pluginID: id,
        id: this.PANE_ID,
        src: rootURI + "content/preferences.xhtml",
        label: this.S("pluginName"),
        image: rootURI + "content/icons/icon.svg",
      });
    }
    catch (e) {
      this.logError(e);
    }

    try {
      this.Feedback.init();
    }
    catch (e) {
      this.logError(e);
    }

    this.log("started, version " + version);
  },

  /**
   * manifest.json is the single source for the repository URL and the
   * supported Zotero versions shown on the About tab.
   */
  async readManifest() {
    try {
      const m = JSON.parse(await Zotero.File.getContentsFromURLAsync(this.rootURI + "manifest.json"));
      const z = m.applications && m.applications.zotero;
      if (m.author) {
        this.PROJECT.author = m.author;
      }
      if (m.homepage_url) {
        this.PROJECT.repo = m.homepage_url.replace(/\/$/, "");
      }
      if (z) {
        this.PROJECT.zoteroMin = String(z.strict_min_version || "").replace(/(\.0)+$/, "");
        this.PROJECT.zoteroMax = String(z.strict_max_version || "").replace(/\.\*$/, "");
      }
    }
    catch (e) {
      this.logError(e);
    }
  },

  shutdown() {
    for (const part of [this.Panel, this.Reader, this.Library, this.Profiles, this.Feedback]) {
      try {
        part.shutdown();
      }
      catch (e) {
        this.logError(e);
      }
    }
    if (Zotero.BetterAnnotations === this) {
      delete Zotero.BetterAnnotations;
    }
  },

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  log(msg) {
    Zotero.debug("[BetterAnnotations] " + msg);
  },

  logError(e) {
    Zotero.debug("[BetterAnnotations] Error: " + (e && e.stack ? e.stack : e));
    try {
      Zotero.logError(e);
    }
    catch (_) {}
  },

  /** setTimeout via the main window (not guaranteed to exist in the plugin scope). */
  setTimeout(fn, ms) {
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (win) {
      return win.setTimeout(fn, ms || 0);
    }
    Zotero.Promise.delay(ms || 0).then(fn);
    return 0;
  },

  /** Normalize a color to "#rrggbb" (lower case); null if invalid. */
  normalize(color) {
    if (typeof color !== "string") {
      return null;
    }
    const c = color.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(c)) {
      return c;
    }
    if (/^#[0-9a-f]{3}$/.test(c)) {
      return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    }
    if (/^[0-9a-f]{6}$/.test(c)) {
      return "#" + c;
    }
    const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      return "#" + [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, "0")).join("");
    }
    return null;
  },

  hexToHsv(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16 & 255) / 255;
    const g = (n >> 8 & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) {
        h = ((g - b) / d) % 6;
      }
      else if (max === g) {
        h = (b - r) / d + 2;
      }
      else {
        h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) {
        h += 360;
      }
    }
    return { h, s: max ? d / max : 0, v: max };
  },

  hsvToHex({ h, s, v }) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return "#" + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
  },

  /** Rainbow order: by hue starting with red, grays last. */
  rainbowSort(colors) {
    const key = (c) => {
      const { h, s } = this.hexToHsv(c);
      return s < 0.15 ? 1000 + (1 - this.hexToHsv(c).v) : h;
    };
    return colors.slice().sort((a, b) => key(a) - key(b));
  },

  uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /** Zotero's name of a default color in the current language (or null). */
  stockName(color) {
    const i = this.STOCK_COLORS.indexOf(this.normalize(color));
    return i >= 0 ? this.S("stockNames")[i] : null;
  },

  /** Visible in menus: enabled and label not empty (spaces count as a label). */
  isVisible(entry) {
    return entry.enabled !== false && typeof entry.label === "string" && entry.label.length > 0;
  },

  visibleColors(profile) {
    return profile.colors.filter(c => this.isVisible(c));
  },

  MAX_DESCRIPTION: 2000,

  /** Description of a label: plain text with line breaks, without trailing spaces. */
  cleanDescription(text) {
    if (typeof text !== "string") {
      return "";
    }
    return text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").replace(/^\n+|\s+$/g, "").slice(0, this.MAX_DESCRIPTION);
  },

  /** Shortened description for tooltips: at most `lines` lines and `chars` characters. */
  shortDescription(text, lines = 4, chars = 220) {
    const clean = this.cleanDescription(text);
    if (!clean) {
      return "";
    }
    let out = clean.split("\n").slice(0, lines).join("\n");
    if (out.length > chars) {
      out = out.slice(0, chars).replace(/\s+\S*$/, "");
    }
    return out.length < clean.length ? out.replace(/[\s.,;:]+$/, "") + "…" : out;
  },

  /**
   * Let a text field grow with its content. Also sizes fields that were
   * created while hidden (closed section, hidden settings tab) as soon as
   * they become visible. Returns the function that recalculates the height.
   */
  autoGrow(area) {
    const grow = () => {
      if (!area.isConnected || !area.getClientRects().length) {
        area.style.height = "";
        return;
      }
      area.style.height = "auto";
      // scrollHeight excludes the border; with border-box sizing it must be added
      const cs = area.ownerDocument.defaultView.getComputedStyle(area);
      const border = cs.boxSizing === "border-box" ? (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) : 0;
      area.style.height = (area.scrollHeight + border) + "px";
    };
    let lastWidth = -1;
    try {
      const RO = area.ownerDocument.defaultView.ResizeObserver;
      if (RO) {
        new RO(() => {
          if (area.clientWidth !== lastWidth) {
            lastWidth = area.clientWidth;
            grow();
          }
        }).observe(area);
      }
    }
    catch (e) {}
    area.addEventListener("input", grow);
    area.addEventListener("focus", grow);
    area.addEventListener("blur", grow);
    this.setTimeout(grow, 0);
    return grow;
  },

  /**
   * Text for a system tooltip: the label, then the shortened description
   * after an empty line, each line marked with “›”.
   */
  tooltipText(label, description) {
    const name = String(label || "").trim();
    const desc = this.descriptionsOn() ? this.shortDescription(description) : "";
    if (!desc) {
      return name;
    }
    return name + "\n\n" + desc.split("\n").map(l => "› " + l).join("\n");
  },

  /**
   * Name of a color in lists and statistics: its label, Zotero's name of the
   * color, else “No label” (the color code only in tooltips).
   */
  listName(color, profile) {
    const entry = profile && profile.colors.find(c => c.color === color);
    if (entry && entry.label.trim()) {
      return entry.label.trim();
    }
    return this.stockName(color) || this.S("noLabel");
  },

  /**
   * “• ✎ n” after a name: separator dot and number of annotations with the
   * icon of the color list (UI guidelines 7.5). Returns one element; numEl is
   * the text of the number, for updates.
   */
  countLabel(doc, n) {
    const box = doc.createElement("span");
    box.className = "bac-count";
    const dot = doc.createElement("span");
    dot.className = "bac-sepdot";
    dot.setAttribute("aria-hidden", "true");
    const num = doc.createElement("span");
    num.className = "bac-count-n";
    num.textContent = n === null || n === undefined ? "" : String(n);
    box.append(dot, this.Icons.make(doc, "marker", 14), num);
    return box;
  },

  /**
   * CSS for countLabel(), in em so it fits every font size. The dot and the
   * icon sit on the baseline and are moved to the middle of the digits
   * (about .35em above the baseline), not to the middle of the line box.
   */
  COUNT_CSS: `
.bac-count { display: inline-flex; align-items: baseline; flex: none; font-variant-numeric: tabular-nums; }
.bac-sepdot { flex: none; width: .24em; height: .24em; margin: 0 .35em; border-radius: 50%; background: currentColor; opacity: .75;
  position: relative; top: -.25em; }
.bac-count > svg { flex: none; width: 1.1em; height: 1.1em; margin: -.3em .12em 0 0; position: relative; top: .17em;
  color: var(--fill-secondary, GrayText); }
`,

  /** Name under which a color is shown (e.g. in lists and statistics). */
  displayName(color, profile) {
    const p = profile || this.Store.getActive();
    const entry = p.colors.find(c => c.color === color);
    if (entry && entry.label.trim()) {
      return entry.label.trim();
    }
    return this.stockName(color) || color;
  },

  /** Open the settings; delayed so that a menu can close first. */
  openPrefs() {
    this.setTimeout(() => {
      try {
        if (Zotero.Utilities?.Internal?.openPreferences) {
          Zotero.Utilities.Internal.openPreferences(this.PANE_ID);
          return;
        }
        Zotero.getMainWindow().openDialog("chrome://zotero/content/preferences/preferences.xhtml", "zotero-prefs",
          "chrome,titlebar,toolbar,centerscreen,resizable=yes", { pane: this.PANE_ID });
      }
      catch (e) {
        this.logError(e);
      }
    }, 120);
  },

  /** Remember a color chosen in the picker (at most 12, newest first). */
  async addRecentColor(color) {
    const c = this.normalize(color);
    if (!c) {
      return;
    }
    const list = [c, ...(this.setting("recentColors") || []).filter(x => x !== c)].slice(0, 12);
    await this.Store.setSetting("recentColors", list);
  },

  /** File name from a profile name (without invalid characters). */
  safeFileName(name) {
    const cleaned = String(name || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    return cleaned || "Profile";
  },

  notify(text) {
    try {
      const pw = new Zotero.ProgressWindow();
      pw.changeHeadline(this.S("pluginName"));
      pw.addDescription(text);
      pw.show();
      // Long notices stay longer (reading time)
      pw.startCloseTimer(Math.min(12000, Math.max(5000, String(text).length * 60)));
    }
    catch (e) {
      this.log(text);
    }
  },
};

// -------------------------------------------------------------------------
// Icons: one set of line icons for the whole plugin (UI guidelines 7.6)
// -------------------------------------------------------------------------
BetterAnnotations.Icons = {
  // Stroke on the 16-unit grid; 1.1 is the plugin's line weight
  STROKE: 1.1,
  // The funnel is the same in every state; badges sit at its lower right
  FUNNEL: "M2.5 3.5h9l-3.5 4.2v3.8l-2 1V7.7z",

  /**
   * Line icon in the current text color. kind: funnel, funnel-plus,
   * funnel-one, keep, describe, tune, edit, marker, profiles, chevron, bars.
   * size: displayed size in px (the grid is 16 units, chevron 8, bars 20).
   */
  make(doc, kind, size) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(NS, "svg");
    const grid = kind === "chevron" ? 8 : kind === "bars" ? 20 : 16;
    const px = size || grid;
    svg.setAttribute("width", String(px));
    svg.setAttribute("height", String(px));
    svg.setAttribute("viewBox", "0 0 " + grid + " " + grid);
    svg.setAttribute("aria-hidden", "true");
    // Small icons get a slightly thicker line on the grid, so they look as heavy
    const stroke = this.STROKE * Math.max(1, 14 / px);
    const line = (d, w) => {
      const el = doc.createElementNS(NS, "path");
      el.setAttribute("d", d);
      el.setAttribute("style", "fill:none;stroke:currentColor;stroke-width:" + (w || stroke) + ";stroke-linecap:round;stroke-linejoin:round");
      svg.append(el);
    };
    const shape = (tag, attrs, filled) => {
      const el = doc.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, String(v));
      }
      el.setAttribute("style", filled ? "fill:currentColor" : "fill:none;stroke:currentColor;stroke-width:" + stroke);
      svg.append(el);
    };
    switch (kind) {
      case "funnel":
        line(this.FUNNEL);
        break;
      case "funnel-plus":
        // All profiles: the funnel with a small “+”
        line(this.FUNNEL);
        line("M12.9 10.2v3.4M11.2 11.9h3.4");
        break;
      case "funnel-one":
        // Only this profile: the funnel with a small “1”
        line(this.FUNNEL);
        line("M12.3 10.8l1.1-.9v4.2");
        break;
      case "keep":
        // Repeat: the color stays selected for further annotations
        line("M2.5 7V6.5a2 2 0 0 1 2-2h8.5M11 2.5l2 2-2 2M13.5 9v.5a2 2 0 0 1-2 2H3M5 9.5l-2 2 2 2");
        break;
      case "describe":
        line("M2.5 3.5h11M2.5 6.5h11M2.5 9.5h7M2.5 12.5h5");
        break;
      case "tune":
        line("M2.5 4h7M12.5 4h1M2.5 8h1.5M7.5 8h6M2.5 12h8M14 12h-.5");
        for (const [cx, cy] of [[11, 4], [5.75, 8], [12, 12]]) {
          shape("circle", { cx, cy, r: 1.5 });
        }
        break;
      case "edit":
        line("M10.6 2.4l3 3-8.2 8.2-3.7.7.7-3.7z M9.2 3.8l3 3");
        break;
      case "marker":
        // Annotations: a highlighter over a line of text
        line("M9.5 2.5l3.5 3.5-5.5 5.5H4v-3.5z");
        line("M2.5 14h11");
        break;
      case "profiles":
        // Other profiles: two squares
        shape("rect", { x: 5.5, y: 2.5, width: 8, height: 8, rx: 1.8 });
        shape("rect", { x: 2.5, y: 5.5, width: 8, height: 8, rx: 1.8 });
        break;
      case "chevron":
        line("M1 2.75 4 5.75 7 2.75", 1.1);
        break;
      case "bars":
        // The four bars of the logo without the card (widths 60/44/52/34 of
        // the logo). Steps of 0.8 px: whole device pixels at 125 % and 250 %.
        for (const [y, w] of [[4.4, 14.4], [7.6, 10.4], [10.8, 12.8], [14, 8]]) {
          shape("rect", { x: 2.8, y, width: w, height: 1.6, rx: 0.8 }, true);
        }
        break;
    }
    return svg;
  },
};

// -------------------------------------------------------------------------
// Profile store (JSON file in the Zotero data directory)
// -------------------------------------------------------------------------
BetterAnnotations.Store = {
  dir: null,
  path: null,
  data: null,
  pendingDraft: null, // unsaved draft, kept if the settings window was closed
  _lastRaw: null,
  _listeners: new Set(),

  get SB() {
    return BetterAnnotations;
  },

  join(...parts) {
    return parts.join(Zotero.isWin ? "\\" : "/");
  },

  /** Observers for changes (active profile, profiles, settings). */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  emit(what) {
    for (const fn of [...this._listeners]) {
      try {
        fn(what);
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  async readJSON(path) {
    let raw;
    try {
      raw = await Zotero.File.getContentsAsync(path);
    }
    catch (e) {
      return { raw: null, data: null }; // file missing
    }
    try {
      return { raw, data: JSON.parse(raw) };
    }
    catch (e) {
      this.SB.logError(e);
      try {
        await Zotero.File.putContentsAsync(path + ".broken-" + Date.now(), raw);
      }
      catch (_) {}
      return { raw: null, data: null };
    }
  },

  async writeJSON(path, obj) {
    await Zotero.File.createDirectoryIfMissingAsync(this.dir);
    await Zotero.File.putContentsAsync(path, JSON.stringify(obj, null, 1));
  },

  async init() {
    const SB = this.SB;
    this.dir = this.join(Zotero.DataDirectory.dir, SB.DATA_DIR);
    await this.moveOldDataDir();
    this.path = this.join(this.dir, "profiles.json");
    const { raw, data } = await this.readJSON(this.path);
    if (data) {
      this._lastRaw = raw;
      this.data = this.sanitize(data);
      return;
    }
    // First start: create new data. Existing annotations are not changed.
    this.data = this.sanitize(null);
    this.importHighlightDescriptions();
    await this.persist();
  },

  /**
   * Test versions before the public release stored their data in
   * "better-annotation-colors". Move that folder once if the new one is missing.
   */
  async moveOldDataDir() {
    try {
      const oldDir = Zotero.File.pathToFile(this.join(Zotero.DataDirectory.dir, "better-annotation-colors"));
      const newDir = Zotero.File.pathToFile(this.dir);
      if (!newDir.exists() && oldDir.exists() && oldDir.isDirectory()) {
        oldDir.moveTo(null, this.SB.DATA_DIR);
        this.SB.log("moved old data folder to " + this.dir);
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  /** Turn unknown or broken content into a valid data object. */
  sanitize(input) {
    const SB = this.SB;
    const out = {
      version: 4,
      activeProfileId: "standard",
      settings: Object.assign({}, SB.DEFAULT_SETTINGS),
      profiles: [],
      collectionRules: [],
      backups: [],
    };
    if (!input || typeof input !== "object") {
      // First start: “Standard” in use, so that existing annotations count
      // there; “Zotero+” as an example profile to switch to
      out.profiles.push(this.plusProfile());
      out.activeProfileId = "standard";
      return out;
    }
    const s = input.settings && typeof input.settings === "object" ? input.settings : {};
    if (s.language === "auto" || SB.LANGUAGES.some(([code]) => code === s.language)) {
      out.settings.language = s.language;
    }
    if (typeof s.uiTab === "string") {
      out.settings.uiTab = s.uiTab;
    }
    out.settings.recentColors = (Array.isArray(s.recentColors) ? s.recentColors : [])
      .map(c => SB.normalize(c)).filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).slice(0, 12);
    for (const key of ["instantTooltip", "showMenuEntry", "showPopupButton", "hideProfileTags",
      "showToolbarButton", "showItemPaneSection", "statsSharedHint", "panelSharedHint", "panelShowOthers",
      "statsDescriptions", "keepToolColor", "sectionDescriptions", "popoutDescriptions", "tagsEnabled",
      "descriptionsEnabled", "profilesPerDocument", "profileTagColor", "profileFilterDefault",
      "tipProfilesShown", "feedbackDone"]) {
      if (typeof s[key] === "boolean") {
        out.settings[key] = s[key];
      }
    }
    for (const key of ["firstUse", "feedbackDue"]) {
      if (typeof s[key] === "string" && /^\d{4}-\d{2}-\d{2}/.test(s[key])) {
        out.settings[key] = s[key].slice(0, 10);
      }
    }
    // 1.0.0-beta.2: one toolbar button instead of two; hidden only if both were hidden
    if (typeof s.showToolbarButton !== "boolean" && s.showToolbarProfile === false && s.showToolbarStats === false) {
      out.settings.showToolbarButton = false;
    }
    if (s.sidenavPlacement === "group" || s.sidenavPlacement === "separate") {
      out.settings.sidenavPlacement = s.sidenavPlacement;
    }
    if (s.popupLayout === "flow" || s.popupLayout === "fixed") {
      out.settings.popupLayout = s.popupLayout;
    }
    if (s.paletteOrder === "rainbow" || s.paletteOrder === "zotero") {
      out.settings.paletteOrder = s.paletteOrder;
    }
    if (typeof s.tagPrefix === "string") {
      out.settings.tagPrefix = s.tagPrefix.slice(0, 40);
    }
    out.settings.menuLimit = this.clampInt(s.menuLimit, 1, 20, SB.DEFAULT_SETTINGS.menuLimit);
    out.settings.popupColumns = this.clampInt(s.popupColumns, 4, 16, SB.DEFAULT_SETTINGS.popupColumns);
    out.settings.popupFixedColumns = this.clampInt(s.popupFixedColumns, 4, 17, SB.DEFAULT_SETTINGS.popupFixedColumns);
    for (const key of ["scopeSubcollections", "exportImages", "exportLabeledOnly", "exportDescriptions"]) {
      if (typeof s[key] === "boolean") {
        out.settings[key] = s[key];
      }
    }
    if (["xlsx", "csv", "html"].includes(s.exportFormat)) {
      out.settings.exportFormat = s.exportFormat;
    }
    if (s.exportSort === "doc" || s.exportSort === "label") {
      out.settings.exportSort = s.exportSort;
    }

    const names = new Set();
    for (const p of Array.isArray(input.profiles) ? input.profiles : []) {
      const profile = this.sanitizeProfile(p);
      if (!profile || SB.PRESET_IDS.includes(profile.id)) {
        continue;
      }
      if (out.profiles.some(x => x.id === profile.id)) {
        profile.id = SB.uid("p");
      }
      let name = profile.name;
      let n = 2;
      while (names.has(name.toLowerCase())) {
        name = profile.name + " (" + n++ + ")";
      }
      profile.name = name;
      names.add(name.toLowerCase());
      out.profiles.push(profile);
    }
    // Data from 1.0.0-beta.1: “Zotero+” was built in; it becomes an ordinary profile
    // with the same ID, so document choices, rules and tags keep working
    if (!(input.version >= 4) && !out.profiles.some(p => p.id === "zoteroplus")) {
      const plus = this.plusProfile();
      let name = plus.name;
      let n = 2;
      while (names.has(name.toLowerCase())) {
        name = plus.name + " (" + n++ + ")";
      }
      plus.name = name;
      names.add(name.toLowerCase());
      out.profiles.unshift(plus);
    }
    const active = input.activeProfileId;
    if (SB.PRESET_IDS.includes(active) || out.profiles.some(p => p.id === active)) {
      out.activeProfileId = active;
    }
    out.collectionRules = this.sanitizeRules(input.collectionRules, out.profiles);
    // Descriptions stay visible for profiles that already have them
    if (typeof s.descriptionsEnabled !== "boolean") {
      out.settings.descriptionsEnabled = out.profiles.some(p => p.colors.some(c => c.description));
    }
    if (Array.isArray(input.backups)) {
      out.backups = input.backups.filter(b => b && typeof b.file === "string" && typeof b.created === "string")
        .map(b => ({ file: b.file, created: b.created, kind: b.kind === "initial" ? "initial" : "manual", count: +b.count || 0 }));
    }
    return out;
  },

  /** Collection rules: { id, lib, key, profileId, sub }; library and key identify the collection. */
  sanitizeRules(list, profiles) {
    const SB = this.SB;
    const known = new Set([...SB.PRESET_IDS, ...(profiles || this.data.profiles).map(p => p.id)]);
    const out = [];
    for (const r of Array.isArray(list) ? list : []) {
      if (!r || typeof r.key !== "string" || !r.key || !Number.isFinite(+r.lib) || !known.has(r.profileId)) {
        continue;
      }
      out.push({ id: typeof r.id === "string" && r.id ? r.id : SB.uid("r"), lib: +r.lib, key: r.key, profileId: r.profileId, sub: r.sub !== false });
    }
    return out.slice(0, 200);
  },

  async setRules(rules) {
    this.data.collectionRules = this.sanitizeRules(rules);
    await this.persist();
    this.emit("rules");
  },

  clampInt(v, min, max, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  },

  /** Validate and clean a profile; null if it contains no valid color. */
  sanitizeProfile(p) {
    const SB = this.SB;
    if (!p || typeof p !== "object") {
      return null;
    }
    const colors = [];
    const seen = new Set();
    for (const c of Array.isArray(p.colors) ? p.colors : []) {
      const color = SB.normalize(c && c.color);
      if (!color || seen.has(color)) {
        continue;
      }
      seen.add(color);
      const label = typeof c.label === "string" ? c.label.slice(0, 200) : "";
      const entry = {
        id: typeof c.id === "string" && c.id ? c.id : SB.uid("c"),
        color,
        label,
        enabled: c.enabled !== false,
      };
      const description = SB.cleanDescription(c.description);
      if (description) {
        entry.description = description;
      }
      colors.push(entry);
      if (colors.length >= SB.MAX_COLORS) {
        break;
      }
    }
    if (!colors.length) {
      return null;
    }
    const name = (typeof p.name === "string" && p.name.trim()) ? p.name.trim().slice(0, 100) : "Profile";
    return {
      id: typeof p.id === "string" && p.id ? p.id : SB.uid("p"),
      name,
      colors,
      modified: typeof p.modified === "string" ? p.modified : new Date().toISOString(),
    };
  },

  /** On first start, import existing labels from “Highlight Descriptions” as a profile. */
  importHighlightDescriptions() {
    const SB = this.SB;
    try {
      const prefix = "extensions.highlightdescriptions.color_";
      const found = {};
      let any = false;
      for (const color of SB.STOCK_COLORS) {
        const v = Zotero.Prefs.get(prefix + color.slice(1), true);
        if (typeof v === "string") {
          found[color] = v;
          any = true;
        }
      }
      if (!any) {
        return;
      }
      let order = SB.STOCK_COLORS.slice();
      const stored = Zotero.Prefs.get("extensions.highlightdescriptions.color_order", true);
      if (typeof stored === "string" && stored) {
        const parsed = stored.split(",").map(s => SB.normalize(s)).filter(c => c && SB.STOCK_COLORS.includes(c));
        order = [...new Set([...parsed, ...SB.STOCK_COLORS])];
      }
      this.data.profiles.push({
        id: SB.uid("p"),
        name: SB.S("importedHD"),
        colors: order.map(color => ({ id: SB.uid("c"), color, label: found[color] || SB.stockName(color), enabled: true })),
        modified: new Date().toISOString(),
      });
    }
    catch (e) {
      SB.logError(e);
    }
  },

  async persist() {
    const json = JSON.stringify(this.data, null, 2);
    await Zotero.File.createDirectoryIfMissingAsync(this.dir);
    if (this._lastRaw && this._lastRaw !== json) {
      try {
        await Zotero.File.putContentsAsync(this.path + ".bak", this._lastRaw);
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
    await Zotero.File.putContentsAsync(this.path, json);
    this._lastRaw = json;
  },

  // --- Built-in presets ------------------------------------------------

  isPreset(id) {
    return this.SB.PRESET_IDS.includes(id);
  },

  /** Zotero without changes: eight colors named after the color. */
  zoteroPreset() {
    const SB = this.SB;
    return {
      id: "standard",
      name: SB.S("presetZotero"),
      preset: true,
      standard: true,
      colors: SB.STOCK_COLORS.map((color, i) => ({ id: "std" + i, color, label: SB.S("stockNames")[i], enabled: true })),
    };
  },

  /** Plugin default: twelve colors, the first eight labeled, four empty. */
  plusPreset() {
    const SB = this.SB;
    const labels = SB.S("plusLabels");
    return {
      id: "zoteroplus",
      name: SB.S("presetPlus"),
      preset: true,
      colors: [...SB.STOCK_COLORS, ...SB.PLUS_COLORS].map((color, i) => ({
        id: "plus" + i,
        color,
        label: labels[i] || "",
        enabled: true,
      })),
    };
  },

  getProfiles() {
    return this.data.profiles;
  },

  /** “Zotero+” as an ordinary profile (first start, migration). */
  plusProfile() {
    const p = this.plusPreset();
    delete p.preset;
    p.modified = new Date().toISOString();
    return p;
  },

  getProfile(id) {
    if (id === "standard") {
      return this.zoteroPreset();
    }
    return this.data.profiles.find(p => p.id === id) || null;
  },

  /**
   * Profile in use (copy): the profile of the document in the selected reader
   * tab, else the default profile. Code for a specific reader asks
   * BetterAnnotations.Profiles.profileForReader(reader).
   */
  getActive() {
    if (this.SB.Profiles) {
      return this.SB.Profiles.profile(this.SB.Profiles.currentId());
    }
    return this.getDefault();
  },

  /** Default profile (copy): for documents without choice, profile annotations or matching rule. */
  getDefault() {
    const p = this.getProfile(this.data.activeProfileId) || this.zoteroPreset();
    return JSON.parse(JSON.stringify(p));
  },

  /** All profiles for menus: presets first. */
  listForMenu() {
    return [
      { id: "standard", name: this.SB.S("presetZotero") },
      ...this.data.profiles.map(p => ({ id: p.id, name: p.name })),
    ];
  },

  isNameTaken(name, exceptId) {
    const SB = this.SB;
    const n = String(name).trim().toLowerCase();
    if (SB.S("presetZotero").toLowerCase() === n) {
      return true;
    }
    return this.data.profiles.some(p => p.id !== exceptId && p.name.toLowerCase() === n);
  },

  /** Set the default profile (the stored key keeps its old name “activeProfileId”). */
  async setDefault(id) {
    if (!this.getProfile(id)) {
      id = "standard";
    }
    this.data.activeProfileId = id;
    await this.persist();
    this.emit("active");
  },

  /** Create or update a profile; returns the saved profile. */
  async saveProfile(profile, { activate = false } = {}) {
    const clean = this.sanitizeProfile(profile);
    if (!clean || this.isPreset(clean.id)) {
      throw new Error(this.SB.S("dlgEmpty"));
    }
    clean.modified = new Date().toISOString();
    const idx = this.data.profiles.findIndex(p => p.id === clean.id);
    if (idx >= 0) {
      this.data.profiles[idx] = clean;
    }
    else {
      this.data.profiles.push(clean);
    }
    if (activate) {
      this.data.activeProfileId = clean.id;
    }
    await this.persist();
    this.emit("profiles");
    return clean;
  },

  async deleteProfile(id) {
    this.data.profiles = this.data.profiles.filter(p => p.id !== id);
    if (this.data.activeProfileId === id) {
      this.data.activeProfileId = "standard";
    }
    this.data.collectionRules = (this.data.collectionRules || []).filter(r => r.profileId !== id);
    try {
      this.SB.Profiles.forgetProfile(id);
    }
    catch (e) {
      this.SB.logError(e);
    }
    await this.persist();
    this.emit("profiles");
  },

  async setSetting(key, value) {
    this.data.settings[key] = value;
    await this.persist();
    this.emit("settings");
  },

  /** A profile as a standalone file (format “better-annotations/profile”). */
  exportProfile(profile) {
    return {
      format: "better-annotations/profile",
      formatVersion: 1,
      plugin: this.SB.version,
      exported: new Date().toISOString(),
      name: profile.name,
      colors: profile.colors.map((c) => {
        const out = { color: c.color, label: c.label, enabled: c.enabled !== false };
        if (c.description) {
          out.description = c.description;
        }
        return out;
      }),
    };
  },

  /**
   * Import profiles from a file; returns the imported profiles.
   * Accepts single profiles, older multi-profile files and full backups.
   */
  async importProfiles(obj) {
    const SB = this.SB;
    let list = [];
    if (obj && Array.isArray(obj.colors)) {
      list = [obj];
    }
    else if (Array.isArray(obj?.profiles)) {
      list = obj.profiles;
    }
    else if (obj?.files?.["profiles.json"]?.profiles) {
      list = obj.files["profiles.json"].profiles;
    }
    const imported = [];
    for (const p of list) {
      const clean = this.sanitizeProfile(p);
      if (!clean) {
        continue;
      }
      clean.id = SB.uid("p");
      let name = clean.name;
      let n = 2;
      while (this.isNameTaken(name)) {
        name = clean.name + " (" + n++ + ")";
      }
      clean.name = name;
      this.data.profiles.push(clean);
      imported.push(clean);
    }
    if (imported.length) {
      await this.persist();
      this.emit("profiles");
    }
    return imported;
  },
};

// -------------------------------------------------------------------------
// Updates: uses Zotero's add-on manager and therefore the same
// update_url from manifest.json as the automatic update check.
// -------------------------------------------------------------------------
BetterAnnotations.Updates = {
  state: { status: "idle", version: null, install: null, checked: null },
  _listeners: new Set(),

  get SB() {
    return BetterAnnotations;
  },

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  set(state) {
    this.state = Object.assign({ version: null, install: null, checked: this.state.checked, autoUpdate: this.state.autoUpdate }, state);
    for (const fn of [...this._listeners]) {
      try {
        fn(this.state);
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  addonManager() {
    try {
      return ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs").AddonManager;
    }
    catch (e) {
      return ChromeUtils.import("resource://gre/modules/AddonManager.jsm").AddonManager;
    }
  },

  /**
   * Does Zotero install updates of this plugin by itself? Depends on the plugin's
   * setting “Allow automatic updates” (Default/On/Off); “Default”
   * follows the general setting “Update plugins automatically”.
   */
  autoUpdateEnabled(AM, addon) {
    try {
      const v = addon.applyBackgroundUpdates;
      if (v === AM.AUTOUPDATE_DISABLE) {
        return false;
      }
      if (v === AM.AUTOUPDATE_ENABLE) {
        return true;
      }
      return AM.autoUpdateDefault !== false;
    }
    catch (e) {
      return null;
    }
  },

  /**
   * Turn on automatic updates for this plugin. If the general setting is
   * already “automatic”, “Default” is enough; otherwise “On”.
   */
  async enableAutoUpdates() {
    const AM = this.addonManager();
    const addon = await AM.getAddonByID(this.SB.id);
    if (!addon) {
      return;
    }
    addon.applyBackgroundUpdates = AM.autoUpdateDefault ? AM.AUTOUPDATE_DEFAULT : AM.AUTOUPDATE_ENABLE;
    this.set(Object.assign({}, this.state, { autoUpdate: true }));
  },

  async check() {
    if (this.state.status === "checking" || this.state.status === "installing") {
      return this.state;
    }
    this.set({ status: "checking" });
    try {
      const AM = this.addonManager();
      const addon = await AM.getAddonByID(this.SB.id);
      if (!addon) {
        throw new Error("add-on not found");
      }
      this.state.autoUpdate = this.autoUpdateEnabled(AM, addon);
      const result = await new Promise((resolve) => {
        let available = null;
        let settled = false;
        const finish = (r) => {
          if (!settled) {
            settled = true;
            resolve(r);
          }
        };
        addon.findUpdates({
          onUpdateAvailable: (a, install) => {
            available = install;
          },
          onNoUpdateAvailable: () => {},
          onUpdateFinished: (a, error) => {
            if (error) {
              finish({ status: "error" });
            }
            else if (available) {
              finish({ status: "available", version: available.version, install: available });
            }
            else {
              finish({ status: "current" });
            }
          },
        }, AM.UPDATE_WHEN_USER_REQUESTED);
        this.SB.setTimeout(() => finish({ status: "error" }), 30000);
      });
      this.set(Object.assign(result, { checked: new Date().toISOString() }));
    }
    catch (e) {
      this.SB.logError(e);
      this.set({ status: "error" });
    }
    return this.state;
  },

  install() {
    const install = this.state.install;
    if (!install) {
      return;
    }
    const version = this.state.version;
    this.set({ status: "installing", version, install });
    try {
      install.addListener({
        onInstallEnded: () => this.set({ status: "installed", version }),
        onInstallFailed: () => this.set({ status: "error" }),
        onDownloadFailed: () => this.set({ status: "error" }),
        onInstallCancelled: () => this.set({ status: "available", version, install }),
      });
      install.install();
    }
    catch (e) {
      this.SB.logError(e);
      this.set({ status: "error" });
    }
  },
};
