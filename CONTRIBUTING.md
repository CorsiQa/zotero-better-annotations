# Contributing

Thank you for helping to improve Better Annotations. Bug reports, ideas, translations and code are all welcome.

## Reporting problems

Use the [bug report form](https://github.com/CorsiQa/zotero-better-annotations/issues/new?template=bug_report.yml). Please include your Zotero version, your operating system, other plugins that change the reader, and the debug output (**Help → Debug Output Logging**, lines starting with `[BetterAnnotations]`).

## Translations

All texts are in `content/locale/<language>.js`, one file per language. English (`en.js`) is the reference.

1. Copy the line you want to change, keep the key on the left and the placeholders in curly braces such as `{n}` or `{name}`.
2. Keep an ellipsis (…) at the end of button labels that have one: it tells users that a dialog follows.
3. Run `node scripts/check-locales.mjs` to check that no key or placeholder is missing.

The template library has its own texts in `content/templates.js`.

To add a language, copy `en.js`, translate it, add the language code to the list in `bootstrap.js` and to `LANGUAGES` in `content/core.js`.

## Code overview

| File | Purpose |
|---|---|
| `bootstrap.js` | Entry point called by Zotero; loads the other files |
| `content/core.js` | Constants, strings, shared icons, profile store (`profiles.json`), update check |
| `content/reader.js` | Menus, selection popup, toolbar buttons and sidebar tooltips in the reader |
| `content/profiles.js` | Profile per document: choice per document, rules for collections, profile tags, the profile of an annotation |
| `content/panel.js`, `content/popout.xhtml` | Item pane section and separate window |
| `content/conflicts.js` | Notice and dialog about other plugins for annotation colors |
| `content/feedback.js` | One-time request for feedback |
| `content/library.js` | Changes to annotations: tags, recoloring, backups, history, full backup, areas |
| `content/export.js` | Export to XLSX, CSV and HTML (including a small ZIP writer) |
| `content/prefs-ui.js` | Settings page |
| `content/color-picker.js`, `content/prefs-style.js` | Color picker and styles of the settings page |
| `content/templates.js` | Template library |
| `content/locale/*.js`, `locale/*/better-annotations.ftl` | Translations (the Fluent files hold the texts Zotero shows itself, such as the section title) |

The code runs directly in Zotero without a build step. Parts of it use internal Zotero interfaces (for example `reader._internalReader`); check them after every Zotero update.

## Building and testing

```
node scripts/build.mjs
```

creates `dist/better-annotations-<version>.xpi`. Install it in a separate Zotero profile for testing (start Zotero with `-P` to create one), not in the profile with your research data.

## Versions

The project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- PATCH (1.0.0 → 1.0.1): bug fixes only.
- MINOR (1.0.1 → 1.1.0): new features that keep existing profiles and settings working.
- MAJOR (1.1.0 → 2.0.0): changes that break something for existing users, for example an incompatible data format or dropping support for a Zotero version.
- Pre-releases carry a suffix: `1.0.0-beta.1`, `1.0.0-beta.2`, … and come before `1.0.0`.

## Releasing

1. Raise `version` in `manifest.json` and add a section to `CHANGELOG.md`.
2. Check `strict_min_version` and `strict_max_version` in `manifest.json`: list only Zotero versions you have tested.
3. Commit and push.
4. On GitHub: **Releases → Draft a new release**, create the tag `v<version>` (for example `v1.0.0-beta.2`), use the changelog section as description and publish. Do not tick “Set as a pre-release”, because Zotero looks for updates in the latest regular release.
5. The workflow `Release` builds the plugin and attaches the `.xpi` file and `updates.json` within a few minutes. Zotero then offers the update to all users.

When a new Zotero version comes out and the plugin works with it, run the workflow **Update Zotero compatibility** (Actions tab) with the new maximum version, e.g. `10.*`. This updates `updates.json` without a new release.
