/* Better Annotations – labels of the active profile with counts
 *
 * Shown in two places with the same content:
 *  - a section “Better Annotations” in Zotero's item pane (library and
 *    reader), registered with Zotero.ItemPaneManager.registerSection
 *  - a separate window that follows the active reader tab, e.g. for a
 *    second screen
 *
 * Content: profile selection, one row per label with color, number of
 * annotations and (optionally) the description, which can be edited in
 * place. In the reader, a click on a row turns on an annotation tool with
 * this color; a second click switches back to the pointer. In the library,
 * the section counts the annotations of all files of the selected item.
 *
 * The icons pin.svg and new-window.svg are Zotero's own icons
 * (AGPL-3.0, Corporation for Digital Scholarship).
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
  _lastTabID: null,
  _collapsedContextPane: false,
  POPOUT_MAX_WIDTH: 380,

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
    this.stopOneShot();
    this._oneShot.clear();
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
    const args = JSON.stringify({ label: SB.S("pluginName") });
    const icon = SB.rootURI + "content/icons/labels.svg";
    const darkIcon = SB.rootURI + "content/icons/labels-dark.svg";
    try {
      this._sectionKey = Zotero.ItemPaneManager.registerSection({
        paneID: "labels",
        pluginID: SB.id,
        header: { l10nID: "better-annotations-section-header", l10nArgs: args, icon, darkIcon },
        sidenav: { l10nID: "better-annotations-section-sidenav", l10nArgs: args, icon, darkIcon },
        // Tooltips of header buttons come from Fluent only (locale/*/better-annotations.ftl)
        sectionButtons: [
          {
            type: "bac-popout",
            icon: "chrome://better-annotations/content/icons/new-window.svg",
            l10nID: "better-annotations-popout",
            onClick: ({ tabType }) => this.openPopout({ collapse: String(tabType || "").startsWith("reader") }),
          },
          {
            type: "bac-top",
            icon: "chrome://better-annotations/content/icons/to-top.svg",
            l10nID: "better-annotations-top",
            onClick: ({ body }) => this.scrollToTop(body),
          },
        ],
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

  /**
   * Show the section at the top of the item pane, opened, as a click on its
   * icon in the side navigation does. Unlike pinning, the next scroll or
   * section change works as usual.
   */
  scrollToTop(body) {
    try {
      const section = body.closest("collapsible-section");
      if (section && section.open === false) {
        section.open = true;
      }
      const details = body.closest("item-details");
      if (details && this._sectionKey) {
        details.scrollToPane(this._sectionKey, "smooth");
      }
    }
    catch (e) {
      this.SB.logError(e);
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

  /** Profile ID of a target: of the reader, else of the (first) file in the library. */
  profileIdOf(target) {
    const P = this.SB.Profiles;
    const reader = this.readerOf(target);
    if (reader) {
      return P.forReader(reader);
    }
    return target && target.attachmentIDs && target.attachmentIDs.length ? P.forFile(target.attachmentIDs[0]) : P.defaultId();
  },

  /** Annotations of a target by profile (see Profiles.summarize). */
  summarizeTarget(target) {
    const P = this.SB.Profiles;
    if (!target) {
      return P.summarize([]);
    }
    const reader = this.readerOf(target);
    if (reader && BetterAnnotations.readerState(reader) && BetterAnnotations.readerState(reader).annotations) {
      return P.summarize(P.readerList(reader));
    }
    return P.summarize(P.fileList(target.attachmentIDs));
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

  openPopout({ collapse = false } = {}) {
    const SB = this.SB;
    const main = Zotero.getMainWindow();
    if (collapse) {
      // The list now lives in its own window: make room for the document
      try {
        if (main.ZoteroContextPane && !main.ZoteroContextPane.collapsed) {
          main.ZoteroContextPane.collapsed = true;
          this._collapsedContextPane = true;
        }
      }
      catch (e) {
        SB.logError(e);
      }
    }
    if (this._popout && !this._popout.closed) {
      this._popout.focus();
      return;
    }
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
        this.limitPopoutSize(win);
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
    const onUnload = () => {
      // Some engines unload the initial blank document first: ignore that
      try {
        if (win.location.href === "about:blank") {
          return;
        }
      }
      catch (e) {}
      win.removeEventListener("unload", onUnload);
      if (win.bacView) {
        this._views.delete(win.bacView);
        win.bacView = null;
      }
      if (this._popout === win) {
        this._popout = null;
        this.restoreContextPane();
      }
    };
    win.addEventListener("unload", onUnload);
  },

  /** A narrow list: limited width, no maximizing (also not by double-clicking the title bar). */
  limitPopoutSize(win) {
    const max = this.POPOUT_MAX_WIDTH;
    const clamp = () => {
      try {
        if (win.windowState === win.STATE_MAXIMIZED || win.windowState === win.STATE_FULLSCREEN) {
          win.restore();
          return;
        }
        if (win.outerWidth > max) {
          win.resizeTo(max, win.outerHeight);
        }
      }
      catch (e) {}
    };
    win.addEventListener("resize", clamp);
    win.addEventListener("sizemodechange", clamp);
    clamp();
  },

  /** Open the right-hand pane of the reader again if the window had closed it. */
  restoreContextPane() {
    if (!this._collapsedContextPane) {
      return;
    }
    this._collapsedContextPane = false;
    try {
      const main = Zotero.getMainWindow();
      if (main && main.ZoteroContextPane && main.ZoteroContextPane.collapsed) {
        main.ZoteroContextPane.collapsed = false;
      }
    }
    catch (e) {}
  },

  closePopout() {
    if (this._popout && !this._popout.closed) {
      try {
        this._popout.close();
      }
      catch (e) {}
    }
    this._popout = null;
    this.restoreContextPane();
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
    const same = view.target && this._popoutTarget && view.target.tabID === this._popoutTarget.tabID
      && view.target.mode === this._popoutTarget.mode;
    view.target = this._popoutTarget;
    if (!same) {
      view.render();
    }
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

  /**
   * Readers in which a color was chosen in the panel while “keep color” is
   * off: after the next annotation the reader switches back to the pointer.
   */
  _oneShot: new Map(),

  armOneShot(reader, color) {
    if (this.SB.setting("keepToolColor") === false) {
      this._oneShot.set(reader, { color: this.SB.normalize(color), count: this.readerAnnotationCount(reader) });
      this.watchOneShot();
    }
    else {
      this._oneShot.delete(reader);
    }
  },

  readerAnnotationCount(reader) {
    try {
      return Array.from(BetterAnnotations.readerState(reader)?.annotations || []).length;
    }
    catch (e) {
      return -1;
    }
  },

  /**
   * The reader adds a new annotation to its own list right away, but saves it
   * to the database (and reports it through the notifier) only after a short
   * delay. Watching the list switches back to the pointer without that delay.
   */
  watchOneShot() {
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!win || this._oneShotTimer) {
      return;
    }
    this._oneShotWin = win;
    this._oneShotTimer = win.setInterval(() => {
      for (const [reader, state] of [...this._oneShot]) {
        const active = this.SB.Reader.activeToolColor(reader);
        if (active !== state.color) {
          this._oneShot.delete(reader); // the user chose another tool meanwhile
          continue;
        }
        const n = this.readerAnnotationCount(reader);
        if (n > state.count) {
          this._oneShot.delete(reader);
          this.SB.Reader.pickToolColor(reader, state.color); // same color again = back to the pointer
          this.refreshAll();
        }
        else if (n < state.count) {
          state.count = n;
        }
      }
      if (!this._oneShot.size) {
        this.stopOneShot();
      }
    }, 80);
  },

  stopOneShot() {
    if (this._oneShotTimer && this._oneShotWin) {
      try {
        this._oneShotWin.clearInterval(this._oneShotTimer);
      }
      catch (e) {}
    }
    this._oneShotTimer = null;
  },

  onAnnotationsAdded(ids) {
    if (!this._oneShot.size) {
      return;
    }
    let parents = [];
    try {
      parents = Zotero.Items.get(ids).filter(i => i && i.isAnnotation && i.isAnnotation()).map(i => i.parentItemID);
    }
    catch (e) {
      return;
    }
    for (const [reader, state] of [...this._oneShot]) {
      if (!parents.includes(reader.itemID)) {
        continue;
      }
      this._oneShot.delete(reader);
      if (this.SB.Reader.activeToolColor(reader) === state.color) {
        this.SB.Reader.pickToolColor(reader, state.color); // same color again = back to the pointer
      }
    }
  },

  onNotify(event, type, ids) {
    if (type === "item" && event === "add") {
      this.onAnnotationsAdded(ids);
    }
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

  /** Update the marked tool color and the counts of open readers; follow tab changes. */
  poll() {
    try {
      const tabs = Zotero.getMainWindow()?.Zotero_Tabs;
      const id = tabs ? tabs.selectedID : null;
      if (id !== this._lastTabID) {
        this._lastTabID = id;
        this.retargetPopout();
      }
    }
    catch (e) {}
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
    this.editing = null; // id of the color entry whose description has the focus
    this.reveal = null; // id of an entry without description whose field is shown for adding one
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

  /** Line icons drawn in the current text color (follow light and dark mode). */
  icon(kind) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = (d, width) => {
      const p = this.doc.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("style", "fill:none;stroke:currentColor;stroke-width:" + (width || 1.1) + ";stroke-linecap:round;stroke-linejoin:round");
      svg.append(p);
    };
    if (kind === "keep") {
      // Repeat: the color stays selected for further annotations
      path("M2.5 7V6.5a2 2 0 0 1 2-2h8.5M11 2.5l2 2-2 2M13.5 9v.5a2 2 0 0 1-2 2H3M5 9.5l-2 2 2 2");
    }
    else if (kind === "filter") {
      // Funnel: show only the annotations of this profile
      path("M2.5 3h11l-4.2 5v4.5l-2.6 1.3V8z");
    }
    else if (kind === "describe") {
      path("M2.5 3.5h11M2.5 6.5h11M2.5 9.5h7M2.5 12.5h5");
    }
    else if (kind === "edit") {
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      path("M10.6 2.4l3 3-8.2 8.2-3.7.7.7-3.7z M9.2 3.8l3 3");
    }
    else if (kind === "chevron") {
      svg.setAttribute("width", "8");
      svg.setAttribute("height", "8");
      svg.setAttribute("viewBox", "0 0 8 8");
      path("M1 2.75 4 5.75 7 2.75");
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

  /** Give the annotations of the document without a profile tag the tag of its profile (in the history, can be undone). */
  async assignUntagged(reader, profile) {
    const SB = this.SB;
    try {
      const scope = { type: "doc", id: reader.itemID, label: this.Panel.targetTitle(this.target) || "" };
      const changes = await SB.Library.planProfileAssign(scope, profile.id);
      if (changes.length) {
        await SB.Library.run("profileAssign", { profile: profile.name, scope: scope.label }, changes);
      }
    }
    catch (e) {
      SB.logError(e);
    }
    this.render();
  }

  /** Changes when something visible changes (tool color, number of annotations). */
  signature() {
    const reader = this.Panel.readerOf(this.target);
    let tool = "";
    let n = "";
    let filter = "";
    try {
      tool = reader ? String(this.SB.Reader.activeToolColor(reader) || "") : "";
      n = reader ? String(Array.from(BetterAnnotations.readerState(reader)?.annotations || []).length) : "";
      filter = reader && this.SB.Profiles.filterActive(reader) ? "f" : "";
    }
    catch (e) {}
    return [this.Panel.profileIdOf(this.target), this.target ? this.target.tabID || this.target.attachmentIDs.join(",") : "", tool, n, filter].join("|");
  }

  render() {
    if (this.editing) {
      // Do not rebuild while a description is being edited
      this.pendingRender = true;
      return;
    }
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
    this.pendingRender = false;
    this._build();
    if (focusKey) {
      this.focusKey(focusKey);
    }
  }

  focusKey(key) {
    const el = Array.from(this.root.querySelectorAll("[data-key]")).find(x => x.getAttribute("data-key") === key);
    if (el) {
      el.focus();
    }
    return el;
  }

  /** Profile selection: a flat button like the reader's profile button, with a native menu. */
  profileButton(profile, summary) {
    const SB = this.SB;
    const S = (k, a) => this.S(k, a);
    const reader = this.Panel.readerOf(this.target);
    const source = reader ? SB.Reader.sourceText(reader) : "";
    const b = this.h("button", {
      class: "bac-p-menu",
      "data-key": "profile",
      title: S("panelProfile") + (source ? "\n" + source : ""),
      "aria-haspopup": "menu",
      "aria-label": S("panelProfile") + ": " + profile.name,
    }, this.h("span", { class: "bac-p-menu-name", text: profile.name }), this.h("span", { class: "bac-p-caret" }, this.icon("chevron")));
    b.addEventListener("click", (e) => {
      e.preventDefault();
      this.openProfileMenu(b, profile.id, summary);
    });
    return b;
  }

  /** Picture under the pointer while a color is dragged: color and label. */
  dragGhost(r) {
    try {
      const ghost = this.h("div", { class: "bac-p-ghost" },
        this.h("span", { class: "bac-p-dot", style: "background:" + r.color }),
        this.h("span", { text: r.name }));
      this.doc.documentElement.append(ghost);
      return ghost;
    }
    catch (e) {
      return null;
    }
  }

  /** Profile menu: like the reader's: all profiles with their number in the document, “Manage Profiles…”. */
  openProfileMenu(anchor, active, summary) {
    const SB = this.SB;
    const P = SB.Profiles;
    const doc = this.doc;
    const target = this.target;
    const entries = P.menuEntries(summary);
    const reader = this.Panel.readerOf(target);
    const choose = (id) => {
      const task = reader ? P.setForReader(reader, id) : P.setForFiles(target ? target.attachmentIDs : [], id);
      Promise.resolve(task).catch(err => SB.logError(err));
    };
    let popup = null;
    try {
      popup = doc.createXULElement ? doc.createXULElement("menupopup") : null;
    }
    catch (e) {}
    if (popup && typeof popup.openPopup === "function") {
      const add = (p) => {
        const mi = doc.createXULElement("menuitem");
        mi.setAttribute("type", "radio");
        mi.setAttribute("label", p.name);
        if (p.n) {
          mi.setAttribute("acceltext", String(p.n));
        }
        if (p.id === active) {
          mi.setAttribute("checked", "true");
        }
        mi.addEventListener("command", () => choose(p.id));
        popup.append(mi);
      };
      entries.forEach(add);
      popup.append(doc.createXULElement("menuseparator"));
      const manage = doc.createXULElement("menuitem");
      manage.setAttribute("label", SB.S("menuManageProfiles"));
      manage.addEventListener("command", () => SB.openPrefs());
      popup.append(manage);
      popup.addEventListener("popuphidden", () => popup.remove(), { once: true });
      (doc.getElementById("mainPopupSet") || doc.documentElement).append(popup);
      popup.openPopup(anchor, "after_start", 0, 2, false, false);
      return;
    }
    // Fallback without XUL (e.g. tests in a browser): a simple list below the button
    this.root.querySelector(".bac-p-fallback")?.remove();
    const menu = this.h("div", { class: "bac-p-fallback", role: "menu" });
    const add = (p) => {
      menu.append(this.h("button", {
        role: "menuitemradio",
        "aria-checked": p.id === active ? "true" : "false",
        on: {
          click: () => {
            menu.remove();
            choose(p.id);
          },
        },
      }, (p.id === active ? "✓ " : "") + p.name + (p.n ? " (" + p.n + ")" : "")));
    };
    entries.forEach(add);
    menu.append(this.h("button", {
      role: "menuitem",
      on: {
        click: () => {
          menu.remove();
          SB.openPrefs();
        },
      },
    }, SB.S("menuManageProfiles")));
    anchor.after(menu);
  }

  _build() {
    const SB = this.SB;
    const S = (k, a) => this.S(k, a);
    const Panel = this.Panel;
    const target = this.target;
    const reader = Panel.readerOf(target);
    const profile = SB.Profiles.profile(Panel.profileIdOf(target));
    const summary = Panel.summarizeTarget(target);
    const counts = summary.colors.get(profile.id) || new Map();
    const total = summary.byProfile.get(profile.id) || 0;
    const toolColor = reader ? SB.Reader.activeToolColor(reader) : null;
    this.lastSignature = this.signature();

    // Toolbar: profile, descriptions, settings
    const descKey = this.kind === "section" ? "sectionDescriptions" : "popoutDescriptions";
    const descOn = SB.descriptionsOn();
    const showDesc = descOn && SB.setting(descKey) === true;
    const keep = SB.setting("keepToolColor") !== false;
    const bar = this.h("div", { class: "bac-p-bar" },
      this.profileButton(profile, summary),
      this.iconButton("keep", S("panelKeepColor"), () => {
        SB.Store.setSetting("keepToolColor", !keep).catch(err => SB.logError(err));
      }, keep));
    // “Only this profile”: Zotero's filter hides the other profiles in the document and the sidebar
    if (reader && SB.Profiles.enabled()) {
      const filtered = SB.Profiles.filterActive(reader);
      bar.append(this.iconButton("filter", S(filtered ? "panelFilterOff" : "panelFilterOn"), () => SB.Profiles.toggleFilter(reader), filtered));
    }
    if (descOn) {
      bar.append(this.iconButton("describe", S("panelDescriptions"), () => {
        SB.Store.setSetting(descKey, !showDesc).catch(err => SB.logError(err));
      }, showDesc));
    }
    bar.append(this.iconButton("settings", S("panelSettings"), () => SB.openPrefs()));

    const parts = [this.style()];
    if (this.kind === "popout") {
      const title = target ? Panel.targetTitle(target) : "";
      parts.push(this.h("div", { class: "bac-p-doc", text: title || S("panelNoDoc") }));
      try {
        this.doc.title = S("pluginName") + (title ? " – " + title : "");
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
      rows.push({ color: entry.color, name: entry.label.trim() || SB.stockName(entry.color) || entry.color, n: counts.get(entry.color) || 0, hidden: false, entry });
    }
    for (const [color, n] of counts) {
      if (!seen.has(color)) {
        const entry = profile.colors.find(c => c.color === color);
        rows.push({ color, name: SB.displayName(color, profile), n, hidden: !!entry, entry });
      }
    }
    const editable = showDesc && !profile.preset && !!SB.Store.getProfile(profile.id);
    const clickable = !!reader && !BetterAnnotations.readerState(reader)?.readOnly;
    const listEl = this.h("div", { class: "bac-p-list", role: "list" });
    let snapshot = null;
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
      const description = r.entry ? SB.cleanDescription(r.entry.description) : "";
      let tip = S("panelRowTip", { label: r.name, n: r.n });
      if (description && !showDesc) {
        tip = SB.tooltipText(tip, description);
      }
      let row;
      if (clickable) {
        const active = toolColor === r.color;
        // A div, not a button: Firefox does not start drags on buttons
        row = this.h("div", {
          class: "bac-p-row bac-p-click" + (active ? " bac-p-active" : ""),
          role: "button",
          tabindex: "0",
          draggable: "true",
          "data-key": "row-" + r.color,
          "aria-pressed": active ? "true" : "false",
          title: tip + "\n" + S(active ? "panelClickHintOff" : "panelClickHint"),
          on: {
            keydown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                row.click();
              }
            },
            // Drag the color onto an annotation in the reader
            dragstart: (e) => {
              snapshot = null;
              if (!SB.Reader.startColorDrag(reader, r.color, e)) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.setData(SB.Reader.DRAG_TYPE, r.color);
              e.dataTransfer.effectAllowed = "copy";
              const ghost = this.dragGhost(r);
              if (ghost) {
                e.dataTransfer.setDragImage(ghost, 10, 10);
                SB.setTimeout(() => ghost.remove(), 0);
              }
            },
            dragend: () => SB.Reader.endColorDrag(),
            // Selected annotations or selected text: take them before the reader loses the focus
            mousedown: () => {
              snapshot = SB.Reader.selectionSnapshot(reader);
            },
            click: () => {
              const once = snapshot || SB.Reader.selectionSnapshot(reader); // keyboard: no mousedown
              snapshot = null;
              if (once) {
                // Color the selection once; the tool is not changed
                SB.Reader.colorSnapshot(reader, once, r.color);
              }
              else {
                SB.Reader.pickToolColor(reader, r.color);
                if (SB.Reader.activeToolColor(reader)) {
                  Panel.armOneShot(reader, r.color);
                }
              }
              SB.setTimeout(() => this.render(), 30);
            },
          },
        }, content);
      }
      else {
        row = this.h("div", { class: "bac-p-row", title: tip }, content);
      }
      const item = this.h("div", { role: "listitem", class: "bac-p-item" }, row);
      const canEdit = editable && r.entry && profile.colors.some(c => c.id === r.entry.id);
      if (canEdit) {
        item.classList.add("bac-p-editable");
        item.append(this.iconButtonEdit(r));
      }
      if (showDesc && r.entry && (description || this.reveal === r.entry.id)) {
        // A click on the text selects the color like the rest of the row
        item.append(this.descriptionField(profile, r.entry, description, canEdit, clickable ? () => row.click() : null));
      }
      listEl.append(item);
    }
    parts.push(listEl);
    const others = [...summary.byProfile.keys()].filter(id => id !== profile.id);
    if (others.length) {
      parts.push(this.h("div", { class: "bac-p-hint", text: S("statsOthers", {
        list: others.map(id => SB.Profiles.name(id) + " (" + summary.byProfile.get(id) + ")").join(", "),
      }) }));
    }
    // Annotations without a profile tag (older ones, from Zotero's apps): offer to assign them
    const untagged = reader ? SB.Profiles.untaggedCount(reader) : 0;
    if (untagged) {
      const filtered = SB.Profiles.filterActive(reader);
      parts.push(this.h("div", { class: "bac-p-hint bac-p-untagged" },
        this.h("span", { text: S(filtered ? "untaggedHidden" : "untaggedHint", { n: untagged }) + " " }),
        this.h("button", {
          class: "bac-p-link",
          "data-key": "assign-untagged",
          on: { click: () => this.assignUntagged(reader, profile) },
        }, S("btnAssignHere", { profile: profile.name }))));
    }
    const shared = SB.Profiles.sharedColorsText(summary);
    if (shared) {
      parts.push(this.h("div", { class: "bac-p-hint bac-p-warn", role: "note", text: shared }));
    }
    if (showDesc && profile.preset) {
      parts.push(this.h("div", { class: "bac-p-hint", text: S("panelPresetDescHint") }));
    }
    if (target && target.mode === "library" && target.attachmentIDs.length > 1) {
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

  /** Pencil next to a row: edit (or add) the description. Visible on hover and keyboard focus. */
  iconButtonEdit(r) {
    const label = this.S("panelEditDescriptionFor", { label: r.name });
    return this.h("button", {
      class: "bac-p-edit-btn",
      "data-key": "edit-" + r.entry.id,
      title: label,
      "aria-label": label,
      on: {
        click: (e) => {
          e.preventDefault();
          // Only the pencil opens the field
          this.unlocked = r.entry.id;
          if (!this.SB.cleanDescription(r.entry.description)) {
            this.reveal = r.entry.id;
          }
          this._render();
          const area = this.focusKey("desc-" + r.entry.id);
          if (area && area.setSelectionRange) {
            area.setSelectionRange(area.value.length, area.value.length);
          }
        },
      },
    }, this.icon("edit"));
  }

  /**
   * Description as text; the pencil turns it into a field. Plain text with
   * line breaks, saved to the profile when the field loses the focus.
   * Esc restores the previous text, Enter finishes, Shift+Enter adds a line.
   */
  descriptionField(profile, entry, description, canEdit, onTextClick) {
    const SB = this.SB;
    const S = (k, a) => this.S(k, a);
    const open = canEdit && this.unlocked === entry.id;
    if (!open) {
      // Plain text like the label; only the pencil turns it into a field
      const text = this.h("div", {
        class: "bac-p-desc bac-p-desc-text" + (this.kind === "section" ? " bac-p-clamp" : ""),
        "data-key": "desc-" + entry.id,
        text: description,
      });
      if (onTextClick) {
        text.addEventListener("click", () => onTextClick());
      }
      return text;
    }
    const area = this.h("textarea", {
      class: "bac-p-desc bac-p-desc-field",
      "data-key": "desc-" + entry.id,
      rows: "1",
      maxlength: String(SB.MAX_DESCRIPTION),
      placeholder: S("btnAddDescription"),
      "aria-label": S("ariaDescription", { label: entry.label.trim() || entry.color }),
      spellcheck: "true",
    });
    area.value = description;
    SB.autoGrow(area);
    let original = description;
    let cancelled = false;
    area.addEventListener("focus", () => {
      if (!canEdit) {
        return;
      }
      this.editing = entry.id;
      original = area.value;
    });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancelled = true;
        area.value = original;
        area.blur();
      }
      else if (e.key === "Enter" && !e.shiftKey) {
        // Enter finishes; Shift+Enter starts a new line
        e.preventDefault();
        area.blur();
      }
    });
    area.addEventListener("blur", async () => {
      if (!canEdit) {
        return;
      }
      const value = SB.cleanDescription(area.value);
      const changed = !cancelled && value !== SB.cleanDescription(original);
      cancelled = false;
      this.editing = null;
      this.reveal = null;
      this.unlocked = null;
      if (changed) {
        try {
          const stored = SB.Store.getProfile(profile.id);
          const copy = stored && !SB.Store.isPreset(profile.id) ? JSON.parse(JSON.stringify(stored)) : null;
          const target = copy && copy.colors.find(c => c.id === entry.id);
          if (target) {
            target.description = value;
            await SB.Store.saveProfile(copy); // all views update through the store
            return;
          }
        }
        catch (e) {
          SB.logError(e);
        }
      }
      this._render();
    });
    return area;
  }

  style() {
    const st = this.h("style");
    st.textContent = `
.bac-p-root { font: inherit; color: var(--fill-primary, CanvasText); }
.bac-p-popout { padding: 8px 10px; box-sizing: border-box; }
.bac-p-bar { display: flex; align-items: center; gap: 2px; margin: 0 0 6px; }
.bac-p-menu { appearance: none; flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px; height: 24px; margin: 0 4px 0 0;
  padding: 0 6px; border: 0; border-radius: 5px; background: transparent; color: inherit; font: inherit; text-align: start; }
.bac-p-menu-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bac-p-caret { display: flex; align-items: center; color: var(--fill-secondary, GrayText); }
.bac-p-menu:hover, .bac-p-icon:hover, .bac-p-edit-btn:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
.bac-p-menu:active, .bac-p-icon:active, .bac-p-edit-btn:active, .bac-p-menu[open] { background: var(--fill-quarternary, rgba(127,127,127,.25)); }
.bac-p-icon { appearance: none; flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 24px;
  margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--fill-secondary, GrayText); }
.bac-p-icon[aria-pressed="true"] { background: var(--fill-quinary, rgba(127,127,127,.2)); color: var(--fill-primary, CanvasText); }
.bac-p-menu:focus-visible, .bac-p-icon:focus-visible, .bac-p-row:focus-visible, .bac-p-edit-btn:focus-visible {
  outline: var(--width-focus-border, 2px) solid var(--color-focus-border, var(--accent-blue, #2e7bd1)); outline-offset: -1px; }
.bac-p-fallback { display: flex; flex-direction: column; margin: 0 0 6px; padding: 4px 0; border: 1px solid var(--fill-quinary, #ccc); border-radius: 6px; }
.bac-p-fallback button { appearance: none; border: 0; background: none; text-align: start; padding: 3px 10px; font: inherit; color: inherit; }
.bac-p-doc { font-weight: 600; margin: 2px 0 8px; overflow-wrap: anywhere; }
.bac-p-list { display: flex; flex-direction: column; gap: 1px; }
.bac-p-item { position: relative; }
.bac-p-row { appearance: none; display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; column-gap: 8px; align-items: center;
  width: 100%; box-sizing: border-box; margin: 0; padding: 3px 6px; border: 1px solid transparent; border-radius: 5px;
  background: transparent; color: inherit; font: inherit; text-align: start; }
.bac-p-click:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
.bac-p-click { cursor: default; user-select: none; -moz-user-select: none; }
.bac-p-ghost { position: fixed; top: -100px; left: 0; display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 5px;
  font: inherit; font-size: 12px; background: var(--material-background, Canvas); color: var(--fill-primary, CanvasText);
  border: 1px solid var(--fill-quinary, rgba(127,127,127,.35)); }
.bac-p-row.bac-p-active { background: color-mix(in srgb, var(--accent-blue, #2e7bd1) 14%, transparent); border-color: color-mix(in srgb, var(--accent-blue, #2e7bd1) 45%, transparent); }
.bac-p-dot { width: 12px; height: 12px; border-radius: 3px; box-sizing: border-box; border: 1px solid rgba(0,0,0,.15); }
.bac-p-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bac-p-name i { color: var(--fill-secondary, GrayText); }
.bac-p-n { font-variant-numeric: tabular-nums; color: var(--fill-secondary, GrayText); }
.bac-p-zero { opacity: .55; }
/* The pencil sits where the number is and covers it on hover or keyboard focus */
.bac-p-edit-btn { appearance: none; position: absolute; top: 1px; right: 1px; display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent;
  color: var(--fill-secondary, GrayText); opacity: 0; }
.bac-p-item:hover .bac-p-edit-btn, .bac-p-item:focus-within .bac-p-edit-btn { opacity: 1; }
.bac-p-editable:hover .bac-p-n, .bac-p-editable:focus-within .bac-p-n { visibility: hidden; }
.bac-p-desc { display: block; box-sizing: border-box; width: calc(100% - 20px); min-height: 0; margin: 0 0 4px 20px;
  padding: 0 7px; color: var(--fill-secondary, GrayText); font: inherit; font-size: 12px; line-height: 1.4; }
/* Text: no field look, not selectable; a click selects the color like the row */
.bac-p-desc-text { white-space: pre-line; overflow-wrap: anywhere; user-select: none; -moz-user-select: none; cursor: default; }
.bac-p-clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
/* Field after a click on the pencil */
textarea.bac-p-desc-field { -moz-appearance: none; appearance: none; padding: 3px 7px; margin-top: 1px; resize: none; overflow: hidden;
  color: var(--fill-primary, FieldText); background: var(--material-background, Field);
  border: 1px solid var(--fill-quinary, rgba(127,127,127,.3)); border-radius: 5px;
  outline: 2px solid color-mix(in srgb, var(--accent-blue, #2e7bd1) 55%, transparent); outline-offset: 0; }
textarea.bac-p-desc-field::placeholder { color: var(--fill-secondary, GrayText); font-style: italic; opacity: .75; }
.bac-p-hint { margin-top: 6px; color: var(--fill-secondary, GrayText); font-size: .92em; }
.bac-p-warn { color: var(--fill-primary, CanvasText); }
.bac-p-warn::before { content: "⚠ "; color: var(--accent-orange, #d97706); }
.bac-p-link { -moz-appearance: none; appearance: none; border: none; background: none; padding: 0; color: var(--accent-blue, LinkText); font: inherit; cursor: pointer; text-decoration: underline; }
.bac-p-link:focus-visible { outline: 2px solid var(--color-focus-border, Highlight); outline-offset: 1px; border-radius: 2px; }
`;
    return st;
  }
};
