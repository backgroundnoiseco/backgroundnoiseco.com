# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static marketing site for Background Noise Co. (backgroundnoiseco.com), deployed via GitHub Pages. No build system, package manager, or tests — just HTML/CSS/vanilla JS served directly. The `CNAME` file sets the custom domain.

## Local preview

There is no build step. Open `index.html` directly in a browser, or serve the directory:

```
python3 -m http.server 8000
```

## Files

- `index.html` — the live site. This was previously the "Portrait" variant in `variants.html`; it now **is** the main site. All page CSS and JS are inline at the top and bottom of this file respectively.
- `index-old.html` — the previous live site (a simpler Projects / About thumbnail-row layout) preserved in case we want to refer back. Not linked from anywhere.
- `style.css` — stylesheet for `index-old.html` only. `index.html` does not reference it.
- `alt.html`, `experiment.html`, `font-compare.html` — self-contained scratch pages for layout/typography experiments. They embed their own CSS and aren't linked from `index.html`. Leave them alone unless the task is about them.
- `privacy-policy.html` — standalone privacy page for the Unicorn Porcupine iOS app (linked from the App Store listing, not from `index.html`).
- `fonts/` — locally hosted display faces (`Distortion` is referenced by name inside `index.html`'s inline `@font-face`; others are used by legacy pages).
- `images/` — project screenshots referenced by `index.html` (`IMG_4019.jpg`, `IMG_4020.jpg`, `IMG_4022.jpg`). `images/old/` holds archived versions; don't reference it from the live site.

## Architecture (index.html)

The live site is a **vertical scroll-snap single-page** layout. The markup lives in a single `.v-port` container with these siblings in order:

1. `.p-top` — sticky header (`position: sticky; top: 0`) with the BGNoiseCo wordmark and a Contact link.
2. `.p-rail` — a fixed, vertical, side rail on the left showing `00 Title / 01 Shadowbox / 02 Prosession / 03 Porcupine / 04 Contact` (rotated via `writing-mode: vertical-rl` + `transform: rotate(180deg)` + `flex-direction: row-reverse` so DOM-first renders at the visual top).
3. `.p-hero` — a wrapper div containing the `.p-intro` heading and the `.p-sub` about band. `min-height: calc(100svh - 60px)`.
4. Three `.p-slot` project sections. Each is `min-height: calc(100svh - 60px)` with a 4-column grid: vertical rotated title / phone screenshot / info block / trailing empty column.
5. `.p-outro` — the "Designing creative tools." closer.
6. `.p-foot` — the three-column footer.

### Scroll container + snap

**The `.page[data-page="portrait"].on` element is the scroll container**, not the window. It has `height: 100vh`, `overflow-y: auto`, and `scroll-snap-type: y mandatory`. Document body doesn't scroll; scrolling happens inside that container. This scoping is left over from when `index.html` held multiple variants with a switcher; the switcher is gone but the `.page` + `[data-page="portrait"]` markup remains and is required for the scroll container.

Snap targets: `.p-hero`, `.p-slot`, `.p-outro` each have `scroll-snap-align: start`. The `scroll-padding-top` on the scroll container is **synced at runtime to `.p-top`'s live `offsetHeight` via a `ResizeObserver`**, so the bottom of the sticky header always aligns with the section boundary when snapped. If you change the header's height/padding, you don't need to update any constants — the observer handles it.

### Side-rail active state + click-to-scroll

Each scroll target carries a `data-idx` (numeric for projects, `"hero"` for `.p-hero`, `"contact"` for `.p-outro`). Each `.p-rail span` carries a matching `data-s`. An `IntersectionObserver` watches every `[data-idx]` and toggles `.on` on the rail span whose `data-s` string-matches. Click handlers on rail spans and the Contact link call `scrollIntoView({behavior: 'smooth', block: 'start'})` on the matching `[data-idx]`.

If you add a new top-level snap target (e.g. an extra section), give it a `data-idx` value and (if you want it to show in the rail) add a matching `<span data-s="...">` in `.p-rail`. The observer and click logic both pick it up automatically without further wiring.

### Rotated project titles

Each `.p-slot` has a `.p-name` in its first column, rendered sideways via `writing-mode: vertical-rl; transform: rotate(180deg)`. Characters read upward. **`.p-name` requires vertical padding** (currently `padding: 60px 0`) to prevent certain Distortion-font glyphs (notably the "o" in "Pro") from being clipped at the element's box edges — this is not just decorative spacing; removing the padding re-introduces the clip. Font size is per-slot via `.p-slot[data-idx="X"] .p-name` rules.

### Porcupine slot color treatment

The Porcupine slot (`data-idx="0"`) pulls colors from the actual app screenshot: teal background (`#1fcbc4`), pink "Porcupine" accent (`#e7519d`), dark-navy info text (`#141b26`), white `dt` labels. These are **hardcoded**, not sampled — an earlier version used a canvas-based sampler but the algorithmic color picks weren't faithful to the app's actual UI palette. If the app's screenshot changes, update the hex values manually.

### Intro decorations (two pseudo-elements on `.p-intro`)

- `::before` — animated noise grain. 200×200 SVG tile with `feTurbulence` + `feColorMatrix` (white + alpha), tiled via `background-repeat: repeat` and flickered via `@keyframes bgnoise` stepping through 10 pre-set `background-position` values every 60ms. `z-index: 0`.
- `::after` — concentric darkening rectangles. **Generated at runtime** by a `ResizeObserver` on `.p-intro`: measures pixel width/height, builds an inline SVG of stacked `<rect fill="black" fill-opacity="0.15">` at equal 40px pixel insets on all four sides, encodes it with `encodeURIComponent`, and sets it on a CSS custom property `--p-rects`. The JS path exists because static SVG with `preserveAspectRatio='none'` stretches non-uniformly and breaks the "equal spacing on both axes" visual. `z-index: 1` — above the noise so the stacked black alphas actually darken the composite. Each layer multiplies remaining luminance by 0.85, so the inner ring reaches ~88% cumulative black.

### Email obfuscation

The contact email (shown in the `.p-outro` as "Contact") is stored as two base64 chunks in `data-a` / `data-b` on `<a class="email">` and assembled at runtime (`atob(...) + '@' + atob(...)`). If you change the address, update both attributes; don't hardcode the plaintext into the HTML. The decoder runs once on load.

## Deployment

Pushing to the default branch on GitHub publishes to GitHub Pages (per the `CNAME`). There is no staging environment.
