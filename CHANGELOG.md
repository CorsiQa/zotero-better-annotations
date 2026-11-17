# Changelog

All notable changes to Better Annotations are listed here.
The project uses [Semantic Versioning](https://semver.org/).

## Unreleased

Changes for the next release are collected here. The section is renamed to the version number when the release is published.

- New section “Better Annotations” in the item pane, in the library and next to the reader: labels of the active profile with the number of annotations and a profile menu. In the reader, a click on a label turns on highlighting in its color; a second click switches back to the pointer. If text or an annotation is selected, the click colors it once and the tool stays as it is. A button chooses whether the color stays selected or the reader returns to the pointer after each annotation. The header has buttons to open the list in a separate window and to show the section at the top. Can be turned off under “Appearance”
- Separate window with the same list. It follows the active reader tab, closes the reader’s side pane while it is open and keeps a narrow width, for example for a second screen
- Drag a color from the item pane section or the separate window onto an annotation in the reader’s sidebar or onto a highlight in a PDF to recolor it (all selected annotations, if it is one of them), or onto selected text to highlight it
- Descriptions for labels (turn on under “Advanced”): add a description below a label, for example what the label stands for and when to use it. Descriptions appear in tooltips, in the statistics (optional), in the item pane section and in the separate window; there they look like plain text, and the pencil next to a label opens a field (Enter or a click elsewhere closes it, Shift+Enter adds a line)
- Export: text and images share one column “Extract”. Image and drawing annotations show their image there (Excel, HTML) or a placeholder such as “[Image]”
- Excel export: the number column carries the annotation color instead of a separate column with the hex code; columns are grouped into “Details” and “Source” and can be folded; column widths follow the content; images are scaled to the column width; the “Labels” sheet lists the descriptions
- HTML export starts with a legend of the labels; Excel and CSV can add a column “Description”
- After an export, the folder with the file opens. Large exports show their progress and no longer block Zotero; missing images are rendered for at most 25 files per export
- Areas (export, recolor, assign) are listed from the narrowest to the widest: selected items, document, collection, parent collection, library, all libraries
- A week after the first start, the plugin asks once whether you want to share your experience and wishes on GitHub (“Remind me later” asks again after 30 days)
- New palettes “Pastel Bold” and “Neon”; the palette “Light” was removed (profiles keep their colors); sorted palettes always show gray last
- Settings: unsaved changes to a profile show a bar with “Save” at the bottom of the window in every tab, and closing the settings asks what to do with them. Empty labels no longer have a red dashed border
- Tooltips of the plugin follow Zotero’s light and dark appearance
- Clearer names: “Annotations” for the statistics in the reader toolbar
- Profile files and full backups include the descriptions; older files remain valid
- New tab “Advanced” in the settings: descriptions, labels as tags and profile per document are off by default and turned on with a switch in the top right corner of their card. A card that is off is shown muted; its options appear when it is turned on. The tab “Tags & Library” is now called “Library”
- Settings: text, options, menus and buttons in the cards share one left edge; parts of a card are separated by a thin line. Collections in menus are indented in the list only. Rules for collections keep their buttons in one line
- The color list shows how many of your other profiles use a color; the tooltip names them. The number of annotations per color is always shown, with a marker icon instead of “×”; its option was removed
- Profile per document (turn on under “Advanced”): every document keeps its own profile. When a document opens, the plugin uses the profile last chosen in it, the profile of most of its annotations, the first rule for the collection it was opened from, or the default profile. New annotations get a profile tag such as “ZBA: Reading” (the same in every language), colored in the plugin’s color if Zotero has a free slot for colored tags, also right away in the reader’s sidebar. The default profile can be chosen in the profile card and under “Advanced”. Turning the function on offers to assign existing annotations; turning it off asks whether the tags stay. Without the function, one profile applies to all documents, as before
- With profile per document, the profile menu of the reader toolbar, of the item pane section and of the separate window is the same native Zotero menu: all profiles in the same order, each with its number of annotations in the document, the chosen one marked, and “Manage Profiles…”
- Renaming a profile renames its tags, deleting a profile asks what happens to them, and annotations without a profile tag can be assigned to a profile for any area
- In the reader, the profile of an annotation appears as a small label in its head, left of icons from other plugins, at full length (shortened in the middle when the sidebar is narrow). The profile tag is hidden in the tag line, and a tag line with only profile tags appears only while the annotation is selected (option under “Advanced”). The tag stays on the annotation, in the reader’s tag filter and in the export
- The statistics and the number in the reader toolbar show the annotations of the document by profile. With the filter “only this profile”, which the statistics offer as the same funnel button as the item pane, they show only the document’s profile. The item pane section counts the annotations of the document’s profile. A notice appears if profiles in one document use the same colors
- Recoloring and export can be limited to one profile; exports take the labels from the profile of each annotation and have a column “Profile”. When colors of a profile change, only its own annotations are recolored
- Full backups include the rules for collections and the profile chosen per document
- The buttons of the profile card wrap in groups when the settings window is narrow
- Reader toolbar: one button instead of two, with the four bars of the logo as icon, the profile of the document and the number of annotations (“Reading · 12”), in the sizes of Zotero's toolbar. A click opens the profile menu, as in the item pane; hovering or keyboard focus shows the statistics. Their head holds the filter “only this profile”; with several profiles in the document they show one heading per profile (“Reading · 12”, its tooltip says why the profile was chosen). The profile button in the item pane shows the same
- Built-in profile “Standard” (Zotero’s colors, formerly “Zotero Default”): cannot be changed or deleted, changes are saved as a new profile. “Zotero+” is now an ordinary example profile, created and in use at the first start, and can be edited or deleted. Existing documents, rules and tags with “Zotero+” keep working
- Export: the column “Tags” leaves out profile tags; they are in the column “Profile”
- The statistics and the profile menu in the reader toolbar close on a click anywhere outside, also in the document, and with Esc. Statistics opened by hovering stay open while the pointer is on them; the bars have the same height with display scaling
- Settings tab “Menus & Reader” is now called “Appearance”. It has one card each for the reader toolbar and the sidebar, with a switch, the warning about shared colors and, with descriptions turned on, where descriptions appear. Card heads are a grey band, and options are separated by thin lines
- Sidebar: the button of the section can sit with Zotero’s sections (default) or in an area of its own between dividers. A right click on the section header or on its button opens the separate window, moves the button or removes the section
- Reader toolbar: a right click on the button hides it; the settings show it again
- Drag and drop of colors also recolors existing highlights in a PDF. While dragging, the color and its label appear opaque next to the pointer
- Tooltips of the colors have an opaque background
- “Standard” is the active profile after the installation, so existing annotations count there; “Zotero+” stays as an example profile
- Which profile an annotation counts to is the same in the statistics, the item pane, exports and label tags. With “Profile per Document” only the profile tag puts an annotation into a profile; without a tag, Zotero's colors count to “Standard”, other colors to no profile. Without the function, the active profile comes first, then “Standard” for Zotero's colors, then another profile with the color. Colors that no profile contains appear as “No profile” with “No label” (the color code only in the tooltip)
- “Profile · n” in the reader toolbar and “Profile: Name · n” in the item pane count the annotations of this profile. Below the lists, a row with a line above shows all annotations of the document, or with the filter only the shown ones; its text starts at the left edge, its number stands in the column of the other numbers. A line also sets off the warning about shared colors. The statistics list all labels of the document's profile, like the item pane, and always offer the filter with “Profile per Document”
- Item pane: the view button switches in steps like the repeat button of a music player: this profile, all profiles (with a heading and the colors of each other profile), only this profile (Zotero's filter, also in the document; with “Profile per Document”). The button keeps its color; a gray background marks the steps after the first
- “Assign” for annotations without a profile tag gives them the tag of the document's profile for its colors, otherwise the tag of the profile with their color; turning on “Profile per Document” assigns the same way. Notices say what changes when the function is turned on or off
- “Standard” adds no label tags; the warning about shared colors ignores “Standard” and appears only with “Profile per Document”
- Drag and drop works again on selected text and now also on existing highlights in PDFs (the conversion of coordinates failed in pdf.js). The color goes to what was marked during the drag; selected text is marked with the rectangles of the future highlight. The lists are not rebuilt while a color is dragged
- Settings: cards with a frame, a light gray head with title, a short description and a smaller “i” for longer explanations, and lines across the full width between groups of options (none between options that belong together). Options have a label on the left and their control right-aligned; menus share one narrower width, numbers have their own field with − and +. Lighter switch colors, one corner radius for header, tabs and cards. The language menu explains itself in a tooltip instead of an “i”. “Rules for collections” has a short explanation and an “i”. The About text describes the current functions; the credits have no bullets
- The profile label in the head of an annotation keeps 4 px more distance to the next icon
- Norwegian Bokmål and Swedish are no longer available; the plugin then follows Zotero’s language or uses English
- Zotero's tools stay in the middle of the reader toolbar, also with a long profile name; before, every button on the right moved them to the left
- After turning on “Profile per Document”, a dialog explains what the profile tag does and that the reader hides it in the tag line of an annotation; the “i” of the card explains it too
- With descriptions turned on, they appear in the item pane section and as a column in exports by default
- The explanation of the profile card with “Profile per Document” showed an outdated text

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
