<div align="center">

<p><img src="docs/images/banner.png" width="100%" alt="Better Annotations for Zotero: every annotation color with a meaning. A context menu with labeled colors, the item pane section with the number of annotations per label, and the profile button with statistics."></p>

<p>
<a href="https://github.com/CorsiQa/zotero-better-annotations/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/CorsiQa/zotero-better-annotations?include_prereleases&style=flat&label=release&color=6B5BD6"></a>
<a href="https://github.com/CorsiQa/zotero-better-annotations/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/CorsiQa/zotero-better-annotations/total?style=flat&label=downloads&color=2EA8E5"></a>
<a href="#compatibility"><img alt="Zotero 7 to 10" src="https://img.shields.io/badge/Zotero-7%E2%80%9310-CC2936?style=flat"></a>
<a href="#compatibility"><img alt="Tested on Zotero 10" src="https://img.shields.io/badge/tested%20on-Zotero%2010-5FB236?style=flat"></a>
<a href="#features"><img alt="11 languages" src="https://img.shields.io/badge/languages-11-F19837?style=flat"></a>
<a href="#license-and-credits"><img alt="License AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-A28AE5?style=flat"></a>
</p>

<p>
<a href="https://github.com/CorsiQa/zotero-better-annotations/releases/latest"><img src="docs/images/buttons/download.svg" height="34" alt="Download"></a>&nbsp;
<a href="#features"><img src="docs/images/buttons/features.svg" height="34" alt="Features"></a>&nbsp;
<a href="#installation"><img src="docs/images/buttons/installation.svg" height="34" alt="Installation"></a>&nbsp;
<a href="#faq"><img src="docs/images/buttons/faq.svg" height="34" alt="FAQ"></a>&nbsp;
<a href="docs/README.md"><img src="docs/images/buttons/documentation.svg" height="34" alt="Documentation"></a>&nbsp;
<a href="docs/README.de.md"><img src="docs/images/buttons/dokumentation.svg" height="34" alt="Dokumentation (DE)"></a>
</p>

</div>

<a name="at-a-glance"></a>

## <img src="docs/images/icons/glance.svg" width="26" height="26" align="top" alt="">&nbsp;At a glance

- 🏷️ **A label for every annotation color**, right where you pick a color in Zotero's reader.
- 🎨 **As many colors as you need**, in your order, saved as **profiles** you can switch.
- 📌 **A section in the item pane** to pick colors, count annotations and drag colors onto highlights.
- 🧪 **Optional advanced functions** (descriptions, labels as tags, a profile per document) that make coding, qualitative analysis and structured literature reviews possible.
- 📤 **Export** to Excel, CSV and HTML, with labels. Every change to annotations can be undone.
- 🆓 Free and open source, Zotero 7 to 10, 11 languages. ⏱️ [Install in a minute](#installation).

> [!NOTE]
> **Beta.** Better Annotations works in daily use, but has not yet been tested widely. Please back up your Zotero data directory before you try it and [report problems](https://github.com/CorsiQa/zotero-better-annotations/issues/new?template=bug_report.yml).

Zotero offers eight annotation colors without names, so it is easy to forget which color stands for what. Better Annotations gives every color a label that appears wherever you choose a color, lets you add as many colors as you need and keeps several color sets as profiles. Use it to mark findings, methods or open questions while you read. With the advanced functions turned on, it goes further: a label can stand for any category, including a code, a document can keep its own scheme, and the export lists every annotation with its label.

<a name="features"></a>

## <img src="docs/images/icons/features.svg" width="26" height="26" align="top" alt="">&nbsp;Features

<table>
<tr>
<td width="54%" valign="middle">

## 🏷️ Labels where you choose a color

The label of a color appears wherever Zotero lets you pick one, so you always see what a color means.

> 🖱️ **Context menu and toolbar.** Every color shows its label. Colors beyond the first eight move into a submenu.
>
> ✨ **Selection popup.** Hover a color to see its label and its description.
>
> 🔎 **Sidebar filter.** The color filter of the annotation sidebar names the colors as well.

</td>
<td width="46%" valign="middle"><img src="docs/images/feature-labels.png" width="380" alt="Context menu of a highlight in Zotero's PDF reader: colors with labels such as Key Point, Quote to Cite and Agree, the submenu More Colors and the entry Customize Annotations"></td>
</tr>
</table>

<table>
<tr>
<td width="46%" valign="middle"><img src="docs/images/feature-itempane.png" width="380" alt="Section Better Annotations next to a PDF: the profile Reading Workflow with its labels, their descriptions and the number of annotations per label"></td>
<td width="54%" valign="middle">

## 📌 A section in the item pane

Next to the reader, a section lists the labels of the document's profile with the number of annotations.

> 👆 **Click to annotate.** A click on a label starts highlighting in its color, or colors the selected text once.
>
> 🔢 **Counts.** See how often each label is used in the document, or in all files of an item in the library.
>
> 📝 **Descriptions at hand.** What a label stands for appears right below it.
>
> 🪟 **Separate window.** The same list in its own window, for example on a second screen.

</td>
</tr>
</table>

<table>
<tr>
<td width="54%" valign="middle">

## 🖐️ Annotate by drag and drop

Drag a label from the item pane onto a passage. Sorting passages into categories becomes as quick as sorting cards, for example when you code text in a qualitative content analysis.

> 🎯 **Onto highlights.** Drop a color on a highlight in the PDF to give it this color.
>
> ✍️ **Onto selected text.** Drop it on selected text to highlight it.
>
> 🗂️ **Onto the sidebar.** Drop it on an annotation in the sidebar; if several are selected, all of them change.
>
> ↩️ **Undo as usual.** Ctrl+Z reverts the change in the reader.

</td>
<td width="46%" valign="middle"><img src="docs/images/feature-drag.png" width="380" alt="The label Follow Up is dragged from the item pane onto a highlight in the PDF, which is outlined while the label hovers over it"></td>
</tr>
</table>

<table>
<tr>
<td width="46%" valign="middle"><img src="docs/images/feature-toolbar.png" width="380" alt="Profile button in the reader toolbar with the statistics: annotations per label with colored bars, grouped by the profiles Reading Workflow and Literature Review"></td>
<td width="54%" valign="middle">

## 📊 Reader toolbar and statistics

One button in the reader toolbar shows the profile of the document and how many annotations it has.

> 🔀 **Switch profiles.** A click opens the profile menu.
>
> 📈 **Statistics.** Hover the button to see the annotations per label, grouped by profile.
>
> 🎯 **One profile at a time.** A filter shows only the annotations of the document's profile, in the list and in the document.
>
> ↔️ **Tools in the middle.** Zotero's tools stay above the middle of the document, however long the profile name is.

</td>
</tr>
</table>

<table>
<tr>
<td width="54%" valign="middle">

## 🗂️ Profiles and templates

Keep different color schemes for different kinds of work, and start from proven ones.

> 🗂️ **Profiles.** One scheme for reading, another one for a review. Switching changes the labels, never your annotations.
>
> 📚 **Template library.** Literature Review (TCCM, ADO), Toulmin's argument analysis, the paradigm model of Grounded Theory, PICO and a reading workflow.
>
> 🔁 **Share.** Export a profile as a file and import the profiles of colleagues.
>
> 🧩 **Coming from another plugin?** Better Annotations offers to take over the labels of other color plugins as a profile.

</td>
<td width="46%" valign="middle"><img src="docs/images/feature-profiles.png" width="380" alt="Template library in the settings with Zotero+, Literature Review TCCM and ADO and Toulmin's argument analysis, each with its labels"></td>
</tr>
</table>

<table>
<tr>
<td width="46%" valign="middle"><img src="docs/images/feature-advanced.png" width="380" alt="Annotations in the reader's sidebar: each shows its profile, such as Reading Workflow or Literature Review TCCM, in its head and its label as a tag"></td>
<td width="54%" valign="middle">

## 🧪 Advanced functions for coding and reviews

Three functions turn your labels into a coding scheme. They are off by default; you turn them on under **Advanced**.

> 📝 **Descriptions.** Define what each label means and when to use it, like the definition of a code.
>
> 🏷️ **Labels as tags.** Annotations receive the label of their color as a tag, so coded passages can be searched and filtered across the library.
>
> 📄 **Profile per document.** Every document keeps its own scheme. Each annotation shows its profile, so several schemes can live in one document.
>
> 📁 **Rules for collections.** Give all documents of a collection the same scheme.

</td>
</tr>
</table>

<table>
<tr>
<td width="54%" valign="middle">

## 🎛️ Make it yours

Nearly everything can be adjusted, so the plugin fits the way you work.

> 🎨 **Colors.** Any number of colors, picked freely, from palettes or by hex code, in your order. Hide what you do not need.
>
> 🧭 **Menus and popup.** How many colors appear directly, how the selection popup is arranged and how fast labels appear.
>
> 🧱 **Where things appear.** Toolbar button, item pane section, separate window, descriptions: show what you use.
>
> 🌍 **Language.** 11 languages, following Zotero or chosen in the settings.

</td>
<td width="46%" valign="middle"><img src="docs/images/feature-settings.png" width="380" alt="Settings of Better Annotations: profile card and the list of colors with labels, descriptions and counters"></td>
</tr>
</table>

<table>
<tr>
<td width="46%" valign="middle"><img src="docs/images/feature-export.png" width="380" alt="Exported Excel workbook: one row per annotation with colored number and label cells, type, extract, comment and description, and an image annotation"></td>
<td width="54%" valign="middle">

## 📤 Export

Export the annotations of a document, a collection or a library with one row per annotation.

> 📗 **Excel.** Colored cells, images, grouped columns, a sheet with all labels and their descriptions, and links back to Zotero.
>
> 📄 **CSV.** For R, Python, SPSS and other software, in UTF-8.
>
> 🌐 **HTML.** A readable report grouped by source or by label, to print or save as PDF.
>
> 🧭 **Your selection.** Choose the area, the order, the profile and the columns.

</td>
</tr>
</table>

## ✨ More functions

> 🎨 **Recolor and merge.** Change the color of existing annotations in a document, the selected items, a collection or a whole library.
>
> 💾 **Backups.** The colors of all annotations are saved when the plugin starts for the first time.
>
> ↩️ **History.** Every change the plugin makes to annotations is listed and can be undone.
>
> 🧳 **Full backup.** Moves all profiles, settings and the history to another computer.
>
> 🔄 **Updates.** Zotero installs new versions automatically; the settings show whether you have the latest one.

<a name="installation"></a>

## <img src="docs/images/icons/install.svg" width="26" height="26" align="top" alt="">&nbsp;Installation and quick start

### Install

1. Download `better-annotations-<version>.xpi` from the [latest release](https://github.com/CorsiQa/zotero-better-annotations/releases/latest) (in Firefox: right-click → Save Link As).
2. In Zotero, open **Tools → Plugins**.
3. Drag the file into the window, or click the gear icon and choose **Install Plugin From File…**.

Zotero installs future versions automatically. The plugin never changes existing annotations without asking; they keep their colors after installation.

### First steps

1. Open **Edit → Settings** (macOS: **Zotero → Settings**) and choose **Better Annotations**.
2. Type a label next to each color, or click **Browse Templates** and start from a template.
3. Click **Save**.
4. Open a PDF. The section **Better Annotations** appears in the item pane on the right. Click a label and select text, or select text and pick a color in the popup.

To give documents their own schemes, turn on **Profile per Document** under **Advanced**. The [documentation](docs/README.md) explains every setting.

<a name="faq"></a>

## <img src="docs/images/icons/faq.svg" width="26" height="26" align="top" alt="">&nbsp;Frequently asked questions

### 🏷️ Labels and colors

#### How do I rename or label the highlight colors in Zotero?

Zotero itself does not offer this. Open the settings of Better Annotations and type a label next to each color. The labels then appear in the reader's menus, in the selection popup, in the sidebar filter and in the item pane section.

#### How do I get more colors or my own colors?

Click **Add Color** and choose any color with the color picker, from a palette or by hex code. There is no fixed limit. Colors beyond the first eight appear in a submenu of the context menu and in further rows of the selection popup. Colors you do not need right now can be hidden.

#### Another plugin for annotation colors is installed. What should I do?

Highlight Color Descriptions, Annotation Color Customizer and Just Enough Color change the same menus, so labels can appear twice or wrong. The settings of Better Annotations show a notice while one of them is active and offer to take over its labels as a profile. Then disable the other plugin under **Tools → Plugins**.

### 🗂️ Profiles and advanced functions

#### What is the difference between the active profile and “Profile per Document”?

Without “Profile per Document”, one profile applies to all documents. Switching it changes the labels everywhere. With the function turned on, every document keeps its own profile: the one you last chose in it, otherwise the profile of most of its annotations, a rule for its collection or the default profile.

#### What are the tags “ZBA: …” on my annotations?

With “Profile per Document”, each new annotation gets a profile tag such as “ZBA: Literature Review”. It records which scheme the annotation belongs to, so the same color can mean different things in different profiles, and it syncs with your library. The reader hides the tag in the annotation and shows the profile name in its head instead. Turning the function off asks whether the tags stay; renaming or deleting a profile updates them.

#### Why does an annotation count as “Standard” or “No profile”?

With “Profile per Document”, only the profile tag puts an annotation into a profile. Annotations without a tag count as “Standard” if they have one of Zotero's eight colors, otherwise as “No profile”. **Assign** in the item pane gives them the tag of the document's profile.

#### Can I use the plugin for coding, qualitative analysis or a literature review?

Yes. A label can stand for any category, including a code; descriptions hold the definition of each code; labels as tags make coded passages searchable across the library; a profile per document lets several schemes live side by side; and the export lists all annotations with their labels, like a list of coded segments. The template library has schemes for reviews and analysis. Better Annotations does not replace software such as MAXQDA or NVivo: it has no code hierarchy, memos or intercoder agreement. Its exports can be processed further in other software.

#### How can my team use the same labels in a group library?

Profiles are stored on each computer. Export your profile and let colleagues import it. Tags (labels as tags, profile tags) are part of the group library, so every member sees them.

### 💾 Backup, sync and export

#### Does the plugin change my existing annotations?

Only when you ask it to, for example when you recolor annotations, add tags or assign profiles. It asks first, records the change in the history and can undo it. On first start it saves the colors of all annotations.

#### How do I undo a change or go back to the state before installation?

Under **Library → History**, **Undo…** reverts a single change. Under **Library → Backups**, **Restore…** sets the colors back to a backup, for example the one “before installation”, and removes the plugin's tags. Annotations created later and your own tags stay unchanged.

#### Are my profiles synced between computers?

Not by Zotero sync. Annotations and their tags sync as usual, but profiles and settings stay on the computer. Use **Create Full Backup…** on one computer and **Load Full Backup…** on the other, or export single profiles.

#### How do I export annotations to Excel or CSV, or group them by color?

Open the **Export** tab, choose the area, the format and the order. Each annotation becomes one row with label, text or image, comment, tags, page, source and a link back to Zotero. Ordered by label, the Excel file can be filtered by label and the HTML report groups all annotations under their labels.

#### What happens when I uninstall the plugin?

Your annotations keep their colors, and tags stay on them. Remove plugin tags first with **Remove Plugin Tags…** if you do not want to keep them. The folder `better-annotations` in your Zotero data directory stays, so a later installation finds your profiles again.

#### Does the plugin send data anywhere?

No. The only network access is Zotero's own update check.

<a name="compatibility"></a>

## <img src="docs/images/icons/compatibility.svg" width="26" height="26" align="top" alt="">&nbsp;Compatibility

- ✅ **Zotero 10:** tested.
- ☑️ **Zotero 7 to 9:** supported, not yet tested. Reports are welcome.

Some plugins change the same menus or the selection popup:

- ⚠️ **[Highlight Color Descriptions](https://github.com/paulMrG2/zotero-highlight-descriptions), [Annotation Color Customizer](https://github.com/aidecameron/zotero-annotation-color-customizer), [Just Enough Color](https://github.com/MCXCC303/just-enough-color):** rename or add colors in the same menus. Better Annotations shows a notice and offers to take over their labels; then disable them.
- ⚠️ **[Zotero Style](https://github.com/MuiseDestiny/zotero-style):** has its own editor for annotation color names. Do not use both for annotation colors.
- ⚠️ **[Actions & Tags](https://github.com/windingwind/zotero-actions-tags):** scripts that rename colors change the same menus, and actions that tag new annotations can add tags twice. Use one of both for these tasks.
- ✅ **[Translate for Zotero](https://github.com/windingwind/zotero-pdf-translate):** no conflict. Choose a popup layout under **Appearance** if the popup gets crowded.

<a name="development"></a>

## <img src="docs/images/icons/development.svg" width="26" height="26" align="top" alt="">&nbsp;Development

The project follows a UX-first approach: every function should feel like part of Zotero, follow Zotero's conventions and stay accessible by keyboard. At the same time, the plugin aims at a wide range of functions and a high degree of customization, with advanced functions that stay out of the way until you turn them on. All functions are tested as thoroughly as possible, with automated tests in a simulated Zotero and by hand in Zotero itself, and refined over many rounds of feedback.

Help is welcome:

- 🧪 **Testing:** try the plugin in your own workflow and on Zotero 7, 8 or 9, and [report](https://github.com/CorsiQa/zotero-better-annotations/issues/new?template=bug_report.yml) what works and what does not.
- 🌍 **Languages:** suggestions for better wording in any language are welcome, as an issue or a pull request ([how to](CONTRIBUTING.md#translations)).
- 💡 **Ideas:** [suggest a feature](https://github.com/CorsiQa/zotero-better-annotations/issues/new?template=feature_request.yml) or join the [Discussions](https://github.com/CorsiQa/zotero-better-annotations/discussions).

Better Annotations is developed with AI: Claude (Anthropic) writes its code and its translations. The maintainer sets the goals, decides on functions and design and tests every version in Zotero.

<a name="for-developers"></a>

## <img src="docs/images/icons/developers.svg" width="26" height="26" align="top" alt="">&nbsp;For developers

The plugin is plain JavaScript and runs in Zotero without a build step. [CONTRIBUTING.md](CONTRIBUTING.md) describes the files, translations, versions and the release process.

```
node scripts/build.mjs           # builds dist/better-annotations-<version>.xpi and dist/updates.json
node scripts/check-locales.mjs   # checks that all languages have the same strings
```

Releases are published by GitHub Actions as soon as a new version reaches `main`; the action builds the `.xpi` file and `updates.json`, from which Zotero learns about new versions. A second action raises the supported Zotero version without a new release.

<a name="license-and-credits"></a>

## <img src="docs/images/icons/license.svg" width="26" height="26" align="top" alt="">&nbsp;License and credits

Copyright © 2026 CorsiQa.

[GNU Affero General Public License v3.0 or later](LICENSE). You may use, share and change the plugin; changed versions that you distribute must be published under the same license. The name Better Annotations and its logo are not covered by the AGPL license. Please do not use them for other projects without permission.

Zotero is a registered trademark of the [Corporation for Digital Scholarship](https://digitalscholar.org). This plugin is an independent project and not affiliated with Zotero.

If the plugin helps your research, you can cite it with the information in [CITATION.cff](CITATION.cff) or the “Cite this repository” button on GitHub.

Thanks to the authors of these plugins, which Better Annotations builds on:

- [Just Enough Color](https://github.com/MCXCC303/just-enough-color) by MCXCC303: the method for creating annotations in arbitrary colors is adapted from this plugin (AGPL-3.0-or-later); the functions in `content/reader.js` say so.
- [Zotero Highlight Color Descriptions](https://github.com/paulMrG2/zotero-highlight-descriptions) by paulMrG2: the idea of showing labels in the reader's color menus.
- [Annotation Color Customizer](https://github.com/aidecameron/zotero-annotation-color-customizer) by aidecameron: the idea of renaming annotation colors.

The screenshots show the article Block, J. H., Colombo, M. G., Cumming, D. J., & Vismara, S. (2018). New players in entrepreneurial finance and why they are there. *Small Business Economics, 50*(2), 239–250. [https://doi.org/10.1007/s11187-016-9826-6](https://doi.org/10.1007/s11187-016-9826-6). It is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
