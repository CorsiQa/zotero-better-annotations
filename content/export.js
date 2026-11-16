/* Better Annotations – export of annotations
 *
 * Exports the annotations of an area (document, selection, collection,
 * library) as a table:
 * one row per annotation with color, label, text, comment, tags,
 * page and source.
 *
 * Formats:
 *  - Excel (.xlsx): colored cells, images of image and ink annotations,
 *    links back to Zotero, extra sheets “Labels” and “Info”
 *  - CSV (.csv): for R, Python, SPSS etc. (UTF-8, comma)
 *  - HTML (.html): readable report with embedded images, printable
 *
 * The XLSX file is written without third-party libraries (Office Open XML in
 * an uncompressed ZIP archive).
 */

/* global Zotero, BetterAnnotations, IOUtils */

BetterAnnotations.Export = {
  get SB() {
    return BetterAnnotations;
  },

  // -------------------------------------------------------------------
  // Collect data
  // -------------------------------------------------------------------

  IO() {
    if (typeof IOUtils !== "undefined") {
      return IOUtils;
    }
    return Zotero.getMainWindow().IOUtils;
  },

  /**
   * Annotations of an area as rows.
   * options: { labeledOnly, images, sort: "doc" | "label", only }
   * Labels come from the profile of each annotation (its tag, else the profile
   * of its document); only: export only annotations of this profile ID.
   */
  async collect(scope, options = {}) {
    const SB = this.SB;
    const Library = SB.Library;
    const match = await Library.scopeFilter(scope);
    const resolver = await SB.Profiles.resolver();
    const index = (await Library.index()).filter(r => !r.del && match(r) && (!options.only || resolver.of(r) === options.only));
    const profileOf = new Map(index.map(r => [r.id, resolver.of(r)]));
    SB.log("export: " + index.length + " annotations in the area");
    const items = await Library.loadItems(index.map(r => r.id));
    const profiles = this.profileTable();
    const docs = new Map();
    const rendered = new Set();
    const rows = [];
    let done = 0;
    for (const item of items) {
      // Let Zotero breathe: large exports must not block the window
      if (++done % 100 === 0) {
        if (options.onProgress) {
          options.onProgress(done, items.length);
        }
        await Zotero.Promise.delay(0);
        if (options.cancelled && options.cancelled()) {
          return [];
        }
      }
      if (!item || !item.isAnnotation || !item.isAnnotation()) {
        continue;
      }
      const color = SB.normalize(item.annotationColor) || "";
      const pid = profileOf.get(item.id) || SB.Profiles.defaultId();
      const p = profiles.get(pid);
      const entry = p.profile.colors.find(c => c.color === color);
      const shown = entry && SB.isVisible(entry);
      const label = shown && entry.label.trim() ? entry.label.trim() : "";
      if (options.labeledOnly && !label) {
        continue;
      }
      const doc = this.docInfo(item.parentItemID, docs);
      const type = item.annotationType || "highlight";
      const row = {
        color,
        label,
        profileId: pid,
        profile: p.profile.name,
        profileOrder: p.order,
        description: label && SB.descriptionsOn() ? SB.cleanDescription(entry.description) : "",
        labelOrder: label ? p.profile.colors.indexOf(entry) : 9999,
        type,
        text: item.annotationText || "",
        comment: item.annotationComment || "",
        tags: this.safe(() => item.getTags().map(t => t.tag).sort((a, b) => a.localeCompare(b)), []),
        page: item.annotationPageLabel || "",
        sortIndex: item.annotationSortIndex || "",
        created: this.localDate(item.dateAdded),
        modified: this.localDate(item.dateModified),
        author: this.safe(() => item.annotationAuthorName
          || (item.createdByUserID ? Zotero.Users.getName(item.createdByUserID) : ""), ""),
        link: this.link(item, doc),
        doc,
        image: null,
      };
      if (options.images && (type === "image" || type === "ink")) {
        row.image = await this.image(item, rendered, options);
      }
      rows.push(row);
    }
    const byDoc = (a, b) => a.doc.sortKey.localeCompare(b.doc.sortKey) || String(a.sortIndex).localeCompare(String(b.sortIndex));
    rows.sort(options.sort === "label"
      ? (a, b) => a.profileOrder - b.profileOrder || a.labelOrder - b.labelOrder || a.color.localeCompare(b.color) || byDoc(a, b)
      : byDoc);
    rows.forEach((r, i) => {
      r.no = i + 1;
    });
    return rows;
  },

  /** All profiles with their order in menus: Map ID -> { profile, order }. */
  profileTable() {
    const SB = this.SB;
    const map = new Map();
    SB.Store.listForMenu().forEach((p, i) => map.set(p.id, { profile: SB.Profiles.profile(p.id), order: i }));
    return {
      get: id => map.get(id) || map.get(SB.Profiles.defaultId()) || { profile: SB.Store.plusPreset(), order: 0 },
    };
  },

  /** Number of annotations that collect() would export (without loading images). */
  async count(scope, options = {}) {
    const SB = this.SB;
    const match = await SB.Library.scopeFilter(scope);
    const resolver = await SB.Profiles.resolver();
    const profiles = this.profileTable();
    let n = 0;
    for (const r of await SB.Library.index()) {
      if (r.del || !match(r)) {
        continue;
      }
      const pid = resolver.of(r);
      if (options.only && pid !== options.only) {
        continue;
      }
      if (options.labeledOnly) {
        const entry = profiles.get(pid).profile.colors.find(c => c.color === r.c);
        if (!entry || !SB.isVisible(entry) || !entry.label.trim()) {
          continue;
        }
      }
      n++;
    }
    return n;
  },

  /** Names of the profiles in the rows, for the info sheet. */
  profileNames(rows) {
    const names = [];
    for (const r of [...rows].sort((a, b) => a.profileOrder - b.profileOrder)) {
      if (!names.includes(r.profile)) {
        names.push(r.profile);
      }
    }
    return names.join(", ");
  },

  safe(fn, fallback) {
    try {
      const v = fn();
      return v === undefined || v === null ? fallback : v;
    }
    catch (e) {
      return fallback;
    }
  },

  /** Zotero stores timestamps in UTC ("YYYY-MM-DD HH:MM:SS"). */
  localDate(sql) {
    if (!sql) {
      return "";
    }
    try {
      const d = Zotero.Date.sqlToDate(sql, true);
      const pad = n => String(n).padStart(2, "0");
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    catch (e) {
      return sql;
    }
  },

  /** Source information (parent item of the file), cached per file. */
  docInfo(attachmentID, cache) {
    if (cache.has(attachmentID)) {
      return cache.get(attachmentID);
    }
    const att = Zotero.Items.get(attachmentID);
    const top = att && att.parentItem ? att.parentItem : att;
    const field = (item, name) => this.safe(() => item.getField(name), "");
    const title = top ? (field(top, "title") || field(att, "title")) : "";
    let creators = [];
    try {
      const all = top.getCreators();
      const primary = Zotero.CreatorTypes.getPrimaryIDForType(top.itemTypeID);
      creators = all.filter(c => c.creatorTypeID === primary);
      if (!creators.length) {
        creators = all;
      }
    }
    catch (e) {}
    const names = creators.map(c => c.lastName || c.name || "").filter(Boolean);
    const full = creators.map(c => (c.fieldMode === 1 || !c.firstName ? (c.lastName || c.name) : c.lastName + ", " + c.firstName));
    let year = "";
    try {
      year = String(Zotero.Date.strToDate(field(top, "date")).year || "");
    }
    catch (e) {}
    let who = names[0] || "";
    if (names.length === 2) {
      who = names[0] + " & " + names[1];
    }
    else if (names.length > 2) {
      who = names[0] + " et al.";
    }
    const citation = who ? who + " (" + (year || "n.d.") + ")" : title;
    let collections = [];
    try {
      collections = (top || att).getCollections().map(id => Zotero.Collections.get(id)).filter(Boolean).map(c => c.name);
    }
    catch (e) {}
    const info = {
      title,
      authors: full.join("; "),
      year,
      citation,
      collections: collections.sort((a, b) => a.localeCompare(b)).join("; "),
      file: att ? (this.safe(() => att.attachmentFilename, "") || field(att, "title")) : "",
      attKey: att ? att.key : "",
      libraryID: att ? att.libraryID : null,
      sortKey: (citation + "\u0000" + title + "\u0000" + (att ? att.key : "")).toLowerCase(),
    };
    cache.set(attachmentID, info);
    return info;
  },

  /** Link that opens the annotation in Zotero. */
  link(item, doc) {
    if (!doc.attKey) {
      return "";
    }
    let base = "zotero://open-pdf/library/items/";
    try {
      const lib = Zotero.Libraries.get(item.libraryID);
      if (lib && lib.libraryType === "group") {
        base = "zotero://open-pdf/groups/" + lib.groupID + "/items/";
      }
    }
    catch (e) {}
    const params = [];
    if (item.annotationPageLabel) {
      params.push("page=" + encodeURIComponent(item.annotationPageLabel));
    }
    params.push("annotation=" + item.key);
    return base + doc.attKey + "?" + params.join("&");
  },

  /** Image of an image or ink annotation from Zotero's cache. */
  /** Rendering missing images is slow (whole PDF pages); at most this many files per export. */
  MAX_RENDERED_FILES: 25,

  async image(item, rendered, options = {}) {
    const IO = this.IO();
    let path = null;
    try {
      path = Zotero.Annotations.getCacheImagePath({ libraryID: item.libraryID, key: item.key });
    }
    catch (e) {
      return null;
    }
    try {
      if (!(await IO.exists(path)) && !rendered.has(item.parentItemID) && rendered.size < this.MAX_RENDERED_FILES
        && Zotero.PDFRenderer?.renderAttachmentAnnotations) {
        rendered.add(item.parentItemID);
        this.SB.log("export: rendering images of file " + item.parentItemID);
        await Zotero.PDFRenderer.renderAttachmentAnnotations(item.parentItemID);
      }
      if (!(await IO.exists(path))) {
        return null;
      }
      const bytes = await IO.read(path);
      const size = this.pngSize(bytes);
      return size ? { bytes, width: size.width, height: size.height } : null;
    }
    catch (e) {
      this.SB.logError(e);
      return null;
    }
  },

  pngSize(b) {
    if (!b || b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50) {
      return null;
    }
    const u32 = o => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
    return { width: u32(16), height: u32(20) };
  },

  /**
   * Summary per label for the “Labels” sheet: the labels of every profile
   * that occurs in the rows (or of `profile` if there are none).
   */
  codebook(rows, profile) {
    const SB = this.SB;
    const ids = [];
    for (const r of [...rows].sort((a, b) => a.profileOrder - b.profileOrder)) {
      if (r.profileId && !ids.includes(r.profileId)) {
        ids.push(r.profileId);
      }
    }
    const list = ids.length ? ids.map(id => SB.Profiles.profile(id)) : [profile || SB.Store.getActive()];
    const out = [];
    for (const p of list) {
      const counts = new Map();
      for (const r of rows) {
        if (!ids.length || r.profileId === p.id) {
          counts.set(r.color, (counts.get(r.color) || 0) + 1);
        }
      }
      for (const c of p.colors) {
        out.push({ profile: p.name, color: c.color, label: c.label.trim(), description: SB.cleanDescription(c.description),
          shown: SB.isVisible(c), n: counts.get(c.color) || 0 });
      }
      for (const [color, n] of counts) {
        if (!p.colors.some(c => c.color === color)) {
          out.push({ profile: p.name, color, label: "", description: "", shown: false, n });
        }
      }
    }
    out.multi = list.length > 1;
    return out;
  },

  // -------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------

  typeName(type) {
    return this.SB.S({
      highlight: "typeHighlight", underline: "typeUnderline", note: "typeNote",
      text: "typeText", image: "typeImage", ink: "typeInk",
    }[type] || "typeHighlight");
  },

  /** Image and ink annotations have no text: the extract is an image. */
  isImageType(type) {
    return type === "image" || type === "ink";
  },

  /**
   * Text of the “Extract” column. For image and ink annotations without an
   * embedded image (CSV, or images turned off) a placeholder such as “[Image]”.
   */
  extractText(r) {
    if (this.isImageType(r.type)) {
      return r.text || "[" + this.typeName(r.type) + "]";
    }
    return r.text;
  },

  /**
   * Columns of the annotation table. min and max limit the width in
   * characters; within these limits the width follows the heading and the
   * content (see fitWidths).
   *
   * Order: content first, then two groups that Excel can fold away:
   * “details” (description, tags, dates, creator) and “source” (title,
   * authors, year, collections, file). Visible columns sit between the groups
   * so that Excel keeps them apart.
   * options: { descriptions, xlsx } – in Excel the colored number replaces the
   * hex code; CSV keeps the hex code as the only color information.
   */
  columns(rows, options = {}) {
    const S = k => this.SB.S(k);
    const cols = [
      { key: "no", head: S("colNo"), min: options.xlsx ? 5 : 4, max: 8, get: r => r.no, num: true, colorCell: !!options.xlsx },
    ];
    if (!options.xlsx) {
      cols.push({ key: "color", head: S("colColor"), min: 9, max: 10, get: r => r.color });
    }
    cols.push(
      { key: "label", head: S("colLabel"), min: 10, max: 30, get: r => r.label, labelCell: true, wrap: true },
      { key: "type", head: S("colType"), min: 8, max: 16, get: r => this.typeName(r.type) },
      { key: "extract", head: S("colExtract"), min: 30, max: 70, get: r => this.extractText(r), wrap: true, extract: true },
      { key: "comment", head: S("colComment"), min: 16, max: 50, get: r => r.comment, wrap: true },
    );
    if (options.descriptions && this.SB.descriptionsOn()) {
      cols.push({ key: "description", head: S("colDescription"), min: 16, max: 50, get: r => r.description, wrap: true, group: "details" });
    }
    if (this.SB.Profiles.enabled()) {
      cols.push({ key: "profile", head: S("colProfile"), min: 8, max: 24, get: r => r.profile || "", wrap: true, group: "details" });
    }
    cols.push(
      { key: "tags", head: S("colTags"), min: 8, max: 30, get: r => r.tags.join("; "), wrap: true, group: "details" },
      { key: "created", head: S("colCreated"), min: 16, max: 18, get: r => r.created, group: "details" },
      { key: "modified", head: S("colModified"), min: 16, max: 18, get: r => r.modified, group: "details" },
    );
    if (rows.some(r => r.author)) {
      cols.push({ key: "author", head: S("colAuthor"), min: 10, max: 25, get: r => r.author, group: "details" });
    }
    cols.push(
      { key: "page", head: S("colPage"), min: 5, max: 10, get: r => r.page, num: r => /^\d{1,6}$/.test(r.page) },
      { key: "citation", head: S("colCitation"), min: 12, max: 30, get: r => r.doc.citation, wrap: true },
      { key: "title", head: S("colTitle"), min: 16, max: 50, get: r => r.doc.title, wrap: true, group: "source" },
      { key: "authors", head: S("colAuthors"), min: 12, max: 40, get: r => r.doc.authors, wrap: true, group: "source" },
      { key: "year", head: S("colYear"), min: 5, max: 8, get: r => r.doc.year, group: "source" },
      { key: "collections", head: S("colCollections"), min: 12, max: 30, get: r => r.doc.collections, wrap: true, group: "source" },
      { key: "file", head: S("colFile"), min: 12, max: 40, get: r => r.doc.file, wrap: true, group: "source" },
      { key: "link", head: S("colLink"), min: 10, max: 18, get: r => r.link, link: true },
    );
    return cols;
  },

  /** Display width of a text in characters (East Asian characters count double). */
  textWidth(text) {
    let longest = 0;
    for (const line of String(text ?? "").split("\n")) {
      let w = 0;
      for (const ch of line) {
        const c = ch.codePointAt(0);
        w += (c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3)
          || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60)
          || (c >= 0xffe0 && c <= 0xffe6) || c >= 0x20000)) ? 2 : 1;
      }
      longest = Math.max(longest, w);
    }
    return longest;
  },

  /**
   * Width of each column in characters: the heading (plus room for the
   * filter button) or the typical content, whichever is wider, within min
   * and max. “Typical” is the 90th percentile, so single long values
   * do not widen the column.
   */
  fitWidths(cols, rows, valueOf) {
    for (const c of cols) {
      const widths = rows.map(r => this.textWidth(valueOf(c, r))).sort((a, b) => a - b);
      const typical = widths.length ? widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.9))] : 0;
      const head = this.textWidth(c.head) + 3;
      c.width = Math.max(c.min, Math.min(c.max, Math.max(head, typical + 1)));
    }
    return cols;
  },

  /** Estimated number of lines of a wrapped text in a column of `width` characters. */
  lineCount(text, width) {
    const usable = Math.max(1, width - 1);
    return String(text ?? "").split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(this.textWidth(line) / usable)), 0);
  },

  // -------------------------------------------------------------------
  // CSV
  // -------------------------------------------------------------------

  toCSV(rows, meta = {}) {
    const cols = this.columns(rows, { descriptions: meta.descriptions });
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
    };
    const lines = [cols.map(c => esc(c.head)).join(",")];
    for (const r of rows) {
      lines.push(cols.map(c => esc(c.get(r))).join(","));
    }
    return "﻿" + lines.join("\r\n") + "\r\n";
  },

  // -------------------------------------------------------------------
  // HTML
  // -------------------------------------------------------------------

  esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },

  toHTML(rows, meta) {
    const SB = this.SB;
    const S = (k, a) => SB.S(k, a);
    const e = s => this.esc(s);
    const typeCol = this.columns(rows).find(c => c.key === "type");
    const groups = [];
    for (const r of rows) {
      const key = meta.sort === "label" ? r.profileId + r.color : r.doc.sortKey;
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key, rows: [], first: r };
        groups.push(g);
      }
      g.rows.push(r);
    }
    const multi = new Set(rows.map(r => r.profileId)).size > 1;
    const chip = r => "<span class=\"chip\"><span class=\"dot\" style=\"background:" + e(r.color) + "\"></span>"
      + (r.label ? e(r.label) : "<i>" + e(r.color) + "</i>") + (multi ? " <span class=\"pf\">· " + e(r.profile) + "</span>" : "") + "</span>";
    const heading = (g) => {
      const r = g.first;
      if (meta.sort === "label") {
        return "<h2>" + chip(r) + " <span class=\"n\">" + g.rows.length + "</span></h2>";
      }
      return "<h2>" + e(r.doc.citation) + " <span class=\"n\">" + g.rows.length + "</span></h2>"
        + (r.doc.title && r.doc.title !== r.doc.citation ? "<p class=\"src\">" + e(r.doc.title) + "</p>" : "");
    };
    const body = groups.map(g => "<section>" + heading(g) + g.rows.map((r) => {
      const parts = [];
      const head = [chip(r), "<span>" + e(typeCol.get(r)) + "</span>"];
      if (r.page) {
        head.push("<span>" + e(S("colPage")) + " " + e(r.page) + "</span>");
      }
      if (meta.sort === "label") {
        head.push("<span>" + e(r.doc.citation) + "</span>");
      }
      if (r.link) {
        head.push("<a href=\"" + e(r.link) + "\">" + e(S("linkOpen")) + "</a>");
      }
      parts.push("<div class=\"meta\">" + head.join("") + "</div>");
      if (r.text) {
        parts.push("<blockquote class=\"" + (r.type === "underline" ? "ul" : "") + "\">" + e(r.text).replace(/\n/g, "<br>") + "</blockquote>");
      }
      if (r.image) {
        parts.push("<img alt=\"\" src=\"data:image/png;base64," + this.base64(r.image.bytes) + "\">");
      }
      else if (this.isImageType(r.type)) {
        parts.push("<p class=\"missing\">" + e(meta.images === false ? this.extractText(r) : S("imageMissing")) + "</p>");
      }
      if (r.comment) {
        parts.push("<p class=\"comment\">" + e(r.comment).replace(/\n/g, "<br>") + "</p>");
      }
      if (r.tags.length) {
        parts.push("<p class=\"tags\">" + r.tags.map(t => "<span>" + e(t) + "</span>").join("") + "</p>");
      }
      return "<article style=\"border-left-color:" + e(r.color) + "\">" + parts.join("") + "</article>";
    }).join("") + "</section>").join("");
    // Legend: labels that occur in the export, with count and description
    const used = new Map();
    for (const r of rows) {
      if (r.label) {
        const u = used.get(r.profileId + r.color) || { r, n: 0 };
        u.n++;
        used.set(r.profileId + r.color, u);
      }
    }
    const legendRows = [...used.values()].sort((a, b) => a.r.profileOrder - b.r.profileOrder || a.r.labelOrder - b.r.labelOrder);
    const legend = legendRows.length
      ? "<details class=\"legend\" open><summary>" + e(S("sheetLabels")) + "</summary><dl>"
        + legendRows.map(u => "<dt>" + chip(u.r) + " <span class=\"n\">" + u.n + "</span></dt>"
          + (u.r.description ? "<dd>" + e(u.r.description).replace(/\n/g, "<br>") + "</dd>" : "")).join("")
        + "</dl></details>"
      : "";
    return "<!DOCTYPE html>\n<html lang=\"" + e(SB.lang) + "\"><head><meta charset=\"utf-8\">"
      + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
      + "<title>" + e(S("exportTitle")) + "</title><style>"
      + "body{font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#222;background:#fff;max-width:880px;margin:0 auto;padding:24px 16px}"
      + "h1{font-size:22px;margin:0 0 4px}.info{color:#666;margin:0 0 24px}"
      + "h2{font-size:17px;margin:28px 0 4px;display:flex;align-items:center;gap:8px}.n{font-size:12px;color:#666;font-weight:400;border:1px solid #ddd;border-radius:9px;padding:0 7px}"
      + ".src{margin:0 0 10px;color:#555;font-style:italic}"
      + "article{border-left:5px solid #ccc;padding:8px 12px;margin:10px 0;background:#fafafa;border-radius:0 6px 6px 0;break-inside:avoid}"
      + ".meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:12px;color:#555}"
      + ".chip{display:inline-flex;align-items:center;gap:5px;font-weight:600;color:#222}.dot{width:11px;height:11px;border-radius:3px;border:1px solid rgba(0,0,0,.2)}.pf{font-weight:400;color:#666}"
      + "blockquote{margin:6px 0;padding:0}blockquote.ul{text-decoration:underline;text-decoration-color:#999}"
      + "img{max-width:100%;border:1px solid #ddd;margin:6px 0}.comment{margin:6px 0;padding:6px 8px;background:#fff;border:1px solid #e4e4e4;border-radius:5px}"
      + ".tags{margin:6px 0 0;display:flex;flex-wrap:wrap;gap:4px}.tags span{font-size:12px;background:#eee;border-radius:9px;padding:0 8px}"
      + ".missing{color:#999;font-style:italic}a{color:#2563c1}"
      + ".legend{margin:0 0 20px;padding:8px 12px;border:1px solid #e4e4e4;border-radius:6px}.legend summary{font-weight:600;cursor:pointer}"
      + ".legend dl{margin:6px 0 0}.legend dt{display:flex;align-items:center;gap:8px;margin-top:6px}.legend dd{margin:2px 0 0 18px;color:#555}"
      + "@media (prefers-color-scheme:dark){body{background:#1d1d1f;color:#e6e6e6}.legend{border-color:#3a3a3c}.legend dd{color:#bbb}article{background:#262628}.chip{color:#eee}.meta,.src,.info,.n{color:#aaa}.comment{background:#1d1d1f;border-color:#3a3a3c}.tags span{background:#3a3a3c}a{color:#7aa7ff}}"
      + "@media print{body{max-width:none}a{color:inherit}}"
      + "</style></head><body><h1>" + e(S("exportTitle")) + "</h1><p class=\"info\">"
      + e(S("exportMeta", { n: rows.length, profile: meta.profile, scope: meta.scope, date: meta.date })) + "</p>"
      + legend + body + "</body></html>\n";
  },

  base64(bytes) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    let i = 0;
    for (; i + 2 < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += chars[n >> 18 & 63] + chars[n >> 12 & 63] + chars[n >> 6 & 63] + chars[n & 63];
    }
    if (i < bytes.length) {
      const n = (bytes[i] << 16) | ((i + 1 < bytes.length ? bytes[i + 1] : 0) << 8);
      out += chars[n >> 18 & 63] + chars[n >> 12 & 63] + (i + 1 < bytes.length ? chars[n >> 6 & 63] : "=") + "=";
    }
    return out;
  },

  // -------------------------------------------------------------------
  // XLSX
  // -------------------------------------------------------------------

  xml(s) {
    // control characters are not allowed in XML
    return String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },

  colName(i) {
    let s = "";
    let n = i + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  },

  /** Mix a color with white (light background of label cells). */
  tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const mix = c => Math.round(c + (255 - c) * amount);
    return [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => mix(c).toString(16).padStart(2, "0")).join("").toUpperCase();
  },

  isDark(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.55;
  },

  /** Builds the XLSX file as bytes. */
  toXLSX(rows, codebook, meta) {
    const S = (k, a) => this.SB.S(k, a);
    const x = s => this.xml(s);
    const withImages = meta.images !== false;
    const cols = this.fitWidths(this.columns(rows, { descriptions: meta.descriptions, xlsx: true }), rows, (c, r) => {
      if (c.link) {
        return r.link ? S("linkOpen") : "";
      }
      if (c.extract && r.image) {
        return ""; // images are scaled to the column, not the other way round
      }
      if (c.extract && withImages && this.isImageType(r.type)) {
        return S("imageMissing");
      }
      return c.get(r);
    });
    // With images, the extract column gets a little more room so that images stay legible
    const extractCol = cols.find(c => c.extract);
    if (extractCol && rows.some(r => r.image)) {
      extractCol.width = Math.max(extractCol.width, 45);
    }
    const colors = [...new Set([...rows.map(r => r.color), ...codebook.map(c => c.color)].filter(Boolean))];

    // --- Styles ---
    const fills = ["<fill><patternFill patternType=\"none\"/></fill>", "<fill><patternFill patternType=\"gray125\"/></fill>",
      "<fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFEDEDED\"/><bgColor indexed=\"64\"/></patternFill></fill>"];
    const solid = rgb => "<fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF" + rgb + "\"/><bgColor indexed=\"64\"/></patternFill></fill>";
    const fonts = [
      "<font><sz val=\"11\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/></font>",
      "<font><b/><sz val=\"11\"/><color theme=\"1\"/><name val=\"Calibri\"/><family val=\"2\"/></font>",
      "<font><u/><sz val=\"11\"/><color rgb=\"FF0563C1\"/><name val=\"Calibri\"/><family val=\"2\"/></font>",
      "<font><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/><family val=\"2\"/></font>",
    ];
    const top = "<alignment vertical=\"top\"/>";
    const topWrap = "<alignment vertical=\"top\" wrapText=\"1\"/>";
    const xfs = [
      "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>",
      "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"center\"/></xf>",
      "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyBorder=\"1\" applyAlignment=\"1\">" + topWrap + "</xf>",
      "<xf numFmtId=\"0\" fontId=\"2\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyBorder=\"1\" applyAlignment=\"1\">" + top + "</xf>",
      "<xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"1\" xfId=\"0\" applyBorder=\"1\" applyAlignment=\"1\">" + top + "</xf>",
    ];
    const ST = { header: 1, wrap: 2, link: 3, plain: 4 };
    const colorStyle = new Map();
    for (const c of colors) {
      fills.push(solid(c.slice(1).toUpperCase()));
      const full = fills.length - 1;
      fills.push(solid(this.tint(c, 0.6)));
      const light = full + 1;
      xfs.push("<xf numFmtId=\"0\" fontId=\"" + (this.isDark(c) ? 3 : 0) + "\" fillId=\"" + full + "\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\">" + top + "</xf>");
      xfs.push("<xf numFmtId=\"0\" fontId=\"0\" fillId=\"" + light + "\" borderId=\"1\" xfId=\"0\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\">" + topWrap + "</xf>");
      colorStyle.set(c, { full: xfs.length - 2, light: xfs.length - 1 });
    }
    const styles = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
      + "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
      + "<fonts count=\"" + fonts.length + "\">" + fonts.join("") + "</fonts>"
      + "<fills count=\"" + fills.length + "\">" + fills.join("") + "</fills>"
      + "<borders count=\"2\"><border><left/><right/><top/><bottom/><diagonal/></border>"
      + "<border><left style=\"thin\"><color rgb=\"FFD9D9D9\"/></left><right style=\"thin\"><color rgb=\"FFD9D9D9\"/></right>"
      + "<top style=\"thin\"><color rgb=\"FFD9D9D9\"/></top><bottom style=\"thin\"><color rgb=\"FFD9D9D9\"/></bottom><diagonal/></border></borders>"
      + "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
      + "<cellXfs count=\"" + xfs.length + "\">" + xfs.join("") + "</cellXfs>"
      + "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>"
      + "</styleSheet>";

    const cell = (ref, value, style, num) => {
      if (value === "" || value === null || value === undefined) {
        return "<c r=\"" + ref + "\"" + (style ? " s=\"" + style + "\"" : "") + "/>";
      }
      if (num) {
        return "<c r=\"" + ref + "\" s=\"" + (style || 0) + "\"><v>" + Number(value) + "</v></c>";
      }
      const text = String(value).slice(0, 32767);
      return "<c r=\"" + ref + "\" t=\"inlineStr\" s=\"" + (style || 0) + "\"><is><t xml:space=\"preserve\">" + x(text) + "</t></is></c>";
    };
    const sheet = (colDefs, headRow, bodyRows, extra = {}) => {
      const last = this.colName(colDefs.length - 1);
      const n = bodyRows.length + 1;
      return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
        + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
        + (colDefs.some(c => c.group) ? "<sheetPr><outlinePr summaryRight=\"1\"/></sheetPr>" : "")
        + "<dimension ref=\"A1:" + last + n + "\"/>"
        + "<sheetViews><sheetView workbookViewId=\"0\"" + (extra.selected ? " tabSelected=\"1\"" : "") + ">"
        + "<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>"
        + "<selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/></sheetView></sheetViews>"
        + "<sheetFormatPr defaultRowHeight=\"15\"" + (colDefs.some(c => c.group) ? " outlineLevelCol=\"1\"" : "") + "/>"
        + "<cols>" + colDefs.map((c, i) => "<col min=\"" + (i + 1) + "\" max=\"" + (i + 1) + "\" width=\"" + c.width + "\" customWidth=\"1\""
          + (c.group ? " outlineLevel=\"1\"" : "") + "/>").join("") + "</cols>"
        + "<sheetData>" + headRow + bodyRows.join("") + "</sheetData>"
        + "<autoFilter ref=\"A1:" + last + n + "\"/>"
        + (extra.hyperlinks || "")
        + "<pageMargins left=\"0.5\" right=\"0.5\" top=\"0.6\" bottom=\"0.6\" header=\"0.3\" footer=\"0.3\"/>"
        + "<pageSetup orientation=\"landscape\" fitToHeight=\"0\"/>"
        + (extra.drawing ? "<drawing r:id=\"rIdDrawing\"/>" : "")
        + "</worksheet>";
    };
    const headRow = defs => "<row r=\"1\" ht=\"20\" customHeight=\"1\">" + defs.map((c, i) => cell(this.colName(i) + "1", c.head, ST.header)).join("") + "</row>";

    // --- Sheet 1: annotations ---
    // Excel measures column widths in characters of the default font
    // (Calibri 11: about 7 px each plus 5 px padding) and row heights in points.
    const PX_PER_CHAR = 7;
    const LINE_PT = 15;
    const MAX_IMG_H = 360;
    const sheetRels = [];
    const links = [];
    const anchors = [];
    const media = [];
    const body = rows.map((r, idx) => {
      const rowNo = idx + 2;
      let imageHeight = 0;
      let lines = 1;
      const cells = cols.map((c, i) => {
        const ref = this.colName(i) + rowNo;
        if (c.colorCell) {
          // The number carries the annotation color (replaces a column with the hex code)
          return cell(ref, c.get(r), r.color ? colorStyle.get(r.color).full : ST.plain, true);
        }
        if (c.labelCell) {
          lines = Math.max(lines, this.lineCount(r.label, c.width));
          return cell(ref, r.label, r.color ? colorStyle.get(r.color).light : ST.wrap);
        }
        if (c.link) {
          if (!r.link) {
            return cell(ref, "", ST.plain);
          }
          const id = "rIdL" + (links.length + 1);
          links.push("<hyperlink ref=\"" + ref + "\" r:id=\"" + id + "\"/>");
          sheetRels.push("<Relationship Id=\"" + id + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink\" Target=\"" + x(r.link) + "\" TargetMode=\"External\"/>");
          return cell(ref, S("linkOpen"), ST.link);
        }
        if (c.extract && this.isImageType(r.type)) {
          if (r.image) {
            // Scale the image to the column width (keeps the aspect ratio)
            const maxW = c.width * PX_PER_CHAR - 1;
            const scale = Math.min(1, maxW / r.image.width, MAX_IMG_H / r.image.height);
            const w = Math.max(1, Math.round(r.image.width * scale));
            const h = Math.max(1, Math.round(r.image.height * scale));
            media.push(r.image.bytes);
            anchors.push({ col: i, row: rowNo - 1, w, h, n: media.length });
            imageHeight = Math.ceil(h * 0.75) + 6;
            return cell(ref, "", ST.plain);
          }
          const text = withImages ? S("imageMissing") : this.extractText(r);
          lines = Math.max(lines, this.lineCount(text, c.width));
          return cell(ref, text, ST.wrap);
        }
        const value = c.get(r);
        const num = typeof c.num === "function" ? c.num(r) : !!c.num;
        if (c.wrap && !num) {
          lines = Math.max(lines, this.lineCount(value, c.width));
        }
        return cell(ref, value, num ? ST.plain : (c.wrap ? ST.wrap : ST.plain), num);
      });
      // Rows with an image need a fixed height. Other rows keep the automatic height,
      // so Excel and LibreOffice fit them to the wrapped text themselves.
      const height = imageHeight ? Math.max(imageHeight, lines * LINE_PT) : 0;
      return "<row r=\"" + rowNo + "\"" + (height ? " ht=\"" + height + "\" customHeight=\"1\"" : "") + ">" + cells.join("") + "</row>";
    });
    const drawing = anchors.length > 0;
    if (drawing) {
      sheetRels.push("<Relationship Id=\"rIdDrawing\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing\" Target=\"../drawings/drawing1.xml\"/>");
    }
    const sheet1 = sheet(cols, headRow(cols), body, {
      selected: true,
      hyperlinks: links.length ? "<hyperlinks>" + links.join("") + "</hyperlinks>" : "",
      drawing,
    });

    // --- Sheet 2: labels ---
    // Columns: profile only with several profiles, description only if descriptions are used
    const cbCols = this.fitWidths([
      ...(codebook.multi ? [{ head: S("colProfile"), min: 10, max: 24, get: c => c.profile, style: () => ST.wrap }] : []),
      { head: S("colColor"), min: 9, max: 10, get: c => c.color, style: c => (colorStyle.get(c.color) ? colorStyle.get(c.color).full : ST.plain) },
      { head: S("colLabel"), min: 12, max: 32, get: c => c.label, style: c => (colorStyle.get(c.color) ? colorStyle.get(c.color).light : ST.wrap) },
      ...(this.SB.descriptionsOn() ? [{ head: S("colDescription"), min: 16, max: 70, get: c => c.description, style: () => ST.wrap }] : []),
      { head: S("colCount"), min: 8, max: 14, get: c => String(c.n), value: c => c.n, num: true, style: () => ST.plain },
      { head: S("colShown"), min: 8, max: 18, get: c => (c.shown ? S("yes") : S("no")), style: () => ST.plain },
    ], codebook, (c, row) => c.get(row));
    const cbRows = codebook.map((c, idx) => {
      const rowNo = idx + 2;
      return "<row r=\"" + rowNo + "\">"
        + cbCols.map((col, i) => cell(String.fromCharCode(65 + i) + rowNo, col.value ? col.value(c) : col.get(c), col.style(c), !!col.num)).join("")
        + "</row>";
    });
    const sheet2 = sheet(cbCols, headRow(cbCols), cbRows);

    // --- Sheet 3: info ---
    const infoRows = [
      [S("rowExported"), meta.date],
      [S("rowProfile"), meta.profile],
      [S("rowScope"), meta.scope],
      [S("rowCount"), String(rows.length)],
      [S("rowPlugin"), "Better Annotations " + (this.SB.version || "")],
    ];
    const infoCols = [{ head: S("rowKey"), width: 22 }, { head: S("rowValue"), width: 70 }];
    const sheet3 = sheet(infoCols, headRow(infoCols), infoRows.map((r, idx) => "<row r=\"" + (idx + 2) + "\">"
      + cell("A" + (idx + 2), r[0], ST.plain) + cell("B" + (idx + 2), r[1], ST.wrap) + "</row>"));

    // --- Images ---
    const EMU = 9525;
    const drawingXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
      + "<xdr:wsDr xmlns:xdr=\"http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing\" "
      + "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
      + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
      + anchors.map(a => "<xdr:oneCellAnchor><xdr:from><xdr:col>" + a.col + "</xdr:col><xdr:colOff>" + (3 * EMU) + "</xdr:colOff>"
        + "<xdr:row>" + a.row + "</xdr:row><xdr:rowOff>" + (3 * EMU) + "</xdr:rowOff></xdr:from>"
        + "<xdr:ext cx=\"" + a.w * EMU + "\" cy=\"" + a.h * EMU + "\"/>"
        + "<xdr:pic><xdr:nvPicPr><xdr:cNvPr id=\"" + (a.n + 1) + "\" name=\"Image " + a.n + "\"/><xdr:cNvPicPr><a:picLocks noChangeAspect=\"1\"/></xdr:cNvPicPr></xdr:nvPicPr>"
        + "<xdr:blipFill><a:blip r:embed=\"rIdImg" + a.n + "\"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>"
        + "<xdr:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"" + a.w * EMU + "\" cy=\"" + a.h * EMU + "\"/></a:xfrm>"
        + "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>").join("")
      + "</xdr:wsDr>";
    const drawingRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
      + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
      + anchors.map(a => "<Relationship Id=\"rIdImg" + a.n + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/image" + a.n + ".png\"/>").join("")
      + "</Relationships>";

    const sheetNames = [S("sheetAnnotations"), S("sheetLabels"), S("sheetInfo")]
      .map(n => String(n).replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
    const files = [
      ["[Content_Types].xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
        + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
        + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
        + "<Default Extension=\"png\" ContentType=\"image/png\"/>"
        + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
        + [1, 2, 3].map(i => "<Override PartName=\"/xl/worksheets/sheet" + i + ".xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>").join("")
        + "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>"
        + (drawing ? "<Override PartName=\"/xl/drawings/drawing1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.drawing+xml\"/>" : "")
        + "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>"
        + "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>"
        + "</Types>"],
      ["_rels/.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>"
        + "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>"
        + "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>"
        + "</Relationships>"],
      ["docProps/core.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" "
        + "xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" "
        + "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">"
        + "<dc:title>" + x(S("exportTitle")) + "</dc:title><dc:creator>Better Annotations</dc:creator>"
        + "<dcterms:created xsi:type=\"dcterms:W3CDTF\">" + new Date().toISOString().replace(/\.\d+Z$/, "Z") + "</dcterms:created>"
        + "</cp:coreProperties>"],
      ["docProps/app.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\"><Application>Better Annotations</Application></Properties>"],
      ["xl/workbook.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
        + "<bookViews><workbookView activeTab=\"0\"/></bookViews><sheets>"
        + sheetNames.map((n, i) => "<sheet name=\"" + x(n) + "\" sheetId=\"" + (i + 1) + "\" r:id=\"rId" + (i + 1) + "\"/>").join("")
        + "</sheets>"
        + "<definedNames>" + sheetNames.map((n, i) => "<definedName name=\"_xlnm._FilterDatabase\" localSheetId=\"" + i + "\" hidden=\"1\">'"
          + x(n.replace(/'/g, "''")) + "'!$A$1:$" + this.colName((i === 0 ? cols : i === 1 ? cbCols : infoCols).length - 1) + "$"
          + ((i === 0 ? rows.length : i === 1 ? codebook.length : infoRows.length) + 1) + "</definedName>").join("") + "</definedNames>"
        + "</workbook>"],
      ["xl/_rels/workbook.xml.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + [1, 2, 3].map(i => "<Relationship Id=\"rId" + i + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet" + i + ".xml\"/>").join("")
        + "<Relationship Id=\"rId4\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>"
        + "</Relationships>"],
      ["xl/styles.xml", styles],
      ["xl/worksheets/sheet1.xml", sheet1],
      ["xl/worksheets/sheet2.xml", sheet2],
      ["xl/worksheets/sheet3.xml", sheet3],
    ];
    if (sheetRels.length) {
      files.push(["xl/worksheets/_rels/sheet1.xml.rels", "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" + sheetRels.join("") + "</Relationships>"]);
    }
    if (drawing) {
      files.push(["xl/drawings/drawing1.xml", drawingXml], ["xl/drawings/_rels/drawing1.xml.rels", drawingRels]);
      media.forEach((bytes, i) => files.push(["xl/media/image" + (i + 1) + ".png", bytes]));
    }
    return this.zip(files);
  },

  // -------------------------------------------------------------------
  // ZIP (uncompressed)
  // -------------------------------------------------------------------

  utf8(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const d = str.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
          i++;
        }
      }
      if (c < 0x80) {
        out.push(c);
      }
      else if (c < 0x800) {
        out.push(0xc0 | c >> 6, 0x80 | c & 63);
      }
      else if (c < 0x10000) {
        out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      }
      else {
        out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      }
    }
    return Uint8Array.from(out);
  },

  crcTable: null,

  crc32(bytes) {
    if (!this.crcTable) {
      this.crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        this.crcTable[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = this.crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  },

  zip(files) {
    const chunks = [];
    const central = [];
    let offset = 0;
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const le = (n, size) => {
      const a = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        a[i] = (n >>> (8 * i)) & 255;
      }
      return a;
    };
    const concat = (parts) => {
      const len = parts.reduce((s, p) => s + p.length, 0);
      const out = new Uint8Array(len);
      let o = 0;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      return out;
    };
    for (const [name, content] of files) {
      const nameBytes = this.utf8(name);
      const data = typeof content === "string" ? this.utf8(content) : content;
      const crc = this.crc32(data);
      const header = concat([
        le(0x04034b50, 4), le(20, 2), le(0x0800, 2), le(0, 2), le(time, 2), le(date, 2),
        le(crc, 4), le(data.length, 4), le(data.length, 4), le(nameBytes.length, 2), le(0, 2), nameBytes,
      ]);
      chunks.push(header, data);
      central.push(concat([
        le(0x02014b50, 4), le(20, 2), le(20, 2), le(0x0800, 2), le(0, 2), le(time, 2), le(date, 2),
        le(crc, 4), le(data.length, 4), le(data.length, 4), le(nameBytes.length, 2), le(0, 2), le(0, 2),
        le(0, 2), le(0, 2), le(0, 4), le(offset, 4), nameBytes,
      ]));
      offset += header.length + data.length;
    }
    const centralBytes = concat(central);
    const end = concat([
      le(0x06054b50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2),
      le(centralBytes.length, 4), le(offset, 4), le(0, 2),
    ]);
    return concat([...chunks, centralBytes, end]);
  },

  // -------------------------------------------------------------------
  // Workflow
  // -------------------------------------------------------------------

  extension(format) {
    return { xlsx: "xlsx", csv: "csv", html: "html" }[format] || "xlsx";
  },

  /** Writes the export file; returns the number of annotations. */
  async write(path, format, rows, meta) {
    if (format === "csv") {
      await Zotero.File.putContentsAsync(path, this.toCSV(rows, meta));
    }
    else if (format === "html") {
      await Zotero.File.putContentsAsync(path, this.toHTML(rows, meta));
    }
    else {
      this.SB.log("export: building xlsx with " + rows.length + " rows");
      await Zotero.Promise.delay(0);
      const bytes = this.toXLSX(rows, this.codebook(rows, meta.profileObj), meta);
      this.SB.log("export: writing " + bytes.length + " bytes");
      await this.IO().write(path, bytes);
    }
    this.SB.log("export: done");
    return rows.length;
  },
};
