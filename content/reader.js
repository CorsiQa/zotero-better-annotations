/* Better Annotations – integration into the Zotero reader
 *
 * Uses the interface Zotero.Reader.registerEventListener:
 *   - createAnnotationContextMenu   right-click on an existing annotation
 *   - createColorContextMenu        color menu in the toolbar
 *   - renderTextSelectionPopup      popup after selecting text
 *   - renderSidebarAnnotationHeader tooltips for the color filter in the sidebar;
 *                                   profile of the annotation in its head
 *
 * Approach for the menus: the plugin appends its entries via `append`
 * (Zotero renders them and handles click and close). It then places
 * visible proxy rows where the default colors are,
 * hides the originals and forwards clicks to the hidden rows.
 * If this step fails (e.g. after a Zotero update), the appended
 * entries stay visible at the end of the menu and keep working.
 *
 * Creating annotations in arbitrary colors is adapted from
 * “Just Enough Color” by MCXCC303 (AGPL-3.0-or-later), see createAnnotation().
 */

/* global Zotero, Components, BetterAnnotations */

BetterAnnotations.Reader = {
  _handlers: null,
  _tip: null,
  _popupState: new WeakMap(),
  _lastPopup: new WeakMap(), // reader -> selection popup shown last
  _tagWatch: new WeakMap(), // reader document -> MutationObserver (profile tags)
  _drag: null, // color drag from the item pane
  _menuSeq: 0,

  get SB() {
    return BetterAnnotations;
  },

  register() {
    this._handlers = {
      createAnnotationContextMenu: e => this._safe(() => this.onAnnotationMenu(e)),
      createColorContextMenu: e => this._safe(() => this.onToolColorMenu(e)),
      renderTextSelectionPopup: e => this._safe(() => this.onSelectionPopup(e)),
      renderSidebarAnnotationHeader: e => this._safe(() => this.onSidebarHeader(e)),
      renderToolbar: e => this._safe(() => this.onToolbar(e)),
    };
    this._unlisten = this.SB.Store.onChange(() => this._safe(() => {
      this.refreshToolbars();
      this.refreshTagMarks();
    }));
    this.startScan();
    for (const [type, fn] of Object.entries(this._handlers)) {
      try {
        Zotero.Reader.registerEventListener(type, fn, this.SB.id);
      }
      catch (e) {
        this.SB.log("reader event not available: " + type);
      }
    }
  },

  unregister() {
    if (!this._handlers) {
      return;
    }
    for (const [type, fn] of Object.entries(this._handlers)) {
      try {
        Zotero.Reader.unregisterEventListener(type, fn);
      }
      catch (e) {}
    }
    this._handlers = null;
    this.endColorDrag();
    this.hideTip();
    this.stopScan();
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
    // Remove inserted elements from open readers
    try {
      for (const r of Zotero.Reader._readers || []) {
        const doc = r._iframeWindow && r._iframeWindow.document;
        if (doc) {
          for (const el of doc.querySelectorAll("[data-bac-toolbar], [data-bac-panel], #bac-reader-style, .bac-chip")) {
            el.remove();
          }
          this._tagWatch.get(doc)?.observer?.disconnect();
          this._tagWatch.delete(doc);
          for (const el of doc.querySelectorAll("[data-bac-hidden], [data-bac-last], [data-bac-only], [data-bac-chip], [data-bac-centered]")) {
            for (const a of ["data-bac-hidden", "data-bac-last", "data-bac-only", "data-bac-chip", "data-bac-centered"]) {
              el.removeAttribute(a);
            }
          }
        }
      }
    }
    catch (e) {}
  },

  shutdown() {
    this.unregister();
  },

  _safe(fn) {
    try {
      fn();
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  // -------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------

  /** Get the color of a menu row or button from its color icon (SVG). */
  colorOf(el) {
    if (!el) {
      return null;
    }
    try {
      for (const node of el.querySelectorAll("[fill]")) {
        const c = this.SB.normalize(node.getAttribute("fill"));
        if (c) {
          return c;
        }
      }
    }
    catch (e) {}
    return null;
  },

  textOf(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  },

  /** Replace the text of a cloned row without changing its structure. */
  replaceText(el, newText) {
    const doc = el.ownerDocument;
    const walker = doc.createTreeWalker(el, 4 /* SHOW_TEXT */);
    let node;
    let done = false;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.trim()) {
        continue;
      }
      if (!done) {
        node.nodeValue = newText;
        done = true;
      }
      else {
        node.nodeValue = "";
      }
    }
    if (!done) {
      el.append(doc.createTextNode(newText));
    }
  },

  /** “Customize” icon (sliders), drawn in the text color. */
  makeTuneIcon(doc, size) {
    return this.SB.Icons.make(doc, "tune", size || 16);
  },

  /** “More Colors” icon: up to four swatches in a square. */
  makeStackIcon(doc, size, colors) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", String(size || 16));
    svg.setAttribute("height", String(size || 16));
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const cells = [[1, 1], [9, 1], [1, 9], [9, 9]];
    cells.forEach(([x, y], i) => {
      const r = doc.createElementNS(NS, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", "6");
      r.setAttribute("height", "6");
      r.setAttribute("rx", "1.5");
      // color via style instead of the fill attribute, so the row is not taken for a color row
      r.setAttribute("style", "fill:" + (colors[i] || "rgba(127,127,127,.35)"));
      svg.append(r);
    });
    return svg;
  },

  /** Replace the icon (SVG) of a cloned element and keep its size. */
  swapIcon(el, makeIcon) {
    const old = el.querySelector("svg");
    let size = 16;
    if (old) {
      size = parseInt(old.getAttribute("width"), 10) || 16;
    }
    const icon = makeIcon(el.ownerDocument, size);
    if (old) {
      old.replaceWith(icon);
    }
    else {
      el.prepend(icon);
    }
    return icon;
  },

  /**
   * Copy a value into the reader iframe so that the reader's own code can use it.
   * Adapted from “Just Enough Color” (MCXCC303, AGPL-3.0-or-later).
   */
  cloneIntoFrame(reader, value) {
    const win = reader && reader._iframeWindow;
    if (!win) {
      return value;
    }
    try {
      return Components.utils.cloneInto(value, win, { wrapReflectors: true });
    }
    catch (e) {
      return value;
    }
  },

  // -------------------------------------------------------------------
  // Context menu of an annotation and color menu of the toolbar
  // -------------------------------------------------------------------

  onAnnotationMenu({ reader, params, append }) {
    if (!reader || !params || typeof append !== "function") {
      return;
    }
    const ids = Array.from(params.ids || []);
    let annotations = [];
    try {
      annotations = Array.from(BetterAnnotations.readerState(reader)?.annotations || []).filter(a => ids.includes(a.id));
    }
    catch (e) {}
    const current = annotations.length === 1 ? this.SB.normalize(annotations[0].color) : null;
    let readOnly = false;
    try {
      readOnly = !!BetterAnnotations.readerState(reader)?.readOnly || annotations.some(a => a.readOnly);
    }
    catch (e) {}
    this.buildColorMenu(reader, append, {
      current,
      readOnly,
      command: color => this.setAnnotationColor(reader, ids, color),
    });
  },

  onToolColorMenu({ reader, append }) {
    if (!reader || typeof append !== "function") {
      return;
    }
    let current = null;
    try {
      current = this.SB.normalize(BetterAnnotations.readerState(reader)?.tool?.color);
    }
    catch (e) {}
    this.buildColorMenu(reader, append, {
      current,
      readOnly: false,
      command: color => this.setToolColor(reader, color),
    });
  },

  buildColorMenu(reader, append, opts) {
    const SB = this.SB;
    const profile = SB.Profiles.profileForReader(reader);
    this._menuSeq++;
    const spec = {
      seq: String(this._menuSeq),
      standard: !!profile.standard,
      colors: [],
      settingsLabel: SB.S("menuCustomize"),
      limit: SB.setting("menuLimit"),
      showEntry: SB.setting("showMenuEntry"),
    };
    const items = [];
    if (!profile.standard) {
      for (const entry of SB.visibleColors(profile)) {
        spec.colors.push({ color: entry.color, label: entry.label, description: entry.description || "" });
        items.push({
          label: entry.label,
          color: entry.color,
          checked: !!opts.current && entry.color === opts.current,
          disabled: !!opts.readOnly,
          onCommand: () => opts.command(entry.color),
        });
      }
    }
    // Always appended: also serves as a marker for rebuilding the menu
    items.push({
      label: spec.settingsLabel,
      onCommand: () => SB.openPrefs(),
    });
    append(...items);
    this.scheduleMenuFix(reader, spec);
  },

  scheduleMenuFix(reader, spec) {
    let tries = 0;
    const tick = () => {
      let doc = null;
      try {
        doc = reader._iframeWindow && reader._iframeWindow.document;
      }
      catch (e) {}
      let ok = false;
      try {
        ok = !!doc && this.fixMenu(doc, spec);
      }
      catch (e) {
        this.SB.logError(e);
        return;
      }
      if (!ok && ++tries < 30) {
        this.SB.setTimeout(tick, 15);
      }
    };
    this.SB.setTimeout(tick, 0);
  },

  /**
   * Rebuild the menu: hide the default colors, put the own colors in their place,
   * then the “More Colors” submenu and “Customize Annotation Colors…”.
   * Returns true once the menu was found and changed.
   */
  fixMenu(doc, spec) {
    const SB = this.SB;
    for (const menu of doc.querySelectorAll(".context-menu")) {
      if (menu.hasAttribute("data-bac-flyout") || menu.getAttribute("data-bac-done") === spec.seq) {
        continue;
      }
      const rows = Array.from(menu.querySelectorAll(".row")).filter(r => !r.hasAttribute("data-bac-proxy"));
      const settingsIndex = this.findLastIndex(rows, r => this.textOf(r) === spec.settingsLabel);
      if (settingsIndex < 0) {
        continue;
      }
      this.resetMenu(menu); // in case Zotero reuses the menu element
      menu.setAttribute("data-bac-done", spec.seq);
      const settingsRow = rows[settingsIndex];

      // The own color rows rendered by Zotero come right before it
      const n = spec.colors.length;
      const ownRows = rows.slice(settingsIndex - n, settingsIndex);
      if (ownRows.length !== n || ownRows.some((r, i) => this.colorOf(r) !== spec.colors[i].color)) {
        SB.log("unknown menu structure – appended items stay visible");
        return true;
      }
      const ownSet = new Set([...ownRows, settingsRow]);
      const stockRows = this.findStockBlock(rows.filter(r => !ownSet.has(r)));
      const stockByColor = new Map(stockRows.map(r => [this.colorOf(r), r]));
      const iconTemplate = [...ownRows, ...stockRows].find(r => !r.classList.contains("checked")) || ownRows[0] || stockRows[0] || null;

      const makeSettings = () => {
        const proxy = iconTemplate
          ? this.makeIconRow(iconTemplate, spec.settingsLabel, (d, s) => this.makeTuneIcon(d, s))
          : this.makeProxy(settingsRow, null);
        this.attachForward(proxy, settingsRow);
        return proxy;
      };

      if (spec.standard) {
        this.hideRows([settingsRow]);
        if (spec.showEntry && stockRows.length) {
          const last = stockRows[stockRows.length - 1];
          last.parentNode.insertBefore(makeSettings(), last.nextSibling);
        }
        return true;
      }

      const anchor = stockRows[0] || ownRows[0] || settingsRow;
      const parent = anchor.parentNode;
      const limit = Math.max(1, spec.limit || 8);
      const mainCount = n > limit ? limit : n;
      const inserts = [];
      let flyout = null;
      const closeFlyout = () => flyout && flyout.hide(true);

      for (let i = 0; i < mainCount; i++) {
        const target = stockByColor.get(spec.colors[i].color) || ownRows[i];
        const p = this.makeProxy(ownRows[i], target);
        this.describeRow(p, spec.colors[i]);
        p.addEventListener("mouseenter", closeFlyout);
        inserts.push(p);
      }
      if (n > limit) {
        const extraColors = spec.colors.slice(limit).map(c => c.color);
        const more = iconTemplate
          ? this.makeIconRow(iconTemplate, SB.S("menuMore"), (d, s) => this.makeStackIcon(d, s, extraColors))
          : this.makeProxy(settingsRow, null);
        if (!iconTemplate) {
          this.replaceText(more, SB.S("menuMore"));
        }
        this.addSubmenuArrow(more);
        const extra = [];
        for (let i = limit; i < n; i++) {
          const target = stockByColor.get(spec.colors[i].color) || ownRows[i];
          const p = this.makeProxy(ownRows[i], target);
          this.describeRow(p, spec.colors[i]);
          extra.push(p);
        }
        flyout = this.makeFlyout(menu, more, extra, iconTemplate);
        inserts.push(more);
      }
      if (spec.showEntry) {
        const s = makeSettings();
        s.addEventListener("mouseenter", closeFlyout);
        inserts.push(s);
      }
      for (const p of inserts) {
        parent.insertBefore(p, anchor);
      }
      for (const r of stockRows) {
        this.hide(r);
      }
      this.hideRows([...ownRows, settingsRow]);
      return true;
    }
    return false;
  },

  /** Tooltip with the label's description (shortened). */
  describeRow(row, entry) {
    const text = this.SB.tooltipText(entry && entry.label, entry && entry.description);
    if (text && entry.description) {
      row.setAttribute("title", text);
    }
  },

  findLastIndex(arr, fn) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (fn(arr[i])) {
        return i;
      }
    }
    return -1;
  },

  /** Contiguous block of rows with Zotero's default colors. */
  findStockBlock(rows) {
    const stock = new Set(this.SB.STOCK_COLORS);
    let best = [];
    let run = [];
    for (const r of rows) {
      const c = this.colorOf(r);
      const isStock = !!c && stock.has(c);
      if (isStock && (!run.length || run[run.length - 1].parentNode === r.parentNode)) {
        run.push(r);
        continue;
      }
      if (run.length > best.length) {
        best = run;
      }
      run = isStock ? [r] : [];
    }
    if (run.length > best.length) {
      best = run;
    }
    return best.length >= 2 ? best : [];
  },

  hide(el) {
    el.setAttribute("data-bac-hidden", "1");
    el.style.display = "none";
  },

  resetMenu(menu) {
    const doc = menu.ownerDocument;
    for (const el of doc.querySelectorAll("[data-bac-flyout]")) {
      el.remove();
    }
    for (const el of menu.querySelectorAll("[data-bac-proxy]")) {
      el.remove();
    }
    for (const el of menu.querySelectorAll("[data-bac-hidden]")) {
      el.removeAttribute("data-bac-hidden");
      el.style.removeProperty("display");
    }
  },

  /** Hide the appended original rows (with their group and divider). */
  hideRows(rows) {
    if (!rows.length) {
      return;
    }
    const group = rows[0].parentNode;
    const onlyOurs = group
      && !group.classList.contains("context-menu")
      && Array.from(group.children).every(ch => rows.includes(ch));
    if (onlyOurs) {
      this.hide(group);
      const prev = group.previousElementSibling;
      const next = group.nextElementSibling;
      if (prev && /separator/.test(prev.className)) {
        this.hide(prev);
      }
      else if (!prev && next && /separator/.test(next.className)) {
        this.hide(next);
      }
      return;
    }
    for (const r of rows) {
      this.hide(r);
    }
  },

  cleanClone(source) {
    const p = source.cloneNode(true);
    p.setAttribute("data-bac-proxy", "1");
    p.removeAttribute("id");
    p.removeAttribute("aria-checked");
    p.style.removeProperty("display");
    return p;
  },

  /** Visible copy of a row whose click is forwarded to `target`. */
  makeProxy(source, target) {
    const p = this.cleanClone(source);
    if (target) {
      this.attachForward(p, target);
    }
    return p;
  },

  /** Row in the style of a color row with its own icon and text. */
  makeIconRow(template, label, makeIcon) {
    const row = this.cleanClone(template);
    row.classList.remove("checked", "active", "focused", "selected");
    const icon = this.swapIcon(row, makeIcon);
    // draw the icon in the menu's text color, not in the color of the template row
    for (let el = icon.parentElement; el && el !== row.parentElement; el = el.parentElement) {
      el.style.removeProperty("color");
      el.style.removeProperty("fill");
    }
    try {
      const menu = template.closest(".context-menu") || template;
      icon.style.color = template.ownerDocument.defaultView.getComputedStyle(menu).color;
    }
    catch (e) {}
    this.replaceText(row, label);
    return row;
  },

  addSubmenuArrow(row) {
    const arrow = row.ownerDocument.createElement("span");
    arrow.textContent = "›";
    arrow.setAttribute("aria-hidden", "true");
    arrow.style.cssText = "margin-inline-start:auto;padding-inline-start:18px;opacity:.75;font-size:1.15em;line-height:1;";
    row.append(arrow);
    const display = row.ownerDocument.defaultView.getComputedStyle(row).display;
    if (!/flex|grid/.test(display)) {
      row.style.display = "flex";
      row.style.alignItems = "center";
    }
  },

  attachForward(el, target) {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.forwardClick(target);
    });
  },

  forwardClick(target) {
    const doc = target.ownerDocument;
    const win = doc.defaultView;
    const menu = target.closest(".context-menu");
    const fire = (type) => {
      try {
        target.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, view: win, button: 0, detail: 1 }));
      }
      catch (e) {
        this.SB.logError(e);
      }
    };
    fire("click");
    // fallback in case Zotero triggers rows on mouseup instead of click
    this.SB.setTimeout(() => {
      if (menu && menu.isConnected && !target.hasAttribute("disabled") && !target.classList.contains("disabled")) {
        fire("mouseup");
      }
    }, 80);
  },

  /**
   * Submenu that opens to the side. Entries are arranged in columns of
   * at most eight rows, so the submenu does not grow out of the window.
   * Height and position are adapted to the window.
   */
  makeFlyout(menu, moreRow, entries, sampleRow) {
    const doc = menu.ownerDocument;
    const win = doc.defaultView;
    const fly = menu.cloneNode(false);
    fly.removeAttribute("id");
    fly.removeAttribute("data-bac-done");
    fly.setAttribute("data-bac-flyout", "1");
    fly.style.cssText = "position:fixed;display:none;margin:0;right:auto;bottom:auto;transform:none;"
      + "z-index:2147483647;overflow:auto;width:auto;height:auto;";
    let holder = fly;
    const sampleGroup = sampleRow && sampleRow.parentNode;
    if (sampleGroup && sampleGroup !== menu) {
      holder = sampleGroup.cloneNode(false);
      holder.removeAttribute("id");
      holder.removeAttribute("data-bac-hidden");
      holder.style.removeProperty("display");
      fly.append(holder);
    }
    holder.style.display = "grid";
    holder.style.gridAutoFlow = "column";
    holder.style.columnGap = "2px";
    for (const e of entries) {
      e.style.minWidth = "0";
      holder.append(e);
    }
    menu.append(fly);

    let hideTimer = null;
    let movedOut = false;
    const cancelHide = () => {
      if (hideTimer) {
        win.clearTimeout(hideTimer);
        hideTimer = null;
      }
    };
    const api = {
      show: () => {
        cancelHide();
        fly.style.display = "";
        const rowH = Math.max(18, moreRow.getBoundingClientRect().height || 24);
        const fit = Math.max(1, Math.floor((win.innerHeight - 24) / rowH));
        const perColumn = Math.max(1, Math.min(8, fit, entries.length));
        holder.style.gridTemplateRows = "repeat(" + perColumn + ", auto)";
        fly.style.maxHeight = Math.max(80, win.innerHeight - 8) + "px";
        fly.style.maxWidth = Math.max(160, win.innerWidth - 8) + "px";
        const mr = menu.getBoundingClientRect();
        const rr = moreRow.getBoundingClientRect();
        const fr = fly.getBoundingClientRect();
        let left = mr.right - 3;
        if (left + fr.width > win.innerWidth - 4) {
          left = Math.max(4, mr.left - fr.width + 3);
        }
        let top = rr.top - 4;
        if (top + fr.height > win.innerHeight - 4) {
          top = Math.max(4, win.innerHeight - fr.height - 4);
        }
        fly.style.left = left + "px";
        fly.style.top = top + "px";
        // correction if a parent element forms its own containing block
        const actual = fly.getBoundingClientRect();
        const dx = actual.left - left;
        const dy = actual.top - top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          fly.style.left = (left - dx) + "px";
          fly.style.top = (top - dy) + "px";
        }
        // if the menu clips the submenu, attach it one level higher
        if (!movedOut) {
          const check = fly.getBoundingClientRect();
          const hit = doc.elementFromPoint(check.left + check.width / 2, check.top + Math.min(10, check.height / 2));
          if (hit && !fly.contains(hit) && menu.parentNode) {
            movedOut = true;
            menu.parentNode.append(fly);
            api.show();
          }
        }
      },
      hide: (now) => {
        cancelHide();
        if (now) {
          fly.style.display = "none";
          return;
        }
        hideTimer = win.setTimeout(() => {
          fly.style.display = "none";
        }, 250);
      },
    };
    moreRow.addEventListener("mouseenter", api.show);
    moreRow.addEventListener("mouseleave", () => api.hide(false));
    moreRow.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (fly.style.display === "none") {
        api.show();
      }
      else {
        api.hide(true);
      }
    });
    fly.addEventListener("mouseenter", cancelHide);
    fly.addEventListener("mouseleave", () => api.hide(false));
    for (const type of ["mousedown", "pointerdown"]) {
      fly.addEventListener(type, e => e.stopPropagation());
    }
    return api;
  },

  // -------------------------------------------------------------------
  // Actions in the reader
  // -------------------------------------------------------------------

  /**
   * New color for annotations. With “Profile per Document” the profile tag
   * follows the color (Profiles.recolor); preferred: the profile whose
   * color list the color came from.
   */
  setAnnotationColor(reader, ids, color, preferred) {
    try {
      this.SB.Profiles.recolor(reader, ids, color, preferred);
    }
    catch (e) {
      this.SB.logError(e);
      this.SB.notify(this.SB.S("errorAnnotation"));
    }
  },

  /** Tool types that use a color. */
  COLOR_TOOLS: ["highlight", "underline", "note", "text", "image", "ink"],

  /** Tool color of a reader if an annotation tool is active, else null. */
  activeToolColor(reader) {
    try {
      const tool = BetterAnnotations.readerState(reader)?.tool;
      return tool && this.COLOR_TOOLS.includes(tool.type) ? this.SB.normalize(tool.color) : null;
    }
    catch (e) {
      return null;
    }
  },

  /**
   * Select a color in the reader: turn on an annotation tool with this color
   * (highlight, or underline if that is the text selection mode). If the color
   * is already active, switch back to the pointer.
   */
  pickToolColor(reader, color) {
    const SB = this.SB;
    try {
      const internal = reader._internalReader;
      const set = (params) => {
        const arg = this.cloneIntoFrame(reader, params);
        if (internal && typeof internal.setTool === "function") {
          internal.setTool(arg);
        }
        else {
          reader.setTool(arg);
        }
      };
      if (this.activeToolColor(reader) === SB.normalize(color)) {
        set({ type: "pointer" });
        return;
      }
      const current = BetterAnnotations.readerState(reader)?.tool?.type;
      let type = current;
      if (!this.COLOR_TOOLS.includes(current)) {
        type = BetterAnnotations.readerState(reader)?.textSelectionAnnotationMode === "underline" ? "underline" : "highlight";
      }
      set({ type, color });
    }
    catch (e) {
      SB.logError(e);
    }
  },

  /**
   * What a click on a color in the item pane would color once: the selected
   * annotations, else the selected text (while its popup is shown), else null.
   * Taken on mousedown, before the reader loses the focus.
   */
  selectionSnapshot(reader) {
    try {
      const state = BetterAnnotations.readerState(reader);
      if (!state || state.readOnly) {
        return null;
      }
      const selected = Array.from(state.selectedAnnotationIDs || []);
      if (selected.length) {
        const ids = Array.from(state.annotations || [])
          .filter(a => selected.includes(a.id) && !a.readOnly)
          .map(a => String(a.id));
        return ids.length ? { ids } : null;
      }
      const popup = this._lastPopup.get(reader);
      const params = popup && popup.isConnected ? this._popupState.get(popup)?.params : null;
      if (params && params.annotation) {
        return { annotation: JSON.parse(JSON.stringify(params.annotation)) };
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
    return null;
  },

  /** Color a snapshot from selectionSnapshot() once; the tool stays as it is. */
  colorSnapshot(reader, snapshot, color, profileId) {
    if (snapshot.ids) {
      this.setAnnotationColor(reader, snapshot.ids, color, profileId);
    }
    else if (snapshot.annotation) {
      this.createAnnotation(reader, snapshot.annotation, color, profileId);
    }
  },

  setToolColor(reader, color) {
    try {
      const arg = this.cloneIntoFrame(reader, { color });
      const internal = reader._internalReader;
      if (internal && typeof internal.setTool === "function") {
        internal.setTool(arg);
      }
      else if (typeof reader.setTool === "function") {
        reader.setTool(arg);
      }
      else {
        throw new Error("setTool not available");
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  /**
   * Create an annotation in any color (like Zotero's color buttons).
   * Uses the reader's internal annotation manager, as “Just Enough Color”
   * (MCXCC303, AGPL-3.0-or-later) does; this approach is adapted from there.
   * Internal API: check after Zotero updates.
   */
  createAnnotation(reader, annotation, color, profileId) {
    const SB = this.SB;
    try {
      if (BetterAnnotations.readerState(reader)?.readOnly) {
        return;
      }
      const type = BetterAnnotations.readerState(reader)?.textSelectionAnnotationMode === "underline" ? "underline" : "highlight";
      const payload = Object.assign(JSON.parse(JSON.stringify(annotation)), { type, color });
      // Directly, with the profile tag; not through the wrapper (see Profiles.addAnnotation)
      const result = SB.Profiles.addAnnotation(reader, payload, profileId);
      if (!result) {
        throw new Error("addAnnotation returned nothing (read-only?)");
      }
      try {
        reader.setSelectedAnnotations?.(this.cloneIntoFrame(reader, []));
      }
      catch (e) {}
    }
    catch (e) {
      SB.logError(e);
      SB.notify(SB.S("errorAnnotation"));
    }
  },

  // -------------------------------------------------------------------
  // Popup after selecting text
  // -------------------------------------------------------------------

  onSelectionPopup({ reader, doc, params, append }) {
    if (!reader || !doc || typeof append !== "function") {
      return;
    }
    const anchor = doc.createElement("span");
    anchor.setAttribute("data-bac-anchor", "1");
    anchor.style.display = "none";
    append(anchor);
    const place = (attempt) => {
      const popup = anchor.isConnected ? anchor.closest(".selection-popup") : null;
      if (!popup) {
        if (attempt < 20) {
          this.SB.setTimeout(() => place(attempt + 1), 15);
        }
        return;
      }
      this._popupState.set(popup, { reader, params });
      this._lastPopup.set(reader, popup);
      if (popup.hasAttribute("data-bac-done")) {
        return;
      }
      popup.setAttribute("data-bac-done", "1");
      this._safe(() => this.enhancePopup(doc, popup, reader));
    };
    place(0);
  },

  /**
   * Color grid in the selection popup: N colors per row (left-aligned),
   * followed by the “Customize Annotation Colors…” button.
   */
  enhancePopup(doc, popup, reader) {
    const SB = this.SB;
    const profile = SB.Profiles.profileForReader(reader);
    const instant = SB.setting("instantTooltip") !== false;
    const fixedLayout = SB.setting("popupLayout") === "fixed";
    const columns = Math.max(1, (fixedLayout ? SB.setting("popupFixedColumns") : SB.setting("popupColumns")) || 8);
    const showButton = SB.setting("showPopupButton") !== false;
    const stockWrap = popup.querySelector(".colors");
    const stockButtons = stockWrap ? Array.from(stockWrap.querySelectorAll("button")) : [];
    const stockByColor = new Map();
    for (const b of stockButtons) {
      const c = this.colorOf(b);
      if (c) {
        stockByColor.set(c, b);
      }
    }

    let entries;
    if (profile.standard) {
      entries = stockButtons.filter(b => this.colorOf(b)).map(b => {
        const color = this.colorOf(b);
        return { color, label: b.getAttribute("title") || SB.stockName(color) || color };
      });
      if (!entries.length) {
        entries = profile.colors;
      }
    }
    else {
      entries = SB.visibleColors(profile);
    }

    const grid = stockWrap ? stockWrap.cloneNode(false) : doc.createElement("div");
    grid.removeAttribute("id");
    grid.removeAttribute("data-tabstop");
    if (!stockWrap) {
      grid.className = "colors";
    }
    grid.classList.add("bac-colors");
    let gap = "4px";
    try {
      if (stockWrap) {
        const cs = doc.defaultView.getComputedStyle(stockWrap);
        gap = cs.columnGap && cs.columnGap !== "normal" ? cs.columnGap : gap;
      }
    }
    catch (e) {}
    const template = stockButtons.find(b => this.colorOf(b)) || null;
    // Measure the width of a color button while the original buttons are still visible
    let buttonWidth = 24;
    try {
      buttonWidth = Math.round(template ? template.getBoundingClientRect().width : 0) || 24;
    }
    catch (e) {}
    const gapPx = parseFloat(gap) || 4;
    const fixed = SB.setting("popupLayout") === "fixed";
    grid.style.display = "grid";
    grid.style.justifyContent = "start";
    grid.style.alignItems = "center";
    grid.style.gap = gap;

    const buttons = entries.map(entry => this.makePopupButton(doc, popup, template, entry, stockByColor.get(entry.color), instant));
    const gear = showButton ? this.makeSettingsButton(doc, template, instant) : null;
    if (fixed) {
      // Fixed number of columns; the button comes last, after the last color
      const items = entries.length + (gear ? 1 : 0);
      grid.style.gridTemplateColumns = "repeat(" + Math.max(1, Math.min(columns, items)) + ", " + buttonWidth + "px)";
    }
    else {
      // Colors fill the available width, the button follows the last color.
      // The minimum width equals `columns` colors plus the button.
      const minCols = Math.min(columns, Math.max(1, entries.length)) + (gear ? 1 : 0);
      grid.style.gridTemplateColumns = "repeat(auto-fill, " + buttonWidth + "px)";
      grid.style.minWidth = (minCols * buttonWidth + (minCols - 1) * gapPx) + "px";
    }
    grid.append(...buttons);
    if (gear) {
      grid.append(gear);
    }

    if (stockWrap && stockWrap.parentNode) {
      stockWrap.parentNode.insertBefore(grid, stockWrap.nextSibling);
      this.hide(stockWrap);
    }
    else {
      popup.insertBefore(grid, popup.firstChild);
    }
    popup.style.maxWidth = "none";
    if (fixed) {
      this.ensureReaderStyle(doc);
      popup.setAttribute("data-bac-fixed", "1");
      try {
        const cs = doc.defaultView.getComputedStyle(popup);
        let width = grid.getBoundingClientRect().width;
        if (cs.boxSizing === "border-box") {
          width += ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"]
            .reduce((sum, k) => sum + (parseFloat(cs[k]) || 0), 0);
        }
        popup.style.width = Math.ceil(width) + "px";
      }
      catch (e) {}
    }
  },

  makePopupButton(doc, popup, template, entry, stockButton, instant) {
    const label = entry.label;
    const shown = label && label.trim() ? label : "";
    let b;
    if (template) {
      b = template.cloneNode(true);
      const tColor = this.colorOf(template);
      let replaced = false;
      for (const node of b.querySelectorAll("[fill]")) {
        if (this.SB.normalize(node.getAttribute("fill")) === tColor) {
          node.setAttribute("fill", entry.color);
          replaced = true;
        }
      }
      if (!replaced) {
        b.textContent = "";
        b.append(this.makeSwatch(doc, entry.color));
      }
      b.classList.remove("active");
    }
    else {
      b = doc.createElement("button");
      b.className = "toolbar-button color-button";
      b.append(this.makeSwatch(doc, entry.color));
    }
    b.removeAttribute("id");
    b.removeAttribute("title");
    b.style.removeProperty("display");
    b.setAttribute("tabindex", "-1");
    const desc = this.SB.shortDescription(entry.description);
    b.setAttribute("aria-label", shown || entry.color);
    if (desc) {
      b.setAttribute("aria-description", desc);
    }
    b.setAttribute("data-bac-color", entry.color);
    if (!instant && shown) {
      b.setAttribute("title", this.SB.tooltipText(shown, entry.description));
    }
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideTip();
      if (stockButton && stockButton.isConnected) {
        stockButton.click(); // Zotero's own handling for default colors
        return;
      }
      const state = this._popupState.get(popup);
      if (state && state.params && state.params.annotation) {
        this.createAnnotation(state.reader, state.params.annotation, entry.color);
      }
    });
    if (instant && shown) {
      b.addEventListener("mouseenter", () => this.showTip(doc, b, shown, entry.color, desc));
      b.addEventListener("mouseleave", () => this.hideTip());
    }
    return b;
  },

  makeSwatch(doc, color) {
    const s = doc.createElement("span");
    s.style.cssText = "display:inline-block;width:16px;height:16px;border-radius:3px;"
      + "border:1px solid rgba(0,0,0,.12);box-sizing:border-box;background:" + color + ";";
    return s;
  },

  /** Button the size of a color button with the “Customize” icon. */
  makeSettingsButton(doc, template, instant) {
    const SB = this.SB;
    const label = SB.S("menuCustomize");
    let b;
    if (template) {
      b = template.cloneNode(true);
      b.classList.remove("active");
      this.swapIcon(b, (d, s) => this.makeTuneIcon(d, s));
    }
    else {
      b = doc.createElement("button");
      b.className = "toolbar-button";
      b.append(this.makeTuneIcon(doc, 16));
    }
    b.removeAttribute("id");
    b.removeAttribute("title");
    b.style.removeProperty("display");
    b.setAttribute("tabindex", "-1");
    b.setAttribute("aria-label", label);
    b.setAttribute("data-bac-settings", "1");
    if (!instant) {
      b.setAttribute("title", label);
    }
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideTip();
      SB.openPrefs();
    });
    if (instant) {
      b.addEventListener("mouseenter", () => this.showTip(doc, b, label, null));
      b.addEventListener("mouseleave", () => this.hideTip());
    }
    return b;
  },

  // -------------------------------------------------------------------
  // Instant tooltip
  // -------------------------------------------------------------------

  showTip(doc, el, text, color, description) {
    this.hideTip();
    const win = doc.defaultView;
    if (!win || !doc.body) {
      return;
    }
    const tip = doc.createElement("div");
    tip.setAttribute("data-bac-tip", "1");
    this.ensureReaderStyle(doc);
    tip.className = "bac-tip";
    tip.style.cssText = "left:0;top:0;";
    if (color) {
      const dot = doc.createElement("span");
      dot.className = "bac-tip-dot";
      dot.style.background = color;
      tip.append(dot);
    }
    const t = doc.createElement("span");
    t.className = "bac-tip-label";
    t.textContent = text;
    tip.append(t);
    if (description) {
      // Label in bold on the first line, the description below in a secondary tone
      tip.classList.add("bac-tip-desc");
      const d = doc.createElement("span");
      d.className = "bac-tip-text";
      d.textContent = description;
      tip.append(d);
    }
    doc.body.append(tip);
    const r = el.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let left = r.left + r.width / 2 - tr.width / 2;
    left = Math.max(4, Math.min(left, win.innerWidth - tr.width - 4));
    let top = r.top - tr.height - 6;
    if (top < 4) {
      top = r.bottom + 6;
    }
    tip.style.left = left + "px";
    tip.style.top = top + "px";
    const timer = win.setInterval(() => {
      if (!el.isConnected) {
        this.hideTip();
      }
    }, 200);
    this._tip = { tip, win, timer };
  },

  hideTip() {
    const t = this._tip;
    this._tip = null;
    if (!t) {
      return;
    }
    try {
      t.win.clearInterval(t.timer);
    }
    catch (e) {}
    try {
      t.tip.remove();
    }
    catch (e) {}
  },

  // -------------------------------------------------------------------
  // Styles in the reader (toolbar, menus, fixed popup width)
  // -------------------------------------------------------------------

  ensureReaderStyle(doc) {
    if (doc.getElementById("bac-reader-style")) {
      return;
    }
    const style = doc.createElement("style");
    style.id = "bac-reader-style";
    style.textContent = `
/* Profile label in the card head: page left, label and icons right */
header[data-bac-chip] > .start { flex: 0 1 auto; }
header[data-bac-chip] > .end { flex: 1 1 0; min-width: 0; }
header[data-bac-chip] .custom-sections { flex: 0 1 auto; min-width: 0; }
header[data-bac-chip] .custom-sections > :not(.bac-chip) { flex: none; }
.bac-chip { display: inline-flex; flex: 0 1 auto; min-width: 2.5em; max-width: 100%; overflow: hidden; white-space: pre; box-sizing: border-box;
  font-size: 10.5px; line-height: 16px; padding: 0 6px; border-radius: 8px; color: #4a3bc2; background: rgba(107, 91, 214, .14);
  margin-inline-end: 4px; /* with the gap of the container: as far from the next icon as the icons from each other */ }
.bac-chip-h { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.bac-chip-t { flex: none; }
@media (prefers-color-scheme: dark) { .bac-chip { color: #cfc8f8; background: rgba(179, 168, 242, .2); } }
.tags .tag[data-bac-hidden] { display: none; }
.tags .tag[data-bac-last]::after { content: none; }
.tags[data-bac-only]::before { content: attr(data-bac-placeholder); }
.preview.expanded0 .tags[data-bac-only], .preview.read-only .tags[data-bac-only], .preview:not([class*="expanded"]) .tags[data-bac-only] { display: none !important; }
[data-bac-drop] { outline: 2px solid var(--bac-drop-color, #6B5BD6) !important; outline-offset: -2px; }
.selection-popup[data-bac-fixed] > :not(.bac-colors) { max-width: 100%; min-width: 0; box-sizing: border-box; overflow-wrap: anywhere; }
.selection-popup[data-bac-fixed] textarea, .selection-popup[data-bac-fixed] input[type="text"] { width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
.selection-popup[data-bac-fixed] pre, .selection-popup[data-bac-fixed] table, .selection-popup[data-bac-fixed] img { max-width: 100%; overflow: auto; }
/* One button like Zotero's dropdown buttons: icon (20 px), profile · number (13 px like the toolbar), arrow (8 px) */
.bac-tb-split { display: flex; align-items: center; gap: 0; }
.bac-tb-main { display: flex; align-items: center; gap: 4px; width: auto !important; max-width: 220px; padding-inline: 4px !important; font: inherit; }
.bac-tb-main > svg { flex: none; }
.bac-tb-caret { display: flex; align-items: center; flex: none; }
.bac-tb-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.bac-tb-count { flex: none; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 2px; }
.bac-tb-dot { flex: none; }
/* Zotero places its tools in the middle of the free space between the left and
   the right group, so every button on the right pushed them to the left. With
   equal groups the tools stay in the middle of the toolbar until space runs out. */
.toolbar[data-bac-centered] > .start, .toolbar[data-bac-centered] > .end { flex: 1 1 0; }
.bac-tb-nocount .bac-tb-count, .bac-tb-nocount .bac-tb-dot { display: none; }
[data-bac-panel] { position: fixed; z-index: 2147483646; min-width: 200px; max-width: 360px; max-height: calc(100vh - 16px); overflow: auto;
  padding: 4px 0; border-radius: 6px; box-sizing: border-box;
  font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--material-background, Canvas); color: var(--fill-primary, CanvasText);
  border: 1px solid var(--fill-quinary, rgba(127,127,127,.35)); box-shadow: 0 6px 20px rgba(0,0,0,.22); }
[data-bac-panel] .bac-item { display: flex; align-items: center; gap: 8px; padding: 4px 12px; cursor: default; white-space: nowrap; }
[data-bac-panel] .bac-item:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
[data-bac-panel] .bac-check { width: 12px; text-align: center; }
[data-bac-panel] .bac-sep { height: 1px; margin: 4px 0; background: var(--fill-quinary, rgba(127,127,127,.3)); }
/* Statistics: between 260 and 340 px; names are shortened, hints wrap */
[data-bac-panel="stats"] { min-width: 260px; max-width: 340px; }
/* Head with title and buttons, a line below it (as in the item pane) */
[data-bac-panel] .bac-head { display: flex; align-items: center; justify-content: flex-start; gap: 2px; padding: 0 8px 4px 12px; margin-bottom: 4px;
  font-weight: 600; min-height: 28px; border-bottom: 1px solid var(--fill-quinary, rgba(127,127,127,.3)); }
[data-bac-panel] .bac-head-title { flex: 1; min-width: 0; }
[data-bac-panel] .bac-head-btn { appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 24px;
  margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--fill-secondary, GrayText); cursor: default; }
[data-bac-panel] .bac-head-btn:hover { background: var(--fill-quinary, rgba(127,127,127,.15)); }
[data-bac-panel] .bac-head-btn[aria-pressed="true"] { background: var(--fill-quinary, rgba(127,127,127,.2)); }
[data-bac-panel] .bac-head-btn:focus-visible { outline: 2px solid var(--color-focus-border, #2e7bd1); outline-offset: -1px; }
[data-bac-panel] .bac-group { padding: 6px 12px 2px; font-size: 11px; font-weight: 600; color: var(--fill-secondary, GrayText); }
[data-bac-panel] .bac-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
[data-bac-panel] .bac-item-n { margin-inline-start: 12px; font-variant-numeric: tabular-nums; color: var(--fill-secondary, GrayText); }
/* Hints wrap at the width of the panel and do not widen it */
[data-bac-panel] .bac-menu-hint, [data-bac-panel] .bac-others { box-sizing: border-box; width: 0; min-width: 100%; }
[data-bac-panel] .bac-menu-hint { padding: 4px 12px; white-space: normal; font-size: 12px; color: var(--fill-secondary, GrayText); }
[data-bac-panel] .bac-menu-warn { margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--fill-quinary, rgba(127,127,127,.3)); }
[data-bac-panel] .bac-menu-warn::before { content: "⚠ "; color: var(--accent-orange, #d97706); }
[data-bac-panel] .bac-others { padding-top: 6px; white-space: normal; }
[data-bac-panel] .bac-sub { padding: 0 12px 6px; opacity: .7; font-size: 12px; }
[data-bac-panel] .bac-stat { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; column-gap: 8px; align-items: center; padding: 3px 12px; }
[data-bac-panel] .bac-dot { width: 12px; height: 12px; border-radius: 3px; box-sizing: border-box; border: 1px solid rgba(0,0,0,.15); }
[data-bac-panel] .bac-stat-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-bac-panel] .bac-stat-name i { opacity: .6; }
[data-bac-panel] .bac-stat-n { font-variant-numeric: tabular-nums; opacity: .8; }
[data-bac-panel] .bac-stat-zero .bac-stat-n, [data-bac-panel] .bac-stat-zero .bac-stat-name { opacity: .55; }
[data-bac-panel] .bac-total { padding-top: 6px; margin-top: 4px; border-top: 1px solid var(--fill-quinary, rgba(127,127,127,.3)); font-size: 12px; }
[data-bac-panel] .bac-total .bac-stat-name { grid-column: 1 / 3; color: var(--fill-secondary, GrayText); }
[data-bac-panel] .bac-bar { grid-column: 2 / 4; height: 3px; border-radius: 1.5px; margin-top: 2px; }
[data-bac-panel] .bac-stat-desc { grid-column: 2 / 4; margin: 1px 0 3px; font-size: 12px; line-height: 1.3; white-space: pre-line;
  color: var(--fill-secondary, GrayText); }
.bac-tip { position: fixed; z-index: 2147483647; pointer-events: none; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px;
  box-sizing: border-box; width: max-content; max-width: 340px; padding: 4px 8px; border-radius: 5px;
  font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  /* Opaque: the menu colour of Zotero over a solid ground (menus may be translucent) */
  background-color: Canvas; background-image: linear-gradient(var(--material-menu, Canvas), var(--material-menu, Canvas));
  color: var(--fill-primary, CanvasText);
  border: var(--material-border-quarternary, 1px solid rgba(127,127,127,.35)); box-shadow: 0 4px 12px rgba(0,0,0,.18); }
.bac-tip-dot { flex: none; width: 10px; height: 10px; border-radius: 2px; box-sizing: border-box; border: 1px solid rgba(0,0,0,.15); }
.bac-tip-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 310px; }
.bac-tip-desc .bac-tip-label { font-weight: 600; }
.bac-tip-text { flex-basis: 100%; white-space: pre-line; color: var(--fill-secondary, GrayText); padding-bottom: 1px; }
`;
    (doc.head || doc.documentElement).append(style);
  },

  // -------------------------------------------------------------------
  // Toolbar: profile switcher and statistics
  // -------------------------------------------------------------------

  _toolbars: new Set(),

  makeIcon(doc, kind) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = doc.createElementNS(NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const add = (tag, attrs) => {
      const el = doc.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, String(v));
      }
      svg.append(el);
    };
    if (kind === "palette") {
      add("path", { d: "M8 1.8a6.2 6.2 0 1 0 0 12.4c.9 0 1.4-.6 1.4-1.3 0-.9-.8-1.2-.8-2 0-.7.6-1.2 1.3-1.2h1.6c1.6 0 2.7-1.1 2.7-2.6C14.2 4.1 11.4 1.8 8 1.8z",
        fill: "none", stroke: "currentColor", "stroke-width": "1.2", "stroke-linejoin": "round" });
      add("circle", { cx: 4.8, cy: 8.2, r: 1.1, style: "fill:currentColor" });
      add("circle", { cx: 6.2, cy: 5, r: 1.1, style: "fill:currentColor" });
      add("circle", { cx: 9.6, cy: 4.6, r: 1.1, style: "fill:currentColor" });
    }
    else if (["filter", "funnel", "funnel-one", "describe", "chevron", "bars", "marker"].includes(kind)) {
      // The plugin's shared icons (UI guidelines 7.6)
      const name = kind === "filter" ? "funnel" : kind;
      return this.SB.Icons.make(doc, name, name === "chevron" ? 8 : name === "bars" ? 20 : name === "marker" ? 12 : 16);
    }
    else {
      for (const [x, h] of [[2.5, 6], [6.5, 10], [10.5, 4]]) {
        add("rect", { x, y: 14 - h, width: 3, height: h, rx: 0.8, style: "fill:currentColor" });
      }
    }
    return svg;
  },

  onToolbar({ reader, doc, append }) {
    if (!reader || !doc || typeof append !== "function") {
      return;
    }
    // Replace an element inserted by the fallback with the officially appended one
    for (const el of doc.querySelectorAll("[data-bac-toolbar]")) {
      el.remove();
    }
    append(this.buildToolbar(reader, doc));
  },

  /**
   * Fallback for readers whose toolbar was rendered before the plugin started
   * (e.g. when tabs are restored after a restart).
   */
  scanReaders() {
    const SB = this.SB;
    if (!SB.setting("showToolbarButton")) {
      return;
    }
    let readers = [];
    try {
      readers = Zotero.Reader._readers || [];
    }
    catch (e) {}
    for (const reader of readers) {
      try {
        const doc = reader._iframeWindow && reader._iframeWindow.document;
        if (!doc || doc.querySelector("[data-bac-toolbar]")) {
          continue;
        }
        const end = doc.querySelector(".toolbar .end") || doc.querySelector(".toolbar > :last-child");
        if (!end) {
          continue;
        }
        end.insertBefore(this.buildToolbar(reader, doc), end.firstChild);
      }
      catch (e) {
        SB.logError(e);
      }
    }
  },

  startScan() {
    this.stopScan();
    const win = Zotero.getMainWindow && Zotero.getMainWindow();
    this._safe(() => this.scanReaders());
    if (win) {
      this._scanWin = win;
      this._scanTimer = win.setInterval(() => {
        // Choose the profile of new readers and prepare their profile tag
        this._safe(() => this.SB.Profiles.openReaders().forEach(r => this.SB.Profiles.forReader(r)));
        // Profile labels and hidden profile tags in new readers
        if (this.SB.Profiles.enabled()) {
          this._safe(() => this.SB.Profiles.openReaders().forEach((r) => {
            const d = r._iframeWindow && r._iframeWindow.document;
            if (d && d.body) {
              this.watchTags(d, r);
            }
          }));
        }
        this._safe(() => this.scanReaders());
        this._safe(() => this.refreshCounts());
      }, 1000);
    }
  },

  stopScan() {
    if (this._scanTimer && this._scanWin) {
      try {
        this._scanWin.clearInterval(this._scanTimer);
      }
      catch (e) {}
    }
    this._scanTimer = null;
    this._scanWin = null;
  },

  buildToolbar(reader, doc) {
    const SB = this.SB;
    this.ensureReaderStyle(doc);
    const wrap = doc.createElement("div");
    wrap.setAttribute("data-bac-toolbar", "1");

    // One button, like Zotero's dropdown buttons (icon, text, arrow): profile
    // and number of annotations. A click opens the profile menu (as in the
    // item pane); hovering or keyboard focus shows the statistics.
    const statsBtn = doc.createElement("button");
    statsBtn.className = "toolbar-button bac-tb-main";
    statsBtn.setAttribute("tabindex", "-1");
    statsBtn.setAttribute("aria-haspopup", "menu");
    const name = doc.createElement("span");
    name.className = "bac-tb-name";
    const count = doc.createElement("span");
    count.className = "bac-tb-count";
    const dot = doc.createElement("span");
    dot.className = "bac-tb-dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = "·";
    const caret = doc.createElement("span");
    caret.className = "bac-tb-caret";
    caret.append(this.makeIcon(doc, "chevron"));
    // Number of annotations with the icon of the color list in the settings
    const countBox = doc.createElement("span");
    countBox.className = "bac-tb-count";
    countBox.append(this.makeIcon(doc, "marker"), count);
    count.className = "bac-tb-num";
    statsBtn.append(this.makeIcon(doc, "bars"), name, dot, countBox, caret);
    const profileBtn = null;

    // Statistics on hover (and keyboard focus): the pointer can move onto
    // them; a click inside (funnel) keeps them open until a click outside or Esc.
    const win = doc.defaultView;
    let openTimer = null;
    let closeTimer = null;
    let pinned = false;
    let menuOpen = false;
    const isOpen = () => !!doc.querySelector("[data-bac-panel=\"stats\"]");
    const unpin = () => {
      pinned = false;
    };
    const open = () => {
      if (menuOpen) {
        return;
      }
      const panel = this.showStats(reader, doc, statsBtn, unpin);
      panel.addEventListener("mouseenter", () => win.clearTimeout(closeTimer));
      panel.addEventListener("mouseleave", () => closeSoon());
      panel.addEventListener("mousedown", () => {
        pinned = true;
      });
    };
    const closeSoon = () => {
      win.clearTimeout(closeTimer);
      closeTimer = win.setTimeout(() => {
        const panel = doc.querySelector("[data-bac-panel=\"stats\"]");
        if (pinned || !panel || panel.matches(":hover") || statsBtn.matches(":hover") || statsBtn.matches(":focus-visible")) {
          return;
        }
        this.closePanel(doc, "stats");
      }, 300);
    };
    statsBtn.addEventListener("mouseenter", () => {
      win.clearTimeout(closeTimer);
      if (!isOpen()) {
        openTimer = win.setTimeout(open, 150);
      }
    });
    statsBtn.addEventListener("mouseleave", () => {
      win.clearTimeout(openTimer);
      if (!pinned) {
        closeSoon();
      }
    });
    statsBtn.addEventListener("focus", () => {
      if (statsBtn.matches(":focus-visible") && !isOpen()) {
        open();
      }
    });
    statsBtn.addEventListener("blur", () => {
      if (!pinned) {
        closeSoon();
      }
    });
    statsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      win.clearTimeout(openTimer);
      this.closePanel(doc, "stats");
      pinned = false;
      // Pressed look while the menu is open, as Zotero's dropdown buttons
      const opened = this.openReaderProfileMenu(reader, statsBtn, () => this.refreshToolbars(), () => {
        menuOpen = false;
        statsBtn.classList.remove("active");
      });
      menuOpen = !!opened;
      statsBtn.classList.toggle("active", menuOpen);
    });

    // Right click: hide the button (like toolbars of the operating systems)
    statsBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      win.clearTimeout(openTimer);
      this.closePanel(doc, "stats");
      pinned = false;
      this._safe(() => this.openToolbarMenu(e));
    });

    wrap.className = "bac-tb-split";
    wrap.append(statsBtn);
    const record = { wrap, name, profileBtn, statsBtn, count, reader };
    this._toolbars.add(record);
    this.updateToolbar(record);
    return wrap;
  },

  /** Context menu of the toolbar button: hide it, open the settings. */
  openToolbarMenu(e) {
    const SB = this.SB;
    const main = Zotero.getMainWindow();
    const mdoc = main && main.document;
    if (!mdoc) {
      return;
    }
    let menu = mdoc.getElementById("bac-toolbar-menu");
    if (!menu) {
      menu = mdoc.createXULElement("menupopup");
      menu.id = "bac-toolbar-menu";
      (mdoc.querySelector("popupset") || mdoc.documentElement).append(menu);
    }
    menu.replaceChildren();
    const item = (label, run) => {
      const mi = mdoc.createXULElement("menuitem");
      mi.setAttribute("label", label);
      mi.addEventListener("command", () => this._safe(run));
      return mi;
    };
    menu.append(
      item(SB.S("menuHideToolbarButton"), () => {
        SB.Store.setSetting("showToolbarButton", false);
        SB.notify(SB.S("noticeToolbarHidden"));
      }),
      mdoc.createXULElement("menuseparator"),
      item(SB.S("menuSettings"), () => SB.openPrefs()));
    menu.openPopupAtScreen(e.screenX, e.screenY, true);
  },

  /** Number next to the statistics icon: the annotations shown (only the document's profile while filtered). */
  annotationCount(reader) {
    try {
      if (!BetterAnnotations.readerState(reader) || !BetterAnnotations.readerState(reader).annotations) {
        return null;
      }
      // Annotations of the document's profile (“Name · n”); all of them are in the statistics
      const P = this.SB.Profiles;
      const id = P.forReader(reader);
      return P.readerList(reader).filter(a => a.profile === id).length;
    }
    catch (e) {
      return null;
    }
  },

  /** Update the number of annotations next to the statistics icon. */
  refreshCounts() {
    for (const rec of [...this._toolbars]) {
      if (!rec.wrap.isConnected) {
        this._toolbars.delete(rec);
        continue;
      }
      const n = this.annotationCount(rec.reader);
      const text = n === null ? "" : String(n);
      if (rec.count.textContent !== text) {
        rec.count.textContent = text;
      }
      const name = this.SB.Profiles.profileForReader(rec.reader).name;
      if (rec.name.textContent !== name) {
        rec.name.textContent = name;
      }
      // The button is appended before the toolbar is in the document
      const bar = rec.wrap.closest(".toolbar");
      if (bar && bar.hasAttribute("data-bac-centered") !== (rec.wrap.style.display !== "none")) {
        bar.toggleAttribute("data-bac-centered", rec.wrap.style.display !== "none");
      }
    }
  },

  updateToolbar(rec) {
    const SB = this.SB;
    const profileName = SB.Profiles.profileForReader(rec.reader).name;
    rec.name.textContent = profileName;
    const source = this.sourceText(rec.reader);
    const n = this.annotationCount(rec.reader);
    rec.count.textContent = n === null ? "" : String(n);
    rec.wrap.classList.toggle("bac-tb-nocount", n === null);
    let total = "";
    try {
      const P = SB.Profiles;
      const id = P.forReader(rec.reader);
      total = n === null ? "" : P.totalText(P.summarize(P.readerList(rec.reader)), id, P.enabled() && P.filterActive(rec.reader));
    }
    catch (e) {}
    // No tooltip: hovering shows the statistics. Screen readers hear the
    // action first (change the profile), the statistics as a description.
    rec.statsBtn.setAttribute("aria-label", SB.S("tbProfileMenu") + ": " + profileName + (n === null ? "" : ", " + n));
    rec.statsBtn.setAttribute("aria-description", [SB.S("tbStatsTip"), total, source].filter(Boolean).join(". "));
    const shown = !!SB.setting("showToolbarButton");
    rec.wrap.style.display = shown ? "" : "none";
    // Keep Zotero's tools in the middle of the toolbar while the button is there
    rec.wrap.closest(".toolbar")?.toggleAttribute("data-bac-centered", shown);
  },

  refreshToolbars() {
    for (const rec of [...this._toolbars]) {
      if (!rec.wrap.isConnected) {
        this._toolbars.delete(rec);
        continue;
      }
      this.updateToolbar(rec);
    }
  },

  _panels: [],

  closePanel(doc, kind) {
    const keep = [];
    for (const rec of this._panels) {
      if (rec.doc === doc && (!kind || rec.kind === kind)) {
        try {
          rec.cleanup();
        }
        catch (e) {}
        rec.panel.remove();
      }
      else if (rec.panel.isConnected) {
        keep.push(rec);
      }
    }
    this._panels = keep;
  },

  /** The reader document, its inner frames and the main window: where a click closes a panel. */
  outsideDocs(doc) {
    const docs = [doc];
    const addFrames = (d, depth) => {
      if (depth > 3) {
        return;
      }
      for (const frame of d.querySelectorAll("iframe, browser")) {
        try {
          const inner = frame.contentDocument;
          if (inner && !docs.includes(inner)) {
            docs.push(inner);
            addFrames(inner, depth + 1);
          }
        }
        catch (e) {}
      }
    };
    addFrames(doc, 0);
    try {
      const main = Zotero.getMainWindow && Zotero.getMainWindow();
      if (main && main.document && !docs.includes(main.document)) {
        docs.push(main.document);
      }
    }
    catch (e) {}
    return docs;
  },

  /** Open a panel below a button; closes on a click outside or Esc. */
  openPanel(doc, anchor, kind, onClose) {
    this.closePanel(doc);
    const win = doc.defaultView;
    const panel = doc.createElement("div");
    panel.setAttribute("data-bac-panel", kind);
    doc.body.append(panel);
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      let left = Math.min(r.left, win.innerWidth - pr.width - 6);
      left = Math.max(6, left);
      let top = r.bottom + 4;
      if (top + pr.height > win.innerHeight - 6) {
        top = Math.max(6, r.top - pr.height - 4);
      }
      panel.style.left = left + "px";
      panel.style.top = top + "px";
    };
    const onDown = (e) => {
      // Menus opened from the panel (profile menu) are part of it
      const inMenu = e.target && e.target.closest && e.target.closest("menupopup");
      if (!inMenu && !panel.contains(e.target) && !anchor.contains(e.target)) {
        this.closePanel(doc, kind);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        this.closePanel(doc, kind);
      }
    };
    // Clicks in the document itself happen in inner frames (the view) and do
    // not reach `doc`; clicks in the item pane happen in the main window.
    const docs = this.outsideDocs(doc);
    for (const d of docs) {
      d.addEventListener("mousedown", onDown, true);
      d.addEventListener("keydown", onKey, true);
    }
    this._panels.push({
      doc,
      kind,
      panel,
      cleanup: () => {
        for (const d of docs) {
          try {
            d.removeEventListener("mousedown", onDown, true);
            d.removeEventListener("keydown", onKey, true);
          }
          catch (e) {}
        }
        if (onClose) {
          onClose();
        }
      },
    });
    return { panel, place };
  },

  /** Why the document uses its profile (tooltip of the profile buttons), "" without “Profile per Document”. */
  sourceText(reader) {
    const SB = this.SB;
    if (!SB.Profiles.enabled()) {
      return "";
    }
    const key = {
      explicit: "srcExplicit",
      annotations: "srcAnnotations",
      rule: "srcRule",
    }[SB.Profiles.sourceForReader(reader)] || "srcDefault";
    return SB.S(key);
  },

  /**
   * Profile menu of a reader (statistics): the native menu of the item pane,
   * opened in the main window below `anchor`. `after` runs once the profile
   * changed.
   */
  openReaderProfileMenu(reader, anchor, after, onHidden) {
    const SB = this.SB;
    const P = SB.Profiles;
    const main = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!main) {
      return false;
    }
    const win = anchor.ownerDocument.defaultView;
    const r = anchor.getBoundingClientRect();
    const summary = P.summarize(P.readerList(reader));
    return SB.Panel.openProfilePopup({
      doc: main.document,
      screen: { x: win.mozInnerScreenX + r.left, y: win.mozInnerScreenY + r.bottom + 2 },
      entries: P.menuEntries(summary),
      active: P.forReader(reader),
      choose: (id) => {
        Promise.resolve(P.setForReader(reader, id))
          .then(() => after && after())
          .catch(e => SB.logError(e));
      },
      onHidden,
    });
  },


  showStats(reader, doc, anchor, onClose) {
    const { panel, place } = this.openPanel(doc, anchor, "stats", onClose);
    this.fillStats(reader, doc, panel);
    place();
    return panel;
  },

  /**
   * Content of the statistics. With “Profile per Document” the funnel in the
   * head is the same switch as in the item pane: “only this profile” in the
   * document, the sidebar and here.
   */
  fillStats(reader, doc, panel) {
    const SB = this.SB;
    const P = SB.Profiles;
    panel.replaceChildren();
    const activeId = P.forReader(reader);
    const summary = P.summarize(P.readerList(reader));
    const filtered = P.enabled() && P.filterActive(reader);
    const totals = P.totals(summary, activeId, filtered);
    const others = [...summary.byProfile.keys()].filter(id => id !== activeId);
    others.sort((a, b) => (a === null) - (b === null));
    const head = doc.createElement("div");
    head.className = "bac-head";
    const title = doc.createElement("span");
    title.className = "bac-head-title";
    title.textContent = SB.S("statsTitle");
    head.append(title);
    const headButton = (icon, label, pressed, run) => {
      const btn = doc.createElement("button");
      btn.className = "bac-head-btn";
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.append(this.makeIcon(doc, icon));
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        Promise.resolve(run())
          .then(() => this.fillStats(reader, doc, panel))
          .catch(err => SB.logError(err));
      });
      head.append(btn);
    };
    // Filter “only this profile”: always there with the function, as in the
    // item pane; the same funnel, with “1” and a gray background when on
    if (P.enabled()) {
      headButton(filtered ? "funnel-one" : "funnel", SB.S(filtered ? "panelFilterOff" : "panelFilterOn"), filtered,
        () => P.toggleFilter(reader));
    }
    // Descriptions: its own setting, independent of the item pane
    if (SB.descriptionsOn()) {
      const shown = SB.setting("statsDescriptions") === true;
      headButton("describe", SB.S("panelDescriptions"), shown,
        () => SB.Store.setSetting("statsDescriptions", !shown));
    }
    panel.append(head);
    const source = this.sourceText(reader);
    // The document's profile with all its labels (as in the item pane), then
    // the other profiles with the colors they use, then “No profile”
    const ids = filtered ? [activeId] : [activeId, ...others.filter(id => summary.byProfile.get(id))];
    const max = Math.max(1, ...ids.map(id => Math.max(0, ...(summary.colors.get(id) || new Map()).values())));
    for (const id of ids) {
      const profile = P.profileOrNone(id);
      if (ids.length > 1) {
        const g = doc.createElement("div");
        g.className = "bac-group";
        g.textContent = P.nameOrNone(id) + " · " + (summary.byProfile.get(id) || 0);
        if (id === activeId && source) {
          g.setAttribute("title", source);
        }
        panel.append(g);
      }
      this.appendStatRows(doc, panel, profile, summary.colors.get(id) || new Map(), max, id === activeId);
    }
    // All annotations, or with the filter the shown ones (as in the item pane)
    // As a row: the number stands in the column of the numbers above
    const total = doc.createElement("div");
    total.className = "bac-stat bac-total";
    const totalName = doc.createElement("span");
    totalName.className = "bac-stat-name";
    totalName.textContent = P.totalLabel(filtered);
    const totalN = doc.createElement("span");
    totalN.className = "bac-stat-n";
    totalN.textContent = String(totals.shown);
    total.append(totalName, totalN);
    panel.append(total);
    if (filtered) {
      const line = P.othersText(summary, activeId);
      if (line) {
        const el = doc.createElement("div");
        el.className = "bac-sub bac-others";
        el.textContent = line;
        panel.append(el);
      }
    }
    const hint = SB.setting("statsSharedHint") !== false ? P.sharedColorsText(summary) : "";
    if (hint) {
      const h = doc.createElement("div");
      h.className = "bac-menu-hint bac-menu-warn";
      h.textContent = hint;
      panel.append(h);
    }
  },

  /**
   * Rows of the statistics for one profile: color, name, number, bar.
   * all: also labels without annotations (the document's profile).
   */
  appendStatRows(doc, panel, profile, counts, max, all) {
    const SB = this.SB;
    const showDesc = SB.descriptionsOn() && SB.setting("statsDescriptions") !== false;
    const order = profile.colors.map(c => c.color);
    const list = new Map(counts);
    if (all) {
      for (const entry of profile.standard ? profile.colors : SB.visibleColors(profile)) {
        if (!list.has(entry.color)) {
          list.set(entry.color, 0);
        }
      }
    }
    const rows = [...list.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia >= 0 && ib >= 0) {
        return ia - ib;
      }
      if (ia >= 0 || ib >= 0) {
        return ia >= 0 ? -1 : 1;
      }
      return b[1] - a[1];
    });
    for (const [color, n] of rows) {
      const entry = profile.colors.find(c => c.color === color);
      const row = doc.createElement("div");
      row.className = "bac-stat" + (n ? "" : " bac-stat-zero");
      const dot = doc.createElement("span");
      dot.className = "bac-dot";
      dot.style.background = color;
      const name = doc.createElement("span");
      name.className = "bac-stat-name";
      const label = SB.listName(color, profile);
      name.textContent = label;
      if (entry && !SB.isVisible(entry)) {
        const hidden = doc.createElement("i");
        hidden.textContent = " (" + SB.S("statsHidden") + ")";
        name.append(hidden);
      }
      const count = doc.createElement("span");
      count.className = "bac-stat-n";
      count.textContent = String(n);
      const bar = doc.createElement("span");
      bar.className = "bac-bar";
      bar.style.background = color;
      bar.style.width = (n ? Math.max(4, Math.round(n / max * 100)) : 0) + "%";
      // Whole device pixels: with display scaling (e.g. 125 %) all bars keep the same height
      const dpr = doc.defaultView.devicePixelRatio || 1;
      bar.style.height = Math.max(2, Math.round(3 * dpr)) / dpr + "px";
      row.append(dot, name, count, bar);
      const desc = entry && SB.isVisible(entry) && SB.descriptionsOn() ? SB.shortDescription(entry.description) : "";
      if (desc && showDesc) {
        const d = doc.createElement("span");
        d.className = "bac-stat-desc";
        d.textContent = desc;
        row.insertBefore(d, bar);
      }
      else if (desc) {
        row.setAttribute("title", SB.tooltipText(label, entry.description));
      }
      else if (!entry && !SB.stockName(color)) {
        // Color code only here, not in the list
        row.setAttribute("title", label + " (" + color + ")");
      }
      panel.append(row);
    }
  },

  // -------------------------------------------------------------------
  // Sidebar: tooltips for the color filter
  // -------------------------------------------------------------------

  onSidebarHeader({ doc, params, append }) {
    if (!doc) {
      return;
    }
    this._safe(() => this.appendProfileChip(doc, params, append));
    if (this._sidebarPending) {
      return;
    }
    this._sidebarPending = true;
    this.SB.setTimeout(() => {
      this._sidebarPending = false;
      this._safe(() => this.labelSidebar(doc));
    }, 60);
  },

  // -------------------------------------------------------------------
  // Profile in the head of an annotation; profile tags hidden in its tags
  // -------------------------------------------------------------------

  /** Profile name for a list of tags ({ name } objects), or "" without a profile tag. */
  profileNameOfTags(tags) {
    const P = this.SB.Profiles;
    const tag = Array.from(tags || []).map(t => String(t && (t.name ?? t))).find(t => P.isProfileTag(t));
    if (!tag) {
      return "";
    }
    const id = P.idForTag(tag);
    return (id && P.name(id)) || tag.slice(P.prefix().length).trim();
  },

  /**
   * Label with the profile name. Full length while there is room; when the
   * sidebar is narrow it is shortened in the middle (“Literature Re…TCCM”):
   * the head shrinks with an ellipsis, the tail keeps its width.
   */
  makeChip(doc, name) {
    const chip = doc.createElement("span");
    chip.className = "bac-chip";
    this.setChipName(chip, name);
    return chip;
  },

  setChipName(chip, name) {
    const doc = chip.ownerDocument;
    const cut = name.length > 8 ? name.length - Math.min(6, Math.ceil(name.length / 3)) : name.length;
    const head = doc.createElement("span");
    head.className = "bac-chip-h";
    head.textContent = name.slice(0, cut);
    const tail = doc.createElement("span");
    tail.className = "bac-chip-t";
    tail.textContent = name.slice(cut);
    chip.replaceChildren(head, tail);
    chip.setAttribute("data-name", name);
    chip.setAttribute("title", this.SB.S("chipTip", { profile: name }));
    chip.setAttribute("aria-label", this.SB.S("chipTip", { profile: name }));
  },

  /**
   * Small label with the profile name in the head of an annotation, through
   * the official interface. The sidebar cards also get it from markTags(),
   * in case the interface does not reach the plugin.
   */
  appendProfileChip() {
    // The sidebar cards get their label from markTags(), placed before the
    // icons of other plugins; the official event would put it after them.
  },

  /**
   * Watch the reader's document: profile label in the head of each sidebar
   * card and profile tags hidden in the tag lines (sidebar and annotation
   * popups). Only the display changes: the tags stay on the annotations, in
   * the tag filter and in the export. Zotero renders each tag as
   * <span class="tag">; the plugin marks these spans and puts its label into
   * the container for plugin content in the card head (.custom-sections).
   */
  watchTags(doc, reader) {
    const known = this._tagWatch.get(doc);
    if (known) {
      known.reader = reader || known.reader;
      return;
    }
    const main = Zotero.getMainWindow && Zotero.getMainWindow();
    if (!main || !doc.body) {
      return;
    }
    const rec = { reader, pending: false, observer: null };
    rec.observer = new main.MutationObserver(() => {
      if (rec.pending) {
        return;
      }
      rec.pending = true;
      this.SB.setTimeout(() => {
        rec.pending = false;
        this._safe(() => this.markTags(doc));
      }, 40);
    });
    rec.observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    this._tagWatch.set(doc, rec);
    this.ensureReaderStyle(doc);
    this.markTags(doc);
  },

  markTags(doc) {
    const P = this.SB.Profiles;
    const rec = this._tagWatch.get(doc);
    const enabled = P.enabled();
    const hide = enabled && this.SB.setting("hideProfileTags") !== false;
    // Profile labels in the card heads
    const names = new Map();
    if (enabled && rec && rec.reader) {
      for (const a of Array.from(BetterAnnotations.readerState(rec.reader)?.annotations || [])) {
        names.set(String(a.id), this.profileNameOfTags(a.tags));
      }
    }
    for (const card of doc.querySelectorAll("[data-sidebar-annotation-id]")) {
      const box = card.querySelector("header .custom-sections");
      if (!box) {
        continue;
      }
      const name = names.get(card.getAttribute("data-sidebar-annotation-id")) || "";
      const chips = Array.from(box.querySelectorAll(".bac-chip"));
      const header = box.closest("header");
      if (!name) {
        chips.forEach(c => c.remove());
        header?.removeAttribute("data-bac-chip");
        continue;
      }
      // The head of the card gives the space between page and icons to the label
      if (header && !header.hasAttribute("data-bac-chip")) {
        header.setAttribute("data-bac-chip", "");
      }
      let chip = chips[0];
      chips.slice(1).forEach(c => c.remove());
      if (!chip) {
        chip = this.makeChip(doc, name);
      }
      else if (chip.getAttribute("data-name") !== name) {
        this.setChipName(chip, name);
      }
      // Left of the icons of other plugins
      if (box.firstChild !== chip) {
        box.prepend(chip);
      }
    }
    // Profile tags in the tag lines
    const placeholder = this.SB.S("readerAddTags");
    for (const box of doc.querySelectorAll(".tags")) {
      if (box.closest(".selector")) {
        continue; // the tag filter at the bottom of the sidebar stays as it is
      }
      const spans = Array.from(box.querySelectorAll(":scope > span.tag"));
      let lastVisible = null;
      let hidden = 0;
      for (const span of spans) {
        const off = hide && P.isProfileTag((span.textContent || "").trim());
        span.toggleAttribute("data-bac-hidden", off);
        span.removeAttribute("data-bac-last");
        if (off) {
          hidden++;
        }
        else {
          lastVisible = span;
        }
      }
      // No comma after the last visible tag
      if (lastVisible && hidden) {
        lastVisible.setAttribute("data-bac-last", "");
      }
      // Only profile tags: like an annotation without tags. The line appears
      // with Zotero's prompt only while the annotation is selected (CSS).
      box.toggleAttribute("data-bac-only", !!hidden && !lastVisible);
      if (hidden && !lastVisible) {
        box.setAttribute("data-bac-placeholder", placeholder);
      }
    }
  },

  /** After a setting changed: mark the tags in all watched readers again. */
  refreshTagMarks() {
    for (const reader of this.SB.Profiles.openReaders()) {
      try {
        const doc = reader._iframeWindow && reader._iframeWindow.document;
        if (!doc || !doc.body) {
          continue;
        }
        if (this.SB.Profiles.enabled()) {
          this.watchTags(doc, reader);
        }
        if (this._tagWatch.has(doc)) {
          this.markTags(doc);
          if (!this.SB.Profiles.enabled()) {
            doc.querySelectorAll(".bac-chip").forEach(el => el.remove());
          }
        }
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  // -------------------------------------------------------------------
  // Drag a color from the item pane onto annotations
  // -------------------------------------------------------------------

  DRAG_TYPE: "application/x-better-annotations-color",

  /**
   * Start of a drag in the item pane or the separate window. While it lasts,
   * the reader's documents (sidebar and view frames) accept the color:
   * dropped on an annotation (card in the sidebar or highlight in a PDF) it
   * recolors the annotation, or all selected annotations if it is one of
   * them; dropped on selected text it creates an annotation in this color.
   */
  startColorDrag(reader, color, event, label, profileId) {
    this.endColorDrag();
    const doc = reader._iframeWindow && reader._iframeWindow.document;
    if (!doc) {
      return false;
    }
    const source = event.target.ownerDocument;
    const docs = this.outsideDocs(doc).filter(d => d !== source);
    const drag = { reader, color, profileId: profileId || null, label: label || color, docs, target: null, overlay: null, listeners: [], ghosts: new Map(), last: Date.now() };
    const on = (d, type, fn) => {
      d.addEventListener(type, fn, true);
      drag.listeners.push(() => d.removeEventListener(type, fn, true));
    };
    // Own picture under the pointer, opaque, in whichever document the pointer is
    for (const d of [source, ...docs]) {
      on(d, "dragover", e => this._safe(() => {
        drag.last = Date.now();
        this.moveGhost(drag, d, e.clientX, e.clientY);
      }));
      // Ends the drag even if the dragged row was rebuilt meanwhile
      on(d, "dragend", () => this.SB.setTimeout(() => this._drag === drag && this.endColorDrag(), 0));
    }
    for (const d of docs) {
      on(d, "dragover", e => this._safe(() => this.onColorDragOver(drag, e)));
      on(d, "dragleave", e => this._safe(() => {
        if (!e.relatedTarget || e.relatedTarget.ownerDocument !== d) {
          this.setDropTarget(drag, null);
        }
      }));
      on(d, "drop", e => this._safe(() => this.onColorDrop(drag, e)));
    }
    this._drag = drag;
    this.ensureReaderStyle(doc);
    return true;
  },

  /** Picture of the dragged color: color and label, opaque (system drag images are translucent). */
  moveGhost(drag, doc, x, y) {
    let ghost = drag.ghosts.get(doc);
    if (!ghost) {
      ghost = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
      ghost.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;display:flex;align-items:center;gap:6px;"
        + "padding:3px 8px;border-radius:5px;font:12px system-ui,-apple-system,'Segoe UI',sans-serif;white-space:nowrap;"
        + "background:Canvas;color:CanvasText;border:1px solid rgba(127,127,127,.45);box-shadow:0 3px 10px rgba(0,0,0,.22);";
      const dot = doc.createElementNS("http://www.w3.org/1999/xhtml", "span");
      dot.style.cssText = "width:10px;height:10px;border-radius:2px;flex:none;border:1px solid rgba(0,0,0,.15);background:" + drag.color;
      const text = doc.createElementNS("http://www.w3.org/1999/xhtml", "span");
      text.textContent = drag.label;
      ghost.append(dot, text);
      (doc.body || doc.documentElement).append(ghost);
      drag.ghosts.set(doc, ghost);
    }
    for (const [d, g] of drag.ghosts) {
      g.style.display = d === doc ? "flex" : "none";
    }
    ghost.style.left = (x + 14) + "px";
    ghost.style.top = (y + 10) + "px";
  },

  /** Draws the picture at once at the start of a drag (before the first dragover). */
  moveGhostAt(e) {
    const drag = this._drag;
    if (drag && e && e.target && e.target.ownerDocument) {
      this._safe(() => this.moveGhost(drag, e.target.ownerDocument, e.clientX, e.clientY));
    }
  },

  /** Is a color being dragged right now? (Ends by itself if the drag got lost.) */
  dragging() {
    return !!this._drag && Date.now() - this._drag.last < 4000;
  },

  endColorDrag() {
    const drag = this._drag;
    this._drag = null;
    if (!drag) {
      return;
    }
    // The lists skipped rebuilding during the drag
    this.SB.setTimeout(() => this.SB.Panel?.refreshAll?.(), 50);
    for (const g of drag.ghosts.values()) {
      try {
        g.remove();
      }
      catch (e) {}
    }
    this.setDropTarget(drag, null);
    for (const off of drag.listeners) {
      try {
        off();
      }
      catch (e) {}
    }
  },

  isColorDrag(e) {
    try {
      return !!this._drag && Array.from(e.dataTransfer.types || []).includes(this.DRAG_TYPE);
    }
    catch (ex) {
      return false;
    }
  },

  onColorDragOver(drag, e) {
    if (!this.isColorDrag(e)) {
      return;
    }
    const target = this.dropTargetAt(drag.reader, e);
    this.setDropTarget(drag, target);
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    }
    else {
      e.dataTransfer.dropEffect = "none";
    }
  },

  onColorDrop(drag, e) {
    if (!this.isColorDrag(e)) {
      return;
    }
    // What was marked during the drag: the PDF view handles “drop” before
    // the plugin and may clear the text selection or change the state
    const target = drag.target || this.dropTargetAt(drag.reader, e);
    this.setDropTarget(drag, null);
    this.SB.log("drop: " + (target ? (target.ids ? "annotations " + target.ids.join(",") : "selected text") : "no target"));
    this.SB.setTimeout(() => this._drag === drag && this.endColorDrag(), 0);
    if (!target) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (target.annotation) {
      this.createAnnotation(drag.reader, target.annotation, drag.color, drag.profileId);
    }
    else if (target.ids) {
      this.setAnnotationColor(drag.reader, target.ids, drag.color, drag.profileId);
    }
  },

  /**
   * What is under the pointer: { ids, el } for annotations (sidebar card or
   * PDF highlight), { annotation, rects } for selected text, or null.
   */
  dropTargetAt(reader, e) {
    const state = BetterAnnotations.readerState(reader);
    if (!state || state.readOnly) {
      return null;
    }
    const annotations = Array.from(state.annotations || []);
    const editable = id => annotations.some(a => String(a.id) === id && !a.readOnly);
    const withSelection = (id) => {
      const selected = Array.from(state.selectedAnnotationIDs || []).map(String);
      return selected.includes(id) ? selected.filter(editable) : [id];
    };
    // Card in the sidebar (or an annotation popup)
    const card = e.target && e.target.closest ? e.target.closest("[data-sidebar-annotation-id]") : null;
    if (card) {
      const id = card.getAttribute("data-sidebar-annotation-id");
      return editable(id) ? { ids: withSelection(id), el: card } : null;
    }
    const doc = e.target && e.target.ownerDocument;
    if (!doc) {
      return null;
    }
    // Annotation in a PDF page: the view's own hit test, else the plugin's
    const hit = this.viewAnnotationAt(reader, doc, e) || this.pdfAnnotationAt(doc, annotations, e.clientX, e.clientY);
    if (hit) {
      const id = String(hit.annotation.id);
      return editable(id) ? { ids: withSelection(id), rects: hit.rects, doc } : null;
    }
    // Selected text (its popup is shown)
    const sel = doc.defaultView && doc.defaultView.getSelection && doc.defaultView.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const rects = Array.from(sel.getRangeAt(0).getClientRects());
      const inside = rects.some(r => e.clientX >= r.left - 2 && e.clientX <= r.right + 2 && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 2);
      const snap = inside ? this.selectionSnapshot(reader) : null;
      if (snap && snap.annotation) {
        // Mark it like a highlight: the rectangles the reader would save (the
        // rectangles of the text layer do not match the glyphs)
        const pos = snap.annotation.position || {};
        let marks = [];
        if (Array.isArray(pos.rects) && Number.isInteger(pos.pageIndex)) {
          marks = this.pdfScreenRects(doc, pos.pageIndex, pos.rects);
          if (Array.isArray(pos.nextPageRects)) {
            marks = marks.concat(this.pdfScreenRects(doc, pos.pageIndex + 1, pos.nextPageRects));
          }
        }
        return { annotation: snap.annotation, rects: marks.length ? marks : rects.map(r => [r.left, r.top, r.right, r.bottom]), doc };
      }
    }
    return null;
  },

  /** The reader's view (PDF, EPUB, snapshot) that shows `doc`. */
  viewForDoc(reader, doc) {
    const internal = reader._internalReader;
    for (const view of [internal && internal._primaryView, internal && internal._secondaryView]) {
      try {
        const vdoc = view && view._iframeWindow && view._iframeWindow.document;
        if (vdoc && Components.utils.unwaiveXrays(vdoc) === Components.utils.unwaiveXrays(doc)) {
          return view;
        }
      }
      catch (e) {}
    }
    return null;
  },

  /**
   * Annotation under the pointer through the PDF view itself, as it selects
   * annotations on a click (pointerEventToPosition, getSelectableAnnotations).
   */
  viewAnnotationAt(reader, doc, e) {
    const view = this.viewForDoc(reader, doc);
    if (!view || typeof view.pointerEventToPosition !== "function" || typeof view.getSelectableAnnotations !== "function") {
      return null;
    }
    const position = view.pointerEventToPosition(e);
    const list = position ? view.getSelectableAnnotations(position) : null;
    const annotation = list && list[0];
    if (!annotation) {
      return null;
    }
    const pos = annotation.position || {};
    const rects = Array.from(pos.rects || []).map(r => Array.from(r));
    let marks = this.pdfScreenRects(doc, pos.pageIndex, rects);
    if (pos.nextPageRects) {
      marks = marks.concat(this.pdfScreenRects(doc, pos.pageIndex + 1, Array.from(pos.nextPageRects).map(r => Array.from(r))));
    }
    if (!marks.length && pos.paths) {
      // Ink: frame of the paths
      const pts = Array.from(pos.paths).flatMap(p => Array.from(p));
      const xs = pts.filter((v, i) => i % 2 === 0);
      const ys = pts.filter((v, i) => i % 2 === 1);
      if (xs.length) {
        marks = this.pdfScreenRects(doc, pos.pageIndex, [[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]]);
      }
    }
    return { annotation, rects: marks };
  },

  /** Page of pdf.js: its view and the rectangle of its div on screen. */
  pdfPage(doc, pageIndex) {
    const win = doc.defaultView;
    const app = win && (win.wrappedJSObject || win).PDFViewerApplication;
    const page = app && app.pdfViewer && app.pdfViewer._pages && app.pdfViewer._pages[pageIndex];
    return page && page.div && page.viewport ? { page, box: page.div.getBoundingClientRect() } : null;
  },

  pdfScreenRects(doc, pageIndex, rects) {
    const p = this.pdfPage(doc, pageIndex);
    if (!p) {
      return [];
    }
    return rects.map(r => this.toScreenRect(p.page.viewport, p.box, r));
  },

  /**
   * PDF rectangle → rectangle on screen. Computed here with the matrix of the
   * viewport: pdf.js may not read arrays of the plugin (“Permission denied to
   * access property 0” in convertToViewportRectangle).
   */
  toScreenRect(viewport, box, r) {
    const [a, b, c, d, e, f] = Array.from(viewport.transform).map(Number);
    const pt = (x, y) => [a * x + c * y + e, b * x + d * y + f];
    const p1 = pt(Number(r[0]), Number(r[1]));
    const p2 = pt(Number(r[2]), Number(r[3]));
    return [box.left + Math.min(p1[0], p2[0]), box.top + Math.min(p1[1], p2[1]),
      box.left + Math.max(p1[0], p2[0]), box.top + Math.max(p1[1], p2[1])];
  },

  /** Annotation of a PDF page under a point of the view (pdf.js), with its rectangles on screen. */
  pdfAnnotationAt(doc, annotations, x, y) {
    const win = doc.defaultView;
    const app = win && (win.wrappedJSObject || win).PDFViewerApplication;
    // Like the reader: any element under the point that belongs to a page
    const pageEl = Array.from(doc.elementsFromPoint(x, y)).map(el => el.closest && el.closest(".page")).find(Boolean);
    if (!app || !app.pdfViewer || !pageEl) {
      return null;
    }
    const pages = Array.from(app.pdfViewer._pages || []);
    const pageIndex = pages.findIndex(pv => pv.div && Components.utils.unwaiveXrays(pv.div) === Components.utils.unwaiveXrays(pageEl));
    const pageView = pages[pageIndex];
    if (!pageView || !pageView.viewport) {
      return null;
    }
    const box = pageView.div.getBoundingClientRect();
    const viewport = pageView.viewport;
    // Inverse of the viewport matrix (no call into pdf.js with values of the plugin)
    const [ta, tb, tc, td, te, tf] = Array.from(viewport.transform).map(Number);
    const det = ta * td - tb * tc;
    const vx = x - box.left - te;
    const vy = y - box.top - tf;
    const px = (td * vx - tc * vy) / det;
    const py = (-tb * vx + ta * vy) / det;
    let best = null;
    for (const a of annotations) {
      const pos = a.position || {};
      let rects = null;
      if (pos.pageIndex === pageIndex) {
        rects = pos.rects;
      }
      else if (pos.pageIndex === pageIndex - 1 && pos.nextPageRects) {
        rects = pos.nextPageRects;
      }
      if (!rects && pos.pageIndex === pageIndex && pos.paths) {
        // Ink: bounding box of the paths
        const pts = Array.from(pos.paths).flatMap(p => Array.from(p));
        const xs = pts.filter((v, i) => i % 2 === 0);
        const ys = pts.filter((v, i) => i % 2 === 1);
        if (xs.length) {
          rects = [[Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]];
        }
      }
      if (!rects) {
        continue;
      }
      rects = Array.from(rects).map(r => Array.from(r));
      const tol = 2;
      const inside = rects.some(r => px >= Math.min(r[0], r[2]) - tol && px <= Math.max(r[0], r[2]) + tol
        && py >= Math.min(r[1], r[3]) - tol && py <= Math.max(r[1], r[3]) + tol);
      if (!inside) {
        continue;
      }
      // The smallest annotation wins (a note on top of a large image area)
      const area = rects.reduce((s, r) => s + Math.abs((r[2] - r[0]) * (r[3] - r[1])), 0);
      if (!best || area < best.area) {
        best = { annotation: a, area, rects };
      }
    }
    if (!best) {
      return null;
    }
    const screen = best.rects.map(r => this.toScreenRect(viewport, box, r));
    return { annotation: best.annotation, rects: screen };
  },

  /** Mark the target under the pointer: outline of the card or of the highlight. */
  setDropTarget(drag, target) {
    const key = target ? (target.el ? "el" : "") + JSON.stringify(target.ids || target.rects) : null;
    if (key === drag.key) {
      return;
    }
    drag.key = key;
    if (drag.target && drag.target.el) {
      drag.target.el.removeAttribute("data-bac-drop");
    }
    if (drag.overlay) {
      drag.overlay.remove();
      drag.overlay = null;
    }
    drag.target = target;
    if (!target) {
      return;
    }
    if (target.el) {
      target.el.setAttribute("data-bac-drop", "");
      target.el.style.setProperty("--bac-drop-color", drag.color);
      return;
    }
    const doc = target.doc;
    const layer = doc.createElement("div");
    layer.setAttribute("data-bac-drop-layer", "");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
    for (const r of target.rects || []) {
      const box = doc.createElement("div");
      box.style.cssText = "position:fixed;box-sizing:border-box;border-radius:2px;pointer-events:none;"
        + "left:" + (r[0] - 2) + "px;top:" + (r[1] - 2) + "px;width:" + (r[2] - r[0] + 4) + "px;height:" + (r[3] - r[1] + 4) + "px;"
        + "outline:2px solid " + drag.color + ";background:" + drag.color + "40;";
      layer.append(box);
    }
    (doc.body || doc.documentElement).append(layer);
    drag.overlay = layer;
  },

  labelSidebar(doc) {
    const reader = this.SB.Profiles.openReaders().find((r) => {
      try {
        return r._iframeWindow && r._iframeWindow.document === doc;
      }
      catch (e) {
        return false;
      }
    });
    const profile = reader ? this.SB.Profiles.profileForReader(reader) : this.SB.Store.getActive();
    if (profile.standard) {
      return;
    }
    const map = new Map(profile.colors.filter(c => c.label && c.label.trim()).map((c) => {
      return [c.color, this.SB.tooltipText(c.label.trim(), c.description)];
    }));
    for (const el of doc.querySelectorAll(".selector button, .selector .color")) {
      const c = this.colorOf(el);
      if (c && map.has(c)) {
        el.setAttribute("title", map.get(c));
      }
    }
  },
};
