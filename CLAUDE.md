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
- `fonts/` — locally hosted display faces (`Distortion` is referenced by name inside `index.html`'s inline `@font-face`; others are used by legacy pages). See "The Distortion font was repaired" below.
- `images/` — project screenshots referenced by `index.html` (`IMG_4019.jpg`, `IMG_4020.jpg`, `IMG_4022.jpg`). `images/old/` holds archived versions; don't reference it from the live site.

## The Distortion font was repaired — don't restore the original

The upstream `distortion-of-the-brain-and-mind.regular.ttf` (a FontStruct export) is **rejected outright by Chrome's OTS font sanitizer**, so Chrome/Edge silently fell back to `serif` while Safari rendered it fine. Cause: the last segment of its `cmap` format-4 subtable had `idDelta=212`, mapping `U+FFFF` to glyph 211 in a font with only 211 glyphs (valid ids 0–210). The spec requires that segment to use `idDelta=1` so `U+FFFF` maps to glyph 0.

The file in `fonts/` has been rebuilt with fontTools (all tables recompiled), which fixes the cmap and drops ~14KB of dead `glyphIdArray` and long-format `loca` padding. Outlines, advance widths, glyph order, and all 208 cmap codepoints are byte-verified identical to the original. `fonts/distortion-of-the-brain-and-mind.regular.woff2` is the same font in WOFF2.

`index.html` embeds the **WOFF2** as a `data:font/woff2` URI with `format("woff2")` — 2.6KB instead of the old 36KB TTF, which cut ~45KB off the page. If you ever re-embed the font, generate it from the repaired file, not from a fresh upstream download, or Chrome loses the typeface again.

## Architecture (index.html)

> **This section was rewritten for the "sliding stage" redesign** (was a vertical scroll-snap layout with one full-height section per project). If anything below doesn't match the code, trust the code and fix the doc. The redesign is still being polished — known gaps: no mobile-specific layout yet, the `N°`/status pill can collide on very short windows, and `syncAll()` still scales info type imperatively instead of via container queries.

The live site is a **sliding-stage single-page** layout: the header, side rail, concentric-rectangle frame and info bar stay put while the hero and three project panels slide up through the frame as you scroll. Markup lives in a single `.v-port` container:

1. `.p-top` — sticky header (`position: sticky; top: 0`), BGNoiseCo wordmark + Contact link. Stays pinned the whole way.
2. `.p-rail` — fixed vertical side rail (`00 Title / 01 Shadowbox / 02 Porcupine / 03 Prosession / 04 Contact`), rotated via `writing-mode: vertical-rl` + `rotate(180deg)`. Left offset is `calc(var(--gutter) - 18px)` so it tracks the content column; below the cap this resolves to the original `left: 14px`.
3. `.stage-track` — the tall scroll runway (`height: var(--panels) * 100svh - header`). Contains the sticky `.stage` plus four `.snap` divs (`--n: 0..3`, positioned at `n * 100svh`) that provide the snap points.
4. `.p-outro` / `.p-foot` — after the stage releases, these scroll in conventionally.

### The stage

`.stage` is `position: sticky` and fills the viewport below the header for the whole track. Inside it:

- `.frame` — `container-type: size`; the framed region the panels move through. Holds the concentric-rectangle `<svg>` and all four panels.
- `.panel` × 4 — `position: absolute; inset: 0`, stacked and translated by `translateY((var(--i) - var(--progress)) * 100%)`. Panel 0 is `.panel--hero`; 1–3 are `.panel--project`. **`.panel` needs `z-index: 2`** — `transform` creates a stacking context, so without it the rectangle svg (`z-index: 1`) paints over the panel content.
- `.p-sub` — the info bar, pinned at the bottom of the stage. One `.sub-panel` per stage panel, all stacked in the same grid cell; each fades via `opacity: 1 - |i - progress|`, so the bar cross-fades on the same scroll value as the panels. Its height is fixed by the hero's `.sub-panel--hero`; project panels reformat their metadata to match (see below).

### Scroll progress drives everything

A single JS driver computes `progress` = fraction through the track × `(panels - 1)`, i.e. `0..3`, and writes it to `--progress` on `.v-port` each `requestAnimationFrame` on scroll. That one value drives: panel transforms, the info-bar cross-fade, the rectangle tint, and the rail's active `.on` marker (`data-idx` on each panel matched to `data-s` on each rail span; `panels[Math.round(progress)]`). There is **no `IntersectionObserver`** — that's the point, one source of truth. Click-to-scroll on rail spans maps `data-s` → panel index and scrolls the track to `i / last * travel`; Contact scrolls to `.p-outro` directly.

**Known rough edge:** at the very bottom of the page the rail can stay on `03 Prosession` because the outro's top never quite crosses the sticky line. Adjust the outro threshold in the driver if this matters.

### Project panels & fit-to-frame

Each `.panel--project` is a two-column grid (`phone / info`), centered. There are **no rotated vertical titles anymore** — the project name is `.p-info .role`, rendered in the Distortion display face. The single lever that keeps a panel inside the frame at any window height is the phone's `max-width: min(240px, 40cqb)`; `syncAll()` scales the info type from the phone's rendered width, so capping the phone scales the whole panel together. Left padding is `calc(var(--gutter) + 16px)` so content clears the rail.

### Info bar metadata

Hero shows `LOCATED / PLATFORMS` stacked (label over value). Each project shows `RELEASE / PLATFORM` the same way. The tagline + `<dl>` were moved out of the panels into the bar, so each project's copy lives once. **Beware global regex edits over `<dl>`** — the outro's contact list and a legacy-variant list are also `<dl>`s; a global strip during the redesign wiped them and had to be restored from backup.

### Concentric-rectangle frame decoration

Built at runtime by a `ResizeObserver` on `.frame` as a live inline `<svg class="rects">` (NOT a data-URI background — a background image is an isolated document and can't inherit CSS colour). It stacks `<rect>`s at equal 40px insets, sized to match the section background band (starts at `--cap`). The loop stops before any rect whose shorter side would drop below one 40px step, so a frame height just past a step boundary can't leave a thin sliver as the innermost rect. Each rect's fill is `color-mix(in srgb, var(--c) calc(var(--rect-mix) * 100%), #000)` with `fill-opacity: calc(0.15 + 0.85 * var(--rect-mix))`.

- `--rect-mix` peaks at 1 on the Porcupine panel (`data-idx="0"`, panel 2) and falls to 0 either side, so the tint eases in/out on scroll.
- On every other panel `--rect-mix` is 0 → fill is black at 0.15 → the **documented cumulative vignette** (each layer × 0.85 luminance) is preserved.
- On Porcupine, opacity reaches **1** (so no dark bg bleeds through and the outer ring reads at full colour) and each ring gets an interpolated `--c` ramping **warm-white outermost → pink innermost**. Colour is keyed to the ring's pixel depth against a fixed `RAMP_PX` (240px, the desktop innermost depth), NOT its index-over-count — otherwise a given ring recolours as the window (and ring count) changes. Narrower windows simply don't ramp as deep. To recolour another panel, give it its own `--rect-mix` expression and per-ring `--c` endpoints — the machinery generalises.

Also on `.frame`: `::before` is the animated noise grain (200×200 `feTurbulence` tile, flickered via `@keyframes bgnoise`, `z-index: 0`); the rects svg is `z-index: 1`; panels `z-index: 2`.

### Email obfuscation

The contact email (in `.p-outro`) is stored as two base64 chunks in `data-a` / `data-b` on `<a class="email">` and assembled at runtime (`atob(...) + '@' + atob(...)`). If you change the address, update both attributes; don't hardcode the plaintext. The decoder runs once on load.

## Deployment

Pushing to the default branch on GitHub publishes to GitHub Pages (per the `CNAME`). There is no staging environment.
