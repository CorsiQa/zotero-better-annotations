# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

- Export: text and images now share one column “Extract”. Image and drawing annotations show their image there (Excel, HTML) or a placeholder such as “[Image]” (CSV, or when images are turned off)
- Excel export: column widths follow the heading and the typical content, within sensible limits; images are scaled to the width of the column
- New section “Annotation Labels” in the item pane, in the library and next to the reader: labels of the active profile with the number of annotations, profile selection and a link to the settings. In the reader, a click on a label selects its color for the next annotation. Can be turned off under “Menus & Reader”
- The same list in a separate window that follows the active reader tab, for example on a second screen
- Descriptions for labels: add a description below each label in the settings, for example what the label stands for and when to use it. Descriptions appear in the tooltips of the selection popup, the context menu, the statistics and the sidebar filter, in the section “Annotation Labels” (can be shown and hidden) and in the separate window, where they can also be edited
- Export: the “Labels” sheet lists the descriptions, the HTML report starts with a legend of the labels, and Excel and CSV can add a column “Description”
- Profile files and full backups include the descriptions; older files remain valid

## 1.0.0-beta.1 – 2026-11-13

First public release (beta). Please report problems in the [issue tracker](https://github.com/CorsiQa/zotero-better-annotations/issues).

- Labels for annotation colors in the annotation context menu, the toolbar color menu, the selection popup and the sidebar color filter
- Any number of colors in any order, with drag and drop, visibility per color and a submenu for extra colors
- Profiles with the presets “Zotero+” and “Zotero Default”, profile switcher in the reader toolbar, import and export of single profiles
- Template library with ready-made profiles, for example PICO and a reading workflow
- Color picker with six palettes and recently used colors; apply a whole palette to a profile
- Statistics of the annotations in the open document by label
- Optional labels as tags, with tracking, renaming and removal of plugin tags
- Recolor and merge colors by document, selected items, collection, parent collection, library or all libraries
- Export of annotations to Excel (colored cells, images, links back to Zotero), CSV and HTML
- Backups of annotation colors, an undoable history and a full backup for moving to a new computer
- Update notice in the settings when automatic updates are turned off
- 13 languages: English, German, Spanish, French, Italian, Japanese, Norwegian Bokmål, Polish, Portuguese, Russian, Swedish, Simplified and Traditional Chinese
