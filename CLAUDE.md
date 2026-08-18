# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static marketing site for Background Noise Co. (backgroundnoiseco.com), deployed via GitHub Pages. No build system, package manager, or tests — just HTML/CSS/vanilla JS served directly. The `CNAME` file sets the custom domain.

## Local preview

There is no build step. Open `index.html` directly in a browser, or serve the directory:

```
python3 -m http.server 8000
```

Browsers (including the Claude Code preview pane) cache `css/site.css` / `js/site.js` hard; a `?v=` buster on `index.html` does **not** refresh them. When previewing changes, hard-reload or fetch the assets with `cache:'no-store'` to confirm what's actually being served.

The asset links in `index.html` carry a version query (`css/site.css?v=N`, `js/site.js?v=N`). **Bump both when either file changes** — Safari in particular held stale copies through normal reloads twice during development, and GitHub Pages adds its own ~10-minute cache.

## Files

- `index.html` — the live site (markup only, ~7KB). This was previously the "Portrait" variant in `variants.html`; it now **is** the main site.
- `css/site.css` — all page styles, including the base64-embedded Distortion `@font-face`.
- `js/site.js` — all page behavior (email decoder + the stage driver, rect renderer, positioning). Loaded with a plain `<script src>` at the end of `<body>`, so it can assume the DOM exists — no DOMContentLoaded wrappers.
- `index-old.html` — the previous live site (a simpler Projects / About thumbnail-row layout) preserved in case we want to refer back. Not linked from anywhere.
- `style.css` — stylesheet for `index-old.html` only. `index.html` does not reference it.
- `alt.html`, `experiment.html`, `font-compare.html` — self-contained scratch pages for layout/typography experiments. They embed their own CSS and aren't linked from `index.html`. Leave them alone unless the task is about them.
- `privacy-policy.html` — standalone privacy page for the Unicorn Porcupine iOS app (linked from the App Store listing, not from `index.html`).
- `fonts/` — display faces used only by the legacy/scratch pages. **`index.html` loads nothing from here**: the Distortion glyph data is base64-embedded in the `@font-face` in `css/site.css`, so the repaired `distortion-…regular.ttf` in this directory and the inline embed are independent copies — updating one does not update the other. See "The Distortion font was repaired" below.
- `images/` — project screenshots referenced by `index.html` (`IMG_4019.jpg`, `IMG_4020.jpg`, `IMG_4022.jpg`). These files are the canonical current screenshots (an earlier base64-hydration mechanism that shadowed them inline was removed). `images/old/` holds archived versions; don't reference it from the live site.

## The Distortion font was repaired — don't restore the original

The upstream `distortion-of-the-brain-and-mind.regular.ttf` (a FontStruct export) is **rejected outright by Chrome's OTS font sanitizer**, so Chrome/Edge silently fell back to `serif` while Safari rendered it fine. Cause: the last segment of its `cmap` format-4 subtable had `idDelta=212`, mapping `U+FFFF` to glyph 211 in a font with only 211 glyphs (valid ids 0–210). The spec requires that segment to use `idDelta=1` so `U+FFFF` maps to glyph 0.

The file in `fonts/` has been rebuilt with fontTools (all tables recompiled), which fixes the cmap and drops ~14KB of dead `glyphIdArray` and long-format `loca` padding. Outlines, advance widths, glyph order, and all 208 cmap codepoints are byte-verified identical to the original. (A standalone `.woff2` copy used to sit in `fonts/` but was orphaned and removed — the WOFF2 bytes live base64-embedded in `css/site.css`, and can be regenerated from the repaired `.ttf` with fontTools if ever needed.)

`css/site.css` embeds the **WOFF2** as a `data:font/woff2` URI with `format("woff2")` — 2.6KB instead of the old 36KB TTF, which cut ~45KB off the page. If you ever re-embed the font, generate it from the repaired file, not from a fresh upstream download, or Chrome loses the typeface again.

## Architecture (index.html)

> **This section was rewritten for the "sliding stage" redesign** (was a vertical scroll-snap layout with one full-height section per project). If anything below doesn't match the code, trust the code and fix the doc. The redesign is still being polished — known gaps: no mobile-specific layout yet, the `N°`/status pill collide once the frame drops below ~280px tall (a 520px-tall window; the gap is 94px at 760, 22px at 580, and goes negative from there — it tracks frame *height*, not width), and the wide-screen composition shift is still viewport-keyed JS (see below).

**Verified out to 2560px wide** (and 2560×1440): the hero composition, the rail, and the project phone/info pair all hold a *constant* offset from the 936px content band at every width past the 1000px cap — nothing drifts against the background, and there's no horizontal overflow. Past-cap widths just grow the gutters.

The live site is a **sliding-stage single-page** layout: the header, side rail, concentric-rectangle frame and info bar stay put while the hero and three project panels slide up through the frame as you scroll. Markup lives in a single `.v-port` container:

1. `.p-top` — sticky header (`position: sticky; top: 0`), BGNoiseCo wordmark + Contact link. Stays pinned the whole way.
2. `.p-rail` — fixed vertical side rail (`00 Title / 01 Shadowbox / 02 Unicorn Porcupine / 03 Contact`; Prosession hidden). A `<nav aria-label="Sections">` of real `<button>`s (keyboard reachable; the driver mirrors `.on` into `aria-current`). Rotated via `writing-mode: vertical-rl` + `rotate(180deg)`. Left offset is `calc(var(--gutter) - 18px)` so it tracks the content column; below the cap this resolves to the original `left: 14px`.

   It is **anchored, not centred**: `top` is 16px below the header, `bottom` is `var(--bar-pad-b)` — the same value that pads the info bar — so it ends level with the bar's divider rule. Its height therefore follows the viewport rather than the type, which is what keeps it stable as the window narrows.

   Buttons are content-sized with `justify-content: space-between`, so `00` lands hard on the top edge and `Contact` hard on the bottom whatever the leftover is. `padRail()` in `js/site.js` then absorbs most of that leftover **into the section numbers**: each label gains leading zeros (`00 Title` → `000 Title` → `0000 Title`…) until only ~2 characters of gap remain, so the rail reads as one run. It spends the budget a character at a time and hands the remainder out one per button (so counts can differ by one) — splitting four ways and flooring instead discards up to four characters, which lands back in the gaps and makes them drift wide. Ranges from 1 extra zero at 1100×430 to 10 at 430×820, with gaps steady at 11–18px across that whole range. The zeros live in a `<span class="pad" aria-hidden>` and take the button's own colour so they light up with the active label; each button carries an `aria-label` with the plain label so screen readers never read the filler.

   `padRail()` runs on `resize`, a `ResizeObserver` on `.p-top` (the header feeds `--p-top-h`, the rail's other height input), and `fonts.ready`. Don't observe the rail itself — it rewrites the rail's own content. **Caveat when verifying in the Claude Code browser pane: `resize_window` there changes layout without dispatching `resize` or firing any `ResizeObserver`, so rail (and stage) measurements after a resize are stale — reload the page after every resize or you'll measure the previous viewport's values.**

   Type (`--rail-fs` / `--rail-ls`) takes the `min()` of a width- and an `svh`-based term, so it shrinks on short windows as well as narrow ones. That budget is tight: at 1100×430 the bare labels need ~253px against a ~295px span, which is why the floors are 6px/1.3px. **Raising either floor, or lengthening a label, can overflow the rail on short windows** — check 1100×430 after such a change.
3. `.stage-track` — the tall scroll runway (`height: var(--panels) * 100svh - header`). Contains the sticky `.stage` plus four `.snap` divs (`--n: 0..3`, positioned at `n * 100svh`) that provide the snap points.
4. `.p-outro` / `.p-foot` — after the stage releases, these scroll in conventionally.

### The stage

`.stage` is `position: sticky` and fills the viewport below the header for the whole track. Inside it:

- `.frame` — `container-type: size`; the framed region the panels move through. Holds the concentric-rectangle `<svg>` and all four panels.
- `.panel` × 4 — `position: absolute; inset: 0`, stacked and translated by `translateY((var(--i) - var(--progress)) * 100%)`. Panel 0 is `.panel--hero`; 1–3 are `.panel--project`. **`.panel` needs `z-index: 2`** — `transform` creates a stacking context, so without it the rectangle svg (`z-index: 1`) paints over the panel content.
- `.p-sub` — the info bar, pinned at the bottom of the stage. One `.sub-panel` per stage panel, all stacked in the same grid cell; each fades via `opacity: 1 - |i - progress|`, so the bar cross-fades on the same scroll value as the panels. Its height is fixed by the hero's `.sub-panel--hero`; project panels reformat their metadata to match (see below).

### Scroll progress drives everything
**The scroller is `position: fixed`.** `.page[data-page="portrait"].on` is pinned to the viewport and is the only scroller; `html, body` are `height:100%; overflow:hidden`. This is load-bearing, not cosmetic: if the *document* ever picks up a scroll offset (focusing the fixed rail, or a layout that shrank after scrolling — removing a panel does exactly that), every rect shifts by that offset and the page appears to scroll past the footer into empty space, because `.page`'s own scroll range stacks on top of a window offset with nowhere to go. `overflow:hidden` alone only stops *user* scrolling, not focus- or script-driven scrolling — taking the scroller out of flow is what makes it impossible.


A single JS driver computes `progress` = fraction through the track × `(panels - 1)`, i.e. `0..3`, and writes it to `--progress` on `.v-port` each `requestAnimationFrame` on scroll. That one value drives: panel transforms, the info-bar cross-fade, the rectangle tint, and the rail's active `.on` + `aria-current` marker (`data-idx` on each panel matched to `data-s` on each rail button; `panels[Math.round(progress)]`). There is **no `IntersectionObserver`** — that's the point, one source of truth. Click-to-scroll on rail buttons maps `data-s` → panel index and scrolls the track to `i / last * travel`; Contact scrolls the stage container directly (never `scrollIntoView` — that also scrolls ancestor scrollers and once pushed the window out of bounds). All programmatic scrolls use `SCROLL_BEHAVIOR`, which respects `prefers-reduced-motion`.

**Compositor motion (scroll-driven animations):** where `animation-timeline: scroll()` is supported (Safari 18.2+/Chrome 115+), the scroller exposes `scroll-timeline-name: --page` and the panels + info-bar cross-fade animate against it directly on the compositor — full frame rate even when rAF is throttled. CSS animations outrank the var-driven declarations in the cascade, so they simply take over; the JS driver remains the fallback for older browsers and still owns the rail active state and rectangle tint (which read `--progress`). **Hardcoded panel-count coupling:** `animation-range`, the constant in `@keyframes panel-slide`, and the stops in the `bar-N` keyframes all encode the panel count — changing it means updating these alongside `--panels`, the `.snap` divs and the rail. **Prosession is currently hidden**, so these are 3-panel values (`200svh`, `-2`, 50%); the 4-panel set was `300svh`, `-3`, 33.333%/66.667%. Its markup is preserved verbatim inside `<template data-disabled="prosession">` wrappers in `index.html` (templates rather than HTML comments, because the markup contains `--` in custom properties, which is invalid inside a comment). Context: Safari caps `requestAnimationFrame` at 30fps in Low Power Mode, so JS-driven motion stutters against native scrolling no matter how cheap the frame work is; if scroll-linked motion is ever added, put it on the scroll timeline, not in the rAF handler.

**Hot-path discipline (Safari fps):** the scroll handler must never read layout — all geometry (`stickyTop`, `trackStart`, `travel`, `outroLine`) is cached by `measure()`, which runs only on load, `resize`, a `ResizeObserver` on `.stage`, and `fonts.ready`. `update()` is one `scrollTop` read + one `--progress` write (rail buttons are only touched when the active section actually changes). Reading `getComputedStyle`/`getBoundingClientRect` per frame — right after the previous frame's `--progress` write dirtied styles — forces a full synchronous recalc of everything var-dependent and was the source of low-fps scrolling in Safari. If the driver ever needs new geometry, add it to `measure()`, not `update()`. The contact line is clamped to max-scroll in `measure()`, so the rail correctly reads `04 Contact` at the very bottom of the page (on short pages the outro's top never crosses the sticky line unclamped).

### Hero composition: two keyframes, one shared pair

Every size and position in the hero — `--hero-size`, the badge's width/margin-left/top, the kicker's size and gap, all four of the hero panel's paddings, and the info bar's `--bar-tag-size` — is stated at **two window widths, 360px and 1000px**, and interpolated linearly between them, clamped outside. There are no per-property breakpoints; the full table of endpoint values lives in the big comment at the top of `css/site.css`.

The form is always `clamp(lo, calc(v0 + var(--kf-x) * K), hi)`, where `--kf-x` is `calc(100vw - 360px)` and `K = (v1 - v0) / 640`. CSS can't divide a length by a length, so `K` has to be a literal — it's the only derived number, and it's local to its own declaration. **To retune, change `v0`/`v1` in the declaration and recompute that one `K`.**

This replaced a set of independently-fitted ramps that each froze at their own width (360, 400, 501, 1000), which is why every size change used to need four separate refits and why several of them silently drifted out of sync. Two invariants the endpoint values must respect, both of which have caused real bugs:

- **Above 565px the badge is the snake's head** — the snake loop writes a `transform` onto it each frame putting its centre on segment 0's position, and segment 0 itself is never drawn, so the squares read as a body trailing behind it. The offset basis (badge centre relative to the canvas's top-left, transform cleared) is cached in the snake's `measure()`, never read per frame; both elements live inside `.panel--hero`, so the panel's own `translateY` affects them equally and cancels out. At or below 565px the snake is hidden, `measure()` clears the transform, and the badge falls back to its CSS keyframe position — that handoff is the only thing the badge's `margin-left`/`top` pairs still control. Two live couplings: it is `aspect-ratio: 1`, so widening it moves its **bottom** edge down by the same amount, and changing `--hero-size` moves it sideways — it hangs off the end of the wordmark (`left: 100%` on a shrink-wrapping h1), so it inherits the h1's width. Known behaviour, not a bug: past the 1000px cap it slides left as a *share* of the window, because everything else freezes its offset from the 936px band while the window keeps growing. No single keyframe pair fixes that.
- **The hero panel has no vertical padding, and must not be given any.** The block is a centred grid item, so vertical padding clears nothing — all it can do is shrink the content box. Once the block's margin box outgrows that box, grid centring stops and the block pins to `padding-top`, and from there the wordmark *tracks* `padding-top` — so it starts falling as the window widens. A 40→80px padTop ramp did exactly that on a ~700px-tall window: the block fit at 915px wide and overflowed at 1000px, so the hero reversed direction mid-resize. It presented as a width bug and was really a height one. The vertical bias lives in **`--hero-drop`** instead — a margin, which participates in centring and never clips. It shifts the block by *half* its value.

`.hero-block` also carries `margin-bottom: var(--kicker-block)`, which cancels the kicker's height out of the centring so the **h1 itself** is centred rather than the block. Without it the wordmark rises whenever the kicker's type or gap shrinks. Below 360px the whole composition is frozen; the h1 box starts to overflow its panel around 327px.

### Floating snake (hero decoration)

`<canvas class="hero-snake">` in the hero panel, drawn by the last IIFE in `js/site.js` — a port of `FloatingSnakeView.swift` from the rng1 app (`~/Desktop/everything/bgnoiseco/rng1`). 30 squares chase a multi-sine path, each rotating on its own seeded speed, head teal → tail purple. The constants are the app's shipped values (speed .5, head 50, tail 10, delay .2, rotation 50, lfo 5); the app's `wiggle` and `depthScale` are both 0 there, so those terms are omitted rather than carried as dead code.

- Shown above 565px only. It shares the region with the badge, which paints over it.
- **`position: absolute` needs `.panel--hero` in the selector** to outweigh `.v-port .panel > *`, which sets `position: relative` further down the file. Without it the canvas becomes a second grid row and pushes the wordmark off centre.
- **`height: 100%`, not `top:0; bottom:0`** — `<canvas>` is a replaced element, so with `height:auto` it falls back to its intrinsic size and ignores the stretch.
- It idles when the hero scrolls away: the stage driver calls `vport._onProgress(p)` with the same `--progress` everything else reads, and the loop stops above `p >= 1`. No IntersectionObserver, no second source of truth. It also stops on `visibilitychange`, and honours `prefers-reduced-motion` by drawing one static frame.
- Canvas size is cached and only re-measured on a `ResizeObserver` — same no-layout-reads-per-frame rule as the stage driver.

### Project panels & fit-to-frame

Each `.panel--project` is a two-column grid (`phone / info`), centered. There are **no rotated vertical titles anymore** — the project name is `.p-info .role`, rendered in the Distortion display face. Everything sizes to the frame via container units (`.frame` is `container-type: size`): the phone caps at `min(240px, 40cqb)`, and the title/CTA/shell-radius are `min(<max>px, <coef>cqb)` where the coefficient is `<max> × 40/240` — so the whole panel scales together with frame height, purely in CSS, no JS. Left padding is `calc(var(--gutter) + 16px)` so content clears the rail.

The one thing still done in JS (`positionAll()` near the bottom) is the wide-screen composition shift: at viewports ≥ 860 it `translateX`es the phone/info pair so the phone's centre lands at ~37% of width. **Past the layout cap (`maxw + 64 = 1000px`) the target is frozen at a constant offset left of centre** (`vw/2 − 130`) so the pair stops drifting left as the window widens — below the cap it's `0.37 × viewport`. It's still viewport-relative, not frame-relative, so it can't be a container query — migrating it means deciding whether the composition should key to the frame instead.

### Info bar metadata

Right side: hero shows `LOCATED / PLATFORMS` stacked (label over value), each project shows `RELEASE / PLATFORM` the same way. Left side: the hero keeps its studio tagline (`.tag`, DM Serif), while **each project shows its six-item `.feats` list in a 3×2 grid** (column-first, so a 7th item would silently start a third column) — the project *description* lives in the panel's `.p-info` instead. That split is deliberate: body copy sits next to the screenshot it describes, and the bar carries scannable specs.

**`.meta` is what sets the bar's height** — it's a constant 86px (fixed 11/13px type, no fluid term), and it is the tallest block in every row at every width, so the bar's height is 86px + its own fluid padding and interpolates cleanly. `align-items: stretch` then makes every row's left block fill that height, which is what keeps the divider rule the same length on the hero and project rows. **Anything placed in a row must stay under 86px or it takes over as the tallest and the bar's height starts tracking *it* instead** — and since `.p-sub` shares the sticky stage with `.frame`, a step there resizes every concentric ring at once. Current headroom: the 3×2 feature grid is 63px, the hero tagline 46px, and the one-column mobile stack 75–82px (see the `max-width:540px` block, which tightens the type specifically to stay under the line). **Beware global regex edits over `<dl>`** — the outro's contact list and a legacy-variant list are also `<dl>`s; a global strip during the redesign wiped them and had to be restored from backup.

### Concentric-rectangle frame decoration

Built at runtime by a `ResizeObserver` on `.frame` as a live inline `<svg class="rects">` (NOT a data-URI background — a background image is an isolated document and can't inherit CSS colour). It stacks `<rect>`s at equal 40px insets, sized to match the section background band (starts at `--cap`). The loop stops before any rect whose shorter side would drop below one 40px step, so a frame height just past a step boundary can't leave a thin sliver as the innermost rect. Each rect's fill is `color-mix(in srgb, var(--c) calc(var(--rect-mix) * 100%), #000)` with `fill-opacity: calc(0.15 + 0.85 * var(--rect-mix))`.

- `--rect-mix` peaks at 1 on the Porcupine panel (`data-idx="0"`, panel 2) and falls to 0 either side, so the tint eases in/out on scroll.
- On every other panel `--rect-mix` is 0 → fill is black at 0.15 → the **documented cumulative vignette** (each layer × 0.85 luminance) is preserved.
- On Porcupine, opacity reaches **1** (so no dark bg bleeds through and the outer ring reads at full colour) and each ring gets an interpolated `--c` ramping **warm-white outermost → pink innermost**. Colour is keyed to the ring's pixel depth against a fixed `RAMP_PX` (240px, the desktop innermost depth), NOT its index-over-count — otherwise a given ring recolours as the window (and ring count) changes. Narrower windows simply don't ramp as deep. To recolour another panel, give it its own `--rect-mix` expression and per-ring `--c` endpoints — the machinery generalises.

The **gutters** (frame background past `--cap`, left/right of the band) read **darker** than the band — they used to be the band colour plus full grain, which lifted them. Two things hold them down: the band gradient paints them with `var(--gutterC)`, which `.frame` sets to `#000` (vs the band's `#0a0a0a`), and `.frame::after` lays `--gutterDark` (a flat `rgba(0,0,0,.3)` wash) over the gutter columns. Because `::after` paints *above* the noise, that wash also mutes the grain there, which is most of what makes the gutter read as recessed. `--ringOverlay` — the Porcupine pink — sits in the **same `::after` as a second, higher layer**, so it is unaffected: at `--rect-mix: 1` it is fully opaque and covers the wash entirely, and the gutter still reads as one linear ramp step out from the warm-white ring. Keep them as separate layers; folding the wash into `--ringOverlay`'s `color-mix` would muddy the pink ramp mid-scroll. Layer order on `.frame`: `::before` animated noise grain (200×200 `feTurbulence` tile oversized by 48px each side and flickered by animating `transform` — NOT `background-position`, which repaints the whole frame every 60ms and tanked Safari scroll fps; `z-index: 0`) → rects svg + `::after` gutter overlay (`z-index: 1`) → panels (`z-index: 2`).

### Email obfuscation

The contact email (in `.p-outro`) is stored as two base64 chunks in `data-a` / `data-b` on `<a class="email">` and assembled at runtime (`atob(...) + '@' + atob(...)`). If you change the address, update both attributes; don't hardcode the plaintext. The decoder runs once on load.

## Deployment

Pushing to the default branch on GitHub publishes to GitHub Pages (per the `CNAME`). There is no staging environment.
