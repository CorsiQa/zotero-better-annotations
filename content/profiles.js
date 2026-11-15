/* Better Annotations – profile per document
 *
 * Every document (file opened in the reader) has its own profile. When a
 * document opens, the plugin chooses it in this order:
 *   1. the profile last chosen by hand in this document (documents.json)
 *   2. the profile of most annotations in the document (profile tags)
 *   3. the first collection rule that matches the collection the document
 *      was opened from, or – without one – the collections of the item
 *   4. the default profile
 *
 * The function is optional (tab “Advanced”, setting profilesPerDocument).
 * Without it, one profile is active for all documents, as in 1.0.0-beta.1,
 * and nothing of the following runs: no tags, no observer, no wrapping.
 *
 * Profile tags: every new annotation gets the tag "ZBA: <profile name>"
 * (Zotero Better Annotations, the same in every language), colored in the
 * brand color if possible. The tag is added in the
 * reader's annotation manager before the reader saves the annotation, so it
 * is part of the same save and of the same undo step. If that is not
 * possible (e.g. after a Zotero update), the tag is added afterwards.
 * Annotations without a profile tag belong to the profile of their document.
 */

/* global Zotero, Components, BetterAnnotations */

BetterAnnotations.Profiles = {
  docs: new Map(), // "libraryID/key" of a file -> { p: profile ID, t: ISO time }
  _readers: new WeakMap(), // reader -> { id, source, ctx, token }
  _files: new Map(), // attachment ID -> { id, source, token } (library)
  _restored: new WeakSet(), // readers that were open before the plugin started
  _wrapped: new Map(), // reader -> { manager, original, token }
  _observerID: null,
  _saveTimer: null,
  _token: 0,

  get SB() {
    return BetterAnnotations;
  },

  get Store() {
    return BetterAnnotations.Store;
  },

  /** Prefix of profile tags, the same in every language. */
  PREFIX: "ZBA: ",

  /** Color of profile tags in Zotero (brand color). */
  TAG_COLOR: "#6B5BD6",

  async init() {
    const Store = this.Store;
    const { data } = await Store.readJSON(Store.join(Store.dir, "documents.json"));
    this.docs = new Map(Object.entries(data?.docs || {}).filter(([, v]) => v && typeof v.p === "string"));
    for (const reader of this.openReaders()) {
      this._restored.add(reader);
    }
    this._unlisten = Store.onChange(what => this.onStoreChange(what));
    this.sync();
    if (this.enabled()) {
      // Tags from earlier versions or other computers get their color
      this.SB.setTimeout(() => this.syncTagColors().catch(e => this.SB.logError(e)), 5000);
    }
  },

  /** Is “Profile per Document” turned on? */
  enabled() {
    return this.SB.setting("profilesPerDocument") === true;
  },

  /** Start or stop the observer and the wrapping when the function is turned on or off. */
  sync() {
    if (this.enabled()) {
      // Readers that are already open were not opened from the collection selected now
      for (const reader of this.openReaders()) {
        if (!this._readers.has(reader)) {
          this._restored.add(reader);
        }
      }
      if (!this._observerID) {
        try {
          this._observerID = Zotero.Notifier.registerObserver({
            notify: (event, type, ids, extra) => {
              if (type === "item") {
                this.onItems(event, ids, extra);
              }
            },
          }, ["item"], "better-annotations-profiles");
        }
        catch (e) {
          this.SB.logError(e);
        }
      }
      return;
    }
    if (this._observerID) {
      Zotero.Notifier.unregisterObserver(this._observerID);
      this._observerID = null;
    }
    for (const reader of [...this._wrapped.keys()]) {
      this.setFilter(reader, false);
      this.unwrap(reader);
    }
    this._readers = new WeakMap();
    this._files.clear();
  },

  shutdown() {
    if (this._observerID) {
      Zotero.Notifier.unregisterObserver(this._observerID);
      this._observerID = null;
    }
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
    for (const reader of [...this._wrapped.keys()]) {
      this.unwrap(reader);
    }
    if (this._saveTimer) {
      this.saveDocs();
    }
  },

  openReaders() {
    try {
      return Array.from(Zotero.Reader._readers || []);
    }
    catch (e) {
      return [];
    }
  },

  // -------------------------------------------------------------------
  // Profiles and tags
  // -------------------------------------------------------------------

  /** A profile that exists, else the default profile. */
  valid(id) {
    return id && this.Store.getProfile(id) ? id : this.defaultId();
  },

  defaultId() {
    const id = this.Store.data.activeProfileId;
    return this.Store.getProfile(id) ? id : "zoteroplus";
  },

  profile(id) {
    const p = this.Store.getProfile(this.valid(id)) || this.Store.plusPreset();
    return JSON.parse(JSON.stringify(p));
  },

  name(id) {
    const p = this.Store.getProfile(id);
    return p ? p.name : "";
  },

  prefix() {
    return this.PREFIX;
  },

  tagForName(name, prefix) {
    const n = String(name || "").trim();
    return n ? (prefix ?? this.prefix()) + n : null;
  },

  tagFor(id) {
    return this.tagForName(this.name(id));
  },

  /** Names of a built-in profile in all languages (the tag may come from another language). */
  presetNames(id) {
    this._presetNames = this._presetNames || {};
    if (!this._presetNames[id]) {
      const key = id === "standard" ? "presetZotero" : "presetPlus";
      this._presetNames[id] = new Set(Object.values(this.SB.STRINGS).map(t => t && t[key]).filter(Boolean));
    }
    return this._presetNames[id];
  },

  /** Profile ID for a tag, or null if the tag is no profile tag of an existing profile. */
  idForTag(tag, prefix) {
    const pre = prefix ?? this.prefix();
    if (typeof tag !== "string" || !pre || !tag.startsWith(pre)) {
      return null;
    }
    const name = tag.slice(pre.length).trim();
    if (!name) {
      return null;
    }
    const own = this.Store.getProfiles().find(p => p.name === name);
    if (own) {
      return own.id;
    }
    for (const id of this.SB.PRESET_IDS) {
      if (this.presetNames(id).has(name)) {
        return id;
      }
    }
    return null;
  },

  /** First profile tag among the tags (strings or { name } / { tag } objects). */
  idForTags(tags) {
    for (const t of tags || []) {
      const id = this.idForTag(typeof t === "string" ? t : (t && (t.name ?? t.tag)));
      if (id) {
        return id;
      }
    }
    return null;
  },

  isProfileTag(tag) {
    const pre = this.prefix();
    return typeof tag === "string" && !!pre && tag.startsWith(pre);
  },

  /** SQL pattern for tags with the prefix. */
  likePattern(prefix) {
    return String(prefix ?? this.prefix()).replace(/[\\%_]/g, m => "\\" + m) + "%";
  },

  // -------------------------------------------------------------------
  // Choice per document (documents.json)
  // -------------------------------------------------------------------

  docKey(item) {
    return item ? item.libraryID + "/" + item.key : null;
  },

  explicitFor(item) {
    const entry = item && this.docs.get(this.docKey(item));
    return entry && this.Store.getProfile(entry.p) ? entry.p : null;
  },

  saveDocsSoon() {
    if (this._saveTimer) {
      return;
    }
    this._saveTimer = this.SB.setTimeout(() => this.saveDocs(), 500);
  },

  async saveDocs() {
    this._saveTimer = null;
    try {
      await this.Store.writeJSON(this.Store.join(this.Store.dir, "documents.json"), { version: 1, docs: Object.fromEntries(this.docs) });
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  /** Forget choices and rules that use a deleted profile. */
  forgetProfile(id) {
    let changed = false;
    for (const [key, v] of [...this.docs]) {
      if (v.p === id) {
        this.docs.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.saveDocsSoon();
    }
  },

  // -------------------------------------------------------------------
  // Collection rules
  // -------------------------------------------------------------------

  /** Rules in their order: { id, lib, key, profileId, sub }. */
  rules() {
    return this.Store.data.collectionRules || [];
  },

  collectionOf(rule) {
    try {
      return Zotero.Collections.getByLibraryAndKey(rule.lib, rule.key) || null;
    }
    catch (e) {
      return null;
    }
  },

  /** The profile of the first rule that matches one of the collections, or null. */
  ruleFor(collectionIDs) {
    const ids = new Set((collectionIDs || []).filter(Boolean));
    if (!ids.size) {
      return null;
    }
    for (const rule of this.rules()) {
      const coll = this.collectionOf(rule);
      if (!coll || !this.Store.getProfile(rule.profileId)) {
        continue;
      }
      const covered = [coll.id];
      if (rule.sub !== false) {
        try {
          for (const d of coll.getDescendents(false, "collection")) {
            covered.push(d.id);
          }
        }
        catch (e) {}
      }
      if (covered.some(id => ids.has(id))) {
        return rule.profileId;
      }
    }
    return null;
  },

  /** Collections that contain the file or its parent item. */
  async collectionsOf(item) {
    const ids = [item.id];
    if (item.parentItemID) {
      ids.push(item.parentItemID);
    }
    try {
      return (await Zotero.DB.columnQueryAsync("SELECT DISTINCT collectionID FROM collectionItems WHERE itemID IN ("
        + ids.map(() => "?").join(",") + ")", ids)) || [];
    }
    catch (e) {
      this.SB.logError(e);
      return [];
    }
  },

  selectedCollectionID() {
    try {
      const coll = Zotero.getMainWindow().ZoteroPane.getSelectedCollection();
      return coll ? coll.id : null;
    }
    catch (e) {
      return null;
    }
  },

  // -------------------------------------------------------------------
  // Choosing the profile of a document
  // -------------------------------------------------------------------

  /** Number of annotations per profile tag in a file: Map profile ID -> { n, last }. */
  async tagCounts(attachmentID) {
    const counts = new Map();
    try {
      const rows = await Zotero.DB.queryAsync(
        "SELECT T.name AS name, COUNT(*) AS n, MAX(I.dateModified) AS last FROM itemAnnotations IA "
        + "JOIN items I ON I.itemID = IA.itemID JOIN itemTags IT ON IT.itemID = IA.itemID JOIN tags T ON T.tagID = IT.tagID "
        + "WHERE IA.parentItemID = ? AND T.name LIKE ? ESCAPE '\\' "
        + "AND IA.itemID NOT IN (SELECT itemID FROM deletedItems) GROUP BY T.name",
        [attachmentID, this.likePattern()]);
      for (const r of rows || []) {
        const id = this.idForTag(r.name);
        if (!id) {
          continue;
        }
        const c = counts.get(id) || { n: 0, last: "" };
        c.n += r.n;
        c.last = r.last > c.last ? r.last : c.last;
        counts.set(id, c);
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
    return counts;
  },

  /** The profile with most annotations; on a tie the one used last. */
  majority(counts) {
    let best = null;
    for (const [id, c] of counts) {
      if (!best || c.n > best.n || (c.n === best.n && c.last > best.last)) {
        best = { id, n: c.n, last: c.last };
      }
    }
    return best ? best.id : null;
  },

  /**
   * Profile of a file: { id, source } with source "explicit", "annotations",
   * "rule" or "default". ctx: ID of the collection the file was opened from
   * (null: none, undefined: use the collections of the item).
   */
  async resolve(item, ctx) {
    const explicit = this.explicitFor(item);
    if (explicit) {
      return { id: explicit, source: "explicit" };
    }
    const byTags = this.majority(await this.tagCounts(item.id));
    if (byTags) {
      return { id: byTags, source: "annotations" };
    }
    const collections = ctx ? [ctx] : await this.collectionsOf(item);
    const byRule = this.ruleFor(collections);
    if (byRule) {
      return { id: byRule, source: "rule" };
    }
    return { id: this.defaultId(), source: "default" };
  },

  readerItem(reader) {
    try {
      return Zotero.Items.get(reader.itemID) || null;
    }
    catch (e) {
      return null;
    }
  },

  /**
   * Profile ID of a reader. The first call starts the choice; until it is
   * finished, a choice by hand or the default profile applies.
   */
  forReader(reader) {
    if (!reader || !this.enabled()) {
      return this.defaultId();
    }
    let entry = this._readers.get(reader);
    if (!entry) {
      const item = this.readerItem(reader);
      const explicit = this.explicitFor(item);
      entry = {
        id: explicit || this.defaultId(),
        source: explicit ? "explicit" : "pending",
        // Restored tabs were not opened from the collection selected now
        ctx: this._restored.has(reader) ? null : this.selectedCollectionID(),
        token: 0,
      };
      this._readers.set(reader, entry);
      if (!explicit) {
        this.resolveReader(reader, entry);
      }
    }
    if (!this.Store.getProfile(entry.id)) {
      entry.id = this.defaultId();
      entry.source = "default";
    }
    this.wrap(reader);
    this.initFilter(reader, entry);
    return entry.id;
  },

  sourceForReader(reader) {
    if (!this.enabled()) {
      return "default";
    }
    this.forReader(reader);
    return this._readers.get(reader)?.source || "default";
  },

  async resolveReader(reader, entry) {
    const token = entry.token = ++this._token;
    const item = this.readerItem(reader);
    if (!item) {
      return;
    }
    let result;
    try {
      result = await this.resolve(item, entry.ctx || undefined);
    }
    catch (e) {
      this.SB.logError(e);
      result = { id: this.defaultId(), source: "default" };
    }
    if (entry.token !== token || entry.source === "explicit") {
      return; // chosen by hand in the meantime
    }
    const changed = entry.id !== result.id;
    entry.id = result.id;
    entry.source = result.source;
    if (changed) {
      this.updateFilter(reader);
      this.Store.emit("doc");
    }
  },

  profileForReader(reader) {
    return this.profile(this.forReader(reader));
  },

  /** Choose a profile in a document by hand; the choice is remembered. */
  async setForReader(reader, id) {
    if (!this.enabled()) {
      // Without “Profile per Document”, one profile applies to all documents
      await this.Store.setDefault(this.valid(id));
      return;
    }
    const item = this.readerItem(reader);
    id = this.valid(id);
    const entry = this._readers.get(reader) || { ctx: null, token: 0 };
    entry.id = id;
    entry.source = "explicit";
    entry.token = ++this._token;
    this._readers.set(reader, entry);
    if (item) {
      this.docs.set(this.docKey(item), { p: id, t: new Date().toISOString() });
      this._files.delete(item.id);
      this.saveDocsSoon();
    }
    this.updateFilter(reader);
    this.Store.emit("doc");
  },

  /** Choose a profile for files from the library (item pane section). */
  async setForFiles(ids, id) {
    if (!this.enabled()) {
      await this.Store.setDefault(this.valid(id));
      return;
    }
    id = this.valid(id);
    for (const item of Zotero.Items.get(ids).filter(Boolean)) {
      this.docs.set(this.docKey(item), { p: id, t: new Date().toISOString() });
      this._files.delete(item.id);
      for (const reader of this.openReaders()) {
        if (reader.itemID === item.id) {
          const entry = this._readers.get(reader);
          if (entry) {
            entry.id = id;
            entry.source = "explicit";
            entry.token = ++this._token;
            this.updateFilter(reader);
          }
        }
      }
    }
    this.saveDocsSoon();
    this.Store.emit("doc");
  },

  /**
   * Profile of a file in the library, chosen with the collection selected
   * there. A stale entry keeps its profile until the new choice is known,
   * so the section does not flicker.
   */
  forFile(attachmentID) {
    if (!this.enabled()) {
      return this.defaultId();
    }
    let entry = this._files.get(attachmentID);
    if (!entry || entry.stale) {
      const item = Zotero.Items.get(attachmentID);
      const explicit = this.explicitFor(item);
      if (!entry) {
        entry = { id: explicit || this.defaultId(), source: explicit ? "explicit" : "pending", token: 0 };
        this._files.set(attachmentID, entry);
      }
      entry.stale = false;
      if (explicit) {
        entry.id = explicit;
        entry.source = "explicit";
      }
      else if (item) {
        const token = entry.token = ++this._token;
        this.resolve(item, this.selectedCollectionID() || undefined).then((result) => {
          if (entry.token === token && this._files.get(attachmentID) === entry) {
            const changed = entry.id !== result.id;
            Object.assign(entry, result);
            if (changed) {
              this.Store.emit("doc");
            }
          }
        }).catch(e => this.SB.logError(e));
      }
    }
    return this.valid(entry.id);
  },

  /** Choose the profiles of files in the library again when they are next needed. */
  invalidateFiles() {
    for (const entry of this._files.values()) {
      entry.stale = true;
    }
  },

  /** Reader of the selected tab, or null. */
  currentReader() {
    try {
      const tabs = Zotero.getMainWindow().Zotero_Tabs;
      if (tabs && String(tabs.selectedType || "").startsWith("reader")) {
        return Zotero.Reader.getByTabID(tabs.selectedID) || null;
      }
    }
    catch (e) {}
    return null;
  },

  /** Profile of the document in the selected tab, else the default profile. */
  currentId() {
    const reader = this.currentReader();
    return reader ? this.forReader(reader) : this.defaultId();
  },

  /** Choose again where the choice depends on rules, annotations or the default profile. */
  onStoreChange(what) {
    if (what === "settings") {
      this.sync();
    }
    if (!this.enabled()) {
      return;
    }
    if (what !== "active" && what !== "profiles" && what !== "rules" && what !== "settings") {
      return;
    }
    this.reresolve();
  },

  /** Choose the profiles of open documents again (except choices by hand), e.g. after tags were assigned. */
  reresolve() {
    if (!this.enabled()) {
      return;
    }
    this.invalidateFiles();
    for (const reader of this.openReaders()) {
      const entry = this._readers.get(reader);
      if (!entry) {
        continue;
      }
      if (entry.source === "explicit" && this.Store.getProfile(entry.id)) {
        continue;
      }
      entry.source = "pending";
      this.resolveReader(reader, entry);
    }
  },

  // -------------------------------------------------------------------
  // Annotations of a document by profile
  // -------------------------------------------------------------------

  /** Annotations of a reader (its own list, changes without delay). */
  readerAnnotations(reader) {
    try {
      return Array.from(BetterAnnotations.readerState(reader)?.annotations || []);
    }
    catch (e) {
      return [];
    }
  },

  /** Profile of an annotation from the reader: its tag, else the profile of the document. */
  ofReaderAnnotation(a, docId) {
    if (!this.enabled()) {
      return docId;
    }
    let tags = [];
    try {
      tags = Array.from(a.tags || []);
    }
    catch (e) {}
    return this.idForTags(tags) || docId;
  },

  /** Profile of an annotation item: its tag, else the given profile of the document. */
  ofItem(item, docId) {
    if (!this.enabled()) {
      return docId;
    }
    let tags = [];
    try {
      tags = item.getTags().map(t => t.tag);
    }
    catch (e) {}
    return this.idForTags(tags) || docId;
  },

  /**
   * Annotations of a document by profile. list: [{ color, profile }]
   * Returns { byProfile: Map id -> n, colors: Map id -> Map color -> n }.
   */
  summarize(list) {
    const byProfile = new Map();
    const colors = new Map();
    for (const a of list) {
      byProfile.set(a.profile, (byProfile.get(a.profile) || 0) + 1);
      if (!colors.has(a.profile)) {
        colors.set(a.profile, new Map());
      }
      const m = colors.get(a.profile);
      if (a.color) {
        m.set(a.color, (m.get(a.color) || 0) + 1);
      }
    }
    return { byProfile, colors };
  },

  /** Annotations of a reader as { color, profile }. */
  readerList(reader) {
    const docId = this.forReader(reader);
    return this.readerAnnotations(reader).map(a => ({
      color: this.SB.normalize(a.color),
      profile: this.ofReaderAnnotation(a, docId),
    }));
  },

  /** Annotations of files in the library as { color, profile }. */
  fileList(attachmentIDs) {
    const out = [];
    for (const att of Zotero.Items.get(attachmentIDs || []).filter(Boolean)) {
      const docId = this.forFile(att.id);
      let annotations = [];
      try {
        annotations = att.getAnnotations();
      }
      catch (e) {
        this.SB.logError(e);
      }
      for (const a of annotations) {
        out.push({ color: this.SB.normalize(a.annotationColor), profile: this.ofItem(a, docId) });
      }
    }
    return out;
  },

  /**
   * Profiles of a document that use the same color: [[nameA, nameB], …]
   * Only profiles that have annotations in the document count.
   */
  sharedColors(summary) {
    const ids = [...summary.byProfile.keys()];
    const pairs = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this.Store.getProfile(ids[i]);
        const b = this.Store.getProfile(ids[j]);
        if (!a || !b) {
          continue;
        }
        const colorsA = new Set(a.colors.map(c => c.color));
        if (b.colors.some(c => colorsA.has(c.color))) {
          pairs.push([a.name, b.name]);
        }
      }
    }
    return pairs;
  },

  /** Text of the notice about shared colors, or "". */
  sharedColorsText(summary) {
    if (!this.enabled()) {
      return "";
    }
    const pairs = this.sharedColors(summary);
    if (!pairs.length) {
      return "";
    }
    const names = [...new Set(pairs.flat())];
    return this.SB.S("sharedColorsHint", { profiles: this.SB.listText(names) });
  },

  /**
   * Entries for a profile menu, always in the order of the profiles: each
   * with its number of annotations in the document (0 without the function).
   */
  menuEntries(summary) {
    const enabled = this.enabled();
    return this.Store.listForMenu().map(p => Object.assign({}, p, { n: enabled ? summary.byProfile.get(p.id) || 0 : 0 }));
  },


  // -------------------------------------------------------------------
  // Profile tag for new annotations
  // -------------------------------------------------------------------

  tagsEnabled() {
    return this.enabled();
  },

  /**
   * Wrap addAnnotation of the reader's annotation manager: the tag of the
   * active profile is added before the reader saves the new annotation.
   * Internal API: check after Zotero updates. Without it, onItems() adds
   * the tag afterwards.
   *
   * The wrapper does as little as possible while the reader is adding the
   * annotation: it reads the profile from the cache and adds the tag.
   * Everything else (tag color, filter) runs afterwards. The reader's own
   * function is kept on the manager (__bacOriginal), so a wrapper is never
   * wrapped again, not even one left by an earlier version of the plugin.
   */
  wrap(reader) {
    try {
      const win = reader._iframeWindow;
      const manager = reader._internalReader && reader._internalReader._annotationManager;
      if (!win || !manager || typeof manager.addAnnotation !== "function") {
        return;
      }
      const known = this._wrapped.get(reader);
      if (known && known.manager === manager && manager.__bacWrapToken === known.token) {
        return;
      }
      const original = typeof manager.__bacOriginal === "function" ? manager.__bacOriginal : manager.addAnnotation;
      const self = this;
      const wrapped = Components.utils.exportFunction(function (annotation) {
        self.tagIncoming(reader, annotation);
        return original.call(manager, annotation);
      }, win);
      const token = "w" + (++this._token);
      manager.__bacOriginal = original;
      manager.addAnnotation = wrapped;
      manager.__bacWrapToken = token;
      this._wrapped.set(reader, { manager, original, token });
    }
    catch (e) {
      this.SB.log("could not wrap addAnnotation: " + e);
    }
  },

  unwrap(reader) {
    const w = this._wrapped.get(reader);
    this._wrapped.delete(reader);
    if (!w) {
      return;
    }
    try {
      if (w.manager.__bacWrapToken === w.token) {
        w.manager.addAnnotation = w.manager.__bacOriginal || w.original;
        delete w.manager.__bacOriginal;
        delete w.manager.__bacWrapToken;
      }
    }
    catch (e) {}
  },

  /** The reader's own addAnnotation, without the wrapper. */
  originalAdd(reader) {
    const manager = reader._internalReader && reader._internalReader._annotationManager;
    if (!manager) {
      return null;
    }
    const fn = typeof manager.__bacOriginal === "function" ? manager.__bacOriginal : manager.addAnnotation;
    return typeof fn === "function" ? { manager, fn } : null;
  },

  /** Profile of a reader from the cache, without starting anything (safe inside the reader's calls). */
  cachedId(reader) {
    if (!this.enabled()) {
      return this.defaultId();
    }
    const entry = this._readers.get(reader);
    return entry && this.Store.getProfile(entry.id) ? entry.id : this.defaultId();
  },

  /**
   * Tags of a new annotation: without other profile tags, with the tag of the
   * reader's profile. The tag carries its color, as Zotero passes it to the
   * reader, so the sidebar shows it colored right away.
   */
  tagsForNew(reader, tags) {
    const tag = this.tagFor(this.cachedId(reader));
    const list = Array.from(tags || []).map((t) => {
      const o = { name: String(t.name) };
      if (t.color) {
        o.color = String(t.color);
      }
      return o;
    }).filter(t => !this.isProfileTag(t.name));
    if (tag) {
      const o = { name: tag };
      const color = this.colorForNew(reader, tag);
      if (color) {
        o.color = color;
      }
      // Colored tags first, as in Zotero
      if (color) {
        list.unshift(o);
      }
      else {
        list.push(o);
      }
      this.colorLater(reader, tag);
    }
    return list;
  },

  /** Color the tag has in Zotero, or will get (brand color, if a slot is free). */
  colorForNew(reader, tag) {
    try {
      const libraryID = this.readerItem(reader)?.libraryID;
      if (!libraryID) {
        return null;
      }
      const colors = Zotero.Tags.getColors(libraryID);
      if (colors.has(tag)) {
        return colors.get(tag).color;
      }
      if (this.SB.setting("profileTagColor") !== false && colors.size < (Zotero.Tags.MAX_COLORED_TAGS || 9)) {
        return this.TAG_COLOR;
      }
    }
    catch (e) {}
    return null;
  },

  /** Called by the wrapper for annotations the reader creates itself. */
  tagIncoming(reader, annotation) {
    if (this._tagging || !this.tagsEnabled()) {
      return;
    }
    this._tagging = true;
    try {
      const raw = Components.utils.waiveXrays(annotation);
      if (!raw || typeof raw !== "object") {
        return;
      }
      raw.tags = Components.utils.cloneInto(this.tagsForNew(reader, raw.tags), reader._iframeWindow);
    }
    catch (e) {
      this.SB.logError(e);
    }
    finally {
      this._tagging = false;
    }
  },

  /**
   * Create an annotation from the plugin (colors that are not Zotero's own):
   * the tag is added here and the reader's own function is called directly,
   * not through the wrapper.
   */
  addAnnotation(reader, payload) {
    const target = this.originalAdd(reader);
    if (!target) {
      throw new Error("_internalReader._annotationManager missing");
    }
    const data = Object.assign({}, payload);
    if (this.tagsEnabled()) {
      data.tags = this.tagsForNew(reader, data.tags);
    }
    return target.fn.call(target.manager, Components.utils.cloneInto(data, reader._iframeWindow));
  },

  /** Give the tag its color after the reader has saved the annotation. */
  colorLater(reader, tag) {
    let libraryID = null;
    try {
      libraryID = this.readerItem(reader)?.libraryID;
    }
    catch (e) {}
    if (libraryID === null || libraryID === undefined) {
      return;
    }
    this.SB.setTimeout(() => {
      this.ensureTagColor(libraryID, tag).catch(e => this.SB.logError(e));
    }, 1500);
  },

  // -------------------------------------------------------------------
  // Color of profile tags in Zotero (tag selector, reader sidebar)
  // -------------------------------------------------------------------

  /**
   * Give a profile tag the brand color in a library. Zotero allows 9 colored
   * tags; if they are used up, the tag stays without color (one notice).
   * The color is added at the end, so the user's shortcuts 1–9 keep their tags.
   */
  async ensureTagColor(libraryID, tag) {
    if (!tag || this.SB.setting("profileTagColor") === false) {
      return;
    }
    this._colored = this._colored || new Set();
    const key = libraryID + "/" + tag;
    if (this._colored.has(key)) {
      return;
    }
    this._colored.add(key);
    try {
      const lib = Zotero.Libraries.get(libraryID);
      if (!lib || lib.editable === false) {
        return;
      }
      const colors = Zotero.Tags.getColors(libraryID);
      if (colors.has(tag)) {
        return;
      }
      if (colors.size >= (Zotero.Tags.MAX_COLORED_TAGS || 9)) {
        if (!this._colorNotice) {
          this._colorNotice = true;
          this.SB.notify(this.SB.S("tagColorFull"));
        }
        return;
      }
      await Zotero.Tags.setColor(libraryID, tag, this.TAG_COLOR);
      await this.refreshReaderTags(libraryID, tag);
    }
    catch (e) {
      this._colored.delete(key);
      this.SB.logError(e);
    }
  },

  /**
   * Zotero gives the reader the tag colors only when it loads annotations.
   * After a tag got its color, open readers load the annotations that show
   * the tag without color again.
   */
  async refreshReaderTags(libraryID, tag) {
    for (const reader of this.openReaders()) {
      try {
        const item = this.readerItem(reader);
        if (!item || item.libraryID !== libraryID || typeof reader.setAnnotations !== "function") {
          continue;
        }
        const keys = this.readerAnnotations(reader)
          .filter(a => Array.from(a.tags || []).some(t => String(t.name) === tag && !t.color))
          .map(a => String(a.id));
        if (!keys.length) {
          continue;
        }
        const items = keys.map(k => Zotero.Items.getByLibraryAndKey(libraryID, k)).filter(Boolean);
        if (items.length) {
          await reader.setAnnotations(items);
        }
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  /** Libraries and names of all profile tags in use: [{ l, name }]. */
  async tagsInUse() {
    try {
      return (await Zotero.DB.queryAsync(
        "SELECT DISTINCT I.libraryID AS l, T.name AS name FROM itemAnnotations IA JOIN items I ON I.itemID = IA.itemID "
        + "JOIN itemTags IT ON IT.itemID = IA.itemID JOIN tags T ON T.tagID = IT.tagID WHERE T.name LIKE ? ESCAPE '\\'",
        [this.likePattern()])) || [];
    }
    catch (e) {
      this.SB.logError(e);
      return [];
    }
  },

  /**
   * Bring the colors in line with the tags in use: profile tags in use get
   * the color, colors of profile tags no longer in use are removed (after
   * renaming, deleting, undoing). Only tags in the brand color are removed.
   */
  async syncTagColors() {
    const inUse = await this.tagsInUse();
    const used = new Set(inUse.map(r => r.l + "/" + r.name));
    let libraries = [];
    try {
      libraries = Zotero.Libraries.getAll();
    }
    catch (e) {}
    for (const lib of libraries) {
      try {
        if (lib.editable === false) {
          continue;
        }
        for (const [name, c] of [...Zotero.Tags.getColors(lib.libraryID)]) {
          const stale = this.isProfileTag(name) && String(c.color).toUpperCase() === this.TAG_COLOR
            && (!used.has(lib.libraryID + "/" + name) || !this.idForTag(name) || this.SB.setting("profileTagColor") === false);
          if (stale) {
            await Zotero.Tags.setColor(lib.libraryID, name, false);
          }
        }
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
    this._colored = new Set();
    if (this.SB.setting("profileTagColor") !== false) {
      for (const r of inUse) {
        if (this.idForTag(r.name)) {
          await this.ensureTagColor(r.l, r.name);
        }
      }
    }
  },

  // -------------------------------------------------------------------
  // “Only this profile”: Zotero's tag filter of the reader. It hides the
  // other annotations in the sidebar and in the document.
  // -------------------------------------------------------------------

  filterTags(reader) {
    try {
      const filter = this.SB.readerState(reader)?.filter;
      return Array.from(filter?.tags || []).map(String);
    }
    catch (e) {
      return [];
    }
  },

  /** Is the reader filtered to the profile of its document? */
  filterActive(reader) {
    if (!this.enabled() || !reader) {
      return false;
    }
    const tags = this.filterTags(reader);
    return tags.length === 1 && this.isProfileTag(tags[0]);
  },

  setReaderFilter(reader, tags) {
    const internal = reader._internalReader;
    if (!internal || typeof internal.setFilter !== "function") {
      throw new Error("setFilter not available");
    }
    internal.setFilter(Components.utils.cloneInto({ tags }, reader._iframeWindow));
  },

  /** Turn “only this profile” on or off; the user's own tag filter comes back afterwards. */
  setFilter(reader, on) {
    try {
      this._filterBefore = this._filterBefore || new WeakMap();
      if (on) {
        const tag = this.tagFor(this.forReader(reader));
        if (!tag) {
          return;
        }
        if (!this.filterActive(reader)) {
          this._filterBefore.set(reader, this.filterTags(reader));
        }
        this.setReaderFilter(reader, [tag]);
      }
      else if (this.filterActive(reader) || this._filterBefore.has(reader)) {
        this.setReaderFilter(reader, this._filterBefore.get(reader) || []);
        this._filterBefore.delete(reader);
      }
      this.Store.emit("doc");
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  toggleFilter(reader) {
    this.setFilter(reader, !this.filterActive(reader));
  },

  /** After a change of profile: the filter follows the new profile. */
  updateFilter(reader) {
    if (this.filterActive(reader)) {
      try {
        this.setReaderFilter(reader, [this.tagFor(this.forReader(reader))]);
      }
      catch (e) {
        this.SB.logError(e);
      }
    }
  },

  /** Option “show only the document's profile when opening”: once per reader, after its annotations are loaded. */
  initFilter(reader, entry) {
    if (entry.filterInit || this.SB.setting("profileFilterDefault") !== true) {
      return;
    }
    const state = this.SB.readerState(reader);
    if (!state || !state.annotations || entry.source === "pending") {
      return;
    }
    entry.filterInit = true;
    // Not inside a call of the reader (forReader can run during one)
    this.SB.setTimeout(() => this.setFilter(reader, true), 0);
  },

  /** Annotations of a reader without a profile tag. */
  untaggedCount(reader) {
    if (!this.enabled()) {
      return 0;
    }
    let n = 0;
    for (const a of this.readerAnnotations(reader)) {
      let tags = [];
      try {
        tags = Array.from(a.tags || []);
      }
      catch (e) {}
      if (!this.idForTags(tags)) {
        n++;
      }
    }
    return n;
  },

  /**
   * Fallback: new annotations saved by an open reader (notifier data with
   * the reader's instance ID) get the tag afterwards if they have none.
   */
  onItems(event, ids, extra) {
    if (event === "add" || event === "modify" || event === "delete" || event === "trash") {
      this.invalidateFiles();
    }
    if (event !== "add" || !this.tagsEnabled()) {
      return;
    }
    const readers = this.openReaders();
    for (const id of ids) {
      const instanceID = extra && extra[id] && extra[id].instanceID;
      if (!instanceID) {
        continue; // not created in a reader on this computer (sync, import)
      }
      const reader = readers.find(r => r._instanceID === instanceID);
      if (!reader) {
        continue;
      }
      this.tagLater(reader, id);
    }
  },

  async tagLater(reader, itemID) {
    try {
      const item = Zotero.Items.get(itemID);
      if (!item || !item.isAnnotation() || item.annotationIsExternal || !item.isEditable()) {
        return;
      }
      if (item.getTags().some(t => this.isProfileTag(t.tag))) {
        return;
      }
      const tag = this.tagFor(this.forReader(reader));
      if (tag) {
        item.addTag(tag, 0);
        await item.saveTx();
      }
    }
    catch (e) {
      this.SB.logError(e);
    }
  },

  // -------------------------------------------------------------------
  // Whole library: profile of each annotation (export, recolor, tags)
  // -------------------------------------------------------------------

  /**
   * Returns an object with of(row): profile ID of an annotation from
   * Library.index(): its tag, else the profile of its document (choice by
   * hand, annotations, collection rule of its collections, default).
   */
  async resolver() {
    const SB = this.SB;
    const prefix = this.prefix();
    const tagged = new Map(); // annotation ID -> profile ID
    const perFile = new Map(); // attachment ID -> Map profile ID -> { n, last }
    try {
      const rows = await Zotero.DB.queryAsync(
        "SELECT IA.itemID AS id, IA.parentItemID AS att, T.name AS name, I.dateModified AS last FROM itemAnnotations IA "
        + "JOIN items I ON I.itemID = IA.itemID JOIN itemTags IT ON IT.itemID = IA.itemID JOIN tags T ON T.tagID = IT.tagID "
        + "WHERE T.name LIKE ? ESCAPE '\\' AND IA.itemID NOT IN (SELECT itemID FROM deletedItems)", [this.likePattern(prefix)]);
      for (const r of rows || []) {
        const pid = this.idForTag(r.name, prefix);
        if (!pid || tagged.has(r.id)) {
          continue;
        }
        tagged.set(r.id, pid);
        if (!perFile.has(r.att)) {
          perFile.set(r.att, new Map());
        }
        const m = perFile.get(r.att);
        const c = m.get(pid) || { n: 0, last: "" };
        c.n++;
        c.last = r.last > c.last ? r.last : c.last;
        m.set(pid, c);
      }
    }
    catch (e) {
      SB.logError(e);
    }
    // Choices by hand: attachment ID -> profile ID
    const explicit = new Map();
    for (const [key, v] of this.docs) {
      const i = key.indexOf("/");
      try {
        const id = Zotero.Items.getIDFromLibraryAndKey(+key.slice(0, i), key.slice(i + 1));
        if (id && this.Store.getProfile(v.p)) {
          explicit.set(id, v.p);
        }
      }
      catch (e) {}
    }
    // Collections of all items, only if there are rules
    const itemCollections = new Map();
    if (this.rules().length) {
      try {
        for (const r of (await Zotero.DB.queryAsync("SELECT itemID, collectionID FROM collectionItems")) || []) {
          if (!itemCollections.has(r.itemID)) {
            itemCollections.set(r.itemID, []);
          }
          itemCollections.get(r.itemID).push(r.collectionID);
        }
      }
      catch (e) {
        SB.logError(e);
      }
    }
    const fallback = this.defaultId();
    const files = new Map();
    const fileProfile = (att, top) => {
      if (files.has(att)) {
        return files.get(att);
      }
      let id = explicit.get(att) || null;
      if (!id && perFile.has(att)) {
        id = this.majority(perFile.get(att));
      }
      if (!id && itemCollections.size) {
        id = this.ruleFor([...(itemCollections.get(att) || []), ...(itemCollections.get(top) || [])]);
      }
      id = id || fallback;
      files.set(att, id);
      return id;
    };
    return {
      tagged,
      fileProfile,
      of: this.enabled() ? (r => tagged.get(r.id) || fileProfile(r.att, r.top)) : (() => fallback),
    };
  },
};
