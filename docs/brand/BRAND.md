# Better Annotations – brand guide

Version 1.0 · November 2026 · The logo is fixed; do not change its shapes or colors.

## Name

- Full name: **Better Annotations**. In context of other software: **Better Annotations for Zotero**.
- Always two words, capitalized as shown. No abbreviation in public texts (internal code prefix: `bac`).
- Short description: *Name and extend annotation colors, switch color profiles and export annotations.*
- Author name: **CorsiQa.** (with the period).
- “Zotero” is a trademark of the Corporation for Digital Scholarship. Use it only in “for Zotero” and never use the Zotero logo.

## Logo

| File | Use |
|---|---|
| `logo.svg` | Master file (vector, 96 × 96 grid). Also used inside the plugin. |
| `logo-1024.png` … `logo-32.png` | Raster versions with transparent background |
| `lockup-light.png` / `.svg` | Logo with name, for light backgrounds |
| `lockup-dark.png` / `.svg` | Logo with name, for dark backgrounds |
| `../images/social-preview.png` | GitHub social preview, 1280 × 640 |

The SVG lockups use the font Inter as live text. Where Inter is not installed, use the PNG lockups.

Rules:
- Keep clear space around the logo of at least ¼ of its width.
- Minimum size: 16 px (screen).
- Do not recolor, rotate, stretch, outline or add effects. The light card gives enough contrast on dark backgrounds, so there is no separate dark logo.

### Logo colors

| Element | Name | Hex |
|---|---|---|
| Card | Paper | `#F4F1EA` |
| Card outline | Paper Edge | `#C9C2B3` |
| Bar 1 | Zotero Yellow | `#FFD400` |
| Bar 2 | Zotero Red | `#FF6666` |
| Bar 3 | Zotero Blue | `#2EA8E5` |
| Bar 4 | Zotero Green | `#5FB236` |
| Plus badge | Zotero Purple | `#A28AE5` |
| Plus sign | White | `#FFFFFF` |

The bar colors are Zotero's own annotation colors, so the logo reads as “Zotero annotations”.

Geometry (96-unit grid): card 80 × 76 at (8, 10), corner radius 14, outline 2. Bars 9 high with fully rounded ends, widths 60 / 44 / 52 / 34, left edge at 18, rows at 22 / 37 / 52 / 67. Badge: circle r = 13 at (72, 70) with a 3-unit Paper outline, plus sign 12 long, stroke 3, round caps.

## Colors

### Brand

| Token | Hex | Use |
|---|---|---|
| Brand Violet | `#6B5BD6` | Accent in public material: second word of the name, links, highlights |
| Violet Light | `#B3A8F2` | Accent on dark backgrounds |
| Ink | `#1F2330` | Headings and body text on light backgrounds |
| Slate | `#4A4F5C` | Secondary text |
| Muted | `#6B6F7A` | Captions, meta information |
| Canvas | `#FBFAF7` | Page background of public material |
| Lilac Mist | `#F1EEFB` | End of the background gradient |
| Surface | `#FFFFFF` | Cards |
| Line | `#E7E5EE` | Dividers and borders |
| Night | `#1D1D1F` | Background in dark mode |
| Night Text | `#F3F2F8` | Text in dark mode |

Background gradient (social preview, banners): `linear-gradient(135deg, #FBFAF7 0%, #F1EEFB 100%)`.

### Settings header gradient (inside the plugin)

The header of the settings page mixes three annotation colors into Zotero's background, so it follows light and dark mode:

```css
linear-gradient(135deg,
  color-mix(in srgb, #FFD400 14%, var(--bg)),
  color-mix(in srgb, #2EA8E5 12%, var(--bg)) 55%,
  color-mix(in srgb, #E56EEE 12%, var(--bg)))
```

On a white background this gives approximately `#FFF9DB` → `#E6F5FC` → `#FCEEFD`.

Inside the plugin, buttons, focus rings and selected states use Zotero's own accent color (`--accent-blue`) so that the plugin looks like part of Zotero. Brand Violet is reserved for material outside Zotero.

### Annotation palette Zotero+

| Slot | Name | Hex | Default label |
|---|---|---|---|
| 1 | Yellow | `#FFD400` | Key Finding |
| 2 | Red | `#FF6666` | Critique / Limitation |
| 3 | Green | `#5FB236` | Method & Data |
| 4 | Blue | `#2EA8E5` | Theory & Definition |
| 5 | Purple | `#A28AE5` | Research Question / Hypothesis |
| 6 | Magenta | `#E56EEE` | Implication |
| 7 | Orange | `#F19837` | Research Gap |
| 8 | Gray | `#AAAAAA` | Background |
| 9 | Teal | `#2BC4A9` | – |
| 10 | Pink | `#FF85B8` | – |
| 11 | Indigo | `#6B7FF0` | – |
| 12 | Lime | `#B4D334` | – |

## Typography

| Role | Typeface | Weights |
|---|---|---|
| Headings, name, lockup | Inter | 700 (name), 600 (headings) |
| Body text | Inter | 400, 500 |
| Code, hex values | System monospace (`ui-monospace`, Menlo, Consolas) | 400 |
| Inside the plugin | Zotero's system font | as Zotero |

Inter is free (SIL Open Font License): https://rsms.me/inter/ or Google Fonts. Letter spacing for large headings: −0.5 to −1 px. Sentence case for headings and buttons in all languages except where the language demands otherwise.

## Shapes

- Corner radius: logo card 15 % of its width; cards 10–12 px; pills and badges 9 px; swatches 3–6 px.
- Shadows only for floating elements (menus, popovers): `0 8px 24px rgba(0,0,0,.22)`.
- Color swatches always with a thin border (`rgba(0,0,0,.15)`), so light colors stay visible.

## Writing style

- Public texts in English; documentation also in German.
- Sober and descriptive: describe what the plugin does, not what users should feel. No superlatives.
- Short sentences, active voice, no exclamation marks.
- Buttons that open a dialog end with an ellipsis (…), as in Zotero.
- Name things as Zotero does: annotation, highlight, underline, collection, library, tag.
