# Fonts

**Inter** — the sole Mapon typeface. Shipped locally in this directory as TTF (no CDN fetch, no Google Fonts import).

Includes three optical sizes:

| Optical | Files | Wired as CSS family | Use for |
|---|---|---|---|
| **18pt** | `Inter_18pt-*.ttf` | `Inter` | Body, UI, captions (≤ 24px) |
| 24pt | `Inter_24pt-*.ttf` | — (available, not wired) | Mid-size headlines if desired |
| **28pt** | `Inter_28pt-*.ttf` | `Inter Display` | Display type (`.mega`, `.hero`, `h1/h2`) |

9 weights (100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900) plus italics are on disk. `colors_and_type.css` wires the upright weights for both the text and display families; italics are available if you add `@font-face` lines for them.

Designer: Rasmus Andersson, 2019. Licensed under the [SIL Open Font License 1.1](https://fonts.google.com/specimen/Inter/license) — free to use, embed, and redistribute.

## Why two optical sizes?

Inter 18pt is hinted for small-to-medium on-screen sizes (4–24 px) with open apertures and wide letterspacing. The 28pt cut is drawn for display use — tighter spacing, smaller x-height relative to caps, more refined details. Using the right size per context gives crisper, more confident typography at both ends of the scale.

## Legacy

**Museo Sans 900** appears in the 2019 logotype in the Figma `/Logo-Pack` frames. It is commercial and **not bundled**. The current brand uses Inter exclusively — if you see Museo Sans, replace it with Inter Black (`font-weight: 900`).
