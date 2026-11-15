# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

- New section “Better Annotations” in the item pane, in the library and next to the reader: labels of the active profile with the number of annotations and a profile menu. In the reader, a click on a label turns on highlighting in its color; a second click switches back to the pointer. The header has buttons to pin the section and to open it in a separate window. Can be turned off under “Menus & Reader”
- Separate window with the same list. It follows the active reader tab, closes the reader’s side pane while it is open and keeps a narrow width, for example for a second screen
- Descriptions for labels: click below a label to add a description, for example what the label stands for and when to use it. Descriptions appear in tooltips, in the statistics (can be turned off), in the item pane section and in the separate window, where they can be edited in place as well
- Export: text and images share one column “Extract”. Image and drawing annotations show their image there (Excel, HTML) or a placeholder such as “[Image]”
- Excel export: the number column carries the annotation color instead of a separate column with the hex code; columns are grouped into “Details” and “Source” and can be folded; column widths follow the content; images are scaled to the column width; the “Labels” sheet lists the descriptions
- HTML export starts with a legend of the labels; Excel and CSV can add a column “Description”
- After an export, the folder with the file opens
- New palettes “Pastel Bold” and “Neon”; the palette “Light” was removed (profiles keep their colors); sorted palettes always show gray last
- Settings: unsaved changes show a bar with “Save” at the bottom of the window, and closing the settings asks what to do with them. Empty labels no longer have a red dashed border
- Tooltips of the plugin follow Zotero’s light and dark appearance
- Clearer names: “Annotations” for the statistics in the reader toolbar
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
