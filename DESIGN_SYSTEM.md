# Design system

A single, coherent visual language for Imre Rajci's UX/UI portfolio. This
document is the source of truth for anyone (human or AI) extending the site.
It describes the tokens and components already implemented in the project —
it does not describe an aspirational future state.

## How the system is implemented

The project is static, hand-authored HTML — no framework, no build step, no
bundler. There is therefore no single shared stylesheet: every page
(`index.html`, `hertz-minilease.html`, etc., plus the three files in
`legacy/`) is self-contained with its own inline `<style>` block. To keep
one coherent system across 10 files without a build process, **the exact
same `:root` token block is duplicated at the top of every file's
stylesheet**. This is the project's existing architecture (established
before this design-system pass) and this update works within it rather than
replacing it with a bundler or a component library.

**Rule for future changes:** any token change must be applied to the
`:root` block in all 10 files identically. Component styles should always
read `var(--token-name)` — never a raw hex value, a raw pixel spacing
number, or a duplicate local token — so a future token change only has to
happen once per file, not once per selector.

## 1. Brand principles

- Experienced and confident, not loud.
- Warm and approachable — brown ink and pastels, never cold grey or pure
  black.
- Editorial and design-led: generous white space, strong typography,
  restrained color.
- Modern but not trendy: no glassmorphism, no gradients, no neon.
- Playful only in small, controlled details (a hand-drawn brush accent
  under a heading, a shimmering skeleton placeholder) — never in navigation,
  data, or anything load-bearing.
- Accessible by default: every color pairing in this system meets WCAG AA
  (verified below), focus states are always visible, motion always respects
  `prefers-reduced-motion`.

## 2. Color system

### Primitives

```css
--brand-brown-500: #5C4432;  /* primary ink */
--brand-brown-600: #493526;  /* hover */
--brand-brown-700: #3F2D20;  /* active/pressed */
--brand-brown-400: #6A5140;  /* muted secondary text */

--brand-mint:   #91D2C0;
--brand-yellow: #FCE795;
--brand-peach:  #FED28A;
--brand-sky:    #96C9EC;
--brand-blush:  #E5BCD9;

--brand-success: #256B57;
--brand-error:   #A13D32;
```

### Semantic roles (what components should actually use)

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#FFFFFF` | Page background |
| `--color-surface-warm` / `--color-surface` | `#FFF8F0` | Cards, form fields, media placeholders |
| `--color-ink` | `#5C4432` | Primary text, headings, icons, primary buttons |
| `--color-ink-hover` | `#493526` | Hover state on ink-colored controls |
| `--color-ink-active` | `#3F2D20` | Pressed/active state |
| `--color-ink-muted` | `#6A5140` | Secondary text on white/warm surfaces only |
| `--color-ink-fixed` | `#5C4432` | Header/nav text — stays ink-colored on the mint header regardless of light/dark mode |
| `--color-mint` | `#91D2C0` | Primary recurring brand accent (header, Hertz project, closing CTA) |
| `--color-yellow` / `--color-peach` / `--color-sky` / `--color-blush` | pastels | One per project/section — see mapping below |
| `--color-success` | `#256B57` | Form success feedback only |
| `--color-error` | `#A13D32` | Form error feedback only |
| `--border-color` | `rgba(ink, 0.22)` | Default hairline borders |
| `--border-color-strong` | `rgba(ink, 0.38)` | Hover/focus/emphasized borders |
| `--shadow-color` | `rgba(ink, 0.12)` | The only shadow color used anywhere |

### Contrast — verified

All pairings below were checked against WCAG 2.1 contrast math (not
estimated):

| Pairing | Ratio | Passes |
|---|---|---|
| Ink on white | 9.02:1 | AAA |
| Ink on warm off-white | 8.56:1 | AAA |
| Ink on mint | 5.23:1 | AA |
| Ink on yellow | 7.30:1 | AAA |
| Ink on peach | 6.36:1 | AA |
| Ink on sky | 5.10:1 | AA |
| Ink on blush | 5.38:1 | AA |
| Ink-muted on white | 7.33:1 | AAA |

Every pastel in the system is safe as a **background with ink text on
top** — never the reverse (no white/light text on a pastel background).

### Distribution

White / warm off-white dominate (roughly 75% of any page). Mint or one
section-specific pastel covers accents, tags, and section backgrounds
(15–25%). Secondary accents (peach/sky/blush) never exceed a handful of
elements on a page.

### Project accent mapping (existing, preserved — not reshuffled)

This mapping already existed before this pass (visible in each project's
`theme-color` meta tag and hero brush accent) and has been kept as-is,
per the instruction to preserve intentional existing mappings:

| Project | Accent |
|---|---|
| Hertz MiniLease | Mint |
| Dentist Finder | Yellow |
| Goldbach KMU | Sky (was "blue", now mapped to the canonical sky token) |
| Motion & Interaction Design | Blush |
| Visual Campaigns | Peach |

## 3. Typography

Single family throughout — **Rubik** — already loaded via Google Fonts, no
new font dependency added. `--font-display` and `--font-body` are the same
family today; kept as two separate tokens so a future display face can be
swapped in without touching every component. There is no handwritten
typeface loaded; the site's "handwritten" moments (the brush-stroke accent
under headings) are hand-drawn PNG/SVG assets, not a font — `--font-handwritten`
exists as a token for consistency but currently resolves to the same family.

```css
--text-display: clamp(3rem, 6vw, 5.5rem);
--text-h1:      clamp(2.5rem, 5vw, 4.5rem);
--text-h2:      clamp(2rem, 4vw, 3.5rem);
--text-h3:      clamp(1.5rem, 2.5vw, 2rem);
--text-body-lg: 1.125rem;
--text-body:    1rem;
--text-small:   0.875rem;
--text-eyebrow: 0.75rem;
```

Rules: display/heading weight 700, tight line-height (~1.0–1.15); body text
16px minimum with 1.55–1.65 line-height; eyebrows are uppercase, 700 weight,
`0.12em` letter-spacing; buttons/nav/labels use sentence case, never
all-caps for anything long.

**Scope note:** the new fluid scale above is wired into every newly
refactored component (contact form, and any component touched in this
pass). Retrofitting every existing heading across all 10
case-study files to the new `--text-*` tokens (each file currently has its
own hand-tuned `clamp()` per heading, hundreds of them) was out of scope
for this pass — see the exceptions list in the completion report.

## 4. Spacing

The project's existing t-shirt scale is the source of truth (already a
clean 4px rhythm) — kept rather than renamed, to avoid a blind
find-and-replace across hundreds of existing usages:

```css
--space-3xs: 4px;   --space-2xs: 8px;   --space-xs: 12px;  --space-sm: 16px;
--space-md: 24px;   --space-lg: 40px;   --space-xl: 64px;  --space-2xl: 96px;
--space-3xl: 128px;
```

Numeric aliases were added on top so either naming works in new code:

```css
--space-1: var(--space-3xs);  --space-2: var(--space-2xs);
--space-3: var(--space-xs);   --space-4: var(--space-sm);
--space-6: var(--space-md);   --space-8: 32px;
--space-12: var(--space-lg);  --space-16: var(--space-xl);
--space-24: var(--space-2xl); --space-32: var(--space-3xl);

--section-space-sm: clamp(3rem, 7vw, 5rem);
--section-space-md: clamp(4rem, 9vw, 7rem);
--section-space-lg: clamp(5rem, 12vw, 9rem);
```

## 5. Layout and containers

```css
--content-width: 980px;       /* existing default container — most pages */
--container-wide: 1280px;
--container-default: 980px;
--container-reading: 680px;   /* long-form case-study copy */
```

Mobile-first, no horizontal scroll at any target width (verified at 375,
768, 1024, 1440 — see completion report). Two-column sections (hero,
contact) stack to one column at 800–900px depending on the section.

## 6. Radius, borders, shadow

```css
--radius-sm: 8px;         /* small elements, tags */
--radius-control: 14px;   /* inputs, compact controls */
--radius-card: 24px;      /* cards, media frames */
--radius-section: 32px;   /* large colored sections */
--radius-pill: 999px;     /* buttons */
```

Borders are always 1px, warm-brown, translucent (`--border-color` /
`--border-color-strong` on hover/focus) — never cold grey. Shadows use
`--shadow-color` only, kept soft (no more than one shadow level is used
anywhere: `0 20px 40px var(--shadow-color)` on the contact card).

## 7. Motion

```css
--duration-fast: 120ms;    --duration-normal: 180ms;   --duration-slow: 280ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-enter:    cubic-bezier(0.22, 1, 0.36, 1);
```

Hover moves at most 2px, never scales or tilts. All decorative motion
(scroll-reveal, drift effects, shimmer) already respects
`prefers-reduced-motion: reduce` — this was true before this pass and
remains true.

## 8. Components (current state)

- **Header/nav** — mint background, ink text/logo (fixed regardless of
  dark mode), underline reveals left-to-right, dropdown submenu, hamburger
  on mobile with full keyboard support.
- **Buttons** — primary (`--color-ink` fill, `--color-surface-warm` text,
  hover `--color-ink-hover`, active `--color-ink-active`, min 48–52px
  height) and the outline "negative" CTA style (ink border/text, fills on
  hover). Both used consistently for the hero CTA, header CTA area, and
  contact-form submit.
- **Tags/chips** — pastel-tinted pills, one accent color per project,
  brown text, used sparingly for role/discipline metadata.
- **Contact form** (`.connect*`) — fully refactored in this pass to read
  only global semantic tokens (no local duplicate color variables left).
  Two-column editorial layout, off-white card, 52px controls, visible
  labels, honeypot field, `aria-live` feedback region. See the section
  below for the backend/security architecture (unchanged by this pass).
- **Focus ring** — global `outline: 3px solid var(--color-ink)` with
  `outline-offset: 2px`, applied via `:focus-visible` everywhere. Changed
  in this pass from mint (5.2:1 borderline on white, and low-contrast on
  some backgrounds) to ink (9:1+ on every surface in the system) —
  outlines are never removed without this replacement in place.

## 9. Accessibility checklist (status)

- [x] Skip-to-content link on every page
- [x] Semantic `<main>` landmark
- [x] Logical heading order (not re-audited line-by-line in this pass —
      see exceptions)
- [x] Keyboard-accessible nav, dropdown, and hamburger menu
- [x] Visible, on-brand focus ring everywhere (`:focus-visible`, ink color)
- [x] 44×44px+ touch targets on nav links, hamburger, buttons
- [x] Real `<label>` elements on every form field (no placeholder-only
      labels)
- [x] `aria-live="polite"` region for contact-form feedback
- [x] `prefers-reduced-motion` respected everywhere motion exists
- [x] Color contrast verified (table above) — no text-only-by-color
      distinctions
- [x] Dark mode (`prefers-color-scheme`) still coherent after the ink
      color change

## 10. Do / don't

**Do**
- Read `var(--color-ink)`, `var(--space-md)`, `var(--radius-card)`, etc.
  Never hardcode a hex, px, or shadow value in a new component.
- Reuse `--radius-card` for anything that reads as a "card"; `--radius-section`
  only for full-width colored bands like the contact section.
- Keep one dominant pastel per section/project.
- Add any new token to the `:root` block in **all 10 files**, identically.

**Don't**
- Don't invent a new one-off spacing, radius, or color value.
- Don't put white/light text on a pastel background.
- Don't add a second styling system, framework, or component library.
- Don't remove a focus outline without an equally visible replacement.
- Don't recolor client logos, screenshots, or the portrait photo.

## 11. Adding a new component without breaking consistency

1. Check this document for an existing token that already fits.
2. If none fits, ask whether the need is real or one-off; most needs map
   onto the existing scales.
3. If a genuinely new token is required, add it to the `:root` block in
   all 10 HTML files (search for `/* ---- Motion ---- */` or the relevant
   section comment to find the right place) and document it here.
4. Build the component using only `var(--token)` references.
5. Check it against the contrast table above if it introduces a new color
   pairing.
6. Test at 375 / 768 / 1024 / 1440px and with `prefers-reduced-motion:
   reduce` before considering it done.
