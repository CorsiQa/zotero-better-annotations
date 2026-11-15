/* Better Annotations – labels of the active profile with counts
 *
 * Shown in two places with the same content:
 *  - a section in Zotero's item pane (library and reader), registered with
 *    Zotero.ItemPaneManager.registerSection
 *  - a separate window that follows the active reader tab, e.g. for a
 *    second screen
 *
 * Content: profile selection, one row per label with color and number of
 * annotations. In the reader, a click on a row makes the color the tool
 * color for the next annotation. In the library, the section counts the
 * annotations of all files of the selected item.
 */

/* global Zotero, BetterAnnotations */

BetterAnnotations.Panel = {
  _views: new Set(),
  _sectionKey: null,
  _popout: null,
  _popoutTarget: null,
  _observerID: null,
  _refreshTimer: null,
  _pollTimer: null,
  _pollWin: null,

  get SB() {
    return BetterAnnotations;
  },

  // -------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------

  init() {
    const SB = this.SB;
    this._unlisten = SB.Store.onChange(what => this.onStoreChange(what));
    try {
      this._observerID = Zotero.Notifier.registerObserver({
        notify: (event, type, ids, extra) => this.onNotify(event, type, ids, extra),
      }, ["item", "tab"], "better-annotations-panel");
    }
    catch (e) {
      SB.logError(e);
    }
    for (const win of this.mainWindows()) {
      this.onMainWindowLoad(win);
    }
    this.updateSection();
    // The reader reports no event when the tool color changes: check once per second
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (win) {
      this._pollWin = win;
      this._pollTimer = win.setInterval(() => this.poll(), 1000);
    }
  },

  shutdown() {
    if (this._pollTimer && this._pollWin) {
      try {
        this._pollWin.clearInterval(this._pollTimer);
      }
      catch (e) {}
    }
    this._pollTimer = null;
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
    if (this._observerID) {
      Zotero.Notifier.unregisterObserver(this._observerID);
      this._observerID = null;
    }
    this.unregisterSection();
    this.closePopout();
    for (const win of this.mainWindows()) {
      this.onMainWindowUnload(win);
    }
  },

  mainWindows() {
    try {
      return Zotero.getMainWindows ? Zotero.getMainWindows() : [Zotero.getMainWindow()].filter(Boolean);
    }
    catch (e) {
      return [];
    }
  },

  /** The section header gets its text from a Fluent file (locale/en-US/better-annotations.ftl). */
  onMainWindowLoad(win) {
    try {
      win.MozXULElement?.insertFTLIfNeeded("better-annotations.ftl");
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  onMainWindowUnload(win) {
    try {
      win.document.querySelector("link[href=\"better-annotations.ftl\"]")?.remove();
    }
    catch (e) {}
  },

  // -------------------------------------------------------------------
  // Section in the item pane
  // -------------------------------------------------------------------

  updateSection() {
    const want = this.SB.setting("showItemPaneSection") !== false;
    if (want && !this._sectionKey) {
      this.registerSection();
    }
    else if (!want && this._sectionKey) {
      this.unregisterSection();
    }
  },

  registerSection() {
    const SB = this.SB;
    if (!Zotero.ItemPaneManager?.registerSection) {
      SB.log("item pane sections not available");
      return;
    }
    const args = JSON.stringify({ label: SB.S("sectionTitle") });
    const icon = SB.rootURI + "content/icons/labels.svg";
    const darkIcon = SB.rootURI + "content/icons/labels-dark.svg";
    try {
      this._sectionKey = Zotero.ItemPaneManager.registerSection({
        paneID: "labels",
        pluginID: SB.id,
        header: { l10nID: "better-annotations-section-header", l10nArgs: args, icon, darkIcon },
        sidenav: { l10nID: "better-annotations-section-sidenav", l10nArgs: args, icon, darkIcon },
        onInit: ({ body }) => {
          body.bacView = new BetterAnnotations.PanelView(body, "section");
          this._views.add(body.bacView);
        },
        onDestroy: ({ body }) => {
          if (body.bacView) {
            this._views.delete(body.bacView);
            body.bacView = null;
          }
        },
        onItemChange: ({ body, item, tabType, setEnabled }) => {
          const target = this.targetFor(body, item, tabType);
          setEnabled(!!target);
          if (body.bacView) {
            body.bacView.target = target;
          }
          return true;
        },
        onRender: ({ body, setSectionSummary }) => {
          const view = body.bacView;
          if (view) {
            view.setSummary = setSectionSummary;
            view.render();
          }
        },
      }) || null;
    }
    catch (e) {
      SB.logError(e);
      this._sectionKey = null;
    }
  },

  unregisterSection() {
    if (!this._sectionKey) {
      return;
    }
    try {
      Zotero.ItemPaneManager.unregisterSection(this._sectionKey);
    }
    catch (e) {
      this.SB.logError(e);
    }
    this._sectionKey = null;
    for (const view of [...this._views]) {
      if (view.kind === "section") {
        this._views.delete(view);
      }
    }
  },

  /** Files of an item that the reader can open (PDF, EPUB, snapshot). */
  readableAttachments(item) {
    if (!item) {
      return [];
    }
    const readable = (att) => {
      try {
        return !!att && att.isAttachment() && (att.attachmentReaderType || (att.isPDFAttachment && att.isPDFAttachment()));
      }
      catch (e) {
        return false;
      }
    };
    try {
      if (item.isAttachment()) {
        return readable(item) ? [item] : [];
      }
      if (!item.isRegularItem()) {
        return [];
      }
      return Zotero.Items.get(item.getAttachments()).filter(readable);
    }
    catch (e) {
      return [];
    }
  },

  /**
   * What the section shows: the open document in a reader tab, else the
   * files of the selected item. null hides the section.
   */
  targetFor(body, item, tabType) {
    if (String(tabType || "").startsWith("reader")) {
      let tabID = null;
      try {
        tabID = body.closest("item-details")?.tabID || null;
      }
      catch (e) {}
      const reader = tabID ? Zotero.Reader.getByTabID(tabID) : null;
      if (reader) {
        return { mode: "reader", tabID, attachmentIDs: [reader.itemID] };
      }
    }
    const atts = this.readableAttachments(item);
    if (!atts.length) {
      return null;
    }
    return { mode: "library", itemID: item.id, attachmentIDs: atts.map(a => a.id) };
  },

  /** Reader of a target (only in reader tabs). */
  readerOf(target) {
    if (!target || target.mode !== "reader") {
      return null;
    }
    try {
      return Zotero.Reader.getByTabID(target.tabID) || null;
    }
    catch (e) {
      return null;
    }
  },

  /** Annotation colors of a target: Map color -> number. */
  countColors(target) {
    const counts = new Map();
    const add = (color) => {
      const c = this.SB.normalize(color);
      if (c) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    };
    if (!target) {
      return counts;
    }
    const reader = this.readerOf(target);
    let fromReader = false;
    try {
      const list = reader && reader._state && reader._state.annotations;
      if (list) {
        for (const a of Array.from(list)) {
          add(a.color);
        }
        fromReader = true;
      }
    }
    catch (e) {}
    if (!fromReader) {
      for (const att of Zotero.Items.get(target.attachmentIDs || []).filter(Boolean)) {
        try {
          for (const a of att.getAnnotations()) {
            add(a.annotationColor);
          }
        }
        catch (e) {
          this.SB.logError(e);
        }
      }
    }
    return counts;
  },

  /** Title of the item a target belongs to. */
  targetTitle(target) {
    try {
      const att = Zotero.Items.get(target.attachmentIDs[0]);
      return this.SB.Library.itemTitle(att);
    }
    catch (e) {
      return "";
    }
  },

  // -------------------------------------------------------------------
  // Separate window
  // -------------------------------------------------------------------

  openPopout() {
    const SB = this.SB;
    if (this._popout && !this._popout.closed) {
      this._popout.focus();
      return;
    }
    const main = Zotero.getMainWindow();
    if (!main) {
      return;
    }
    this._popoutTarget = this.currentReaderTarget() || this._popoutTarget;
    let win;
    try {
      win = main.openDialog("chrome://better-annotations/content/popout.xhtml", "better-annotations-labels",
        "chrome,dialog=no,resizable,centerscreen");
    }
    catch (e) {
      SB.logError(e);
      return;
    }
    this._popout = win;
    win.addEventListener("load", () => {
      try {
        const root = win.document.getElementById("bac-popout-root");
        const view = new BetterAnnotations.PanelView(root, "popout");
        view.target = this._popoutTarget;
        win.bacView = view;
        this._views.add(view);
        view.render();
      }
      catch (e) {
        SB.logError(e);
      }
    }, { once: true });
    win.addEventListener("unload", () => {
      if (win.bacView) {
        this._views.delete(win.bacView);
        win.bacView = null;
      }
      if (this._popout === win) {
        this._popout = null;
      }
    }, { once: true });
  },

  closePopout() {
    if (this._popout && !this._popout.closed) {
      try {
        this._popout.close();
      }
      catch (e) {}
    }
    this._popout = null;
  },

  /** Target of the selected tab if it is a reader tab. */
  currentReaderTarget() {
    try {
      const tabs = Zotero.getMainWindow().Zotero_Tabs;
      if (!tabs || !String(tabs.selectedType || "").startsWith("reader")) {
        return null;
      }
      const reader = Zotero.Reader.getByTabID(tabs.selectedID);
      return reader ? { mode: "reader", tabID: tabs.selectedID, attachmentIDs: [reader.itemID] } : null;
    }
    catch (e) {
      return null;
    }
  },

  /** The window follows the active reader tab and keeps the last document in the library. */
  retargetPopout() {
    const view = this._popout && !this._popout.closed ? this._popout.bacView : null;
    if (!view) {
      return;
    }
    const target = this.currentReaderTarget();
    if (target) {
      this._popoutTarget = target;
    }
    else if (this._popoutTarget && this._popoutTarget.mode === "reader" && !this.readerOf(this._popoutTarget)) {
      // The tab was closed: keep the document, without the click action
      this._popoutTarget = Object.assign({}, this._popoutTarget, { mode: "library" });
    }
    view.target = this._popoutTarget;
    view.render();
  },

  // -------------------------------------------------------------------
  // Updates
  // -------------------------------------------------------------------

  onStoreChange(what) {
    if (what === "settings") {
      this.updateSection();
    }
    this.refreshAll();
  },

  onNotify(event, type, ids) {
    if (type === "tab") {
      if (event === "select" || event === "close" || event === "load") {
        this.SB.setTimeout(() => this.retargetPopout(), 50);
      }
      return;
    }
    if (type === "item" && this._views.size) {
      this.refreshSoon();
    }
  },

  refreshSoon() {
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!win) {
      return;
    }
    if (this._refreshTimer) {
      win.clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = win.setTimeout(() => {
      this._refreshTimer = null;
      this.refreshAll();
    }, 250);
  },

  refreshAll() {
    for (const view of [...this._views]) {
      if (!view.root.isConnected) {
        this._views.delete(view);
        continue;
      }
      view.render();
    }
  },

  /** Update the marked tool color and the counts of open readers. */
  poll() {
    for (const view of [...this._views]) {
      if (!view.root.isConnected) {
        this._views.delete(view);
        continue;
      }
      if (view.signature() !== view.lastSignature) {
        view.render();
      }
    }
  },
};

/**
 * Content of the section and of the separate window.
 * kind: "section" | "popout"
 */
BetterAnnotations.PanelView = class {
  constructor(root, kind) {
    this.root = root;
    this.kind = kind;
    this.target = null;
    this.setSummary = null;
    this.lastSignature = null;
    this.doc = root.ownerDocument;
  }

  get SB() {
    return BetterAnnotations;
  }

  get Panel() {
    return BetterAnnotations.Panel;
  }

  S(key, args) {
    return this.SB.S(key, args);
  }

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
      else if (k === "on") {
        for (const [type, fn] of Object.entries(v)) {
          el.addEventListener(type, fn);
        }
      }
      else {
        el.setAttribute(k, v === true ? "" : String(v));
      }
    }
    for (const c of children.flat()) {
      if (c !== null && c !== undefined && c !== false) {
        el.append(typeof c === "string" ? this.doc.createTextNode(c) : c);
      }
    }
    return el;
  }

  icon(kind) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = (d) => {
      const p = this.doc.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("style", "fill:none;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round");
      svg.append(p);
    };
    if (kind === "popout") {
      path("M9.5 2.5h4v4M13.5 2.5 8 8M12 9.5v3.2c0 .5-.4.8-.8.8H3.3c-.5 0-.8-.3-.8-.8V4.8c0-.4.3-.8.8-.8h3.2");
    }
    else if (kind === "describe") {
      path("M2.5 3.5h11M2.5 6.5h11M2.5 9.5h7M2.5 12.5h5");
    }
    else {
      return this.SB.Reader.makeTuneIcon(this.doc, 16);
    }
    return svg;
  }

  iconButton(kind, label, onClick, pressed) {
    const b = this.h("button", {
      class: "bac-p-icon",
      "data-key": "btn-" + kind,
      title: label,
      "aria-label": label,
      on: {
        click: (e) => {
          e.preventDefault();
          onClick();
        },
      },
    }, this.icon(kind));
    if (pressed !== undefined) {
      b.setAttribute("aria-pressed", pressed ? "true" : "false");
    }
    return b;
  }

  /** Changes when something visible changes (tool color, number of annotations). */
  signature() {
    const reader = this.Panel.readerOf(this.target);
    let tool = "";
    let n = "";
    try {
      tool = reader ? String(reader._state?.tool?.color || "") : "";
      n = reader ? String(Array.from(reader._state?.annotations || []).length) : "";
    }
    catch (e) {}
    return [this.SB.Store.data.activeProfileId, tool, n].join("|");
  }

  render() {
    try {
      this._render();
    }
    catch (e) {
      this.SB.logError(e);
    }
  }

  _render() {
    // Keep the keyboard focus on the same control after rebuilding
    let focusKey = null;
    try {
      const active = this.doc.activeElement;
      if (active && this.root.contains(active)) {
        focusKey = active.getAttribute("data-key");
      }
    }
    catch (e) {}
    this._build();
    if (focusKey) {
      const el = Array.from(this.root.querySelectorAll("[data-key]")).find(x => x.getAttribute("data-key") === focusKey);
      if (el) {
        el.focus();
      }
    }
  }

  _build() {
    const SB = this.SB;
    const S = (k, a) => this.S(k, a);
    const Panel = this.Panel;
    const profile = SB.Store.getActive();
    const target = this.target;
    const reader = Panel.readerOf(target);
    const counts = Panel.countColors(target);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    let toolColor = null;
    try {
      toolColor = reader ? SB.normalize(reader._state?.tool?.color) : null;
    }
    catch (e) {}
    this.lastSignature = this.signature();

    // Toolbar: profile, separate window, settings
    const select = this.h("select", {
      class: "bac-p-profile",
      "data-key": "profile",
      "aria-label": S("panelProfile"),
      title: S("panelProfile"),
      on: {
        change: (e) => {
          SB.Store.setActive(e.target.value).catch(err => SB.logError(err));
        },
      },
    });
    const list = SB.Store.listForMenu();
    list.forEach((p, i) => {
      if (i === 2) {
        select.append(this.h("option", { disabled: true, text: "──────────" }));
      }
      const opt = this.h("option", { value: p.id, text: p.name });
      if (p.id === SB.Store.data.activeProfileId) {
        opt.setAttribute("selected", "true");
      }
      select.append(opt);
    });
    const bar = this.h("div", { class: "bac-p-bar" }, select);
    if (this.kind === "section") {
      bar.append(this.iconButton("popout", S("panelPopout"), () => Panel.openPopout()));
    }
    bar.append(this.iconButton("settings", S("panelSettings"), () => SB.openPrefs()));

    const parts = [this.style()];
    if (this.kind === "popout") {
      const title = target ? Panel.targetTitle(target) : "";
      parts.push(this.h("div", { class: "bac-p-doc", text: title || S("panelNoDoc") }));
      try {
        this.doc.title = S("sectionTitle") + (title ? " – " + title : "");
      }
      catch (e) {}
    }
    parts.push(bar);

    // Rows: visible labels of the profile, then other colors in use
    const rows = [];
    const seen = new Set();
    const entries = profile.standard ? profile.colors : SB.visibleColors(profile);
    for (const entry of entries) {
      seen.add(entry.color);
      rows.push({ color: entry.color, name: entry.label.trim() || SB.stockName(entry.color) || entry.color, n: counts.get(entry.color) || 0, hidden: false });
    }
    for (const [color, n] of counts) {
      if (!seen.has(color)) {
        const entry = profile.colors.find(c => c.color === color);
        rows.push({ color, name: SB.displayName(color, profile), n, hidden: !!entry, other: !entry });
      }
    }
    const clickable = !!reader && !reader._state?.readOnly;
    const listEl = this.h("div", { class: "bac-p-list", role: "list" });
    for (const r of rows) {
      const name = this.h("span", { class: "bac-p-name", text: r.name });
      if (r.hidden) {
        name.append(this.h("i", { text: " (" + S("statsHidden") + ")" }));
      }
      const content = [
        this.h("span", { class: "bac-p-dot", style: "background:" + r.color }),
        name,
        this.h("span", { class: "bac-p-n" + (r.n ? "" : " bac-p-zero"), text: String(r.n) }),
      ];
      const tip = S("panelRowTip", { label: r.name, n: r.n });
      let row;
      if (clickable) {
        const active = toolColor === r.color;
        row = this.h("button", {
          class: "bac-p-row" + (active ? " bac-p-active" : ""),
          "data-key": "row-" + r.color,
          "aria-pressed": active ? "true" : "false",
          title: tip + "\n" + S("panelClickHint"),
          on: {
            click: () => {
              SB.Reader.setToolColor(reader, r.color);
              this.SB.setTimeout(() => this.render(), 30);
            },
          },
        }, content);
      }
      else {
        row = this.h("div", { class: "bac-p-row", title: tip }, content);
      }
      listEl.append(this.h("div", { role: "listitem" }, row));
    }
    parts.push(listEl);
    if (!target && this.kind === "popout") {
      // nothing more to say: the line above asks to open a document
    }
    else if (target && target.mode === "library" && target.attachmentIDs.length > 1) {
      parts.push(this.h("div", { class: "bac-p-hint", text: S("panelLibraryHint", { n: target.attachmentIDs.length }) }));
    }
    this.root.replaceChildren(...parts);
    this.root.classList.add("bac-p-root", "bac-p-" + this.kind);
    if (this.setSummary) {
      try {
        this.setSummary(S("sectionSummary", { n: total, profile: profile.name }));
      }
      catch (e) {}
    }
  }

  style() {
    const st = this.h("style");
    st.textContent = `
.bac-p-root { font: inherit; color: var(--fill-primary, CanvasText); }
.bac-p-popout { padding: 8px 10px; box-sizing: border-box; }
.bac-p-bar { display: flex; align-items: center; gap: 4px; margin: 0 0 6px; }
.bac-p-profile { flex: 1; min-width: 0; font: inherit; }
.bac-p-icon { appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 24px;
  padding: 0; border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--fill-secondary, #666); }
.bac-p-icon:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); color: var(--fill-primary, CanvasText); }
.bac-p-icon[aria-pressed="true"] { background: var(--fill-quinary, rgba(127,127,127,.2)); color: var(--fill-primary, CanvasText); border-color: var(--fill-quarternary, rgba(127,127,127,.35)); }
.bac-p-icon:focus-visible, .bac-p-row:focus-visible { outline: 2px solid var(--color-focus-border, var(--accent-blue, #2e7bd1)); outline-offset: -1px; }
.bac-p-doc { font-weight: 600; margin: 2px 0 8px; overflow-wrap: anywhere; }
.bac-p-list { display: flex; flex-direction: column; gap: 1px; }
.bac-p-row { appearance: none; display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; column-gap: 8px; align-items: center;
  width: 100%; box-sizing: border-box; margin: 0; padding: 3px 6px; border: 1px solid transparent; border-radius: 5px;
  background: transparent; color: inherit; font: inherit; text-align: start; }
button.bac-p-row:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
.bac-p-row.bac-p-active { border-color: var(--accent-blue, #2e7bd1); background: color-mix(in srgb, var(--accent-blue, #2e7bd1) 10%, transparent); }
.bac-p-dot { width: 12px; height: 12px; border-radius: 3px; box-sizing: border-box; border: 1px solid rgba(0,0,0,.15); }
.bac-p-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bac-p-name i { color: var(--fill-secondary, #777); }
.bac-p-n { font-variant-numeric: tabular-nums; color: var(--fill-secondary, #666); }
.bac-p-zero { opacity: .55; }
.bac-p-hint { margin-top: 6px; color: var(--fill-secondary, #666); font-size: .92em; }
`;
    return st;
  }
};
