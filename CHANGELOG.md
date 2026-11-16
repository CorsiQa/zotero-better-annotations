# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

- New section “Better Annotations” in the item pane, in the library and next to the reader: labels of the active profile with the number of annotations and a profile menu. In the reader, a click on a label turns on highlighting in its color; a second click switches back to the pointer. If text or an annotation is selected, the click colors it once and the tool stays as it is. A button chooses whether the color stays selected or the reader returns to the pointer after each annotation. The header has buttons to open the list in a separate window and to show the section at the top. Can be turned off under “Menus & Reader”
- Separate window with the same list. It follows the active reader tab, closes the reader’s side pane while it is open and keeps a narrow width, for example for a second screen
- Drag a color from the item pane section or the separate window onto an annotation in the reader’s sidebar or onto a highlight in a PDF to recolor it (all selected annotations, if it is one of them), or onto selected text to highlight it
- Descriptions for labels (turn on under “Advanced”): add a description below a label, for example what the label stands for and when to use it. Descriptions appear in tooltips, in the statistics (optional), in the item pane section and in the separate window; there they look like plain text, and the pencil next to a label opens a field (Enter or a click elsewhere closes it, Shift+Enter adds a line)
- Export: text and images share one column “Extract”. Image and drawing annotations show their image there (Excel, HTML) or a placeholder such as “[Image]”
- Excel export: the number column carries the annotation color instead of a separate column with the hex code; columns are grouped into “Details” and “Source” and can be folded; column widths follow the content; images are scaled to the column width; the “Labels” sheet lists the descriptions
- HTML export starts with a legend of the labels; Excel and CSV can add a column “Description”
- After an export, the folder with the file opens
- New palettes “Pastel Bold” and “Neon”; the palette “Light” was removed (profiles keep their colors); sorted palettes always show gray last
- Settings: unsaved changes to a profile show a bar with “Save” at the bottom of the window in every tab, and closing the settings asks what to do with them. Empty labels no longer have a red dashed border
- Tooltips of the plugin follow Zotero’s light and dark appearance
- Clearer names: “Annotations” for the statistics in the reader toolbar
- Profile files and full backups include the descriptions; older files remain valid
- New tab “Advanced” in the settings: descriptions, labels as tags and profile per document are off by default and turned on with a switch in the top right corner of their card. A card that is off is shown muted; its options appear when it is turned on. The tab “Tags & Library” is now called “Library”
- Settings: text, options, menus and buttons in the cards share one left edge; parts of a card are separated by a thin line. Collections in menus are indented in the list only. Rules for collections keep their buttons in one line
- The color list shows how many of your other profiles use a color; the tooltip names them. The number of annotations per color is always shown; its option was removed
- Profile per document (turn on under “Advanced”): every document keeps its own profile. When a document opens, the plugin uses the profile last chosen in it, the profile of most of its annotations, the first rule for the collection it was opened from, or the default profile. New annotations get a profile tag such as “ZBA: Reading” (the same in every language), colored in the plugin’s color if Zotero has a free slot for colored tags, also right away in the reader’s sidebar. The default profile can be chosen in the profile card and under “Advanced”. Turning the function on offers to assign existing annotations; turning it off asks whether the tags stay. Without the function, one profile applies to all documents, as before
- With profile per document, the profile menu in the reader toolbar, in the item pane section and in the separate window lists all profiles in the same order, each with its number of annotations in the document, and “Manage Profiles…”; the tooltip of the profile button says why the document uses its profile. A filter button in the section shows only the annotations of the document’s profile, in the document and in the sidebar (Zotero’s tag filter); annotations without a profile tag can be assigned there
- Renaming a profile renames its tags, deleting a profile asks what happens to them, and annotations without a profile tag can be assigned to a profile for any area
- In the reader, the profile of an annotation appears as a small label in its head, and the profile tag is hidden in its tag line (option under “Advanced”). The tag stays on the annotation, in the reader’s tag filter and in the export
- The statistics and the number in the reader toolbar show the annotations of the document by profile. With the filter “only this profile”, which the statistics offer as the same funnel button as the item pane, they show only the document’s profile. The item pane section counts the annotations of the document’s profile. A notice appears if profiles in one document use the same colors
- Recoloring and export can be limited to one profile; exports take the labels from the profile of each annotation and have a column “Profile”. When colors of a profile change, only its own annotations are recolored
- Full backups include the rules for collections and the profile chosen per document
- The buttons of the profile card wrap in groups when the settings window is narrow
- Reader toolbar: one split button instead of two. Its main part shows the statistics icon, the profile of the document and the number of annotations; hovering or clicking opens the statistics, which also name the profile and why it was chosen. The arrow opens the profile menu. In the settings, toolbar and item pane share one card
- The statistics and the profile menu in the reader toolbar close on a click anywhere outside, also in the document, and with Esc. Statistics opened by hovering stay open while the pointer is on them; the bars have the same height with display scaling
- Norwegian Bokmål and Swedish are no longer available; the plugin then follows Zotero’s language or uses English

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
