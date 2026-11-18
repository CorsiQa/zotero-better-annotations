# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

The main additions are a section in Zotero's item pane, drag and drop of colors, descriptions for labels and a profile per document.

### New
- Item pane section “Better Annotations” in the library and next to the reader: the labels of the profile with their number of annotations. In the reader, a click on a label starts highlighting in its color; with text or annotations selected, it colors them once. Can be turned off under “Appearance”
- Separate window with the same list that follows the active reader tab, for example on a second screen
- Drag a color from the section or the window onto an annotation in the sidebar, a highlight in a PDF or selected text
- Descriptions for labels (off by default, tab “Advanced”): in tooltips, the section, the window, the statistics and as an export column
- Profile per document (off by default, tab “Advanced”): every document keeps its own profile, chosen by hand, by its annotations, by rules for collections or as the default profile. New annotations get a profile tag “ZBA: Profile name”; the reader shows the profile in the head of the annotation and hides the tag in its tag line. Filter “only this profile” in the section and the statistics. Renaming or deleting a profile updates its tags; annotations without a tag can be assigned
- Tab “Advanced” for functions that write to the library or need an explanation: descriptions, labels as tags, profile per document
- Notice in the settings and a one-time dialog while Highlight Color Descriptions, Annotation Color Customizer or Just Enough Color is active, with the offer to take over their labels as a profile
- Palettes “Pastel Bold” and “Neon” (“Light” was removed; profiles keep their colors)
- A week after the first start, a one-time request for feedback on GitHub

### Changed
- Reader toolbar: one button with the profile and its number of annotations. A click opens the profile menu; hovering or keyboard focus shows the statistics. Zotero's tools stay above the middle of the document (can be turned off). A right click hides the button
- Statistics: grouped by profile, with the same filter as the section and optional descriptions; they open below the button
- The profile menus of the toolbar, the section and the window are the same native Zotero menu
- Built-in profile “Standard” (formerly “Zotero Default”) is active after the installation and cannot be changed; “Zotero+” is an ordinary example profile
- Export: one column “Extract” for text and images. Excel colors the number column, groups columns into “Details” and “Source”, fits widths to the content and lists the descriptions in the sheet “Labels”; HTML starts with a legend of the labels; optional columns “Description” and “Profile”. The folder opens after an export; large exports show their progress and no longer block Zotero
- Areas for export, recoloring and assigning are listed from the narrowest to the widest
- Settings: cards with a head and explanations, tabs “Appearance” (formerly “Menus & Reader”) and “Library” (formerly “Tags & Library”), a bar to save profile changes in every tab
- Icons are drawn like Zotero's own, and one function has the same icon everywhere. “Customize Annotation Colors…” is now “Customize Annotations…”
- The color list shows how many of your other profiles use a color
- Profile files and full backups include descriptions, rules for collections and the profile per document; older files remain valid
- Labels of Highlight Color Descriptions are no longer taken over at the first start without asking; the plugin offers it instead
- Norwegian Bokmål and Swedish were removed; the plugin is available in 11 languages

### Fixed
- Colors and labels in the selection popup and the context menu stay correct while another plugin for annotation colors is active
- With a long profile name, the item pane can be made narrow again: the name is shortened and the buttons stay visible
- Tooltips follow Zotero's light and dark appearance and have an opaque background

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
