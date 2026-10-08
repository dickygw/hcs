# Pegadaian Design System

Brand and interface foundations for **PT Pegadaian**, the Indonesian state-owned pawnbroking and gold-services company, now part of the **Danantara Indonesia** holding. The company's promise — *Mengatasi Masalah Tanpa Masalah* ("solving problems without problems") — sits inside the logo lockup and sets the tone for everything here: practical, warm, unfussy.

This system was built from brand material supplied by the client. It is not a reconstruction from memory, and nothing in it was invented where a source existed.

## Sources used

| Source | What came out of it |
|---|---|
| `uploads/MASTER LOGO 2.png`, `MASTER LOGO 3.png` | Horizontal and stacked Pegadaian lockups → `assets/logo/` |
| `uploads/Danantara_Indonesia_Logo_vector (Color \| White).png` | Holding-company lockups → `assets/logo/` |
| `uploads/Ronnia-*.ttf`, `RonniaCond-*.ttf` (32 files) | The corporate typeface, Ronnia by Rosetta Type Foundry → `assets/fonts/`, `tokens/fonts.css` |
| `uploads/[UNTUK DI DOWNLOAD] - Template PPT Resmi Pegadaian Corporate Version (2).pptx` | Slide geometry, type scale, colour values, 10 corporate icons, 3 patterns, 15 photographs, 4 cut-out figures → `assets/`, `slides/` |
| Client instruction | The three mandated colours `#fbc513`, `#75c044`, `#0da94d` |

No codebase, Figma file, or product URL was supplied. See **Gaps** at the end.

---

## Content fundamentals

**Language.** Indonesian first, formal-but-plain register (*bahasa baku* without officialese). English appears only in borrowed business nouns the company itself uses — "Business", "Program", "Portofolio" all appear verbatim in the official deck. When a design needs bilingual copy, Indonesian leads and English follows in a smaller size, never the reverse.

**Person.** The company addresses the customer as **Anda**, and refers to itself as **Pegadaian** or **kami** — never "aku/kamu", never first-person singular. Corporate decks drop the pronoun entirely and speak in noun phrases: *Struktur*, *Alur*, *Kegiatan 2025*.

**Casing.** Sentence case everywhere — headings, buttons, form labels, table headers. Title Case is reserved for proper product names (*Tabungan Emas*, *Gadai Emas*, *Galeri 24*, *Pegadaian Digital*). ALL CAPS appears only as eyebrow/kicker type at 12px with 0.12em tracking, never as a heading and never in a button.

**Length.** Slide titles are one or two words (*Judul*, *Program*, *Struktur*, *Portofolio*, *Tim*). Body copy runs 2–4 sentences per block; the template never lets a paragraph exceed roughly 400 characters. Buttons are 1–3 words, verb-first: *Ajukan Sekarang*, *Buka rekening*, *Simulasi*.

**Numbers.** Indonesian conventions — comma as decimal separator, full stop as thousands separator: `0,01 gram`, `Rp 1.250.000`. Dates spelled out: `11 September 2026`.

**Tone examples.**
- Reassuring, not salesy: "Menabung emas mulai dari 0,01 gram, tersimpan aman di Pegadaian."
- Instructional, not chatty: "Pastikan taksiran dan tenor sudah sesuai sebelum dikirim ke cabang."
- Direct in errors, no apology padding: "Nomor HP belum lengkap." — not "Maaf, sepertinya ada masalah…"

**Emoji.** Never. The brand has a full icon set (see Iconography); emoji do not appear in any supplied material and must not be introduced.

---

## Visual foundations

### Colour

Three mandated colours carry the system: **`#fbc513` Kuning**, **`#75c044` Hijau Muda**, **`#0da94d` Hijau**. Around them sit the heritage greens pulled from the logo mark and the corporate deck — `#bfd730` lime, `#007249`, `#018d5b`, and the ink colour **`#064e43` forest**, which is the heading colour for the whole system.

Rules that fall out of the source material:

- **Green is the action colour.** Gold is *value* — emas products, promotions, highlight numbers — and never a default button.
- **Forest is the ink**, not black. Headings, slide titles and the page number are all `#064e43`. Pure black appears nowhere.
- **Never white text on gold.** Forest on gold is 8.9:1; white on gold fails. Forest on lime (5.7:1) is likewise the only correct pairing.
- **One or two backgrounds per artefact.** The corporate deck is white / `#fafafa` throughout with colour arriving through photography and small lime accents. Do not build dark decks.
- Full ramps (50→900) exist for green, gold, lime and a warm green-tinted neutral scale. Tints below 200 are wash colours; 500+ are ink colours.

### Type

**Ronnia** (Rosetta Type Foundry) is the corporate typeface, supplied in eight upright weights plus italics, with **Ronnia Cond** for tables, data and tight slide furniture. It is a slab-flavoured humanist face with a large x-height — friendly at text sizes, solid at display sizes.

- Display and headings: Ronnia **Bold 700**, leading 1.02–1.2, tracking −0.02em.
- Body: Ronnia **Regular 400**, leading 1.45 (UI) to 1.62 (long-form).
- Eyebrows and overlines: **SemiBold 600**, 12px, uppercase, 0.12em tracking, `--pgd-green-dark`.
- Scale is a 1.25 major third off a 16px base, with a separate slide scale (107 / 33 / 26px) taken from the PPT.

> **Substitution note.** The official PPT was typeset in **Poppins + Lato**, because Ronnia is not installable in Google Slides. This system standardises on Ronnia, which is the licensed brand face the client supplied. If Poppins/Lato must be matched exactly for a Slides deliverable, say so and we will add them as a deck-only pair.

### Layout & spacing

4px base step. Cards pad 24px, stacks gap 16px, inline groups gap 12px, page sections 64px. Web layouts cap at 1200px (`--container-max`). Slides are a fixed 1920×1080 with a 184px side margin and a 1573px live band — those numbers come straight out of the template XML.

### Shape

Corners are generous but not pill-shaped: controls 8px, cards 16px, media 20px, large panels 24px. The logo mark is circular and photography picks that up — the title slide masks talent into an 820px white circle, and content photos use an arch (350px top radius, 24px bottom).

### Backgrounds & texture

White and `#fafafa` dominate. Three supplied textures carry the brand pattern language, all green on white: a **halftone dot field** that fades from dense to sparse (used as a full-bleed circle behind cover talent), a **regular dot grid**, and a thin **orbit ring**. There are no gradients-as-background in the source material — `--gradient-brand` exists only as a 4–6px cap on cards and panels, and `--gradient-forest` only for small solid-colour tiles. No mesh gradients, no purple, no glassmorphism.

### Photography

Warm daylight, real branches, real uniformed staff. Consistent traits across the fifteen supplied photographs: natural window light, mid-warm white balance, shallow depth, people looking at each other or at a screen rather than at camera. Batik and hijab are present and normal. Four figures are supplied as transparent cut-outs for hero and cover layouts. Images are never desaturated, never duotoned, never given a colour overlay — when text must sit over a photo, use `--scrim-bottom` (a forest-to-transparent scrim), not a tint.

### Elevation

Shadows are **green-tinted** (`rgba(6,78,67,…)`), never neutral black — they read correctly on the warm off-white. Six steps from `--shadow-xs` hairline to `--shadow-xl` modal, plus `--shadow-accent` / `--shadow-gold` glows used only on hover for filled buttons. Inner shadow exists for inset fields but is rarely needed.

### Borders

1px `--border-subtle` (`#e4e8e5`) is the default card and divider stroke. Focus is a 3px lime ring (`--ring-focus`), which is the one place `#75c044` appears as a system colour rather than an accent. The 4px brand-gradient cap on cards and the 5px green cap on panels come from the deck.

### Motion

Fast and confident, no bounce and no spring. 140ms for control state, 220ms for surfaces, 360ms for anything entering the page; `cubic-bezier(.2,0,0,1)` as standard and `cubic-bezier(.16,1,.3,1)` for entrances. Transitions are colour, shadow and small translation only — nothing rotates, nothing overshoots.

### Interaction states

- **Hover** — filled buttons darken one ramp step and gain their tinted glow; outline and ghost fill with `--green-50`; cards lift 2px and go to `--shadow-lg`.
- **Press** — scale to 0.985 and darken a second ramp step. No colour inversion.
- **Focus** — 3px lime ring, always visible, never removed.
- **Disabled** — flat `--neutral-100` fill, `--text-disabled` label, no shadow, `not-allowed` cursor. Opacity-only disabling is not used.
- **Selected** — lime-100 fill with a `#75c044` border (tags), or a 3px green inset rule (tabs).

### Transparency & blur

Sparingly. The only blur in the system is the 3px backdrop blur behind a modal, over a 62%-opacity forest scrim. Inverse surfaces use `rgba(255,255,255,.14)` fills and `.24` borders. Text is never set in a transparent colour — muted text uses a solid neutral.

---

## Iconography

The brand does **not** use a public icon library. Ten corporate icons were extracted from the official deck and ship in `assets/icons/`, in two colourways: the original **white** artwork (for forest and green grounds) and a generated **`#064e43` green** recolour (for light grounds).

`chevron` · `network` · `podium` · `leadership` · `feedback` · `handshake` · `gears` · `team-gear` · `org-circle` · `hub`

They are PNGs, not an icon font and not SVG — that is how they arrived. Stroke weight is heavy (roughly 8% of the icon box) and the set mixes outline with solid fill within a single glyph, which is why substituting Lucide or Heroicons looks visibly wrong next to them. Small UI affordances that the set does not cover (× close, ↓ download, chevrons in a select) are drawn from CSS borders or plain Unicode, as they are in the components here — not from a third-party set.

Use `<Icon name="handshake" tone="green" basePath="…" />`. Emoji are never used as icons. If a concept is missing from the ten, **ask for the file** rather than drawing a replacement.

**Substitution flagged:** none. No third-party icon library has been introduced.

---

## What's in here

```
styles.css              single entry point — @import list only
tokens/                 fonts · colors · typography · spacing · radius · elevation · motion · base
assets/
  fonts/                Ronnia + Ronnia Cond (13 weights shipped of 32 supplied)
  logo/                 Pegadaian horizontal / stacked / tagline / mark · Danantara colour + white
  icons/                10 corporate icons × 2 colourways
  patterns/             halftone dots · dot grid · orbit ring
  illustrations/        triangle puzzle diagram
  photos/               15 photographs + 4 transparent cut-outs
components/             see below
guidelines/             25 foundation specimen cards (Design System tab)
slides/                 9 corporate slide layouts + click-through deck · README.md
thumbnail.html          homepage tile
SKILL.md                Agent-Skills wrapper for use in Claude Code
```

### Components

Grouped by concern; each has a `.jsx`, a `.d.ts` props contract, a `.prompt.md`, and a shared `@dsCard` per directory.

- **core/** — `Button`, `IconButton`, `Badge`, `Tag`, `Card`
- **forms/** — `Input`, `Select`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`
- **feedback/** — `Dialog`, `Toast`, `Tooltip`
- **navigation/** — `Tabs`
- **brand/** — `Logo`, `Icon`, `BrandBar`, `MarkerLabel`

No component source (codebase or Figma library) was supplied, so this is the standard primitive set sized to the brand, not a recreation of an existing Pegadaian component library.

**Intentional additions** — four components that exist because the brand material demands them, not because a library usually has them:
- `Logo` — so no one ever redraws the mark; it only ever renders supplied files.
- `Icon` — a wrapper over the extracted PNG set, so the house icons stay in use instead of a CDN substitute.
- `BrandBar` — the Pegadaian + Danantara co-branding strip that appears on every official slide and document.
- `MarkerLabel` — the lime-square-and-chevron caption lockup used throughout the corporate deck.

---

## Gaps

- **No product UI kit.** No app screens, website source, Figma file, or repository was provided, so no UI kit has been built. Recreating the Pegadaian Digital app or pegadaian.co.id from memory or screenshots would produce something the team would not recognise. Attach a repository, a Figma link, or exported screens and the kit follows.
- **No mono / knockout Pegadaian lockup** was supplied. On dark grounds, place the colour lockup on a white plate rather than recolouring it.
- **Poppins + Lato** are the fonts in the official PPT; this system uses Ronnia instead (see the substitution note above).
- Only 13 of the 32 supplied Ronnia cuts are wired into `@font-face`; the rest are available in `uploads/` if more weights are needed.
