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

- `index.html` — the live site (Projects / About toggle). All page JS is inline at the bottom of this file.
- `style.css` — shared stylesheet for the live site.
- `alt.html`, `experiment.html`, `font-compare.html` — self-contained scratch pages for layout/typography experiments. They embed their own CSS and are not linked from `index.html`. Leave them alone unless the task is about them.
- `privacy-policy.html` — standalone privacy page for the Unicorn Porcupine iOS app (linked from the App Store listing, not from `index.html`).
- `fonts/` — locally hosted display faces (`@font-face` declared at the top of `style.css`); Google Fonts (Outfit, Cormorant Garamond, Tac One) load from the CDN.
- `images/` — project screenshots referenced by `index.html`. `images/old/` holds archived versions; don't reference it from the live site.

## Layout system (index.html)

The core of the page is a single horizontal row of project thumbnails (`.screenshots`) whose sizing is driven by JS, not CSS media queries (except on mobile). Key behaviors that span `index.html` + `style.css`:

- **Desktop zoom-to-fit**: `.page` has a fixed `width: 820px`. The inline `updateZoom()` sets `page.style.zoom` to `min(1, innerWidth / 1050)` so the whole page shrinks proportionally on narrower windows. Do not replace this with a responsive breakpoint — the design assumes the desktop layout is uniformly scaled.
- **Thumbnail sizing via CSS vars**: `resize()` computes `thumbWidth` and the inter-thumbnail gap from `wrapper.clientWidth` and writes them to `--thumb-w` / `--gap` on `:root`. Most `.thumb`, `.info`, and font sizes in `style.css` are `calc()`s off `--thumb-w`, so changing the variable cascades everywhere. If you add a new element inside a screenshot card, size it in terms of `--thumb-w`, not px.
- **Click-to-expand info panel**: Clicking a `.screenshot` toggles `.active`, which animates a side `.info` panel open (width transitions from 0). Cards with `.info-left` render the info panel on the left of the thumbnail; when one is activated, `row.style.marginLeft` is shifted by `-(thumbWidth + gap)` so the row stays visually centered.
- **Mobile (≤600px)** switches to a 2-column grid (media query in `style.css`) and overlays the info panel absolutely on top of the neighbor column; the neighbor is translated off-screen using `:has()` + sibling selectors. JS detects mobile via `isMobile()` and skips the desktop margin math.
- **Projects ↔ About toggle**: `showAbout()` / `showProjects()` animate a height transition on `.content-area` by measuring `offsetHeight` before/after the content swap, then listening for `transitionend` on opacity to perform the DOM swap. Keep this ordering — measure, swap, animate — if you add new sections.

## Email obfuscation

The contact email is stored as two base64 chunks in `data-a` / `data-b` on `.email` and assembled at runtime (`atob(...) + '@' + atob(...)`). If you change the address, update both attributes; don't hardcode the plaintext into the HTML.

## Deployment

Pushing to the default branch on GitHub publishes to GitHub Pages (per the `CNAME`). There is no staging environment.
