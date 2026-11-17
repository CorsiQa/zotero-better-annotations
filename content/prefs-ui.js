/* Better Annotations – settings page
 *
 * Builds the user interface in Zotero's settings window: profile selection,
 * color list with drag and drop, color picker, save/discard, options
 * and import/export.
 */

/* global Zotero, Services, ChromeUtils, BetterAnnotations */

BetterAnnotations.Prefs = {
  init(win) {
    try {
      const doc = win.document;
      const root = doc.getElementById("bac-root");
      if (!root || root.hasAttribute("data-ready")) {
        return;
      }
      const pane = new BetterAnnotations.PaneController(win, doc, root);
      this.current = pane; // for debugging
      pane.start();
    }
    catch (e) {
      BetterAnnotations.logError(e);
    }
  },
};

BetterAnnotations.PaneController = class {
  constructor(win, doc, root) {
    this.win = win;
    this.doc = doc;
    this.root = root;
    this.SB = BetterAnnotations;
    this.Store = BetterAnnotations.Store;
    this.usage = new Map();
    this.picker = null;
    this.notice = null;
  }

  S(key, args) {
    return this.SB.S(key, args);
  }

  // -------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------

  /** HTML element: h("div", { class, text, title, style, on: {click} }, ...children) */
  h(tag, attrs, ...children) {
    const el = this.doc.createElementNS("http://www.w3.org/1999/xhtml", tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) {
        continue;
      }
      if (k === "class") {
        el.className = v;
      }
      else if (k === "text") {
        el.textContent = v;
      }
      else if (k === "style") {
        el.style.cssText = v;
      }
      else if (k === "on") {
        for (const [type, fn] of Object.entries(v)) {
          el.addEventListener(type, fn);
        }
      }
      else if (k === "value") {
        el.value = v;
      }
      else if (k === "checked") {
        el.checked = !!v;
      }
      else if (k === "disabled") {
        el.disabled = true;
      }
      else {
        el.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) {
        continue;
      }
      el.append(typeof c === "string" ? this.doc.createTextNode(c) : c);
    }
    return el;
  }

  /** Native Zotero button (XUL), matching the rest of the settings. */
  button(label, onCommand, { disabled = false, tooltip = null } = {}) {
    const b = this.doc.createXULElement("button");
    b.setAttribute("label", label);
    if (tooltip) {
      b.setAttribute("tooltiptext", tooltip);
    }
    if (disabled) {
      b.setAttribute("disabled", "true");
    }
    b.addEventListener("command", () => onCommand());
    return b;
  }

  setDisabled(el, disabled) {
    if (disabled) {
      el.setAttribute("disabled", "true");
    }
    else {
      el.removeAttribute("disabled");
    }
  }

  checkbox(label, checked, onChange) {
    const cb = this.doc.createXULElement("checkbox");
    cb.setAttribute("label", label);
    if (checked) {
      cb.setAttribute("checked", "true");
    }
    cb.addEventListener("command", () => onChange(cb.checked ?? cb.hasAttribute("checked")));
    return cb;
  }

  menulist(items, selected, onSelect) {
    const doc = this.doc;
    const ml = doc.createXULElement("menulist");
    const popup = doc.createXULElement("menupopup");
    ml.append(popup);
    for (const it of items) {
      if (it === "-") {
        popup.append(doc.createXULElement("menuseparator"));
        continue;
      }
      const mi = doc.createXULElement("menuitem");
      mi.setAttribute("label", it.label);
      mi.setAttribute("value", it.value);
      if (it.image) {
        mi.classList.add("menuitem-iconic");
        mi.setAttribute("image", it.image);
      }
      if (it.disabled) {
        mi.setAttribute("disabled", "true");
      }
      if (it.indent) {
        // Indent in the list only; the closed menu shows the name without spaces
        mi.style.paddingInlineStart = (12 + 16 * it.indent) + "px";
      }
      if (it.value === selected) {
        mi.setAttribute("selected", "true");
      }
      popup.append(mi);
    }
    ml.addEventListener("command", () => {
      const item = ml.selectedItem;
      onSelect(item ? item.getAttribute("value") : null);
    });
    this.SB.setTimeout(() => this.selectMenu(ml, selected), 0);
    return ml;
  }

  selectMenu(ml, value) {
    try {
      const item = Array.from(ml.querySelectorAll("[value]")).find(i => i.getAttribute("value") === value);
      if (item) {
        ml.selectedItem = item;
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
  }

  /** Section in the style of Zotero's settings. */
  section(title, ...children) {
    const doc = this.doc;
    const box = doc.createXULElement("groupbox");
    box.classList.add("bac-section");
    const label = doc.createXULElement("label");
    label.append(this.h("h2", { text: title }));
    box.append(label, ...children);
    return box;
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -------------------------------------------------------------------
  // Startup and state
  // -------------------------------------------------------------------
  start() {
    this.root.setAttribute("data-ready", "1");
    this.injectStyle();
    // Opened from a document (“Manage Profiles…”): show its profile
    this.loadDraft(this.SB.Profiles.currentId());
    const pending = this.Store.pendingDraft;
    this.Store.pendingDraft = null;
    if (pending && pending.baseId === this.baseId) {
      this.draft = pending.draft;
      this.notice = this.S("restoredDraft");
    }
    this.render();
    this.loadUsage();
    this._unlisten = this.Store.onChange(what => this.onStoreChange(what));
    this._unlistenUpdates = this.SB.Updates.onChange(() => this.updateBadge());
    this.checkForUpdates();
    // The selection in the main window can change while the settings are open
    let focusTimer = null;
    this.win.addEventListener("focus", (e) => {
      if (e.target !== this.win && e.target !== this.doc) {
        return;
      }
      this.win.clearTimeout(focusTimer);
      focusTimer = this.win.setTimeout(() => {
        if (!this.picker && !this.popover && !this.root.classList.contains("bac-busy")) {
          this.refreshScopes();
        }
      }, 250);
    });
    // Ask before the settings window closes with unsaved changes
    this.win.addEventListener("close", (e) => this.onWindowClose(e));
    this.win.addEventListener("unload", () => {
      this._unlisten();
      this._unlistenUpdates();
      this.closePicker(false);
      this.closePopover();
      if (this.isDirty()) {
        this.Store.pendingDraft = { baseId: this.baseId, draft: this.clone(this.draft) };
      }
    });
  }

  onWindowClose(e) {
    if (this._closing || !this.isDirty()) {
      return;
    }
    e.preventDefault();
    const choice = this.askUnsaved();
    if (choice === 1) {
      return;
    }
    const close = () => {
      this._closing = true;
      this.win.close();
    };
    if (choice === 2) {
      this.loadDraft(this.baseId);
      close();
      return;
    }
    this.save({ rerender: false }).then((ok) => {
      if (ok) {
        close();
      }
    });
  }

  loadDraft(id) {
    const p = this.Store.getProfile(id) || this.Store.zoteroPreset();
    this.baseId = p.id;
    this.draft = this.clone(p);
    for (const c of this.draft.colors) {
      c.label = typeof c.label === "string" ? c.label : "";
      c.enabled = c.enabled !== false;
      c.description = typeof c.description === "string" ? c.description : "";
    }
    this.snapshot = this.serialize(this.draft);
  }

  serialize(d) {
    return JSON.stringify(d.colors.map(c => [c.id, c.color, c.label, c.enabled !== false, this.SB.cleanDescription(c.description)]));
  }

  isDirty() {
    return this.serialize(this.draft) !== this.snapshot;
  }

  isPreset() {
    return this.Store.isPreset(this.baseId);
  }

  /** Colors in use; with “Profile per Document” only the annotations of the profile shown. */
  async loadUsage() {
    this.usage = await this.SB.Library.getColorUsage(null, this.SB.Profiles.enabled() ? this.baseId : null);
    this.updateUsage();
    if (this.recolorBox) {
      this.renderRecolor();
    }
  }

  // -------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------
  render() {
    this.closePicker(false);
    this.closePopover();
    const style = this.root.querySelector("style");
    this.root.replaceChildren();
    if (style) {
      this.root.append(style);
    }
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const settings = this.Store.data.settings;
    const set = (key, value, after) => this.own(() => this.Store.setSetting(key, value)).then(after || (() => {}));

    // --- Header: name, version, update status, language -------------------
    this.root.append(this.renderHeader());

    // --- Tabs -----------------------------------------------------------
    const tabs = [["colors", "tabColors"], ["display", "tabDisplay"], ["library", "tabLibrary"], ["export", "tabExport"],
      ["advanced", "tabAdvanced"], ["about", "tabAbout"]];
    if (!tabs.some(([id]) => id === this.tab)) {
      this.tab = tabs.some(([id]) => id === settings.uiTab) ? settings.uiTab : "colors";
    }
    this.tabButtons = new Map();
    this.panels = new Map();
    const nav = this.h("div", { class: "bac-tabs", role: "tablist" });
    for (const [id, key] of tabs) {
      const b = this.h("button", {
        class: "bac-tab",
        role: "tab",
        "data-tab": id,
        on: { click: () => this.showTab(id) },
      }, S(key));
      this.tabButtons.set(id, b);
      nav.append(b);
      this.panels.set(id, this.h("div", { class: "bac-panel", role: "tabpanel", "data-tab": id }));
    }
    this.root.append(nav, ...this.panels.values());

    // --- Tab “Colors & Profiles” -----------------------------------------
    const colors = this.panels.get("colors");
    const profileItems = [
      { value: "standard", label: S("presetZotero") },
    ];
    if (this.Store.getProfiles().length) {
      profileItems.push("-");
      for (const p of this.Store.getProfiles()) {
        profileItems.push({ value: p.id, label: p.name });
      }
    }
    this.profileMenu = this.menulist(profileItems, this.baseId, id => this.onSelectProfile(id));
    this.profileMenu.classList.add("bac-profile-menu");
    const notices = [];
    if (this.isPreset()) {
      notices.push(S("presetInfo", { name: this.draft.name }));
    }
    const perDocument = SB.Profiles.enabled();
    // Messages appear at the top of the active tab
    const message = this.notice;
    this.notice = null;
    // Buttons wrap only in groups that belong together
    const group = (...items) => this.h("span", { class: "bac-group" }, ...items);
    colors.append(this.card(S("secProfile"), S(perDocument ? "infoProfilePerDoc" : "infoProfile"), S(perDocument ? "cardProfilePerDoc" : "cardProfile"),
      this.h("div", { class: "bac-bar bac-profile-row" },
        this.profileMenu,
        group(
          this.button(S("btnNewProfile"), () => this.newProfile()),
          this.button(S("btnRename"), () => this.renameProfile(), { disabled: this.isPreset() }),
          this.button(S("btnDelete"), () => this.deleteProfile(), { disabled: this.isPreset() }),
        ),
      ),
      this.h("div", { class: "bac-bar bac-profile-row" },
        group(this.button(S(this.libraryOpen ? "btnHideTemplates" : "btnTemplates"), () => {
          this.libraryOpen = !this.libraryOpen;
          this.render();
        })),
        group(
          this.button(S("btnImport"), () => this.importProfiles()),
          this.button(S("btnExport"), () => this.exportProfiles()),
        ),
      ),
      perDocument ? this.defaultProfileField() : null,
      perDocument ? this.hint(S("profilePerDocHint")) : null,
      this.libraryOpen ? this.renderLibrary() : null,
      ...notices.map(n => this.h("div", { class: "bac-notice", text: n })),
    ));

    this.listEl = this.h("div", { class: "bac-list", role: "list" });
    this.renderList();
    this.addBtn = this.button(S("btnAddColor"), () => this.addColor());
    this.statusEl = this.h("span", { class: "bac-status" });
    this.saveBtn = this.button(S("btnSave"), () => this.save());
    this.saveBtn.classList.add("bac-save");
    this.discardBtn = this.button(S("btnDiscard"), () => this.discard());
    const paletteBtn = this.button(S("btnApplyPalette"), () => this.openPaletteMenu(paletteBtn), { tooltip: S("applyPaletteHint") });
    colors.append(this.card(S("secColors"), S("infoColors") + (SB.descriptionsOn() ? "\n\n" + S("infoDescriptions") : ""), S("cardColors"),
      this.listEl,
      this.h("div", { class: "bac-bar bac-end" }, this.addBtn),
      this.h("div", { class: "bac-bar bac-actions" },
        this.button(S("btnResetPlus"), () => this.resetToPlus()),
        paletteBtn,
      ),
    ));

    // --- Tab “Appearance” --------------------------------------------
    const display = this.panels.get("display");
    const number = (key, min, max) => this.h("input", {
      class: "bac-number",
      type: "number",
      min: String(min),
      max: String(max),
      value: String(SB.setting(key)),
      on: {
        change: (e) => {
          const v = this.Store.clampInt(e.target.value, min, max, SB.DEFAULT_SETTINGS[key]);
          e.target.value = String(v);
          set(key, v, () => this.renumber());
        },
      },
    });
    const fixedLayout = SB.setting("popupLayout") === "fixed";
    const layoutMenu = this.menulist(
      [{ value: "flow", label: S("layoutFlow") }, { value: "fixed", label: S("layoutFixed") }],
      SB.setting("popupLayout"),
      v => set("popupLayout", v, () => this.render()), // the number field depends on the layout
    );
    display.append(
      this.card(S("secContextMenu"), S("infoContextMenu"), S("cardContextMenu"),
        this.field(S("optMenuLimit"), number("menuLimit", 1, 20)),
        this.hint(S("optMenuLimitHint")),
        this.h("div", { class: "bac-checks" },
          this.checkbox(S("optShowMenuEntry"), settings.showMenuEntry !== false, v => set("showMenuEntry", v))),
      ),
      this.card(S("secPopup"), S("infoPopup"), S("cardPopup"),
        this.field(S("optPopupLayout"), layoutMenu),
        // The fixed number needs more explanation: an “i” instead of a sentence
        fixedLayout
          ? this.field(S("optPopupFixedColumns"), number("popupFixedColumns", 4, 17), S("optPopupFixedHint"))
          : this.field(S("optPopupColumns"), number("popupColumns", 4, 16)),
        fixedLayout ? null : this.hint(S("optPopupColumnsHint")),
        this.h("div", { class: "bac-checks" },
          this.checkbox(S("optShowPopupButton"), settings.showPopupButton !== false, v => set("showPopupButton", v)),
          this.checkbox(S("optInstantTip"), settings.instantTooltip !== false, v => set("instantTooltip", v))),
      ),
    );
    this.toolbarBox = this.h("div");
    this.sectionBox = this.h("div");
    display.append(
      this.card(S("secToolbar"), S("infoToolbar"), S("cardToolbar"), this.toolbarBox),
      this.card(S("secSidebar"), S("infoItemPane"), S("cardSidebar"), this.sectionBox),
    );
    this.renderToolbarCard();
    this.renderSectionCard();

    // --- Tab “Tags & Library” --------------------------------------------
    const library = this.panels.get("library");
    this.recolorBox = this.h("div");
    this.backupBox = this.h("div");
    this.historyBox = this.h("div");
    library.append(
      this.card(S("secRecolor"), S("infoRecolor"), S("cardRecolor"), this.recolorBox),
      this.card(S("secBackups"), S("infoBackups"), S("backupIntro"), this.backupBox),
      this.card(S("secHistory"), S("infoHistory"), S("historyIntro"), this.historyBox),
    );
    this.renderRecolor();
    this.renderBackups();
    this.renderHistory();

    // --- Tab “Export” ----------------------------------------------------
    this.exportBox = this.h("div");
    this.panels.get("export").append(this.card(S("secExport"), S("infoExport"), S("exportIntro"), this.exportBox));
    this.renderExport();

    // --- Tab “Advanced”: functions that are off by default ----------------
    this.descBox = this.h("div");
    this.tagsBox = this.h("div");
    this.docProfileBox = this.h("div");
    this.panels.get("advanced").append(
      this.h("div", { class: "bac-hint bac-tab-intro", text: S("advancedIntro") }),
      this.card(S("secDescriptions"), S("infoDescriptionsCard"), S("descriptionsIntro"), this.descBox),
      this.card(S("secTags"), S("infoTags"), S("tagsIntro"), this.tagsBox),
      this.card(S("secDocProfile"), S("infoDocProfile"), S("docProfileIntro"), this.docProfileBox),
    );
    this.renderDescriptionsCard();
    this.renderTags();
    this.renderDocProfiles();

    // --- Tab “About” -----------------------------------------------------
    const P = SB.PROJECT;
    const link = (label, url) => this.button(label, () => this.openURL(url));
    this.panels.get("about").append(
      this.card(S("secAbout"), null, null,
        ...String(S("aboutText")).split("\n\n").map(t => this.h("p", { class: "bac-about-text", text: t })),
        this.h("div", { class: "bac-hint", text: S("versionLabel", { v: SB.version || "?" }) + " · "
          + S("aboutCompat", { min: P.zoteroMin, max: P.zoteroMax }) + " · " + S("aboutLicense", { license: P.license })
            + (P.author ? " · " + S("aboutAuthor", { author: P.author }) : "") }),
      ),
      this.card(S("secLinks"), null, null,
        this.h("div", { class: "bac-bar" },
          link(S("btnDocs"), P.docs),
          link(S("btnReleaseNotes"), P.releases),
          link(S("btnReportIssue"), P.bugReport),
          link(S("btnFeatureRequest"), P.featureRequest),
          link(S("btnSourceCode"), P.repo),
        ),
      ),
      this.card(S("secCredits"), null, S("aboutCredits"),
        this.h("ul", { class: "bac-credits" }, P.credits.map(([name, author, url, key]) => this.h("li", {},
          this.h("a", {
            href: url,
            on: {
              click: (e) => {
                e.preventDefault();
                this.openURL(url);
              },
            },
          }, name),
          " (" + author + "): " + S(key)))),
      ),
      // One sentence is enough here: no “i”
      this.card(S("secData"), null, S("infoData"),
        this.h("div", { class: "bac-bar" },
          this.h("span", { class: "bac-hint bac-grow" }, S("storageLocation") + " ", this.h("code", { class: "bac-path", text: this.Store.dir })),
          this.button(S("btnShowFolder"), () => this.showFolder())),
      ),
      this.card(S("secFullBackup"), S("infoFullBackup"), S("fullBackupIntro"),
        this.h("div", { class: "bac-bar" },
          this.button(S("btnFullBackup"), () => this.saveFullBackup()),
          this.button(S("btnFullRestore"), () => this.loadFullBackup()),
        ),
      ),
    );

    // Save bar for the profile: appears in every tab while there are unsaved
    // changes and stays at the bottom of the visible area
    this.actionsBar = this.h("div", { class: "bac-bar bac-savebar", role: "region", "aria-label": S("unsaved") },
      this.statusEl,
      this.h("span", { class: "bac-spacer" }),
      this.discardBtn,
      this.saveBtn,
    );
    this.root.append(this.actionsBar);

    if (message) {
      const panel = this.panels.get(this.tab);
      panel.insertBefore(this.h("div", { class: "bac-notice bac-notice-top", text: message }), panel.firstChild);
    }
    this.showTab(this.tab, false);
    this.updateDirty();
  }

  /** Strings of a template in the current language. */
  templateText(t) {
    const SB = this.SB;
    if (t.builtin) {
      const labels = SB.S("plusLabels");
      return {
        name: SB.S("tplPlusName"),
        description: SB.S("tplPlusDesc"),
        labels: t.colors.map((c, i) => labels[i] || ""),
      };
    }
    return t.text[SB.lang] || t.text.en;
  }

  /** Template library: plugin default and ready-made profiles based on established frameworks. */
  renderLibrary() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const cards = (SB.TEMPLATES || []).map((t) => {
      const text = this.templateText(t);
      let source = S("librarySourceNone");
      if (t.builtin) {
        source = S("librarySourcePlugin");
      }
      else if (t.source) {
        source = S("librarySource", { source: t.source });
      }
      return this.h("div", { class: "bac-tpl" + (t.builtin ? " bac-tpl-builtin" : "") },
        this.h("div", { class: "bac-tpl-name", text: text.name }),
        this.h("div", { class: "bac-tpl-source", text: source }),
        this.h("div", { class: "bac-tpl-desc", text: text.description }),
        this.h("div", { class: "bac-chips" }, t.colors.map((c, i) => {
          const dot = this.h("span", { class: "bac-chip-dot" });
          dot.style.background = c;
          const label = text.labels[i];
          return label
            ? this.h("span", { class: "bac-chip" }, dot, label)
            : this.h("span", { class: "bac-chip bac-chip-empty" }, dot, S("chipEmpty"));
        })),
        this.h("div", { class: "bac-bar bac-end bac-tpl-actions" }, this.button(S("btnUseTemplate"), () => this.useTemplate(t))),
      );
    });
    return this.h("div", { class: "bac-library" },
      this.h("div", { class: "bac-library-title", text: S("libraryTitle") }),
      this.h("div", { class: "bac-hint", text: S("libraryIntro") }),
      this.h("div", { class: "bac-tpl-grid" }, cards),
      this.h("div", { class: "bac-bar bac-community" },
        this.h("span", { class: "bac-hint bac-grow", text: S("libraryCommunity") }),
        this.button(S("btnCommunity"), () => {}, { disabled: true, tooltip: S("comingSoonTip") }),
      ),
    );
  }

  uniqueProfileName(base) {
    let name = base;
    let n = 2;
    while (this.Store.isNameTaken(name)) {
      name = base + " " + n++;
    }
    return name;
  }

  async useTemplate(t) {
    const SB = this.SB;
    const text = this.templateText(t);
    if (!(await this.resolveUnsaved())) {
      return;
    }
    const name = this.promptName(this.S("dlgTemplateTitle"), this.S("dlgNameText"), this.uniqueProfileName(text.name));
    if (!name) {
      return;
    }
    const colors = t.colors.map((color, i) => ({ id: SB.uid("c"), color, label: text.labels[i] || "", enabled: true }));
    try {
      const saved = await this.own(() => this.Store.saveProfile({ id: SB.uid("p"), name, colors }));
      await this.afterNewProfile(saved);
      this.loadDraft(saved.id);
      this.libraryOpen = false;
      this.render();
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  /** Header with icon, name, version, update status and language selection. */
  renderHeader() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const icon = this.h("img", { class: "bac-logo", src: SB.rootURI + "content/icons/icon.svg", alt: "" });
    this.badge = this.h("span", { class: "bac-badge" });
    this.updateBtn = this.button(S("btnCheckUpdates"), () => this.onUpdateButton());
    const languageMenu = this.menulist(
      SB.LANGUAGES.map(([value, label]) => ({ value, label: value === "auto" ? S("langAuto") : label })),
      this.Store.data.settings.language || "auto",
      lang => this.onLanguage(lang),
    );
    languageMenu.classList.add("bac-lang");
    const header = this.h("div", { class: "bac-header" },
      icon,
      this.h("div", { class: "bac-head-main" },
        this.h("div", { class: "bac-head-title" },
          this.h("span", { class: "bac-name", text: S("pluginName") }),
          this.h("span", { class: "bac-version", text: "v" + (SB.version || "?") }),
          this.badge,
          this.info(S("infoUpdates")),
        ),
        this.h("div", { class: "bac-tagline", text: S("tagline") }),
        this.updateHint = this.h("div", { class: "bac-update-hint", hidden: true },
          this.updateHintText = this.h("span"),
          this.h("div", { class: "bac-bar bac-end" },
            this.button(S("btnEnableAutoUpdates"), () => this.onEnableAutoUpdates())),
        ),
      ),
      this.h("div", { class: "bac-head-side" },
        this.updateBtn,
        this.h("div", { class: "bac-lang-row" }, this.globeIcon(), languageMenu, this.info(this.S("infoGeneral"))),
      ),
    );
    this.updateBadge();
    return header;
  }

  globeIcon() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("class", "bac-globe");
    svg.setAttribute("aria-hidden", "true");
    const p = this.doc.createElementNS(NS, "path");
    p.setAttribute("d", "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM1.5 8h13M8 1.5c1.8 1.8 2.6 4 2.6 6.5S9.8 12.7 8 14.5M8 1.5C6.2 3.3 5.4 5.5 5.4 8s.8 4.7 2.6 6.5");
    p.setAttribute("style", "fill:none;stroke:currentColor;stroke-width:1.1");
    svg.append(p);
    return svg;
  }

  /** Card with title, optional info icon and optional short description. */
  /**
   * Card: a head (light gray) with title, optional “i” and a short
   * description, and a body whose rows are separated by lines across the
   * whole width. Hints (.bac-hint) belong to the row above them.
   */
  card(title, infoText, description, ...children) {
    const titleRow = this.h("div", { class: "bac-card-title" }, this.h("h3", { text: title }), infoText ? this.info(infoText) : null);
    const head = this.h("div", { class: "bac-card-head" }, titleRow,
      description ? this.h("div", { class: "bac-card-desc", text: description }) : null);
    const body = this.h("div", { class: "bac-card-body" });
    for (const child of children.flat().filter(Boolean)) {
      // Plain boxes that a render function fills later
      if (child.localName === "div" && !child.className) {
        child.classList.add("bac-box");
      }
      body.append(child);
    }
    const card = this.h("section", { class: "bac-card" }, head, body);
    this.syncCardBody(card);
    return card;
  }

  /** Hide the body of a card that has nothing to show (e.g. a function that is off). */
  syncCardBody(card) {
    const body = card && card.querySelector(":scope > .bac-card-body");
    if (!body) {
      return;
    }
    const empty = ![...body.children].some(c => !c.hidden && !(c.classList.contains("bac-box") && !c.childElementCount));
    body.hidden = empty;
    card.classList.toggle("bac-card-nobody", empty);
  }

  /**
   * On/off switch in the head of the card that contains `box`. A card that is
   * off is shown muted; its options are hidden.
   */
  setCardSwitch(box, on, label, onChange) {
    const card = box.closest(".bac-card");
    if (!card) {
      return;
    }
    const titleRow = card.querySelector(".bac-card-title");
    const title = titleRow.querySelector("h3");
    if (title && !title.id) {
      title.id = this.SB.uid("bac-h");
    }
    titleRow.querySelector(".bac-switch")?.remove();
    const sw = this.h("button", {
      class: "bac-switch",
      role: "switch",
      "aria-checked": on ? "true" : "false",
      "aria-label": label,
      "aria-describedby": title ? title.id : null,
      title: label,
      on: { click: () => onChange(!on) },
    }, this.h("span", { class: "bac-switch-knob", "aria-hidden": "true" }));
    titleRow.append(sw);
    card.classList.toggle("bac-card-off", !on);
  }

  /** Replace the content of a box; empty entries (null, false) are left out. */
  fill(box, ...children) {
    box.replaceChildren(...children.flat().filter(Boolean));
    this.syncCardBody(box.closest(".bac-card"));
  }

  /** Part of a card with a thin line above and an optional heading. */
  subsection(title, ...children) {
    return this.h("div", { class: "bac-subsec" },
      title ? this.h("h4", { class: "bac-subhead", text: title }) : null,
      ...children);
  }

  /** “Default profile” menu (profile per document): in the profile card and in “Advanced”. */
  defaultProfileField() {
    const Store = this.Store;
    const P = this.SB.Profiles;
    const items = Store.listForMenu().map(p => ({ value: p.id, label: p.name }));
    const menu = this.menulist(items, P.defaultId(), (id) => {
      if (id && id !== Store.data.activeProfileId) {
        this.own(() => Store.setDefault(id)).then(() => this.syncDefaultMenus(id)).catch(e => this.SB.logError(e));
      }
    });
    menu.classList.add("bac-default-menu");
    return this.field(this.S("optDefaultProfile"), menu);
  }

  /** Both default menus show the same profile (changes are made by this page, so no re-render). */
  syncDefaultMenus(id) {
    for (const ml of this.root.querySelectorAll(".bac-default-menu")) {
      this.selectMenu(ml, id);
    }
  }

  /** Label and control in two columns. */
  /** Row with a label on the left and its control on the right; info: text of a small “i”. */
  field(label, control, info) {
    return this.h("div", { class: "bac-field" },
      this.h("span", { class: "bac-field-label" }, this.h("label", { text: label }), info ? this.info(info) : null),
      control);
  }

  /** One sentence below an option. */
  hint(text) {
    return this.h("div", { class: "bac-hint", text });
  }

  /** Small “i” that shows an explanation on hover or focus. */
  info(text) {
    const pop = this.h("span", { class: "bac-info-pop", role: "tooltip" },
      String(text).split("\n\n").map(par => this.h("span", { class: "bac-info-par", text: par })));
    const icon = this.h("span", {
      class: "bac-info",
      tabindex: "0",
      role: "button",
      "aria-label": this.S("infoTitle"),
    }, "i", pop);
    // Fixed positioning keeps the box inside the visible settings area, so
    // neither Zotero's navigation on the left nor scroll containers cut it off.
    const place = () => {
      const margin = 8;
      const rootRect = this.root.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const viewWidth = this.win.innerWidth;
      const viewHeight = this.win.innerHeight;
      const minLeft = Math.max(rootRect.left, 0) + margin;
      const maxRight = Math.min(rootRect.right, viewWidth) - margin;
      const width = Math.max(200, Math.min(330, maxRight - minLeft));
      const left = Math.min(Math.max(iconRect.left - 10, minLeft), maxRight - width);
      Object.assign(pop.style, { position: "fixed", width: width + "px", left: left + "px", top: (iconRect.bottom + 7) + "px", right: "auto" });
      // Above the icon if there is not enough room below
      const height = pop.offsetHeight || 0;
      if (iconRect.bottom + 7 + height > viewHeight - margin && iconRect.top - 7 - height > margin) {
        pop.style.top = (iconRect.top - 7 - height) + "px";
      }
    };
    icon.addEventListener("mouseenter", place);
    icon.addEventListener("focus", place);
    return icon;
  }

  showTab(id, persist = true) {
    this.tab = id;
    for (const [key, panel] of this.panels) {
      panel.hidden = key !== id;
      this.tabButtons.get(key).classList.toggle("bac-tab-on", key === id);
      this.tabButtons.get(key).setAttribute("aria-selected", key === id ? "true" : "false");
    }
    if (persist && this.Store.data.settings.uiTab !== id) {
      this.own(() => this.Store.setSetting("uiTab", id));
    }
  }

  openURL(url) {
    try {
      Zotero.launchURL(url);
    }
    catch (e) {
      this.SB.logError(e);
    }
  }

  // --- Updates ---------------------------------------------------------
  updateBadge() {
    if (!this.badge) {
      return;
    }
    const S = (k, a) => this.S(k, a);
    const st = this.SB.Updates.state;
    const map = {
      idle: ["", ""],
      checking: [S("upChecking"), "busy"],
      current: [S("upCurrent"), "ok"],
      available: [S("upAvailable", { v: st.version }), "warn"],
      error: [S("upError"), "err"],
      installing: [S("upInstalling"), "busy"],
      installed: [S("upInstalled"), "ok"],
    };
    const [text, kind] = map[st.status] || map.idle;
    this.badge.textContent = text;
    this.badge.className = "bac-badge" + (kind ? " bac-badge-" + kind : "");
    this.badge.hidden = !text;
    if (st.status === "error") {
      this.badge.setAttribute("title", S("upErrorTip"));
    }
    else {
      this.badge.removeAttribute("title");
    }
    if (this.updateHint) {
      // Notice when Zotero does not install the update by itself
      const show = st.status === "available" && st.autoUpdate === false;
      this.updateHint.hidden = !show;
      this.updateHintText.textContent = show ? S("upAutoOffHint", { v: st.version }) : "";
    }
    if (this.updateBtn) {
      this.updateBtn.setAttribute("label", st.status === "available" ? S("btnInstallUpdate") : S("btnCheckUpdates"));
      this.setDisabled(this.updateBtn, st.status === "checking" || st.status === "installing" || st.status === "installed");
    }
  }

  /**
   * Check for updates when the settings open. If automatic updates are
   * allowed, the plugin installs a found update right away, as Zotero's
   * add-on manager does. Unsaved changes take precedence: then the
   * “Install Update” button is shown instead.
   */
  async checkForUpdates() {
    const U = this.SB.Updates;
    const st = U.state.status === "idle" ? await U.check() : U.state;
    if (st.status === "available" && st.autoUpdate === true && !this.isDirty()) {
      U.install();
    }
  }

  async onEnableAutoUpdates() {
    try {
      await this.SB.Updates.enableAutoUpdates();
      this.notice = this.S("upAutoEnabled");
      this.render();
    }
    catch (e) {
      this.SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  onUpdateButton() {
    const U = this.SB.Updates;
    if (U.state.status === "available") {
      U.install();
    }
    else {
      U.check();
    }
  }

  /** Mark own changes to the store so that the observer ignores them. */
  async own(fn) {
    this._self = (this._self || 0) + 1;
    try {
      return await fn();
    }
    finally {
      this._self--;
    }
  }

  onStoreChange(what) {
    if (this._self) {
      return;
    }
    // Changed in a context menu (toolbar button, section header)
    if (what === "settings") {
      if (this.toolbarBox && this.toolbarBox.isConnected) {
        this.renderToolbarCard();
      }
      if (this.sectionBox && this.sectionBox.isConnected) {
        this.renderSectionCard();
      }
    }
    // A description was edited elsewhere (separate window): take it over if nothing is pending here
    if (what === "profiles" && !this.isDirty() && this.Store.getProfile(this.baseId)
      && this.serialize(this.Store.getProfile(this.baseId)) !== this.snapshot) {
      this.loadDraft(this.baseId);
      if (this.listEl) {
        this.renderList();
        this.updateDirty();
      }
      return;
    }
    // Without “Profile per Document” the settings show the active profile, as in the reader
    if (what === "active" && !this.SB.Profiles.enabled() && this.Store.data.activeProfileId !== this.baseId) {
      if (this.isDirty()) {
        this.notice = this.S("externalSwitch", { name: this.SB.Profiles.name(this.Store.data.activeProfileId) });
      }
      else {
        this.loadDraft(this.Store.data.activeProfileId);
      }
      this.render();
      return;
    }
    if (what === "active" && this.SB.Profiles.enabled()) {
      this.syncDefaultMenus(this.SB.Profiles.defaultId());
    }
    // With it, the profile shown here is only for editing; other changes concern the document profiles
    if ((what === "active" || what === "rules" || what === "profiles") && this.docProfileBox && this.docProfileBox.isConnected) {
      this.renderDocProfiles();
    }
  }

  /** Color swatch as an image for XUL menu items. */
  swatchImage(color) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect x='1' y='1' width='14' height='14' rx='3' fill='"
      + color + "' stroke='rgba(0,0,0,0.25)'/></svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  // -------------------------------------------------------------------
  // Tags, recoloring, backups, history
  // -------------------------------------------------------------------
  get Library() {
    return this.SB.Library;
  }

  renderTags() {
    const S = (k, a) => this.S(k, a);
    const enabled = !!this.SB.setting("tagsEnabled");
    const n = this.Library.registry.size;
    this.setCardSwitch(this.tagsBox, enabled, S("optTagsEnabled"), v => this.onTagsToggle(v));
    if (!enabled) {
      // Tags added earlier can still be removed
      this.fill(this.tagsBox,
        n ? this.h("div", { class: "bac-bar" }, this.h("span", { class: "bac-hint bac-grow", text: S("tagsCount", { n }) }),
          this.button(S("btnRemoveTags"), () => this.removeTags())) : null,
      );
      return;
    }
    const prefix = this.h("input", {
      class: "bac-text",
      type: "text",
      value: this.SB.setting("tagPrefix") || "",
      maxlength: "40",
      on: { change: e => this.own(() => this.Store.setSetting("tagPrefix", e.target.value)) },
    });
    this.fill(this.tagsBox,
      this.field(S("optTagPrefix"), prefix),
      this.hint(S("tagPrefixHint")),
      this.h("div", { class: "bac-bar" },
        this.h("span", { class: "bac-hint bac-grow", text: S("tagsCount", { n }) }),
        this.button(S("btnApplyTags"), () => this.applyTags()),
        this.button(S("btnRemoveTags"), () => this.removeTags(), { disabled: !n }),
      ),
    );
  }

  async onTagsToggle(value) {
    if (value) {
      if (!this.confirmAction(this.S("dlgEnableTagsTitle"), this.S("dlgEnableTagsText"), this.S("dlgEnable"))) {
        this.renderTags();
        return;
      }
      await this.Library.ensureColorCache();
    }
    await this.own(() => this.Store.setSetting("tagsEnabled", value));
    this.renderTags();
  }

  // --- Profile per document: default profile and collection rules -----

  /** All collections for a menu: library names as headers, subcollections indented. */
  collectionItems() {
    const items = [];
    let libraries = [];
    try {
      libraries = Zotero.Libraries.getAll().filter(l => l.libraryType === "user" || l.libraryType === "group");
    }
    catch (e) {
      this.SB.logError(e);
    }
    for (const lib of libraries) {
      let colls = [];
      try {
        colls = Zotero.Collections.getByLibrary(lib.libraryID, true);
      }
      catch (e) {}
      if (!colls.length) {
        continue;
      }
      if (items.length) {
        items.push("-");
      }
      items.push({ value: "lib-" + lib.libraryID, label: lib.name, disabled: true });
      for (const c of colls) {
        items.push({ value: lib.libraryID + "/" + c.key, label: c.name, indent: (c.level || 0) + 1 });
      }
    }
    return items;
  }

  /** Path of a collection for messages: “Parent › Child”. */
  collectionPath(coll) {
    const names = [];
    for (let c = coll; c; c = c.parentID ? Zotero.Collections.get(c.parentID) : null) {
      names.unshift(c.name);
    }
    return names.join(" › ");
  }

  renderDocProfiles() {
    const S = (k, a) => this.S(k, a);
    const Store = this.Store;
    const P = this.SB.Profiles;
    this.setCardSwitch(this.docProfileBox, P.enabled(), S("optProfilesPerDocument"), v => this.onProfilesToggle(v));
    if (!P.enabled()) {
      this.fill(this.docProfileBox);
      return;
    }
    const profiles = Store.listForMenu();
    const profileItems = profiles.map(p => ({ value: p.id, label: p.name }));
    const rules = P.rules().map(r => Object.assign({}, r));
    const saveRules = () => this.own(() => Store.setRules(rules)).then(() => this.renderDocProfiles()).catch(e => this.SB.logError(e));
    const collections = this.collectionItems();
    const iconBtn = (text, label, onClick, disabled) => this.h("button", {
      class: "bac-icon-btn",
      title: label,
      "aria-label": label,
      disabled: disabled || null,
      on: { click: onClick },
    }, text);
    const rows = rules.map((rule, i) => {
      const coll = P.collectionOf(rule);
      const value = rule.lib + "/" + rule.key;
      const items = coll ? collections : [{ value, label: S("ruleMissingCollection") }, "-", ...collections];
      const collMenu = this.menulist(items, value, (v) => {
        const j = v ? v.indexOf("/") : -1;
        if (j > 0) {
          rule.lib = +v.slice(0, j);
          rule.key = v.slice(j + 1);
          saveRules();
        }
      });
      collMenu.classList.add("bac-rule-coll");
      collMenu.setAttribute("aria-label", S("ruleCollection"));
      if (coll) {
        collMenu.setAttribute("tooltiptext", this.collectionPath(coll)); // the full path; the menu shows the name
      }
      const profMenu = this.menulist(profileItems, rule.profileId, (id) => {
        rule.profileId = id;
        saveRules();
      });
      profMenu.classList.add("bac-rule-profile");
      profMenu.setAttribute("aria-label", S("ruleProfile"));
      const sub = this.checkbox(S("ruleSub"), rule.sub !== false, (v) => {
        rule.sub = v;
        saveRules();
      });
      const name = coll ? this.collectionPath(coll) : S("ruleMissingCollection");
      sub.classList.add("bac-rule-sub");
      return this.h("div", { class: "bac-rule", role: "listitem" },
        this.h("span", { class: "bac-rule-no", text: String(i + 1) }),
        collMenu,
        this.h("span", { class: "bac-rule-arrow", "aria-hidden": "true", text: "→" }),
        profMenu,
        iconBtn("↑", S("ruleUp", { name }), () => {
          [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
          saveRules();
        }, i === 0),
        iconBtn("↓", S("ruleDown", { name }), () => {
          [rules[i + 1], rules[i]] = [rules[i], rules[i + 1]];
          saveRules();
        }, i === rules.length - 1),
        iconBtn("✕", S("ruleRemove", { name }), () => {
          rules.splice(i, 1);
          saveRules();
        }),
        sub,
      );
    });
    const hasCollections = collections.some(c => c !== "-" && !c.disabled);
    const addBtn = this.button(S("btnAddRule"), () => {
      // Preset: the collection selected in the main window and the profile shown above
      let lib = null;
      let key = null;
      try {
        const sel = Zotero.getMainWindow().ZoteroPane.getSelectedCollection();
        if (sel) {
          lib = sel.libraryID;
          key = sel.key;
        }
      }
      catch (e) {}
      if (!key) {
        const first = collections.find(c => c !== "-" && !c.disabled);
        const j = first.value.indexOf("/");
        lib = +first.value.slice(0, j);
        key = first.value.slice(j + 1);
      }
      rules.push({ id: this.SB.uid("r"), lib, key, profileId: Store.getProfile(this.baseId) ? this.baseId : P.defaultId(), sub: true });
      saveRules();
    }, { disabled: !hasCollections });
    // Assign annotations without a profile tag in an area
    const scope = this.scopeControls("assign", () => {});
    this.assignScope = scope;
    if (!this.assignProfile || !Store.getProfile(this.assignProfile)) {
      this.assignProfile = P.currentId();
    }
    const assignTarget = this.menulist(profileItems, this.assignProfile, (v) => {
      this.assignProfile = v;
    });
    const count = this.h("div", { class: "bac-hint" });
    this.fill(this.docProfileBox,
      this.defaultProfileField(),
      this.hint(S("docProfileSummary")),
      this.checkbox(S("optProfileFilterDefault"), this.SB.setting("profileFilterDefault") === true,
        v => this.own(() => Store.setSetting("profileFilterDefault", v))),
      this.hint(S("hintFilterDefault")),
      this.checkbox(S("optProfileTagColor"), this.SB.setting("profileTagColor") !== false,
        v => this.own(() => Store.setSetting("profileTagColor", v)).then(() => P.syncTagColors())),
      this.hint(S("hintTagColor")),
      this.checkbox(S("optHideProfileTags"), this.SB.setting("hideProfileTags") !== false,
        v => this.own(() => Store.setSetting("hideProfileTags", v))),
      this.hint(S("hintHideProfileTags")),
      this.subsection(S("rulesTitle"),
        rows.length
          ? this.h("div", { class: "bac-rules", role: "list" }, rows)
          : this.h("div", { class: "bac-hint", text: hasCollections ? S("rulesEmpty") : S("rulesNoCollections") }),
        this.h("div", { class: "bac-bar" }, addBtn),
      ),
      this.subsection(S("assignTitle"),
        this.hint(S("assignIntro")),
        count,
        scope.el,
        this.field(S("assignTo"), assignTarget),
        this.h("div", { class: "bac-bar bac-end" }, this.button(S("btnAssignProfile"), () => this.assignProfileTags())),
      ),
    );
    this.Library.countProfileTags().then((n) => {
      count.textContent = S("profileTagsCount", { n });
    }).catch(e => this.SB.logError(e));
  }

  /** Card “Reader toolbar”: switch, warning, descriptions in the statistics. */
  renderToolbarCard() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const set = (key, value) => this.own(() => this.Store.setSetting(key, value));
    const on = SB.setting("showToolbarButton") !== false;
    this.setCardSwitch(this.toolbarBox, on, S("optToolbarButton"), async (v) => {
      await set("showToolbarButton", v);
      this.renderToolbarCard();
    });
    const shared = SB.Profiles.enabled();
    this.fill(this.toolbarBox,
      // The warning concerns profiles in one document (“Profile per Document”)
      on && shared ? this.checkbox(S("optSharedHint"), SB.setting("statsSharedHint") !== false, v => set("statsSharedHint", v)) : null,
      on && shared ? this.hint(S("hintSharedHint")) : null,
      on && SB.descriptionsOn()
        ? this.checkbox(S("optStatsDescriptions"), SB.setting("statsDescriptions") !== false, v => set("statsDescriptions", v))
        : null,
    );
  }

  /** Card “Sidebar”: switch, place of the button, warning, descriptions, own window. */
  renderSectionCard() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const set = (key, value) => this.own(() => this.Store.setSetting(key, value));
    const on = SB.setting("showItemPaneSection") !== false;
    this.setCardSwitch(this.sectionBox, on, S("optItemPaneSection"), async (v) => {
      await set("showItemPaneSection", v);
      this.renderSectionCard();
    });
    const placement = this.menulist(
      [{ value: "group", label: S("sidenavGroup") }, { value: "separate", label: S("sidenavSeparate") }],
      SB.setting("sidenavPlacement") === "separate" ? "separate" : "group",
      v => set("sidenavPlacement", v),
    );
    const shared = SB.Profiles.enabled();
    const desc = on && SB.descriptionsOn();
    this.fill(this.sectionBox,
      on ? this.field(S("optSidenavPlacement"), placement) : null,
      on ? this.hint(S("hintSidenavPlacement")) : null,
      on && shared ? this.checkbox(S("optSharedHint"), SB.setting("panelSharedHint") !== false, v => set("panelSharedHint", v)) : null,
      on && shared ? this.hint(S("hintSharedHint")) : null,
      desc ? this.checkbox(S("optSectionDescriptions"), SB.setting("sectionDescriptions") === true, v => set("sectionDescriptions", v)) : null,
      desc ? this.checkbox(S("optPopoutDescriptions"), SB.setting("popoutDescriptions") !== false, v => set("popoutDescriptions", v)) : null,
      on ? this.h("div", { class: "bac-bar" }, this.button(S("btnOpenPopout"), () => SB.Panel.openPopout())) : null,
    );
  }

  /** Card “Descriptions”: switch and where descriptions are shown. */
  renderDescriptionsCard() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const set = (key, value) => this.own(() => this.Store.setSetting(key, value));
    const on = SB.descriptionsOn();
    this.setCardSwitch(this.descBox, on, S("optDescriptions"), async (v) => {
      await set("descriptionsEnabled", v);
      this.render(); // the color list gets or loses its description fields
    });
    this.fill(this.descBox,
      on ? this.h("div", { class: "bac-hint bac-hint-row", text: S("descriptionsWhere") }) : null,
    );
  }

  /**
   * Turn “Profile per Document” on: new annotations get profile tags;
   * existing annotations without one can get the tag of their document's
   * profile. Turn it off: one profile for all documents again; the tags can
   * stay or be removed.
   */
  async onProfilesToggle(value) {
    const S = (k, a) => this.S(k, a);
    const P = this.SB.Profiles;
    if (value) {
      const choice = this.confirm3(S("dlgProfilesOnTitle"), S("dlgProfilesOnText", { profile: P.name(P.defaultId()) }),
        S("btnEnableAndAssign"), S("btnEnableOnly"), 0);
      if (choice === 1) {
        this.renderDocProfiles();
        return;
      }
      await this.own(() => this.Store.setSetting("profilesPerDocument", true));
      this.noticeProfilesChanged(true);
      if (choice === 0) {
        const changes = await this.Library.planProfileAssignByDocument();
        if (changes.length) {
          await this.runLibraryTask(() => this.Library.run("profileAssignAll", {}, changes));
          return;
        }
      }
      await P.syncTagColors();
      this.render();
      return;
    }
    const changes = await this.Library.planRemoveProfileTags();
    let remove = false;
    if (changes.length) {
      const choice = this.confirm3(S("dlgProfilesOffTitle"), S("dlgProfilesOffText", { n: changes.length }),
        S("btnKeepProfileTags"), S("btnRemoveProfileTags"), 0);
      if (choice === 1) {
        this.renderDocProfiles();
        return;
      }
      remove = choice === 2;
    }
    await this.own(() => this.Store.setSetting("profilesPerDocument", false));
    this.noticeProfilesChanged(false);
    if (remove) {
      await this.runLibraryTask(() => this.Library.run("profileRemoveAll", {}, changes));
      return;
    }
    this.render();
  }

  /** Status after turning “Profile per Document” on or off (also about label tags). */
  noticeProfilesChanged(on) {
    const SB = this.SB;
    const P = SB.Profiles;
    let text = this.S(on ? "noticeProfilesOn" : "noticeProfilesOff", { profile: P.name(P.defaultId()) });
    // Profiles of annotations change, label tags are not rewritten by themselves
    if (SB.setting("tagsEnabled") && this.Library.registry.size) {
      text += " " + this.S("noticeLabelTagsStale");
    }
    try {
      SB.notify(text);
    }
    catch (e) {
      SB.logError(e);
    }
  }

  async assignProfileTags() {
    const P = this.SB.Profiles;
    const id = this.assignProfile;
    const scope = this.assignScope.resolve();
    const changes = await this.Library.planProfileAssign(scope, id);
    if (!changes.length) {
      this.alert(this.S("assignNone"));
      return;
    }
    const text = this.S("dlgAssignText", { n: changes.length, scope: scope.label, tag: P.tagFor(id) });
    if (!this.confirmAction(this.S("dlgAssignTitle"), text, this.S("dlgAssign"))) {
      return;
    }
    await this.runLibraryTask(() => this.Library.run("profileAssign", { profile: P.name(id), scope: scope.label }, changes));
  }

  // --- Areas (document, selection, collection, library) ----------------

  /** Area selection for recoloring and export; remembers the choice per card. */
  scopeControls(key, onChange) {
    const S = (k, a) => this.S(k, a);
    const Library = this.Library;
    const ctx = Library.scopeContext();
    const options = Library.scopeOptions(ctx);
    this.scopeSel = this.scopeSel || {};
    let value = this.scopeSel[key];
    if (!options.some(o => o.value === value && !o.disabled)) {
      value = ["doc", "collection", "library", "all"].find(v => options.some(o => o.value === v && !o.disabled));
    }
    this.scopeSel[key] = value;
    const resolve = () => {
      const opt = options.find(o => o.value === this.scopeSel[key]);
      const scope = Object.assign({}, opt.scope);
      if (scope.type === "collection") {
        scope.sub = this.SB.setting("scopeSubcollections") !== false;
      }
      scope.label = opt.label;
      scope.name = opt.name;
      return scope;
    };
    const isCollection = v => v === "collection" || v === "parent";
    const sub = this.checkbox(S("optSubcollections"), this.SB.setting("scopeSubcollections") !== false, (v) => {
      this.own(() => this.Store.setSetting("scopeSubcollections", v)).then(() => onChange(resolve()));
    });
    sub.hidden = !isCollection(value);
    const menu = this.menulist(options, value, (v) => {
      this.scopeSel[key] = v;
      sub.hidden = !isCollection(v);
      onChange(resolve());
    });
    menu.classList.add("bac-scope-menu");
    const refresh = this.button(S("btnRefreshScope"), () => this.refreshScopes(), { tooltip: S("refreshScopeTip") });
    // Label left, menu and “Refresh” right; “with subcollections” below the menu
    const el = this.h("div", { class: "bac-field bac-scope" },
      this.h("span", { class: "bac-field-label" }, this.h("label", { text: S("scopeLabel") })),
      this.h("div", { class: "bac-inline" }, menu, refresh),
      this.h("span"),
      sub,
    );
    return { el, resolve };
  }

  /** Read the selection in the main window again (e.g. after switching collections). */
  refreshScopes() {
    if (this.recolorBox) {
      this.renderRecolor();
    }
    if (this.docProfileBox && this.SB.Profiles.enabled()) {
      this.renderDocProfiles();
    }
    if (this.exportBox) {
      this.renderExport();
    }
  }

  /** Menu “Profile:” for recoloring and export: all profiles or one profile. */
  profileFilter(key, onChange) {
    const S = (k, a) => this.S(k, a);
    this.profileSel = this.profileSel || {};
    const list = this.Store.listForMenu();
    if (this.profileSel[key] && !list.some(p => p.id === this.profileSel[key])) {
      this.profileSel[key] = "";
    }
    const items = [{ value: "", label: S("filterAllProfiles") }, "-", ...list.map(p => ({ value: p.id, label: p.name }))];
    const menu = this.menulist(items, this.profileSel[key] || "", (v) => {
      this.profileSel[key] = v || "";
      onChange(v || null);
    });
    return menu;
  }

  filterValue(key) {
    if (!this.SB.Profiles.enabled()) {
      return null;
    }
    return (this.profileSel && this.profileSel[key]) || null;
  }

  // --- Export of annotations ------------------------------------------

  renderExport() {
    const S = (k, a) => this.S(k, a);
    const SB = this.SB;
    const set = (key, value) => this.own(() => this.Store.setSetting(key, value));
    const scope = this.scopeControls("export", () => this.updateExportCount());
    this.exportScope = scope;
    const format = SB.setting("exportFormat");
    const images = this.checkbox(S("optExportImages"), SB.setting("exportImages") !== false, v => set("exportImages", v));
    images.hidden = format === "csv";
    // HTML shows the descriptions in the legend at the top
    const descriptions = this.checkbox(S("optExportDescriptions"), SB.setting("exportDescriptions") === true, v => set("exportDescriptions", v));
    descriptions.hidden = format === "html" || !SB.descriptionsOn();
    const formatMenu = this.menulist([
      { value: "xlsx", label: S("fmtXlsx") },
      { value: "csv", label: S("fmtCsv") },
      { value: "html", label: S("fmtHtml") },
    ], format, (v) => {
      set("exportFormat", v);
      images.hidden = v === "csv";
      descriptions.hidden = v === "html" || !SB.descriptionsOn();
      formatHint.textContent = S(v === "csv" ? "fmtCsvHint" : v === "html" ? "fmtHtmlHint" : "fmtXlsxHint");
    });
    const formatHint = this.h("div", { class: "bac-hint", text: S(format === "csv" ? "fmtCsvHint" : format === "html" ? "fmtHtmlHint" : "fmtXlsxHint") });
    const sortMenu = this.menulist([
      { value: "doc", label: S("sortDoc") },
      { value: "label", label: S("sortLabel") },
    ], SB.setting("exportSort"), v => set("exportSort", v));
    const profileMenu = this.profileFilter("export", () => this.updateExportCount());
    this.exportCount = this.h("div", { class: "bac-hint bac-count" });
    this.exportBtn = this.button(S("btnExportAnnotations"), () => this.exportAnnotations());
    this.fill(this.exportBox,
      scope.el,
      SB.Profiles.enabled() ? this.field(S("filterProfile"), profileMenu) : null,
      this.field(S("exportFormat"), formatMenu),
      formatHint,
      this.field(S("exportSort"), sortMenu),
      this.h("div", { class: "bac-checks" },
        images,
        descriptions,
        this.checkbox(S("optExportLabeled"), SB.setting("exportLabeledOnly") === true, (v) => {
          set("exportLabeledOnly", v).then(() => this.updateExportCount());
        }),
      ),
      this.h("div", { class: "bac-bar" }, this.exportCount, this.h("span", { class: "bac-spacer" }), this.exportBtn),
    );
    this.updateExportCount();
  }

  /** Show the number of annotations in the selected area. */
  async updateExportCount() {
    const token = (this._exportToken = (this._exportToken || 0) + 1);
    const scope = this.exportScope.resolve();
    const only = this.filterValue("export");
    const labeledOnly = this.SB.setting("exportLabeledOnly") === true;
    let n = 0;
    if (labeledOnly) {
      // Labels depend on the profile of each annotation
      n = await this.SB.Export.count(scope, { only, labeledOnly });
    }
    else {
      for (const count of (await this.Library.getColorUsage(scope, only)).values()) {
        n += count;
      }
    }
    if (token !== this._exportToken) {
      return;
    }
    this.exportCount.textContent = this.S("exportCount", { n });
    this.setDisabled(this.exportBtn, !n);
  }

  async exportAnnotations() {
    const SB = this.SB;
    const E = SB.Export;
    const scope = this.exportScope.resolve();
    const format = SB.setting("exportFormat");
    const only = this.filterValue("export");
    const profile = only ? SB.Profiles.profile(only) : this.Store.getActive();
    const ext = E.extension(format);
    const fileName = SB.safeFileName(scope.name) + " - " + this.S("fileAnnotations") + "." + ext;
    const filter = { xlsx: ["Excel", "*.xlsx"], csv: ["CSV", "*.csv"], html: ["HTML", "*.html; *.htm"] }[ext];
    const path = await this.pickFile(true, fileName, { title: this.S("btnExportAnnotations"), filters: [filter] });
    if (!path) {
      return;
    }
    this.root.classList.add("bac-busy");
    this.exportCount.textContent = this.S("working");
    try {
      const rows = await E.collect(scope, {
        labeledOnly: SB.setting("exportLabeledOnly") === true,
        images: format !== "csv" && SB.setting("exportImages") !== false,
        sort: SB.setting("exportSort"),
        only,
        onProgress: (n, total) => {
          if (this.exportCount && this.exportCount.isConnected) {
            this.exportCount.textContent = this.S("exportProgress", { n, total });
          }
        },
      });
      this.exportCount.textContent = this.S("working");
      if (!rows.length) {
        this.alert(this.S("exportNone"));
        return;
      }
      const n = await E.write(path, format, rows, {
        images: SB.setting("exportImages") !== false,
        descriptions: format !== "html" && SB.descriptionsOn() && SB.setting("exportDescriptions") === true,
        sort: SB.setting("exportSort"),
        profile: only ? profile.name : E.profileNames(rows),
        profileObj: profile,
        scope: scope.label,
        date: SB.formatDate(new Date().toISOString()),
      });
      this.notice = this.S("exportDone", { n, file: String(path).split(/[\\/]/).pop() });
      this.render();
      // Only after the file is complete and Zotero has drawn the page again
      SB.setTimeout(() => this.revealFile(path), 500);
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
    finally {
      this.root.classList.remove("bac-busy");
      if (this.exportCount && this.exportCount.isConnected) {
        this.updateExportCount();
      }
    }
  }

  /** Display name of a color: label in the editor, else in another profile, else the color name. */
  colorName(color) {
    const own = this.draft.colors.find(c => c.color === color);
    if (own && own.label.trim()) {
      return own.label.trim();
    }
    for (const p of [this.Store.getActive(), ...this.Store.getProfiles(), this.Store.plusPreset()]) {
      const entry = p.colors.find(c => c.color === color);
      if (entry && entry.label.trim()) {
        return this.S("colorInProfile", { label: entry.label.trim(), profile: p.name });
      }
    }
    return this.SB.stockName(color) || color;
  }

  renderRecolor() {
    const S = (k, a) => this.S(k, a);
    const box = this.recolorBox;
    const scope = this.scopeControls("recolor", () => this.fillRecolor());
    this.recolorScope = scope;
    this.recolorFromSlot = this.h("span", { class: "bac-slot" });
    this.recolorToSlot = this.h("span", { class: "bac-slot" });
    this.recolorTags = this.SB.setting("tagsEnabled") === true;
    this.recolorBtn = this.button(S("btnRecolor"), () => this.manualRecolor(), { disabled: true });
    const profileMenu = this.profileFilter("recolor", () => this.fillRecolor());
    this.fill(box,
      scope.el,
      this.SB.Profiles.enabled() ? this.field(S("filterProfile"), profileMenu) : null,
      this.field(S("recolorFrom"), this.recolorFromSlot),
      this.field(S("recolorTo"), this.recolorToSlot),
      this.isDirty() ? this.hint(S("recolorDraftHint")) : null,
      this.checkbox(S("optRecolorTags"), this.recolorTags, (v) => {
        this.recolorTags = v;
      }),
      this.h("div", { class: "bac-bar bac-end" }, this.recolorBtn),
    );
    this.fillRecolor();
  }

  /** Load the color lists for the selected area. */
  async fillRecolor() {
    const S = (k, a) => this.S(k, a);
    const token = (this._recolorToken = (this._recolorToken || 0) + 1);
    const scope = this.recolorScope.resolve();
    const usage = await this.Library.getColorUsage(scope, this.filterValue("recolor"));
    if (token !== this._recolorToken) {
      return;
    }
    const used = [...usage.entries()].sort((a, b) => b[1] - a[1]);
    const fromItems = used.map(([color, n]) => ({
      value: color,
      label: S("colorOption", { label: this.colorName(color), n }),
      image: this.swatchImage(color),
    }));
    // Target: colors from the editor (including unsaved ones), then other colors in use
    const toItems = this.draft.colors.map(c => ({
      value: c.color,
      label: c.label.trim() || this.SB.stockName(c.color) || c.color,
      image: this.swatchImage(c.color),
    }));
    const others = used.filter(([color]) => !this.draft.colors.some(c => c.color === color));
    if (others.length) {
      toItems.push("-", ...others.map(([color]) => ({ value: color, label: this.colorName(color), image: this.swatchImage(color) })));
    }
    if (!fromItems.some(i => i.value === this.recolorFrom)) {
      this.recolorFrom = fromItems[0] ? fromItems[0].value : null;
    }
    if (!toItems.some(i => i.value === this.recolorTo)) {
      this.recolorTo = this.draft.colors[0] ? this.draft.colors[0].color : null;
    }
    this.recolorFromSlot.replaceChildren(fromItems.length
      ? this.menulist(fromItems, this.recolorFrom, (v) => {
        this.recolorFrom = v;
      })
      : this.h("span", { class: "bac-hint", text: S("recolorNoAnnotations") }));
    this.recolorToSlot.replaceChildren(this.menulist(toItems, this.recolorTo, (v) => {
      this.recolorTo = v;
    }));
    this.setDisabled(this.recolorBtn, !fromItems.length);
  }

  renderBackups() {
    const S = (k, a) => this.S(k, a);
    const rows = this.Store.data.backups.map(b => this.h("div", { class: "bac-logrow" },
      this.h("span", {
        class: "bac-logtext",
        text: S("backupRow", {
          date: this.SB.formatDate(b.created),
          kind: S(b.kind === "initial" ? "backupKindInitial" : "backupKindManual"),
          n: b.count,
        }),
      }),
      this.button(S("btnRestore"), () => this.restoreBackup(b)),
    ));
    this.fill(this.backupBox,
      ...(rows.length ? rows : [this.h("div", { class: "bac-hint bac-hint-row", text: S("noBackups") })]),
      this.h("div", { class: "bac-bar bac-end" }, this.button(S("btnCreateBackup"), () => this.createBackup())),
    );
  }

  renderHistory() {
    const S = (k, a) => this.S(k, a);
    const rows = this.Library.history.map(e => this.h("div", { class: "bac-logrow" + (e.undone ? " bac-undone" : "") },
      this.h("span", { class: "bac-logtext", text: this.SB.formatDate(e.time) + " · " + this.Library.describe(e) }),
      e.undone
        ? this.h("span", { class: "bac-hint bac-undone-label", text: S("undone") })
        : this.button(S("btnUndo"), () => this.undoEntry(e)),
    ));
    this.fill(this.historyBox,
      ...(rows.length ? rows : [this.h("div", { class: "bac-hint bac-hint-row", text: S("historyEmpty") })]),
    );
  }

  /** Two buttons: action and cancel. Returns true if confirmed. */
  confirmAction(title, text, actionLabel) {
    const ps = Services.prompt;
    const flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1_DEFAULT;
    return ps.confirmEx(this.win, title, text, flags, actionLabel, this.S("dlgCancel"), null, null, {}) === 0;
  }

  /** Run long tasks, report the result and refresh the view. */
  async runLibraryTask(task) {
    this.root.classList.add("bac-busy");
    try {
      const res = await task();
      if (res) {
        let msg = this.S("opResult", { n: res.done });
        if (res.skipped) {
          msg += " " + this.S("opSkipped", { n: res.skipped });
        }
        this.notice = msg;
      }
    }
    catch (e) {
      this.SB.logError(e);
      this.notice = this.S("saveError", { msg: e.message });
    }
    finally {
      this.root.classList.remove("bac-busy");
    }
    await this.loadUsage();
    this.render();
  }

  async manualRecolor() {
    const from = this.recolorFrom;
    const to = this.recolorTo;
    if (!from || !to || from === to) {
      this.alert(this.S("nothingToDo"));
      return;
    }
    const scope = this.recolorScope.resolve();
    const pairs = [[from, to]];
    // Labels from the editor, so unsaved changes are used for tags as well
    const profile = this.clone(this.draft);
    const only = this.filterValue("recolor");
    const changes = await this.Library.planRecolor(pairs, { scope, tags: this.recolorTags, profile, only });
    if (!changes.length) {
      this.alert(this.S("nothingToDo"));
      return;
    }
    const toEntry = this.draft.colors.find(c => c.color === to);
    const newTag = toEntry && this.SB.isVisible(toEntry) ? this.Library.tagForLabel(toEntry.label) : null;
    let tagLine = this.S("recolorTagsOff");
    if (this.recolorTags) {
      tagLine = newTag ? this.S("recolorTagsOn", { tag: newTag }) : this.S("recolorTagsRemove");
    }
    const text = this.S("dlgManualRecolorText", {
      n: changes.length,
      scope: scope.label + (only ? " · " + this.SB.Profiles.name(only) : ""),
      from: this.colorName(from) + " (" + from + ")",
      to: this.colorName(to) + " (" + to + ")",
      tags: tagLine,
    });
    if (!this.confirmAction(this.S("dlgManualRecolorTitle"), text, this.S("dlgRecolor"))) {
      return;
    }
    const where = scope.label + (only ? " · " + this.SB.Profiles.name(only) : "");
    const params = this.Library.recolorParams(pairs, [this.colorName(from) + " → " + this.colorName(to) + " · " + where]);
    await this.runLibraryTask(() => this.Library.run("recolor", params, changes));
  }

  async applyTags() {
    const changes = await this.Library.planApplyTags();
    if (!changes.length) {
      this.alert(this.S("nothingToDo"));
      return;
    }
    const text = this.S("dlgApplyTagsText", { n: changes.length });
    if (!this.confirmAction(this.S("dlgApplyTagsTitle"), text, this.S("dlgContinue"))) {
      return;
    }
    await this.runLibraryTask(() => this.Library.run("tagsApply", {}, changes));
  }

  async removeTags() {
    const changes = this.Library.planRemoveTags();
    if (!changes.length) {
      this.alert(this.S("nothingToDo"));
      return;
    }
    const text = this.S("dlgRemoveTagsText", { n: changes.length });
    if (!this.confirmAction(this.S("dlgRemoveTagsTitle"), text, this.S("dlgContinue"))) {
      return;
    }
    await this.runLibraryTask(() => this.Library.run("tagsRemove", {}, changes));
  }

  async createBackup() {
    try {
      await this.Library.createBackup("manual");
      this.notice = this.S("backupCreated");
    }
    catch (e) {
      this.SB.logError(e);
      this.notice = this.S("saveError", { msg: e.message });
    }
    this.render();
  }

  async restoreBackup(backup) {
    let plan;
    try {
      plan = await this.Library.planRestore(backup);
    }
    catch (e) {
      this.SB.logError(e);
      this.alert(this.S("importError", { msg: e.message }));
      return;
    }
    if (!plan.changes.length) {
      this.alert(this.S("nothingToDo"));
      return;
    }
    const text = this.S("dlgRestoreText", { date: this.SB.formatDate(plan.created), n: plan.colorCount, m: plan.tagCount });
    if (!this.confirmAction(this.S("dlgRestoreTitle"), text, this.S("btnRestore").replace("…", ""))) {
      return;
    }
    await this.runLibraryTask(() => this.Library.run("restore", { created: plan.created }, plan.changes));
  }

  async undoEntry(entry) {
    const text = this.S("dlgUndoText", { desc: this.Library.describe(entry) });
    if (!this.confirmAction(this.S("dlgUndoTitle"), text, this.S("dlgUndo"))) {
      return;
    }
    await this.runLibraryTask(() => this.Library.undo(entry.id));
  }

  // -------------------------------------------------------------------
  // Apply palette
  // -------------------------------------------------------------------
  closePopover() {
    if (this.popover) {
      this.popover.cleanup();
      this.popover.el.remove();
      this.popover = null;
    }
  }

  openPaletteMenu(anchor) {
    if (this.popover) {
      this.closePopover();
      return;
    }
    this.closePicker(false);
    const S = (k, a) => this.S(k, a);
    const el = this.h("div", { class: "bac-popover", role: "menu" });
    for (const pal of this.SB.PALETTES) {
      const swatches = this.h("span", { class: "bac-mini" });
      for (const c of pal.colors) {
        const dot = this.h("span");
        dot.style.background = c;
        swatches.append(dot);
      }
      el.append(this.h("div", {
        class: "bac-pal-row",
        role: "menuitem",
        on: {
          click: () => {
            this.closePopover();
            this.applyPalette(pal);
          },
        },
      }, this.h("span", { class: "bac-pal-title", text: S(pal.key) }), swatches));
    }
    const recent = this.SB.setting("recentColors") || [];
    const recentDots = this.h("span", { class: "bac-mini" });
    for (let i = 0; i < 12; i++) {
      const dot = this.h("span", { class: recent[i] ? "" : "bac-empty-slot" });
      if (recent[i]) {
        dot.style.background = recent[i];
      }
      recentDots.append(dot);
    }
    el.append(this.h("div", {
      class: "bac-pal-row" + (recent.length ? "" : " bac-disabled"),
      role: "menuitem",
      title: recent.length ? null : S("recentEmpty"),
      on: {
        click: () => {
          if (!recent.length) {
            return;
          }
          this.closePopover();
          this.applyPalette({ colors: recent });
        },
      },
    }, this.h("span", { class: "bac-pal-title", text: S("palRecent") }), recentDots));
    el.append(this.h("div", { class: "bac-hint bac-pop-hint", text: S("applyPaletteHint") }));
    this.root.append(el);
    const rootRect = this.root.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    el.style.left = Math.max(0, Math.min(a.left - rootRect.left, rootRect.width - el.offsetWidth)) + "px";
    el.style.top = (a.top - rootRect.top - el.offsetHeight - 6) + "px";
    const onDown = (e) => {
      if (!el.contains(e.target) && !anchor.contains(e.target)) {
        this.closePopover();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        this.closePopover();
      }
    };
    this.doc.addEventListener("mousedown", onDown, true);
    this.doc.addEventListener("keydown", onKey, true);
    this.popover = {
      el,
      cleanup: () => {
        this.doc.removeEventListener("mousedown", onDown, true);
        this.doc.removeEventListener("keydown", onKey, true);
      },
    };
  }

  /** Map colors onto another palette by their position in the Zotero+ order. */
  applyPalette(pal) {
    const slotOf = (color) => {
      for (const p of [...this.SB.PALETTES.map(x => x.colors), ...this.SB.LEGACY_PALETTES]) {
        const i = p.indexOf(color);
        if (i >= 0) {
          return i;
        }
      }
      return -1;
    };
    const used = new Set();
    const assigned = new Map();
    for (const entry of this.draft.colors) {
      const slot = slotOf(entry.color);
      if (slot >= 0 && pal.colors[slot] && !used.has(pal.colors[slot])) {
        assigned.set(entry, pal.colors[slot]);
        used.add(pal.colors[slot]);
      }
    }
    const spare = pal.colors.filter(c => !used.has(c));
    for (const entry of this.draft.colors) {
      if (!assigned.has(entry) && spare.length) {
        assigned.set(entry, spare.shift());
      }
    }
    const taken = new Set(this.draft.colors.filter(e => !assigned.has(e)).map(e => e.color));
    for (const [entry, color] of assigned) {
      if (!taken.has(color)) {
        entry.color = color;
      }
    }
    this.flip(() => this.renderList());
    this.updateDirty();
  }

  renderList() {
    this.listEl.replaceChildren();
    for (const entry of this.draft.colors) {
      this.listEl.append(this.makeRow(entry));
    }
    this.renumber();
    this.updateUsage();
  }

  makeRow(entry) {
    const S = (k, a) => this.S(k, a);
    const row = this.h("div", { class: "bac-row", "data-id": entry.id, role: "listitem" });
    const handle = this.h("span", { class: "bac-handle", title: S("tipDrag"), text: "⠿", "aria-hidden": "true" });
    handle.addEventListener("pointerdown", e => this.startDrag(e, row));
    const visible = this.h("input", {
      class: "bac-visible",
      type: "checkbox",
      title: S("tipVisible"),
      "aria-label": S("tipVisible"),
      checked: entry.enabled !== false,
      on: {
        change: (e) => {
          entry.enabled = e.target.checked;
          this.renumber();
          this.updateDirty();
        },
      },
    });
    const pos = this.h("span", { class: "bac-pos" });
    const swatch = this.h("button", {
      class: "bac-swatch",
      title: S("tipSwatch", { color: entry.color }),
      "aria-label": S("tipSwatch", { color: entry.color }),
      on: { click: () => this.openPicker(entry, row) },
    });
    swatch.style.setProperty("background-color", entry.color, "important");
    const input = this.h("input", {
      class: "bac-label" + (entry.label === "" ? " bac-empty" : ""),
      type: "text",
      value: entry.label,
      placeholder: S("phEmpty"),
      maxlength: "200",
      on: {
        input: (e) => {
          entry.label = e.target.value;
          e.target.classList.toggle("bac-empty", entry.label === "");
          this.renumber();
          this.updateDirty();
        },
        keydown: (e) => {
          if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            this.moveEntry(entry.id, e.key === "ArrowUp" ? -1 : 1);
          }
        },
      },
    });
    const labelCol = this.h("div", { class: "bac-labelcol" }, input, this.SB.descriptionsOn() ? this.descriptionEditor(entry) : null);
    const usage = this.h("span", { class: "bac-usage" });
    const shared = this.h("span", { class: "bac-shared", role: "img", hidden: true });
    const del = this.h("button", {
      class: "bac-del",
      title: S("tipDelete"),
      "aria-label": S("tipDelete"),
      text: "✕",
      on: { click: () => this.removeColor(entry.id) },
    });
    row.append(handle, visible, pos, swatch, labelCol, shared, usage, del);
    return row;
  }

  /**
   * Description below the label: grey text that becomes a field when
   * clicked. Lines wrap as needed; plain text with line breaks.
   */
  descriptionEditor(entry) {
    const S = (k, a) => this.S(k, a);
    const area = this.h("textarea", {
      class: "bac-desc",
      rows: "1",
      maxlength: String(this.SB.MAX_DESCRIPTION),
      placeholder: S("btnAddDescription"),
      "aria-label": S("ariaDescription", { label: entry.label.trim() || entry.color }),
      spellcheck: "true",
    });
    area.value = entry.description || "";
    this.SB.autoGrow(area);
    let original = area.value;
    area.addEventListener("focus", () => {
      original = area.value;
    });
    area.addEventListener("input", () => {
      entry.description = area.value;
      this.updateDirty();
    });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Esc restores the text from before the field was entered
        e.preventDefault();
        e.stopPropagation();
        area.value = original;
        entry.description = original;
        this.updateDirty();
        area.blur();
      }
      else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        area.blur();
      }
    });
    return area;
  }

  rowFor(id) {
    return Array.from(this.listEl.children).find(r => r.getAttribute("data-id") === id) || null;
  }

  entryFor(id) {
    return this.draft.colors.find(c => c.id === id);
  }

  /**
   * Show positions in the menus (hidden entries do not count)
   * and place the divider before the first color of the submenu.
   */
  renumber() {
    if (!this.listEl) {
      return;
    }
    const limit = this.SB.setting("menuLimit");
    let pos = 0;
    for (const row of this.listEl.children) {
      const entry = this.entryFor(row.getAttribute("data-id"));
      const visible = !!entry && this.SB.isVisible(entry);
      const posEl = row.querySelector(".bac-pos");
      row.classList.toggle("bac-off", !visible);
      row.classList.remove("bac-sub-start");
      if (visible) {
        pos++;
        posEl.textContent = String(pos);
        posEl.removeAttribute("title");
        if (pos === limit + 1) {
          row.classList.add("bac-sub-start");
        }
      }
      else {
        posEl.textContent = "–";
        posEl.setAttribute("title", this.S("tipHiddenPos"));
      }
    }
  }

  updateUsage() {
    if (!this.listEl) {
      return;
    }
    for (const row of this.listEl.children) {
      const entry = this.entryFor(row.getAttribute("data-id"));
      const span = row.querySelector(".bac-usage");
      if (!entry || !span) {
        continue;
      }
      const n = this.usage.get(entry.color) || 0;
      span.replaceChildren();
      if (n) {
        // Marker icon and number, like the icon for other profiles next to it
        span.append(this.smallIcon("marker"), this.h("span", { text: String(n) }));
        span.setAttribute("title", this.S("tipUsage", { n }));
        span.setAttribute("role", "img");
        span.setAttribute("aria-label", this.S("tipUsage", { n }));
      }
      else {
        span.removeAttribute("title");
        span.removeAttribute("aria-label");
      }
      this.updateShared(row.querySelector(".bac-shared"), entry.color);
    }
  }

  /** Other own profiles with this color: icon with their number, names in the tooltip. */
  updateShared(el, color) {
    if (!el) {
      return;
    }
    const names = this.Store.getProfiles()
      .filter(p => p.id !== this.baseId && (p.colors || []).some(c => this.SB.normalize(c.color) === color))
      .map(p => p.name);
    el.hidden = !names.length;
    el.replaceChildren();
    if (!names.length) {
      el.removeAttribute("title");
      el.removeAttribute("aria-label");
      return;
    }
    const text = this.S("tipSharedColor", { n: names.length, list: this.SB.listText(names) });
    el.setAttribute("title", text);
    el.setAttribute("aria-label", text);
    el.append(this.smallIcon("profiles"), this.h("span", { text: String(names.length) }));
  }

  /** 12 px icons of the color list: “profiles” (two squares), “marker” (annotations). */
  smallIcon(kind) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "12");
    svg.setAttribute("aria-hidden", "true");
    const add = (tag, attrs) => {
      const el = this.doc.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(Object.assign({ fill: "none", stroke: "currentColor", "stroke-width": 1.3,
        "stroke-linejoin": "round", "stroke-linecap": "round" }, attrs))) {
        el.setAttribute(k, String(v));
      }
      svg.append(el);
    };
    if (kind === "profiles") {
      add("rect", { x: 5.5, y: 1.5, width: 9, height: 9, rx: 2 });
      add("rect", { x: 1.5, y: 5.5, width: 9, height: 9, rx: 2 });
    }
    else {
      // Highlighter over a line of text
      add("path", { d: "M9.5 2.5l3.5 3.5-5.5 5.5H4v-3.5z" });
      add("path", { d: "M2 14.5h12" });
    }
    return svg;
  }

  updateDirty() {
    if (!this.statusEl) {
      return;
    }
    const dirty = this.isDirty();
    this.statusEl.textContent = dirty ? this.S("unsavedProfile", { name: this.draft.name }) : "";
    if (this.actionsBar) {
      // While there are changes, the bar stays at the bottom of the visible area
      this.actionsBar.classList.toggle("bac-actions-dirty", dirty);
    }
    if (dirty) {
      this.saveBtn.setAttribute("default", "true");
    }
    else {
      this.saveBtn.removeAttribute("default");
    }
    if (this.tabButtons && this.tabButtons.get("colors")) {
      this.tabButtons.get("colors").classList.toggle("bac-tab-dirty", dirty);
    }
    this.setDisabled(this.saveBtn, !dirty);
    this.setDisabled(this.discardBtn, !dirty);
    this.setDisabled(this.addBtn, this.draft.colors.length >= this.SB.MAX_COLORS);
    for (const del of this.listEl.querySelectorAll(".bac-del")) {
      del.disabled = this.draft.colors.length <= 1;
    }
  }

  /** The color of an entry changed: update the row without losing focus. */
  refreshRow(entry) {
    const row = this.rowFor(entry.id);
    if (!row) {
      return;
    }
    const sw = row.querySelector(".bac-swatch");
    sw.style.setProperty("background-color", entry.color, "important");
    sw.setAttribute("title", this.S("tipSwatch", { color: entry.color }));
    const dup = this.draft.colors.some(c => c !== entry && c.color === entry.color);
    row.classList.toggle("bac-duplicate", dup);
    this.updateUsage();
    this.updateDirty();
  }

  // -------------------------------------------------------------------
  // Animations (FLIP: First, Last, Invert, Play)
  // -------------------------------------------------------------------
  flip(mutate, { added = null } = {}) {
    const before = new Map();
    for (const r of this.listEl.children) {
      before.set(r.getAttribute("data-id"), r.getBoundingClientRect().top);
    }
    mutate();
    for (const r of this.listEl.children) {
      const id = r.getAttribute("data-id");
      if (before.has(id)) {
        const delta = before.get(id) - r.getBoundingClientRect().top;
        if (Math.abs(delta) > 0.5) {
          this.animateFrom(r, delta);
        }
      }
      else if (id === added) {
        r.classList.add("bac-enter");
        r.getBoundingClientRect();
        this.SB.setTimeout(() => r.classList.remove("bac-enter"), 20);
      }
    }
  }

  animateFrom(el, deltaY) {
    el.style.transition = "none";
    el.style.transform = "translateY(" + deltaY + "px)";
    el.getBoundingClientRect();
    el.style.transition = "transform 180ms cubic-bezier(.2,.7,.3,1)";
    el.style.transform = "";
    this.SB.setTimeout(() => {
      if (!el.classList.contains("bac-dragging")) {
        el.style.transition = "";
      }
    }, 200);
  }

  // -------------------------------------------------------------------
  // Drag and drop with pointer events
  // -------------------------------------------------------------------
  startDrag(e, row) {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    this.closePicker(false);
    const handle = e.currentTarget;
    try {
      handle.setPointerCapture(e.pointerId);
    }
    catch (_) {}
    const list = this.listEl;
    const grab = e.clientY - row.getBoundingClientRect().top;
    const scroller = this.findScroller(list);
    row.classList.add("bac-dragging");
    row.style.transition = "none";
    let lastY = e.clientY;

    const position = () => {
      const listTop = list.getBoundingClientRect().top;
      const wantedTop = lastY - listTop - grab;
      const center = wantedTop + row.offsetHeight / 2;
      const siblings = Array.from(list.children).filter(r => r !== row);
      let before = null;
      for (const s of siblings) {
        if (center < s.offsetTop + s.offsetHeight / 2) {
          before = s;
          break;
        }
      }
      if (before !== row.nextElementSibling) {
        const old = new Map(siblings.map(s => [s, s.getBoundingClientRect().top]));
        list.insertBefore(row, before);
        this.renumber();
        for (const s of siblings) {
          const delta = old.get(s) - s.getBoundingClientRect().top;
          if (Math.abs(delta) > 0.5) {
            this.animateFrom(s, delta);
          }
        }
      }
      row.style.transform = "translateY(" + (wantedTop - row.offsetTop) + "px)";
    };

    const onMove = (ev) => {
      lastY = ev.clientY;
      if (scroller) {
        const sr = scroller.getBoundingClientRect();
        if (ev.clientY < sr.top + 30) {
          scroller.scrollTop -= 10;
        }
        else if (ev.clientY > sr.bottom - 30) {
          scroller.scrollTop += 10;
        }
      }
      position();
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      row.style.transition = "transform 160ms cubic-bezier(.2,.7,.3,1)";
      row.style.transform = "";
      this.SB.setTimeout(() => {
        row.classList.remove("bac-dragging");
        row.style.transition = "";
      }, 170);
      const order = Array.from(list.children).map(r => r.getAttribute("data-id"));
      this.draft.colors.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      this.renumber();
      this.updateDirty();
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  findScroller(el) {
    let node = el.parentElement;
    while (node) {
      try {
        const style = this.win.getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
          return node;
        }
      }
      catch (e) {}
      node = node.parentElement;
    }
    return null;
  }

  moveEntry(id, dir) {
    const i = this.draft.colors.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.draft.colors.length) {
      return;
    }
    const [entry] = this.draft.colors.splice(i, 1);
    this.draft.colors.splice(j, 0, entry);
    this.flip(() => this.renderList());
    this.rowFor(id)?.querySelector(".bac-label")?.focus();
    this.updateDirty();
  }

  // -------------------------------------------------------------------
  // Add and remove colors
  // -------------------------------------------------------------------
  suggestColor() {
    const used = new Set(this.draft.colors.map(c => c.color));
    for (const pal of this.SB.PALETTES) {
      for (const c of pal.colors) {
        if (!used.has(c)) {
          return c;
        }
      }
    }
    let c;
    do {
      c = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    } while (used.has(c));
    return c;
  }

  addColor() {
    if (this.draft.colors.length >= this.SB.MAX_COLORS) {
      return;
    }
    const entry = { id: this.SB.uid("c"), color: this.suggestColor(), label: "", enabled: true };
    this.draft.colors.push(entry);
    this.flip(() => this.renderList(), { added: entry.id });
    this.updateDirty();
    const row = this.rowFor(entry.id);
    if (row) {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      row.querySelector(".bac-label").focus();
    }
  }

  removeColor(id) {
    const entry = this.entryFor(id);
    if (!entry || this.draft.colors.length <= 1) {
      return;
    }
    const n = this.usage.get(entry.color) || 0;
    if (n && !Services.prompt.confirm(this.win, this.S("dlgRemoveUsedTitle"), this.S("dlgRemoveUsedText", { n }))) {
      return;
    }
    this.closePicker(false);
    const row = this.rowFor(id);
    const finish = () => {
      this.draft.colors = this.draft.colors.filter(c => c.id !== id);
      this.flip(() => this.renderList());
      this.updateDirty();
    };
    if (!row) {
      finish();
      return;
    }
    row.style.height = row.offsetHeight + "px";
    row.getBoundingClientRect();
    row.classList.add("bac-removing");
    this.SB.setTimeout(finish, 190);
  }

  // -------------------------------------------------------------------
  // Color picker
  // -------------------------------------------------------------------
  openPicker(entry, row) {
    if (this.picker && this.picker.entry === entry) {
      this.closePicker(false);
      return;
    }
    this.closePicker(false);
    const picker = new BetterAnnotations.ColorPicker(this, entry, row.querySelector(".bac-swatch"));
    this.picker = picker;
    picker.open();
  }

  closePicker(revert) {
    if (this.picker) {
      const p = this.picker;
      this.picker = null;
      p.close(revert);
    }
  }

  // -------------------------------------------------------------------
  // Dialogs
  // -------------------------------------------------------------------

  /** Three buttons; button 1 is always “Cancel” (also triggered by Esc). */
  confirm3(title, text, b0, b2, defaultButton = 0) {
    const ps = Services.prompt;
    const flags = ps.BUTTON_POS_0 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_1 * ps.BUTTON_TITLE_IS_STRING
      + ps.BUTTON_POS_2 * ps.BUTTON_TITLE_IS_STRING
      + (defaultButton === 2 ? ps.BUTTON_POS_2_DEFAULT : ps.BUTTON_POS_0_DEFAULT);
    return ps.confirmEx(this.win, title, text, flags, b0, this.S("dlgCancel"), b2, null, {});
  }

  /** 0 = Save, 1 = Cancel, 2 = Don't Save */
  askUnsaved() {
    return this.confirm3(this.S("dlgUnsavedTitle"), this.S("dlgUnsavedText", { name: this.draft.name }),
      this.S("dlgSave"), this.S("dlgDontSave"));
  }

  /** Ask before leaving the draft. Returns false if cancelled. */
  async resolveUnsaved() {
    if (!this.isDirty()) {
      return true;
    }
    const choice = this.askUnsaved();
    if (choice === 1) {
      return false;
    }
    if (choice === 0) {
      return this.save({ rerender: false });
    }
    return true;
  }

  promptName(title, text, suggestion, exceptId) {
    let value = suggestion || "";
    for (;;) {
      const obj = { value };
      if (!Services.prompt.prompt(this.win, title, text, obj, null, { value: false })) {
        return null;
      }
      const name = String(obj.value || "").trim().slice(0, 100);
      if (!name) {
        return null;
      }
      if (this.Store.isNameTaken(name, exceptId)) {
        Services.prompt.alert(this.win, title, this.S("dlgNameTaken"));
        value = name;
        continue;
      }
      return name;
    }
  }

  suggestName() {
    const base = this.SB.lang === "de" ? "Mein Profil" : "My Profile";
    let name = base;
    let n = 2;
    while (this.Store.isNameTaken(name)) {
      name = base + " " + n++;
    }
    return name;
  }

  alert(text) {
    Services.prompt.alert(this.win, this.S("pluginName"), text);
  }

  validate() {
    if (!this.draft.colors.length) {
      this.alert(this.S("dlgEmpty"));
      return false;
    }
    const seen = new Set();
    for (const c of this.draft.colors) {
      if (seen.has(c.color)) {
        this.alert(this.S("dlgDuplicate", { color: c.color }));
        return false;
      }
      seen.add(c.color);
    }
    return true;
  }

  // -------------------------------------------------------------------
  // Profile actions
  // -------------------------------------------------------------------
  async onSelectProfile(id) {
    if (!id || id === this.baseId) {
      return;
    }
    if (!(await this.resolveUnsaved())) {
      this.selectMenu(this.profileMenu, this.baseId);
      return;
    }
    // With “Profile per Document” the menu only chooses the profile to edit.
    // Without it, it also activates the profile for all documents, as in the reader.
    if (!this.SB.Profiles.enabled()) {
      try {
        await this.own(() => this.Store.setDefault(id));
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
    this.loadDraft(id);
    this.render();
    if (this.SB.Profiles.enabled()) {
      this.loadUsage();
    }
  }

  async onLanguage(lang) {
    if (!lang || lang === this.SB.lang) {
      return;
    }
    await this.Store.setSetting("language", lang);
    // Presets have language-dependent labels: reload them as long as nothing was changed
    if (this.isPreset() && !this.isDirty()) {
      this.loadDraft(this.baseId);
    }
    this.notice = this.S("optRestartHint");
    this.render();
  }

  /** Saves the draft. Returns true if it was saved. */
  async save({ rerender = true } = {}) {
    this.closePicker(false);
    this.closePopover();
    if (!this.validate()) {
      return false;
    }
    const SB = this.SB;
    const Library = this.Library;
    const base = this.Store.getProfile(this.baseId);
    const baseEntry = c => base && base.colors.find(x => x.id === c.id);
    // Descriptions edited in the separate window meanwhile win over unchanged ones here
    try {
      const loaded = new Map(JSON.parse(this.snapshot).map(([id, , , , desc]) => [id, desc]));
      for (const c of this.draft.colors) {
        const o = baseEntry(c);
        if (o && loaded.has(c.id) && SB.cleanDescription(c.description) === loaded.get(c.id)
          && SB.cleanDescription(o.description) !== loaded.get(c.id)) {
          c.description = o.description || "";
        }
      }
    }
    catch (e) {
      SB.logError(e);
    }

    // 1. Changed colors that are already in use
    const used = [];
    for (const c of this.draft.colors) {
      const o = baseEntry(c);
      if (o && o.color !== c.color && (this.usage.get(o.color) || 0) > 0) {
        used.push({ from: o.color, to: c.color, label: c.label.trim() || o.label.trim() || this.S("unnamed"), n: this.usage.get(o.color) });
      }
    }
    // 2. Renamed labels whose tag BetterAnnotations has already added
    const renames = [];
    for (const c of this.draft.colors) {
      const o = baseEntry(c);
      if (!o || !o.label.trim() || !c.label.trim() || o.label.trim() === c.label.trim()) {
        continue;
      }
      const fromTag = Library.tagForLabel(o.label);
      const toTag = Library.tagForLabel(c.label);
      const n = Library.countTag(fromTag);
      if (n) {
        renames.push({ from: o.label.trim(), to: c.label.trim(), fromTag, toTag, n });
      }
    }

    let recolor = false;
    // With “Profile per Document” only the annotations of this profile change
    const recolorOnly = SB.Profiles.enabled() ? this.baseId : null;
    if (used.length) {
      const list = used.map(u => "• " + u.label + ": " + u.from + " → " + u.to + " (" + u.n + "×)").join("\n");
      const choice = this.confirm3(this.S("dlgSaveRecolorTitle"),
        recolorOnly ? this.S("dlgSaveRecolorTextProfile", { list, profile: this.draft.name }) : this.S("dlgSaveRecolorText", { list }),
        this.S("dlgRecolor"), this.S("dlgSaveOnly"), 2);
      if (choice === 1) {
        return false;
      }
      recolor = choice === 0;
    }
    const doRenames = [];
    for (const r of renames) {
      const choice = this.confirm3(this.S("dlgRenameTagsTitle"), this.S("dlgRenameTagsText", r),
        this.S("dlgRenameTags"), this.S("dlgKeepTags"), 2);
      if (choice === 1) {
        return false;
      }
      if (choice === 0) {
        doRenames.push(r);
      }
    }

    try {
      let saved;
      if (this.isPreset()) {
        const name = this.promptName(this.S("dlgSavePresetTitle"), this.S("dlgSavePresetText"), this.suggestName());
        if (!name) {
          return false;
        }
        const colors = this.draft.colors.map(c => Object.assign({}, c, { id: SB.uid("c") }));
        const presetId = this.baseId;
        saved = await this.own(() => this.Store.saveProfile({ id: SB.uid("p"), name, colors }, { activate: this.Store.data.activeProfileId === presetId }));
        // The changed preset becomes the new profile in the documents that showed it
        await this.replaceInOpenDocuments(presetId, saved.id);
      }
      else {
        saved = await this.own(() => this.Store.saveProfile({
          id: this.baseId,
          name: base ? base.name : this.draft.name,
          colors: this.draft.colors,
        }));
      }
      this.loadDraft(saved.id);
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
      return false;
    }

    // 3. Change the library (after saving, so that tags get the new labels)
    if (recolor || doRenames.length) {
      await this.runLibraryTask(async () => {
        const total = { done: 0, skipped: 0 };
        const add = (r) => {
          total.done += r.done;
          total.skipped += r.skipped;
        };
        if (recolor) {
          const pairs = used.map(u => [u.from, u.to]);
          add(await Library.run("recolor", Library.recolorParams(pairs, used.map(u => u.label)), await Library.planRecolor(pairs, { only: recolorOnly })));
        }
        for (const r of doRenames) {
          add(await Library.run("tagsRename", { from: r.fromTag, to: r.toTag }, Library.planRenameTag(r.fromTag, r.toTag)));
        }
        return total;
      });
      return true;
    }
    if (rerender) {
      this.render();
    }
    return true;
  }

  /** Open documents with profile `from` switch to profile `to` (after saving a changed preset). */
  /**
   * A new profile: without “Profile per Document” it becomes the active
   * profile (as before); the second own profile brings a one-time tip about
   * the function. With it, a notice says where to choose the profile.
   */
  async afterNewProfile(saved) {
    const SB = this.SB;
    if (SB.Profiles.enabled()) {
      this.notice = this.S("newProfileHint", { name: saved.name });
      return;
    }
    await this.own(() => this.Store.setDefault(saved.id));
    if (this.Store.getProfiles().length >= 2 && !SB.setting("tipProfilesShown")) {
      this.notice = this.S("tipProfilesPerDocument");
      await this.own(() => this.Store.setSetting("tipProfilesShown", true));
    }
  }

  async replaceInOpenDocuments(from, to) {
    const P = this.SB.Profiles;
    if (!P.enabled()) {
      return;
    }
    for (const reader of P.openReaders()) {
      try {
        if (P.forReader(reader) === from) {
          await P.setForReader(reader, to);
        }
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  }

  discard() {
    this.loadDraft(this.baseId);
    this.render();
  }

  resetToPlus() {
    if (!Services.prompt.confirm(this.win, this.S("dlgResetTitle"), this.S("dlgResetText"))) {
      return;
    }
    const keep = new Map(this.draft.colors.map(c => [c.color, c.id]));
    this.draft.colors = this.Store.plusPreset().colors.map(c => Object.assign({}, c, { id: keep.get(c.color) || this.SB.uid("c") }));
    this.flip(() => this.renderList());
    this.updateDirty();
  }

  async newProfile() {
    const choice = this.confirm3(this.S("dlgNewTitle"), this.S("dlgNewSourceText"),
      this.S("dlgNewFromCurrent"), this.S("dlgNewFromPlus"));
    if (choice === 1) {
      return;
    }
    let source;
    if (choice === 0) {
      // Current palette including unsaved changes; the old profile stays unchanged
      source = this.draft.colors;
    }
    else {
      if (!(await this.resolveUnsaved())) {
        return;
      }
      source = this.Store.plusPreset().colors;
    }
    const name = this.promptName(this.S("dlgNewTitle"), this.S("dlgNameText"), this.suggestName());
    if (!name) {
      return;
    }
    const colors = source.map(c => Object.assign({}, c, { id: this.SB.uid("c") }));
    try {
      const saved = await this.own(() => this.Store.saveProfile({ id: this.SB.uid("p"), name, colors }));
      await this.afterNewProfile(saved);
      this.loadDraft(saved.id);
      this.render();
    }
    catch (e) {
      this.SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  async renameProfile() {
    const p = this.Store.getProfile(this.baseId);
    if (!p || this.isPreset()) {
      return;
    }
    const name = this.promptName(this.S("dlgRenameTitle"), this.S("dlgNameText"), p.name, p.id);
    if (!name || name === p.name) {
      return;
    }
    const P = this.SB.Profiles;
    const fromTag = P.tagForName(p.name);
    const toTag = P.tagForName(name);
    await this.own(() => this.Store.saveProfile(Object.assign({}, p, { name })));
    this.draft.name = name;
    // Profile tags follow the new name
    const changes = await this.Library.planRetag(fromTag, toTag);
    if (changes.length) {
      await this.runLibraryTask(() => this.Library.run("profileRename", { from: fromTag, to: toTag }, changes));
      return;
    }
    this.render();
  }

  async deleteProfile() {
    const p = this.Store.getProfile(this.baseId);
    if (!p || this.isPreset()) {
      return;
    }
    const P = this.SB.Profiles;
    const tag = P.tagForName(p.name);
    const tagged = await this.Library.planRetag(tag, null);
    let retag = null; // null: keep the tags
    if (tagged.length) {
      // What happens to the profile tags: remove, give to another profile, keep
      const targets = this.Store.listForMenu().filter(x => x.id !== p.id);
      const options = [
        this.S("dlgDeleteTagsRemove"),
        ...targets.map(x => this.S("dlgDeleteTagsMove", { profile: x.name })),
        this.S("dlgDeleteTagsKeep"),
      ];
      const selected = {};
      const ok = Services.prompt.select(this.win, this.S("dlgDeleteTitle"),
        this.S("dlgDeleteTagsText", { name: p.name, n: tagged.length, tag }), options, selected);
      if (!ok) {
        return;
      }
      const i = selected.value;
      if (i === 0) {
        retag = { to: null, changes: tagged };
      }
      else if (i <= targets.length) {
        const to = P.tagForName(targets[i - 1].name);
        retag = { to, changes: await this.Library.planRetag(tag, to) };
      }
    }
    else if (!Services.prompt.confirm(this.win, this.S("dlgDeleteTitle"), this.S("dlgDeleteText", { name: p.name }))) {
      return;
    }
    await this.own(() => this.Store.deleteProfile(p.id));
    this.loadDraft(P.currentId());
    if (retag && retag.changes.length) {
      await this.runLibraryTask(() => retag.to
        ? this.Library.run("profileRename", { from: tag, to: retag.to }, retag.changes)
        : this.Library.run("profileRemove", { tag }, retag.changes));
      return;
    }
    this.render();
  }

  // -------------------------------------------------------------------
  // Files
  // -------------------------------------------------------------------
  /** Show a file in the system's file manager (folder opened, file selected). */
  revealFile(path) {
    try {
      if (Zotero.File.reveal) {
        Zotero.File.reveal(path);
        return;
      }
      const file = Zotero.File.pathToFile(path);
      file.reveal();
    }
    catch (e) {
      this.SB.logError(e);
    }
  }

  showFolder() {
    try {
      if (Zotero.File.reveal) {
        Zotero.File.reveal(this.Store.path);
        return;
      }
    }
    catch (e) {}
    try {
      Zotero.launchFile(this.Store.dir);
    }
    catch (e) {
      this.SB.logError(e);
    }
  }

  /**
   * File picker. filters: [[name, pattern], …]; when saving, defaultName is suggested.
   */
  async pickFile(save, defaultName, { title = null, filters = [["JSON", "*.json"]] } = {}) {
    let FilePicker = null;
    try {
      FilePicker = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs").FilePicker;
    }
    catch (e) {
      this.SB.logError(e);
    }
    if (!FilePicker) {
      return null;
    }
    const fp = new FilePicker();
    fp.init(this.win, title || (save ? this.S("btnExport") : this.S("btnImport")), save ? fp.modeSave : fp.modeOpen);
    for (const [name, pattern] of filters) {
      fp.appendFilter(name, pattern);
    }
    if (save) {
      fp.defaultString = defaultName || "Better Annotations.json";
    }
    const rv = await fp.show();
    if (rv === fp.returnOK || rv === fp.returnReplace) {
      return fp.file;
    }
    return null;
  }

  /** Write a full backup of all plugin data to a file. */
  async saveFullBackup() {
    const SB = this.SB;
    try {
      const date = new Date().toISOString().slice(0, 10);
      const path = await this.pickFile(true, "Better Annotations - " + this.S("fileFullBackup") + " " + date + ".json",
        { title: this.S("btnFullBackup") });
      if (!path) {
        return;
      }
      const data = await this.Library.buildFullBackup();
      await Zotero.File.putContentsAsync(path, JSON.stringify(data));
      this.notice = this.S("fullBackupDone");
      this.render();
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  async loadFullBackup() {
    const SB = this.SB;
    let obj;
    let info;
    try {
      const path = await this.pickFile(false, null, { title: this.S("btnFullRestore") });
      if (!path) {
        return;
      }
      obj = JSON.parse(await Zotero.File.getContentsAsync(path));
      info = this.Library.inspectFullBackup(obj);
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("importError", { msg: e.message }));
      return;
    }
    const text = this.S("dlgFullRestoreText", {
      date: SB.formatDate(info.created),
      p: info.profiles,
      h: info.history,
      t: info.tags,
      b: info.backups,
    });
    if (!this.confirmAction(this.S("dlgFullRestoreTitle"), text, this.S("dlgFullRestore"))) {
      return;
    }
    try {
      await this.own(() => this.Library.restoreFullBackup(obj));
      this.loadDraft(this.SB.Profiles.currentId());
      await this.loadUsage();
      this.notice = this.S("fullRestoreDone");
      this.render();
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  /** Exports the profile shown as a single file; the file name contains the profile name. */
  async exportProfiles() {
    const SB = this.SB;
    const profile = this.clone(this.draft);
    const fileName = SB.safeFileName(profile.name) + " - Better Annotations.json";
    try {
      const path = await this.pickFile(true, fileName);
      if (!path) {
        return;
      }
      await Zotero.File.putContentsAsync(path, JSON.stringify(this.Store.exportProfile(profile), null, 2));
      this.notice = this.S("exportProfileDone", { name: profile.name });
      this.render();
    }
    catch (e) {
      SB.logError(e);
      this.alert(this.S("saveError", { msg: e.message }));
    }
  }

  /** Imports a profile from a file and shows it (older multi-profile files: all of them). */
  async importProfiles() {
    try {
      const path = await this.pickFile(false);
      if (!path) {
        return;
      }
      const raw = await Zotero.File.getContentsAsync(path);
      const imported = await this.Store.importProfiles(JSON.parse(raw));
      if (!imported.length) {
        this.alert(this.S("importError", { msg: this.S("importNoProfile") }));
        return;
      }
      this.notice = imported.length === 1
        ? this.S("importOne", { name: imported[0].name })
        : this.S("importResult", { n: imported.length });
      if (imported.length === 1) {
        await this.onSelectProfile(imported[0].id); // asks if there are unsaved changes
      }
      if (this.notice) {
        this.render(); // profile not switched: show the message anyway
      }
    }
    catch (e) {
      this.SB.logError(e);
      this.alert(this.S("importError", { msg: e.message }));
    }
  }

  // -------------------------------------------------------------------
  // Style
  // -------------------------------------------------------------------
  injectStyle() {
    const css = BetterAnnotations.PREFS_CSS;
    const style = this.h("style", {});
    style.textContent = css;
    this.root.append(style);
  }
};
