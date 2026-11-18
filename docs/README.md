# Better Annotations – Documentation

Better Annotations extends the annotation colors of the Zotero reader. You can rename colors, change them, add more colors, reorder them and keep several palettes as profiles. Optional tools add labels as tags, recolor existing annotations and undo every change.

Deutsch: [README.de.md](README.de.md)

## Contents

1. [Installation](#installation)
2. [Quick start](#quick-start)
3. [Where the colors appear](#where-the-colors-appear)
4. [Settings: Colors & Profiles](#settings-colors--profiles)
5. [Settings: Appearance](#settings-appearance)
6. [Settings: Tags & Library](#settings-tags--library)
7. [Settings: Export](#settings-export)
8. [Settings: About](#settings-about)
9. [Updates](#updates)
10. [Languages](#languages)
11. [Data and privacy](#data-and-privacy)
12. [Troubleshooting](#troubleshooting)

## Installation

1. Download the latest `better-annotations-<version>.xpi` from the [releases page](https://github.com/CorsiQa/zotero-better-annotations/releases).
2. In Zotero, open **Tools → Plugins**, click the gear icon and choose **Install Plugin From File…**.
3. Select the downloaded file.

Better Annotations is tested with Zotero 10 and built for Zotero 7 and later. Other plugins that change the same menus (for example “Zotero Highlight Color Descriptions”, “Annotation Color Customizer” or “Just Enough Color”) should be disabled, because they modify the same elements.

The plugin never changes existing annotations on its own. Your annotations keep their colors after installation. On first start, the plugin saves a backup of all annotation colors.

## Quick start

1. Open **Edit → Settings** (macOS: **Zotero → Settings**) and choose **Better Annotations**.
2. The preset **Zotero+** is active: the eight Zotero colors with labels for literature work plus four empty colors.
3. Edit a label or click a swatch to change a color. Because Zotero+ is a built-in preset, **Save** asks for a name and creates your own profile.
4. Open a PDF, select text and pick a color. Hover over a color to see its label.

## Where the colors appear

| Place | What the plugin does |
|---|---|
| Right-click on an annotation | Shows your colors with labels. The first 8 colors (configurable) appear directly, all others in the **More Colors** submenu, followed by **Customize Annotations…**. |
| Color menu of the reader toolbar | Same list, sets the color of the highlight, underline, note, text, image and ink tools. |
| Popup after selecting text | Shows all visible colors as buttons, the customize button at the end and the label as a tooltip. |
| Reader toolbar | Profile switcher and the number of annotations in the open document. Hover over the number for a breakdown by label. |
| Annotation sidebar | The color filter shows labels as tooltips. |

A color appears in the menus when its checkbox is selected and its label is not empty. A label that consists only of spaces counts as a label.

## Settings: Colors & Profiles

### Profiles

A profile stores a complete palette: colors, labels, order and visibility. The active profile determines what you see in the reader.

| Profile | Description |
|---|---|
| **Zotero+** | Built-in default. 12 colors: the 8 Zotero colors plus teal, pink, indigo and lime. The first 8 carry labels for literature work: Key Finding, Critique / Limitation, Method & Data, Theory & Definition, Research Question / Hypothesis, Implication, Research Gap, Background. The 4 extra colors are empty and therefore hidden until you name them. |
| **Zotero Default** | Zotero without changes: 8 colors named after the color. |
| Your profiles | Any number of own palettes. |

Built-in presets cannot be overwritten. When you save changes to a preset, the plugin asks for a name and creates a new profile.

- **New Profile…** asks whether to start with the current palette (including unsaved changes) or with Zotero+.
- **Rename…** and **Delete…** apply to your own profiles.
- **Export Profile…** saves the profile shown as a JSON file of its own; the file name contains the profile name. **Import Profile…** adds such a profile and shows it. Use this to exchange profiles with colleagues, for example when you work together in a group library. If the name already exists, the imported profile gets a number.
- **Browse Templates** opens the template library (see below).

If you switch profiles while there are unsaved changes, the plugin asks whether to save them. Switching profiles never changes annotations, only the labels that are shown for them.

### Template library

The library offers ready-made profiles as starting points. Using a template creates a new profile that you can change freely.

| Template | Based on | Labels |
|---|---|---|
| Zotero+ (plugin default) | default of this plugin | Key Finding, Critique / Limitation, Method & Data, Theory & Definition, Research Question / Hypothesis, Implication, Research Gap, Background; four empty colors |
| Literature Review: TCCM | Paul & Rosado-Serrano (2019) | Theory, Context, Characteristics (Constructs), Methodology, Finding, Future Research |
| Literature Review: ADO | Paul & Benito (2018) | Antecedents, Decisions, Outcomes, Moderators & Mediators, Theory, Method, Future Research |
| Argument Analysis: Toulmin | Toulmin (1958) | Claim, Grounds / Evidence, Warrant, Backing, Qualifier, Rebuttal |
| Grounded Theory: Paradigm Model | Strauss & Corbin (1990) | Phenomenon, Causal Conditions, Context, Intervening Conditions, Actions / Interactions, Consequences, Memo |
| Evidence Extraction: PICO | Richardson et al. (1995) | Population, Intervention / Exposure, Comparison, Outcome, Study Design, Effect / Result, Risk of Bias |
| Reading Workflow | common practice | Key Point, Quote to Cite, Agree, Disagree, Question / Unclear, Definition, Follow Up (Reference), Own Idea |

Zotero+ is meant for literature work: the eight labels record what a study finds, how it can be criticized, how it was done, which theory it uses, which question it asks, what follows from it, what is missing and what is context.

A community collection for sharing your own schemes is in preparation. Until then, exchange profiles as files.

### Colors

Each row is one color:

- **⠿** handle: drag to reorder. Alt+↑/↓ in the text field moves the row as well.
- **Checkbox**: show or hide the color in the menus.
- **Number**: position in the menus. Hidden colors show “–”. A line marks where the **More Colors** submenu begins.
- **Swatch**: opens the color picker.
- **Label**: the name shown in the menus. Empty fields are marked with a dashed border.
- **Counter**: how many annotations in your libraries use this color (can be turned off).
- **✕**: removes the color from the profile. Annotations keep their color.

Below the list:

- **Add Color** adds a new color at the end.
- **Reset to Zotero+…** replaces the palette with the preset.
- **Apply Palette…** maps the whole profile to another palette (for example Pastel). Colors are matched by their position in the Zotero+ order, labels stay the same.
- **Save** stores the profile. If you changed colors that are already used by annotations, the plugin asks whether these annotations should be recolored as well. If you renamed a label that is already used as a tag, it asks whether the tags should be renamed.

### Color picker

The picker offers a saturation/brightness field, a hue slider, a hex field, the color picker of your operating system and six palettes with 12 colors each: Zotero+, Pastel, Light, Strong, Muted and Earth. Below them, **Recently Used** shows the last 12 colors you chose; this row also appears under **Apply Palette…**. **Sorted** shows the palettes ordered by hue; **Zotero** shows them in the order of the Zotero+ slots, so you can see which colors correspond to each other. Zotero+ always keeps its own order. Esc restores the previous color.

## Settings: Appearance

| Setting | Effect |
|---|---|
| Colors shown directly in the context menu | Number of colors before the **More Colors** submenu (default 8). The submenu is arranged in columns of up to 8 entries, so it does not grow out of the window. |
| Show “Customize Annotations…” in the context menu | Shortcut to the settings. |
| Selection popup: Adapt to the popup width | Colors fill the available width. Useful with plugins that add content to the popup, such as translators. |
| Selection popup: Fixed number of colors per row | The popup keeps the width of the color grid; wide content of other plugins wraps or scrolls. The customize button is always the last item. |
| Minimum number of colors per row | Only with “Adapt to the popup width” (default 8). |
| Items per row | Only with a fixed number (default 9). The customize button counts as an item; with 9, eight colors and the button share one row. |
| Show the customize button in the selection popup | Shortcut to the settings at the end of the colors. |
| Show labels immediately when hovering | Instant tooltip instead of the delayed system tooltip. |
| Reader toolbar | Button with the profile and the number of annotations; hovering shows the statistics by label. A right click on the button hides it. Optional: warning about shared colors, descriptions. |
| Sidebar | Section “Better Annotations” in the item pane. Its button sits with Zotero’s sections or in an area of its own between dividers. A right click on the header or the button opens the separate window, moves the button or removes the section. |

Whether a color creates a highlight or an underline is decided by Zotero’s own toggle below the colors in the popup. Zotero remembers the last choice.

## Settings: Tags & Library

All functions on this tab change annotations in your libraries. Each of them asks for confirmation first, explains the consequences and is recorded in the history so it can be undone.

### Tags

When **Add labels as tags** is enabled (off by default), every new annotation and every annotation whose color changes receives the label of its color as a tag, optionally with a prefix such as `#`. Only colors with a visible label in the active profile produce tags.

The plugin keeps a list of the tags it added (`tags.json`). Therefore it can:

- rename these tags when you rename a label,
- remove all of them (**Remove Plugin Tags…**),
- add them again or bring them in line with the active profile (**Apply Tags to Existing Annotations…**),

without touching tags you added yourself.

### Recolor annotations

Changes the color of all annotations that use one color, for example to merge two categories or to move existing annotations to a new palette.

- **Annotations in** sets the area. It refers to the main Zotero window: the open document, the selected items, the selected collection, its parent collection (optionally with subcollections), the selected library or all libraries. If you change the selection in the main window, click **Refresh**.
- **From** lists the colors that annotations in this area currently use, with their count. The name comes from the profile on the “Colors & Profiles” tab, otherwise from another profile (with its name in parentheses), otherwise it is the color name or hex code.
- **To** lists the colors of the profile on the “Colors & Profiles” tab, including unsaved changes, for example after **Apply Palette…**. Other colors in use follow, so you can merge codes.
- **Update tags** gives the annotations the label of the new color as a tag and replaces a previous plugin tag. The box is checked by default when tags are enabled.

Annotations in read-only group libraries and annotations stored inside the PDF file are skipped.

If you change colors on the “Colors & Profiles” tab that are already in use, **Save** also asks whether existing annotations should be recolored. This then applies to all libraries.

### Backups

A backup stores the color of every annotation. The first backup is created automatically on first start (“before installation”). **Restore…** sets the colors back and removes all plugin tags. Annotations created later and your own tags stay unchanged.

### History

Lists every change the plugin made to annotations (up to 50 entries). **Undo…** reverts one entry. Annotations that were deleted or changed again in the meantime are skipped.

## Settings: Export

Exports annotations as a table with one row per annotation. You choose the area as for recoloring.

| Column | Content |
|---|---|
| No., Color, Label, Type | Running number, hex code (a colored cell in Excel), label from the active profile, highlight, underline, note, text, image or drawing |
| Text, Image, Comment, Tags | Highlighted text, the image of image and drawing annotations, your comment and all tags |
| Page, Citation, Title, Authors, Year | Source information of the parent item, citation as “Author (Year)” |
| Collections, File, Link | Collections of the item, file name and a link that opens the annotation in Zotero |
| Created, Modified, Created by | Timestamps; “Created by” only for group libraries |

| Format | Best for |
|---|---|
| Excel (.xlsx) | Reviewing, filtering and sorting. Colored cells, embedded images, links back to Zotero, a frozen header row with filters and the sheets “Labels” (count per label) and “Info” (profile, area, date). |
| CSV (.csv) | R, Python, SPSS and other statistics software. UTF-8 with commas, without colors and images. |
| HTML (.html) | Reading, printing or saving as PDF. Grouped by source or label, with colors and images. |

Options: order by source and page or by label; include images; only annotations whose color has a label in the active profile.

Images of image and drawing annotations come from Zotero’s cache. If an image is missing, the plugin asks Zotero to render it. If that fails, open the document once in Zotero.

## Settings: About

Shows the version, compatibility, license, the credits, the data folder and links to this documentation, the release notes, the source code, **Report an Issue** and **Request a Feature** (forms in the GitHub issue tracker).

### Full backup

**Create Full Backup…** saves all plugin data in one JSON file: profiles, settings, the list of plugin tags, the history and the backups of annotation colors. Annotations, PDFs and other Zotero data are not included; they come from Zotero sync or your Zotero data directory.

On a new computer, set up Zotero as usual, install the plugin and choose **Load Full Backup…**. Libraries are stored in a portable form (“My Library” or the group ID), so tags and history work there as well. Before loading, the plugin saves the current state in the folder `full-backups`.

## Updates

Zotero checks for plugin updates automatically. **Check for Updates** in the header starts the same check immediately and, if an update is available, installs it through Zotero’s add-on manager. The header shows whether you have the latest version.

Whether Zotero installs updates on its own is set per plugin under **Tools → Plugins → Better Annotations → Allow automatic updates**. “Default” follows the general setting in the gear menu of the plugin manager. When you open the plugin settings, the plugin checks as well. If automatic updates are allowed, it installs a new version right away, as Zotero's plugin manager does (unless you have unsaved changes). If automatic updates are off for this plugin, a notice in the header offers **Install Update** and **Turn On Automatic Updates**. The plugin does not check in the background on its own; that is Zotero's job.

## Languages

By default, the plugin uses the language of Zotero. Available: English, German, Spanish, French, Italian, Japanese, Norwegian (Bokmål), Polish, Portuguese, Russian, Swedish, Simplified and Traditional Chinese. Other languages fall back to English. You can change the language in the header.

## Data and privacy

All data is stored in `<Zotero data directory>/better-annotations/`:

| File | Content |
|---|---|
| `profiles.json` | Profiles and settings (previous state in `profiles.json.bak`) |
| `tags.json` | Tags added by the plugin |
| `history.json` | Change history for undo |
| `backups/` | Backups of annotation colors |
| `full-backups/` | Automatic state before loading a full backup |

Profiles are stored on your computer and are not synced by Zotero. To move them to another computer, use **Create Full Backup…** or export single profiles.

When you uninstall the plugin, this folder stays, so a later installation finds your profiles again. Delete it manually if you no longer need it. Tags that the plugin added stay on your annotations; remove them before uninstalling with **Remove Plugin Tags…** if you do not want to keep them.

Nothing is stored in the Zotero database apart from the annotation colors and tags you change on purpose. The only network access is the update check, which uses Zotero’s own mechanism.

## Troubleshooting

**Every color underlines instead of highlighting.** Click the left half of the toggle below the colors in the selection popup. Zotero remembers this choice.

**Selecting text immediately creates a yellow highlight without a popup.** The highlight tool in the reader toolbar is active. Click it again or press Esc.

**The menus look like Zotero’s original menus.** Another plugin may modify the same menus, or a Zotero update changed the reader. Disable other color plugins and report the problem with the debug output (**Help → Debug Output Logging**, lines starting with `[BetterAnnotations]`).

**The toolbar buttons are missing.** They are added to documents opened after the plugin started; documents that were already open receive them within a few seconds.
