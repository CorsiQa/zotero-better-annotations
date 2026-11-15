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
 * Profile tags: if turned on, every new annotation gets the tag
 * "<prefix><profile name>", e.g. “Profile: Reading”. The tag is added in the
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
  _wrapped: new Map(), // reader -> original addAnnotation
  _observerID: null,
  _saveTimer: null,
  _token: 0,

  get SB() {
    return BetterAnnotations;
  },

  get Store() {
    return BetterAnnotations.Store;
  },

  async init() {
    const Store = this.Store;
    const { data } = await Store.readJSON(Store.join(Store.dir, "documents.json"));
    this.docs = new Map(Object.entries(data?.docs || {}).filter(([, v]) => v && typeof v.p === "string"));
    // The prefix is fixed in the language of the first start, so that a later
    // change of language does not leave the existing tags behind
    if (typeof Store.data.settings.profileTagPrefix !== "string") {
      await Store.setSetting("profileTagPrefix", this.SB.S("profileTagPrefixDefault"));
    }
    for (const reader of this.openReaders()) {
      this._restored.add(reader);
    }
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
    this._unlisten = Store.onChange(what => this.onStoreChange(what));
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
    const p = this.SB.setting("profileTagPrefix");
    return typeof p === "string" ? p : this.SB.S("profileTagPrefixDefault");
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
    if (!reader) {
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
    return entry.id;
  },

  sourceForReader(reader) {
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
      this.Store.emit("doc");
    }
  },

  profileForReader(reader) {
    return this.profile(this.forReader(reader));
  },

  /** Choose a profile in a document by hand; the choice is remembered. */
  async setForReader(reader, id) {
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
    this.Store.emit("doc");
  },

  /** Choose a profile for files from the library (item pane section). */
  async setForFiles(ids, id) {
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
    if (what !== "active" && what !== "profiles" && what !== "rules" && what !== "settings") {
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
      return Array.from(reader._state?.annotations || []);
    }
    catch (e) {
      return [];
    }
  },

  /** Profile of an annotation from the reader: its tag, else the profile of the document. */
  ofReaderAnnotation(a, docId) {
    let tags = [];
    try {
      tags = Array.from(a.tags || []);
    }
    catch (e) {}
    return this.idForTags(tags) || docId;
  },

  /** Profile of an annotation item: its tag, else the given profile of the document. */
  ofItem(item, docId) {
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
    const pairs = this.sharedColors(summary);
    if (!pairs.length) {
      return "";
    }
    const names = [...new Set(pairs.flat())];
    return this.SB.S("sharedColorsHint", { profiles: names.join(", ") });
  },

  /**
   * Entries for a profile menu: profiles with annotations in the document
   * (with their number), then the other profiles.
   */
  menuGroups(summary) {
    const all = this.Store.listForMenu();
    const inDoc = all.filter(p => summary.byProfile.get(p.id)).map(p => Object.assign({}, p, { n: summary.byProfile.get(p.id) }));
    const others = all.filter(p => !summary.byProfile.get(p.id));
    return { inDoc, others };
  },

  // -------------------------------------------------------------------
  // Profile tag for new annotations
  // -------------------------------------------------------------------

  tagsEnabled() {
    return this.SB.setting("profileTagsEnabled") === true;
  },

  /**
   * Wrap addAnnotation of the reader's annotation manager: the tag of the
   * active profile is added before the reader saves the new annotation.
   * Internal API: check after Zotero updates. Without it, onItems() adds
   * the tag afterwards.
   */
  wrap(reader) {
    try {
      const win = reader._iframeWindow;
      const manager = reader._internalReader && reader._internalReader._annotationManager;
      if (!win || !manager || typeof manager.addAnnotation !== "function") {
        return;
      }
      const known = this._wrapped.get(reader);
      if (known && manager.__bacWrapToken === known.token) {
        return;
      }
      const original = manager.addAnnotation;
      const self = this;
      const wrapped = Components.utils.exportFunction(function (annotation) {
        try {
          self.addTagToNew(reader, annotation);
        }
        catch (e) {
          self.SB.logError(e);
        }
        return original.call(manager, annotation);
      }, win);
      const token = "w" + (++this._token);
      manager.addAnnotation = wrapped;
      manager.__bacWrapToken = token;
      this._wrapped.set(reader, { manager, original, wrapped, token });
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
        w.manager.addAnnotation = w.original;
        delete w.manager.__bacWrapToken;
      }
    }
    catch (e) {}
  },

  addTagToNew(reader, annotation) {
    if (!this.tagsEnabled()) {
      return;
    }
    const tag = this.tagFor(this.forReader(reader));
    if (!tag) {
      return;
    }
    const raw = Components.utils.waiveXrays(annotation);
    const tags = Array.from(raw.tags || []).map(t => ({ name: String(t.name) })).filter(t => !this.isProfileTag(t.name));
    tags.push({ name: tag });
    raw.tags = Components.utils.cloneInto(tags, reader._iframeWindow);
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
      of: r => tagged.get(r.id) || fileProfile(r.att, r.top),
    };
  },
};
