/* Better Annotations – changes to annotations in the library
 *
 * - Recoloring (including merging colors)
 * - Tags from labels (optional, off by default), with a log of all
 *   tags added by BetterAnnotations (tags.json)
 * - Backups of annotation colors (automatically on first start)
 * - History of all changes with undo (history.json)
 *
 * Every change is described as a list of single changes:
 *   { l: libraryID, k: itemKey,
 *     b, a:   color before/after (optional),
 *     add, rem: added/removed tags (optional),
 *     reg, rb, ra: entry in the tag log before/after (optional) }
 * The same function applies and reverts changes.
 */

/* global Zotero, BetterAnnotations */

BetterAnnotations.Library = {
  registry: new Map(), // "libraryID/key" -> tag added by BetterAnnotations
  colorCache: null, // itemID -> color, to detect real color changes
  history: [],
  _observerID: null,
  _regTimer: null,

  get SB() {
    return BetterAnnotations;
  },

  get Store() {
    return BetterAnnotations.Store;
  },

  path(name) {
    return this.Store.join(this.Store.dir, name);
  },

  async init() {
    const reg = await this.Store.readJSON(this.path("tags.json"));
    this.registry = new Map(Object.entries(reg.data?.tags || {}).filter(([, v]) => typeof v === "string"));
    const hist = await this.Store.readJSON(this.path("history.json"));
    this.history = Array.isArray(hist.data?.entries) ? hist.data.entries : [];

    if (!this.Store.data.backups.length) {
      try {
        await this.createBackup("initial");
      }
      catch (e) {
        this.SB.logError(e);
      }
    }

    this._observerID = Zotero.Notifier.registerObserver({
      notify: (event, type, ids) => {
        if (type === "item" && (event === "add" || event === "modify")) {
          this.onItemsChanged(event, ids).catch(e => this.SB.logError(e));
        }
      },
    }, ["item"], "better-annotations");

    if (this.SB.setting("tagsEnabled")) {
      await this.ensureColorCache();
    }
  },

  shutdown() {
    if (this._observerID) {
      Zotero.Notifier.unregisterObserver(this._observerID);
      this._observerID = null;
    }
    if (this._regTimer) {
      this.saveRegistry();
    }
  },

  // -------------------------------------------------------------------
  // Basics
  // -------------------------------------------------------------------

  /** All annotations with library, key, color and parent items. */
  async index() {
    const rows = await Zotero.DB.queryAsync(
      "SELECT IA.itemID AS id, I.libraryID AS l, I.key AS k, LOWER(IA.color) AS c, "
      + "IA.isExternal AS ext, (D.itemID IS NOT NULL) AS del, IA.parentItemID AS att, ATT.parentItemID AS top "
      + "FROM itemAnnotations IA JOIN items I ON I.itemID = IA.itemID "
      + "LEFT JOIN itemAttachments ATT ON ATT.itemID = IA.parentItemID "
      + "LEFT JOIN deletedItems D ON D.itemID = IA.itemID"
    );
    return (rows || []).map(r => ({
      id: r.id, l: r.l, k: r.k, c: this.SB.normalize(r.c), ext: !!r.ext, del: !!r.del,
      att: r.att, top: r.top || null,
    }));
  },

  editableLibrary(libraryID) {
    try {
      const lib = Zotero.Libraries.get(libraryID);
      return !!lib && !!lib.editable;
    }
    catch (e) {
      return false;
    }
  },

  /** Annotations that BetterAnnotations may change. */
  async changeable() {
    return (await this.index()).filter(r => !r.del && !r.ext && this.editableLibrary(r.l));
  },

  /**
   * Colors in use: Map color -> number. profile: only annotations of this
   * profile (tag, else profile of the document); null for all.
   */
  async getColorUsage(scope, profile) {
    const usage = new Map();
    try {
      const match = await this.scopeFilter(scope);
      const of = profile ? (await this.SB.Profiles.resolver()).of : null;
      for (const r of await this.index()) {
        if (!match(r) || (of && of(r) !== profile)) {
          continue;
        }
        if (!r.del && r.c) {
          usage.set(r.c, (usage.get(r.c) || 0) + 1);
        }
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
    return usage;
  },

  // -------------------------------------------------------------------
  // Areas: document, selection, collection, library, all libraries
  // -------------------------------------------------------------------

  /** Title of an item or of the parent item of a file. */
  itemTitle(item) {
    try {
      const top = item.parentItem || item;
      return top.getDisplayTitle ? top.getDisplayTitle() : top.getField("title");
    }
    catch (e) {
      return "";
    }
  },

  /** What is currently open or selected in the main window. */
  scopeContext() {
    const ctx = { doc: null, items: null, collection: null, parent: null, library: null };
    let win = null;
    try {
      win = Zotero.getMainWindow();
    }
    catch (e) {}
    if (!win) {
      return ctx;
    }
    try {
      const tabs = win.Zotero_Tabs;
      if (tabs && String(tabs.selectedType || "").startsWith("reader")) {
        const reader = Zotero.Reader.getByTabID(tabs.selectedID);
        const item = reader && Zotero.Items.get(reader.itemID);
        if (item) {
          ctx.doc = { id: item.id, name: this.itemTitle(item) };
        }
      }
    }
    catch (e) {}
    const zp = win.ZoteroPane;
    if (!zp) {
      return ctx;
    }
    try {
      const selected = (zp.getSelectedItems ? zp.getSelectedItems() : []).filter(i => i && (i.isRegularItem() || i.isAttachment()));
      if (selected.length) {
        ctx.items = { ids: selected.map(i => i.id), n: selected.length, name: this.itemTitle(selected[0]) };
      }
    }
    catch (e) {}
    try {
      const coll = zp.getSelectedCollection && zp.getSelectedCollection();
      if (coll) {
        ctx.collection = { id: coll.id, name: coll.name };
        const parent = coll.parentID ? Zotero.Collections.get(coll.parentID) : null;
        if (parent) {
          ctx.parent = { id: parent.id, name: parent.name };
        }
      }
    }
    catch (e) {}
    try {
      const libraryID = zp.getSelectedLibraryID();
      const lib = Zotero.Libraries.get(libraryID);
      if (lib) {
        ctx.library = { id: libraryID, name: lib.name };
      }
    }
    catch (e) {}
    return ctx;
  },

  /** Menu items for the areas; unavailable areas are disabled. */
  scopeOptions(ctx) {
    const S = (k, a) => this.SB.S(k, a);
    return [
      ctx.doc
        ? { value: "doc", label: S("scopeDoc", { name: ctx.doc.name }), scope: { type: "doc", id: ctx.doc.id }, name: ctx.doc.name }
        : { value: "doc", label: S("scopeDocNone"), disabled: true },
      ctx.items
        ? { value: "items", label: S("scopeItems", { n: ctx.items.n, name: ctx.items.name }), scope: { type: "items", ids: ctx.items.ids }, name: ctx.items.name }
        : { value: "items", label: S("scopeItemsNone"), disabled: true },
      ctx.collection
        ? { value: "collection", label: S("scopeCollection", { name: ctx.collection.name }), scope: { type: "collection", id: ctx.collection.id }, name: ctx.collection.name }
        : { value: "collection", label: S("scopeCollectionNone"), disabled: true },
      ctx.parent
        ? { value: "parent", label: S("scopeParent", { name: ctx.parent.name }), scope: { type: "collection", id: ctx.parent.id }, name: ctx.parent.name }
        : { value: "parent", label: S("scopeParentNone"), disabled: true },
      ctx.library
        ? { value: "library", label: S("scopeLibrary", { name: ctx.library.name }), scope: { type: "library", id: ctx.library.id }, name: ctx.library.name }
        : { value: "library", label: S("scopeLibraryNone"), disabled: true },
      { value: "all", label: S("scopeAll"), scope: { type: "all" }, name: S("scopeAllName") },
    ];
  },

  /** Predicate for rows from index(): does the annotation belong to the area? */
  async scopeFilter(scope) {
    if (!scope || scope.type === "all") {
      return () => true;
    }
    if (scope.type === "doc") {
      return r => r.att === scope.id;
    }
    if (scope.type === "library") {
      return r => r.l === scope.id;
    }
    if (scope.type === "items") {
      const set = new Set(scope.ids);
      return r => set.has(r.att) || set.has(r.top);
    }
    if (scope.type === "collection") {
      const ids = [scope.id];
      if (scope.sub !== false) {
        try {
          for (const d of Zotero.Collections.get(scope.id).getDescendents(false, "collection")) {
            ids.push(d.id);
          }
        }
        catch (e) {
          this.SB.logError(e);
        }
      }
      const rows = await Zotero.DB.columnQueryAsync(
        "SELECT itemID FROM collectionItems WHERE collectionID IN (" + ids.map(() => "?").join(",") + ")", ids);
      const set = new Set(rows || []);
      return r => set.has(r.att) || set.has(r.top);
    }
    return () => true;
  },

  async loadItems(ids) {
    const items = (await Zotero.Items.getAsync(ids)).filter(Boolean);
    try {
      await Zotero.Items.loadDataTypes(items);
    }
    catch (e) {
      for (const item of items) {
        try {
          await item.loadAllData();
        }
        catch (_) {}
      }
    }
    return items;
  },

  regKey(l, k) {
    return l + "/" + k;
  },

  setRegistry(l, k, tag) {
    const key = this.regKey(l, k);
    if (tag) {
      this.registry.set(key, tag);
    }
    else {
      this.registry.delete(key);
    }
    this.saveRegistrySoon();
  },

  saveRegistrySoon() {
    if (this._regTimer) {
      return;
    }
    this._regTimer = this.SB.setTimeout(() => this.saveRegistry(), 1000);
  },

  async saveRegistry() {
    this._regTimer = null;
    try {
      await this.Store.writeJSON(this.path("tags.json"), { version: 1, tags: Object.fromEntries(this.registry) });
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  /** Tag for a color in the given profile, or null. */
  tagForColor(color, profile) {
    const entry = profile.colors.find(c => c.color === color);
    if (!entry || !this.SB.isVisible(entry) || !entry.label.trim()) {
      return null;
    }
    return this.tagForLabel(entry.label);
  },

  tagForLabel(label) {
    const t = String(label || "").trim();
    return t ? (this.SB.setting("tagPrefix") || "") + t : null;
  },

  // -------------------------------------------------------------------
  // Automatic tags for new and recolored annotations
  // -------------------------------------------------------------------

  async ensureColorCache() {
    if (this.colorCache) {
      return;
    }
    this.colorCache = new Map();
    for (const r of await this.index()) {
      this.colorCache.set(r.id, r.c);
    }
  },

  async onItemsChanged(event, ids) {
    if (!this.SB.setting("tagsEnabled")) {
      return;
    }
    await this.ensureColorCache();
    const items = Zotero.Items.get(ids).filter(i => i && typeof i.isAnnotation === "function" && i.isAnnotation());
    if (!items.length) {
      return;
    }
    const Profiles = this.SB.Profiles;
    const readers = Profiles.openReaders();
    for (const item of items) {
      const color = this.SB.normalize(item.annotationColor);
      const before = this.colorCache.get(item.id);
      this.colorCache.set(item.id, color);
      // Only for new annotations and real color changes, not for other edits
      if (event === "modify" && before === color) {
        continue;
      }
      if (!this.editableLibrary(item.libraryID) || item.annotationIsExternal) {
        continue;
      }
      // Labels from the annotation's profile: its tag, else the profile of its document
      const reader = readers.find(r => r.itemID === item.parentItemID);
      const docId = reader ? Profiles.forReader(reader) : Profiles.forFile(item.parentItemID);
      const profile = Profiles.profile(Profiles.ofItem(item, docId));
      const desired = this.tagForColor(color, profile);
      const current = this.registry.get(this.regKey(item.libraryID, item.key)) || null;
      try {
        let changed = false;
        if (current && current !== desired && item.hasTag(current)) {
          item.removeTag(current);
          changed = true;
        }
        if (desired && !item.hasTag(desired)) {
          item.addTag(desired, 0);
          changed = true;
        }
        this.setRegistry(item.libraryID, item.key, desired);
        if (changed) {
          await item.saveTx();
        }
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  // -------------------------------------------------------------------
  // Apply and undo
  // -------------------------------------------------------------------

  async execute(changes, undo) {
    const index = new Map((await this.index()).map(r => [this.regKey(r.l, r.k), r]));
    await this.ensureColorCache();
    let done = 0;
    let skipped = 0;
    const byId = new Map();
    for (const ch of changes) {
      const row = index.get(this.regKey(ch.l, ch.k));
      if (!row) {
        skipped++;
        continue;
      }
      byId.set(row.id, ch);
    }
    const ids = [...byId.keys()];
    {
      for (let i = 0; i < ids.length; i += 100) {
        const items = await this.loadItems(ids.slice(i, i + 100));
        await Zotero.DB.executeTransaction(async () => {
          for (const item of items) {
            const ch = byId.get(item.id);
            if (!this.editableLibrary(item.libraryID) || item.annotationIsExternal) {
              skipped++;
              continue;
            }
            let changed = false;
            if (ch.a) {
              const from = undo ? ch.a : ch.b;
              const to = undo ? ch.b : ch.a;
              const color = this.SB.normalize(item.annotationColor);
              if (color === from) {
                item.annotationColor = to;
                this.colorCache.set(item.id, to);
                changed = true;
              }
              else if (color !== to) {
                skipped++; // changed differently in the meantime
                continue;
              }
            }
            const add = (undo ? ch.rem : ch.add) || [];
            const rem = (undo ? ch.add : ch.rem) || [];
            for (const t of rem) {
              if (item.hasTag(t)) {
                item.removeTag(t);
                changed = true;
              }
            }
            for (const t of add) {
              if (!item.hasTag(t)) {
                item.addTag(t, 0);
                changed = true;
              }
            }
            if (ch.reg) {
              this.setRegistry(ch.l, ch.k, undo ? ch.rb : ch.ra);
            }
            if (changed) {
              await item.save();
              done++;
            }
          }
        });
      }
    }
    // The color cache is already updated, so the automatic tags
    // do not react to these changes a second time.
    await this.saveRegistry();
    return { done, skipped };
  },

  async record(type, params, changes) {
    const entry = {
      id: this.SB.uid("h"),
      time: new Date().toISOString(),
      type,
      params,
      count: changes.length,
      changes,
      undone: false,
    };
    this.history.unshift(entry);
    this.history = this.history.slice(0, 50);
    await this.saveHistory();
    return entry;
  },

  async saveHistory() {
    await this.Store.writeJSON(this.path("history.json"), { version: 1, entries: this.history });
  },

  describe(entry) {
    const key = { recolor: "hRecolor", tagsApply: "hTagsApply", tagsRemove: "hTagsRemove",
      tagsRename: "hTagsRename", restore: "hRestore", profileAssign: "hProfileAssign", profileRename: "hProfileRename",
      profileRemove: "hProfileRemove", profileAssignAll: "hProfileAssignAll", profileRemoveAll: "hProfileRemoveAll" }[entry.type] || "hRecolor";
    const params = Object.assign({ n: entry.count }, entry.params || {});
    if (entry.type === "restore" && params.created) {
      params.date = this.SB.formatDate(params.created);
    }
    return this.SB.S(key, params);
  },

  PROFILE_TYPES: ["profileAssign", "profileRename", "profileRemove", "profileAssignAll", "profileRemoveAll"],

  async run(type, params, changes) {
    const result = await this.execute(changes, false);
    if (result.done) {
      await this.record(type, Object.assign({}, params, { n: result.done }), changes);
    }
    if (this.PROFILE_TYPES.includes(type)) {
      await this.SB.Profiles.syncTagColors();
      this.SB.Profiles.reresolve();
    }
    return result;
  },

  async undo(entryId) {
    const entry = this.history.find(e => e.id === entryId);
    if (!entry || entry.undone) {
      return { done: 0, skipped: 0 };
    }
    const result = await this.execute(entry.changes, true);
    entry.undone = true;
    entry.undoneTime = new Date().toISOString();
    await this.saveHistory();
    if (this.PROFILE_TYPES.includes(entry.type)) {
      await this.SB.Profiles.syncTagColors();
    }
    return result;
  },

  // -------------------------------------------------------------------
  // Plans (computed first, applied after confirmation)
  // -------------------------------------------------------------------

  /**
   * Recolor: pairs = [[from, to], …]
   * options.scope: area (default: all libraries)
   * options.tags: update the plugin tag to the new color's label (default: if tags are enabled)
   * options.profile: profile that provides the labels (default: profile of each annotation)
   * options.only: only annotations of this profile ID (default: all)
   */
  async planRecolor(pairs, options = {}) {
    const map = new Map(pairs.filter(([a, b]) => a && b && a !== b));
    const tags = options.tags ?? this.SB.setting("tagsEnabled");
    const match = await this.scopeFilter(options.scope);
    const Profiles = this.SB.Profiles;
    const resolver = (options.only || (tags && !options.profile)) ? await Profiles.resolver() : null;
    const profiles = new Map();
    const profileOf = (r) => {
      if (options.profile) {
        return options.profile;
      }
      const id = resolver.of(r);
      if (!profiles.has(id)) {
        profiles.set(id, Profiles.profile(id));
      }
      return profiles.get(id);
    };
    const changes = [];
    for (const r of await this.changeable()) {
      if (!map.has(r.c) || !match(r) || (options.only && resolver.of(r) !== options.only)) {
        continue;
      }
      const ch = { l: r.l, k: r.k, b: r.c, a: map.get(r.c) };
      if (tags) {
        const current = this.registry.get(this.regKey(r.l, r.k)) || null;
        const desired = this.tagForColor(ch.a, profileOf(r));
        if (current !== desired) {
          ch.add = desired ? [desired] : [];
          ch.rem = current ? [current] : [];
          ch.reg = true;
          ch.rb = current;
          ch.ra = desired;
        }
      }
      changes.push(ch);
    }
    return changes;
  },

  recolorParams(pairs, labels) {
    const SB = this.SB;
    return {
      list: pairs.map(([a, b], i) => (labels && labels[i])
        ? labels[i] + " (" + a + " → " + b + ")"
        : SB.displayName(a) + " → " + SB.displayName(b)).join(", "),
    };
  },

  /** Set the label tags of all annotations according to the profile of each annotation. */
  async planApplyTags() {
    const Profiles = this.SB.Profiles;
    const resolver = await Profiles.resolver();
    const profiles = new Map();
    const changes = [];
    for (const r of await this.changeable()) {
      const id = resolver.of(r);
      if (!profiles.has(id)) {
        profiles.set(id, Profiles.profile(id));
      }
      const current = this.registry.get(this.regKey(r.l, r.k)) || null;
      const desired = this.tagForColor(r.c, profiles.get(id));
      if (current === desired) {
        continue;
      }
      changes.push({
        l: r.l, k: r.k,
        add: desired ? [desired] : [],
        rem: current ? [current] : [],
        reg: true, rb: current, ra: desired,
      });
    }
    return changes;
  },

  planRemoveTags() {
    return [...this.registry.entries()].map(([key, tag]) => {
      const i = key.indexOf("/");
      return { l: +key.slice(0, i), k: key.slice(i + 1), rem: [tag], reg: true, rb: tag, ra: null };
    });
  },

  planRenameTag(fromTag, toTag) {
    return [...this.registry.entries()].filter(([, tag]) => tag === fromTag).map(([key]) => {
      const i = key.indexOf("/");
      return { l: +key.slice(0, i), k: key.slice(i + 1), rem: [fromTag], add: [toTag], reg: true, rb: fromTag, ra: toTag };
    });
  },

  // -------------------------------------------------------------------
  // Profile tags
  // -------------------------------------------------------------------

  /** Annotations with one of the tags: [{ l, k, name }]. */
  async annotationsWithTags(names) {
    const out = [];
    const list = [...new Set(names.filter(Boolean))];
    for (let i = 0; i < list.length; i += 200) {
      const part = list.slice(i, i + 200);
      const rows = await Zotero.DB.queryAsync(
        "SELECT I.libraryID AS l, I.key AS k, T.name AS name FROM itemAnnotations IA JOIN items I ON I.itemID = IA.itemID "
        + "JOIN itemTags IT ON IT.itemID = IA.itemID JOIN tags T ON T.tagID = IT.tagID "
        + "WHERE IA.isExternal = 0 AND IA.itemID NOT IN (SELECT itemID FROM deletedItems) AND T.name IN ("
        + part.map(() => "?").join(",") + ")", part);
      for (const r of rows || []) {
        if (this.editableLibrary(r.l)) {
          out.push({ l: r.l, k: r.k, name: r.name });
        }
      }
    }
    return out;
  },

  /** Replace a profile tag by another (to = null: remove it). */
  async planRetag(from, to) {
    return (await this.annotationsWithTags([from])).map(r => ({ l: r.l, k: r.k, rem: [from], add: to ? [to] : [] }));
  },

  /** Number of annotations with a profile tag (all tags with the prefix that belong to a profile). */
  async countProfileTags() {
    const resolver = await this.SB.Profiles.resolver();
    return resolver.tagged.size;
  },

  /** Number of annotations with the tag of a profile. */
  async countTagged(tag) {
    return tag ? (await this.annotationsWithTags([tag])).length : 0;
  },

  /** Give annotations without a profile tag in an area the tag of a profile. */
  async planProfileAssign(scope, profileId) {
    const Profiles = this.SB.Profiles;
    const tag = Profiles.tagFor(profileId);
    if (!tag) {
      return [];
    }
    const resolver = await Profiles.resolver();
    const match = await this.scopeFilter(scope);
    return (await this.changeable()).filter(r => match(r) && !resolver.tagged.has(r.id)).map(r => ({ l: r.l, k: r.k, add: [tag] }));
  },

  /**
   * When “Profile per Document” is turned on: every annotation without a
   * profile tag gets the tag of the profile its document uses now.
   */
  async planProfileAssignByDocument() {
    const Profiles = this.SB.Profiles;
    const resolver = await Profiles.resolver();
    return (await this.changeable()).filter(r => !resolver.tagged.has(r.id)).map((r) => {
      const tag = Profiles.tagFor(resolver.fileProfile(r.att, r.top));
      return tag ? { l: r.l, k: r.k, add: [tag] } : null;
    }).filter(Boolean);
  },

  /** All profile tags (to remove them when the function is turned off). */
  async planRemoveProfileTags() {
    const Profiles = this.SB.Profiles;
    const names = [...new Set((await Profiles.tagsInUse()).map(r => r.name).filter(n => Profiles.idForTag(n)))];
    const byKey = new Map();
    for (const r of await this.annotationsWithTags(names)) {
      const key = r.l + "/" + r.k;
      if (!byKey.has(key)) {
        byKey.set(key, { l: r.l, k: r.k, rem: [] });
      }
      byKey.get(key).rem.push(r.name);
    }
    return [...byKey.values()];
  },

  countTag(tag) {
    let n = 0;
    for (const t of this.registry.values()) {
      if (t === tag) {
        n++;
      }
    }
    return n;
  },

  // -------------------------------------------------------------------
  // Backups
  // -------------------------------------------------------------------

  async createBackup(kind) {
    const rows = await this.index();
    const created = new Date().toISOString();
    const file = "backup-" + created.replace(/[-:]/g, "").replace(/\..*$/, "") + "-" + kind + ".json";
    const dir = this.path("backups");
    await Zotero.File.createDirectoryIfMissingAsync(this.Store.dir);
    await Zotero.File.createDirectoryIfMissingAsync(dir);
    await Zotero.File.putContentsAsync(this.Store.join(dir, file), JSON.stringify({
      version: 1,
      created,
      kind,
      plugin: this.SB.version,
      annotations: rows.map(r => ({ l: r.l, k: r.k, c: r.c })),
    }));
    const info = { file, created, kind, count: rows.length };
    this.Store.data.backups.unshift(info);
    await this.Store.persist();
    return info;
  },

  async planRestore(backup) {
    const { data } = await this.Store.readJSON(this.Store.join(this.path("backups"), backup.file));
    if (!data || !Array.isArray(data.annotations)) {
      throw new Error("backup file missing or damaged");
    }
    const current = new Map((await this.index()).map(r => [this.regKey(r.l, r.k), r]));
    const changes = new Map();
    for (const a of data.annotations) {
      const key = this.regKey(a.l, a.k);
      const row = current.get(key);
      const color = this.SB.normalize(a.c);
      if (row && color && row.c !== color) {
        changes.set(key, { l: a.l, k: a.k, b: row.c, a: color });
      }
    }
    let colorCount = changes.size;
    let tagCount = 0;
    for (const [key, tag] of this.registry.entries()) {
      const i = key.indexOf("/");
      const ch = changes.get(key) || { l: +key.slice(0, i), k: key.slice(i + 1) };
      Object.assign(ch, { rem: [tag], reg: true, rb: tag, ra: null });
      changes.set(key, ch);
      tagCount++;
    }
    return { changes: [...changes.values()], colorCount, tagCount, created: data.created || backup.created };
  },

  // -------------------------------------------------------------------
  // Full backup (for a new computer)
  // -------------------------------------------------------------------

  /**
   * Library IDs are only valid on one computer. The backup therefore uses
   * "u" for “My Library” and "g<group ID>" for groups.
   */
  portableLib(l) {
    try {
      const lib = Zotero.Libraries.get(l);
      if (lib && lib.libraryType === "group") {
        return "g" + (lib.groupID || Zotero.Groups.getGroupIDFromLibraryID(l));
      }
      if (lib && lib.libraryType === "user") {
        return "u";
      }
    }
    catch (e) {}
    return l === Zotero.Libraries.userLibraryID ? "u" : "l" + l;
  },

  localLib(p) {
    try {
      if (p === "u") {
        return Zotero.Libraries.userLibraryID;
      }
      if (typeof p === "string" && p[0] === "g") {
        return Zotero.Groups.getLibraryIDFromGroupID(parseInt(p.slice(1), 10)) || null;
      }
    }
    catch (e) {}
    return null;
  },

  mapChanges(changes, fn) {
    const out = [];
    for (const ch of changes || []) {
      const l = fn(ch.l);
      if (l !== null && l !== undefined) {
        out.push(Object.assign({}, ch, { l }));
      }
    }
    return out;
  },

  mapRegistry(entries, fn) {
    const out = {};
    for (const [key, tag] of entries) {
      const i = key.indexOf("/");
      const l = fn(key[0] === "u" || key[0] === "g" || key[0] === "l" ? key.slice(0, i) : +key.slice(0, i));
      if (l !== null && l !== undefined) {
        out[l + "/" + key.slice(i + 1)] = tag;
      }
    }
    return out;
  },

  /** All plugin data as one object: profiles, settings, tags, history, backups. */
  async buildFullBackup() {
    const toPortable = l => this.portableLib(l);
    const backups = {};
    for (const b of this.Store.data.backups) {
      const { data } = await this.Store.readJSON(this.Store.join(this.path("backups"), b.file));
      if (data && Array.isArray(data.annotations)) {
        backups[b.file] = Object.assign({}, data, { annotations: this.mapChanges(data.annotations, toPortable) });
      }
    }
    if (this._regTimer) {
      await this.saveRegistry();
    }
    const profiles = JSON.parse(JSON.stringify(this.Store.data));
    profiles.collectionRules = (profiles.collectionRules || []).map(r => Object.assign({}, r, { lib: toPortable(r.lib) }));
    return {
      format: "better-annotations/full-backup",
      formatVersion: 1,
      plugin: this.SB.version,
      created: new Date().toISOString(),
      files: {
        "profiles.json": profiles,
        "documents.json": { version: 1, docs: this.mapRegistry(this.SB.Profiles.docs.entries(), toPortable) },
        "tags.json": { version: 1, tags: this.mapRegistry(this.registry.entries(), toPortable) },
        "history.json": {
          version: 1,
          entries: this.history.map(e => Object.assign({}, e, { changes: this.mapChanges(e.changes, toPortable) })),
        },
        backups,
      },
    };
  },

  /** Checks a full backup and returns a short summary. */
  inspectFullBackup(obj) {
    // "better-annotation-colors/…" is the format name used before the plugin was renamed
    const formats = ["better-annotations/full-backup", "better-annotation-colors/full-backup"];
    if (!obj || !formats.includes(obj.format) || !obj.files || !obj.files["profiles.json"]) {
      throw new Error(this.SB.S("fullBackupInvalid"));
    }
    const f = obj.files;
    return {
      created: obj.created,
      profiles: (f["profiles.json"].profiles || []).length,
      history: (f["history.json"]?.entries || []).length,
      tags: Object.keys(f["tags.json"]?.tags || {}).length,
      backups: Object.keys(f.backups || {}).length,
    };
  },

  /**
   * Replaces all plugin data with the backup. The current state is saved
   * as a full backup in the data folder first.
   */
  async restoreFullBackup(obj) {
    this.inspectFullBackup(obj);
    const toLocal = p => this.localLib(p);
    const safety = await this.buildFullBackup();
    const dir = this.path("full-backups");
    await Zotero.File.createDirectoryIfMissingAsync(this.Store.dir);
    await Zotero.File.createDirectoryIfMissingAsync(dir);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
    await Zotero.File.putContentsAsync(this.Store.join(dir, "before-restore-" + stamp + ".json"), JSON.stringify(safety));

    const f = obj.files;
    // Backups of annotation colors
    await Zotero.File.createDirectoryIfMissingAsync(this.path("backups"));
    const known = new Set();
    for (const [file, data] of Object.entries(f.backups || {})) {
      if (!/^[\w.-]+\.json$/.test(file) || !data || !Array.isArray(data.annotations)) {
        continue;
      }
      known.add(file);
      await Zotero.File.putContentsAsync(this.Store.join(this.path("backups"), file),
        JSON.stringify(Object.assign({}, data, { annotations: this.mapChanges(data.annotations, toLocal) })));
    }
    // Profiles and settings; collection rules and choices per document with local library IDs
    const rawProfiles = Object.assign({}, f["profiles.json"]);
    rawProfiles.collectionRules = (rawProfiles.collectionRules || []).map(r => Object.assign({}, r, { lib: toLocal(r && r.lib) }))
      .filter(r => r.lib !== null && r.lib !== undefined);
    const data = this.Store.sanitize(rawProfiles);
    data.backups = data.backups.filter(b => known.has(b.file));
    this.Store.data = data;
    await this.Store.persist();
    // Tags and history
    this.registry = new Map(Object.entries(this.mapRegistry(Object.entries(f["tags.json"]?.tags || {}), toLocal)));
    await this.saveRegistry();
    if (f["documents.json"]) {
      this.SB.Profiles.docs = new Map(Object.entries(this.mapRegistry(Object.entries(f["documents.json"].docs || {}), toLocal))
        .filter(([, v]) => v && typeof v.p === "string"));
      await this.SB.Profiles.saveDocs();
    }
    this.history = (f["history.json"]?.entries || []).filter(e => e && Array.isArray(e.changes))
      .map(e => Object.assign({}, e, { changes: this.mapChanges(e.changes, toLocal) })).slice(0, 50);
    await this.saveHistory();
    this.colorCache = null;
    if (this.SB.setting("tagsEnabled")) {
      await this.ensureColorCache();
    }
    this.Store.emit("profiles");
    this.Store.emit("settings");
    this.Store.emit("active");
  },
};
