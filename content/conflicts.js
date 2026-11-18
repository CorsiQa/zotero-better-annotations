/* Better Annotations – other plugins that change the same menus
 *
 * Three plugins also rename or extend Zotero's annotation colors in the
 * reader's popup and menus. Running together with Better Annotations, the
 * labels of both plugins can mix up. While one of them is active:
 *   - a warning above the tabs of the settings, closed with ×; it comes back
 *     when one of the plugins is turned on or installed again;
 *   - once per plugin a dialog (after installing it, or on the first start
 *     with it), with the offer to take over its color names as a profile.
 * Disabling or removing the other plugin is left to the user.
 */

/* global Zotero, Services, BetterAnnotations */

BetterAnnotations.Conflicts = {
  PLUGINS: [
    { id: "highlightdescriptions@paulmrg2", name: "Highlight Color Descriptions", source: "hcd" },
    { id: "annotation-color-customizer@aidecameron.github.io", name: "Annotation Color Customizer", source: "acc" },
    { id: "just-enough-color@zotero.plugin", name: "Just Enough Color", source: "jec" },
  ],
  DIALOG_DELAY_MS: 8000,
  active: [], // ids of the active plugins
  _listener: null,
  _timer: null,
  _listeners: new Set(),

  get SB() {
    return BetterAnnotations;
  },

  plugin(id) {
    return this.PLUGINS.find(p => p.id === id) || null;
  },

  /** Active plugins as { id, name, source }. */
  activePlugins() {
    return this.active.map(id => this.plugin(id)).filter(Boolean);
  },

  /** Observers (the settings page): called when the list or the warning changes. */
  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  emit() {
    for (const fn of [...this._listeners]) {
      try {
        fn();
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  async init() {
    const SB = this.SB;
    const AM = SB.Updates.addonManager();
    const ids = this.PLUGINS.map(p => p.id);
    const addons = await AM.getAddonsByIDs(ids);
    this.active = addons.filter(a => a && a.isActive).map(a => a.id);
    // A warning closed for a plugin that is off now comes back when it is on again
    const dismissed = (SB.setting("conflictDismissed") || []).filter(id => this.active.includes(id));
    if (dismissed.length !== (SB.setting("conflictDismissed") || []).length) {
      await SB.Store.setSetting("conflictDismissed", dismissed);
    }
    this._listener = {
      onEnabled: a => this.changed(a, true),
      onInstalled: a => this.changed(a, a.isActive),
      onDisabled: a => this.changed(a, false),
      onUninstalled: a => this.changed(a, false),
    };
    AM.addAddonListener(this._listener);
    this.scheduleDialog();
  },

  shutdown() {
    try {
      if (this._listener) {
        this.SB.Updates.addonManager().removeAddonListener(this._listener);
      }
    }
    catch (e) {}
    this._listener = null;
    this._timer = null;
  },

  /** A plugin of the list was turned on or off, installed or removed. */
  async changed(addon, on) {
    const SB = this.SB;
    if (!addon || !this.plugin(addon.id)) {
      return;
    }
    const id = addon.id;
    this.active = this.active.filter(x => x !== id);
    if (on) {
      this.active.push(id);
    }
    // Turned off or on again: the warning shows again the next time it is on
    const dismissed = (SB.setting("conflictDismissed") || []).filter(x => x !== id);
    await SB.Store.setSetting("conflictDismissed", dismissed);
    this.emit();
    if (on) {
      this.scheduleDialog();
    }
  },

  /** “X is active and also changes …” for one or more plugins. */
  warningText(plugins) {
    const names = this.SB.listText(plugins.map(p => p.name));
    return this.SB.S(plugins.length > 1 ? "conflictWarningMany" : "conflictWarningOne", { names });
  },

  /** Plugins whose color names can be taken over now. */
  importablePlugins() {
    return this.activePlugins().filter(p => this.readColors(p.source));
  },

  /** Is the warning in the settings to be shown? */
  warningVisible() {
    const dismissed = this.SB.setting("conflictDismissed") || [];
    return this.active.some(id => !dismissed.includes(id));
  },

  /** Close the warning for the plugins active now. */
  async dismiss() {
    await this.SB.Store.setSetting("conflictDismissed", this.active.slice());
    this.emit();
  },

  scheduleDialog() {
    const warned = this.SB.setting("conflictWarned") || [];
    if (!this.active.some(id => !warned.includes(id)) || this._timer) {
      return;
    }
    this._timer = this.SB.setTimeout(() => {
      this._timer = null;
      this.showDialog().catch(e => this.SB.logError(e));
    }, this.DIALOG_DELAY_MS);
  },

  /** Once per plugin: what can happen and what to do. */
  async showDialog() {
    const SB = this.SB;
    const S = (k, a) => SB.S(k, a);
    const warned = SB.setting("conflictWarned") || [];
    const plugins = this.activePlugins().filter(p => !warned.includes(p.id));
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!plugins.length || !win) {
      return;
    }
    await SB.Store.setSetting("conflictWarned", warned.concat(plugins.map(p => p.id)));
    const importable = plugins.find(p => this.readColors(p.source));
    const ps = Services.prompt;
    let flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1_DEFAULT;
    if (importable) {
      flags += ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING;
    }
    // Button 1 (also Esc): close
    const text = this.warningText(plugins)
      + (importable ? "\n\n" + S("conflictImportText", { name: importable.name }) : "")
      + "\n\n" + S("conflictDialogNote");
    const choice = ps.confirmEx(win, S("conflictDialogTitle"), text, flags,
      S("btnManagePlugins"), S("btnCloseDialog"), importable ? S("btnImportNames") : null, null, {});
    if (choice === 0) {
      this.openPluginManager();
    }
    else if (choice === 2 && importable) {
      const profile = await this.importNames(importable.id);
      if (profile) {
        Services.prompt.alert(win, S("conflictDialogTitle"), S("conflictImported", { name: profile.name }));
      }
    }
  },

  /** Zotero's plugin manager (Tools → Plugins). */
  openPluginManager() {
    try {
      Zotero.getMainWindow().ZoteroStandalone.openAddonsWindow();
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  /**
   * Color names stored by the other plugin as profile colors
   * [{ color, label }], or null if there is nothing to take over.
   */
  readColors(source) {
    const SB = this.SB;
    const get = (key, global) => {
      try {
        return Zotero.Prefs.get(key, global);
      }
      catch (e) {
        return undefined;
      }
    };
    const parse = (raw) => {
      try {
        return raw ? JSON.parse(raw) : null;
      }
      catch (e) {
        return null;
      }
    };
    let colors = [];
    if (source === "hcd") {
      // Labels of Zotero's eight colors, in the plugin's order
      const order = String(get("extensions.highlightdescriptions.color_order", true) || "")
        .split(",").map(s => SB.normalize(s.trim())).filter(Boolean);
      const all = order.concat(SB.STOCK_COLORS.filter(c => !order.includes(c)));
      colors = all.filter(c => SB.STOCK_COLORS.includes(c)).map(color => {
        const label = get("extensions.highlightdescriptions.color_" + color.slice(1), true);
        return { color, label: typeof label === "string" ? label.trim() : "" };
      });
      // The labels the plugin shows (its defaults included)
      if (!colors.some(c => c.label)) {
        return null;
      }
    }
    else if (source === "acc") {
      // { yellow: { hex, name }, … }; without a stored setting there is nothing of the user's
      const config = parse(get("extensions.annotationColorCustomizer.colorConfig"));
      if (!config || typeof config !== "object") {
        return null;
      }
      colors = Object.values(config).map(c => ({ color: SB.normalize(c && c.hex), label: String((c && c.name) || "").trim() }));
    }
    else if (source === "jec") {
      // A palette of own colors without names, after Zotero's colors
      const palette = parse(get("extensions.zotero.jec.custom-palette", true));
      if (!Array.isArray(palette) || !palette.length) {
        return null;
      }
      colors = SB.STOCK_COLORS.map(color => ({ color, label: "" }))
        .concat(palette.map(c => ({ color: SB.normalize(c), label: "" })));
    }
    colors = colors.filter(c => c.color);
    return colors.length ? colors : null;
  },

  /** Take over the color names of another plugin as a new profile; returns it. */
  async importNames(id) {
    const p = this.plugin(id);
    const colors = p && this.readColors(p.source);
    if (!colors) {
      return null;
    }
    const imported = await this.SB.Store.importProfiles({ name: p.name, colors: colors.map(c => Object.assign({ enabled: true }, c)) });
    return imported[0] || null;
  },
};
