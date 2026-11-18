# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

The main additions are a section in Zotero's item pane, drag and drop of colors, descriptions for labels and a profile per document.

### New
- **Item pane section** next to the reader and in the library: the labels of the profile with their number of annotations. A click on a label starts highlighting in its color or colors the selected text or annotations. Also available as a **separate window**, for example on a second screen
- **Drag and drop** of a color onto an annotation in the sidebar, a highlight in a PDF or selected text
- **Tab “Advanced”** with three functions that are off by default: **descriptions** for labels (in tooltips, the item pane, the statistics and exports), **labels as tags** (moved from “Tags & Library”) and a **profile per document** with profile tags “ZBA: Profile name”, rules for collections and a filter for one profile
- **Notice and one-time dialog** while Highlight Color Descriptions, Annotation Color Customizer or Just Enough Color is active, with the offer to take over their labels as a profile
- Palettes “Pastel Bold” and “Neon”; a one-time request for feedback a week after the first start

### Changed
- **Reader toolbar:** one button with the profile and its number of annotations; a click opens the profile menu, hovering shows the statistics grouped by profile. Zotero's tools stay above the middle of the document
- **Profiles:** the built-in profile “Standard” (formerly “Zotero Default”) is active after the installation and cannot be changed; “Zotero+” is an ordinary example profile. All profile menus are the same native Zotero menu
- **Export:** one column “Extract” for text and images, optional columns “Description” and “Profile”; Excel groups and sizes its columns and colors the number column; HTML starts with a legend; the folder opens afterwards; large exports no longer block Zotero
- **Look:** settings in cards with explanations and the tabs “Appearance” and “Library”, a save bar for profile changes in every tab, icons drawn like Zotero's own, tooltips in Zotero's light and dark appearance. “Customize Annotation Colors…” is now “Customize Annotations…”
- Labels of Highlight Color Descriptions are no longer taken over without asking at the first start
- Profile files and full backups include descriptions, rules for collections and the profile per document; older files remain valid
- Norwegian Bokmål and Swedish were removed; 11 languages remain

### Fixed
- Colors and labels in the selection popup and the context menu stay correct while another plugin for annotation colors is active
- With a long profile name, the item pane can be made narrow again

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
