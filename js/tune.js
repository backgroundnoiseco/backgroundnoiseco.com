/* Layout tuning overlay - DEV ONLY, never loaded on the live site.
   Enable by adding ?tune to the URL. js/site.js injects this file only when that
   flag is present, so nothing here costs the real page a byte of parse time.

   Drag the wordmark or the badge, resize the badge from its corner handle, and the
   panel prints the finished CSS declarations to hand back. Everything is applied as
   inline style so what you see is exactly what the numbers say.

   The layout is a two-keyframe system (see the table at the top of css/site.css), so a
   drag only ever tells us ONE endpoint. The panel says which one your current window
   width is editing, and recomputes that declaration's K for you. */
(function(){
  const q = new URLSearchParams(location.search);
  if (!q.has('tune')) return;

  const vport = document.querySelector('.v-port');
  const panel = document.querySelector('.panel--hero');
  const block = document.querySelector('.hero-block');
  // The badge ships disabled inside <template data-disabled="badge">. The overlay exists to
  // position it, so unwrap it here rather than making every reference below optional - same
  // move ensureSnake() makes for the canvas, just eagerly, since the badge is never optional
  // to this tool. On a page where it is already unwrapped this is a no-op.
  (function unwrapBadge(){
    const tpl = document.querySelector('.v-port template[data-disabled="badge"]');
    if (tpl && !document.querySelector('.v-port .p-badge')) {
      tpl.parentNode.insertBefore(tpl.content.cloneNode(true), tpl);
    }
  })();
  const badge = document.querySelector('.p-badge');
  const h1     = document.querySelector('.panel--hero h1');
  const kicker = document.querySelector('.panel--hero .kicker');
  const barTag = document.querySelector('.sub-panel--hero .tag');
  const bar    = document.querySelector('.p-sub');
  if (!vport || !panel || !block || !badge || !h1 || !kicker || !barTag || !bar) return;

  const KF0 = 360;
  const num = v => parseFloat(v) || 0;
  const cs  = el => getComputedStyle(el);
  // NOT getPropertyValue('--cap'): an unregistered custom property computes to its own
  // token stream, so --cap comes back as the literal "calc(max(32px,...) - 32px)" and
  // parseFloat gives NaN -> 0. That silently made every cap-relative readout absolute,
  // and the printed calc(var(--cap) + N) declarations then double-counted the gutter.
  // Mirror the stylesheet's arithmetic instead: cap = max(32, (W - maxw)/2) - 32.
  const cap = () => Math.max(0, (vport.clientWidth - num(cs(vport).getPropertyValue('--maxw'))) / 2 - 32);
  const step = () => num(cs(vport).getPropertyValue('--ring-step')) || 40;
  const bandCap = () => num(cs(vport).getPropertyValue('--maxw')) + 64;

  // live values, seeded from whatever the stylesheet currently computes
  const state = {
    padLeft: num(cs(panel).paddingLeft) - cap(),
    drop:    num(cs(block).marginTop),
    badgeTop:   num(cs(badge).top),
    badgeRight: num(cs(badge).right) - cap(),
    badgeW:     badge.offsetWidth,
    heroSize:   num(cs(h1).fontSize),
    kickerFs:   num(cs(kicker).fontSize),
    barTag:     num(cs(barTag).fontSize),
    maxw:       num(cs(vport).getPropertyValue('--maxw')),
  };

  function apply(){
    panel.style.paddingLeft = `calc(${cap()}px + ${state.padLeft.toFixed(1)}px)`;
    block.style.marginTop   = state.drop.toFixed(1) + 'px';
    badge.style.top    = state.badgeTop.toFixed(1) + 'px';
    badge.style.right  = `calc(${cap()}px + ${state.badgeRight.toFixed(1)}px)`;
    badge.style.width  = state.badgeW.toFixed(1) + 'px';
    // each var is set on the element that declares it, so the cascade is unchanged
    vport.style.setProperty('--hero-size',    state.heroSize.toFixed(1) + 'px');
    panel.style.setProperty('--kicker-fs',    state.kickerFs.toFixed(2) + 'px');
    bar.style.setProperty('--bar-tag-size',   state.barTag.toFixed(2) + 'px');
    vport.style.setProperty('--maxw',         state.maxw.toFixed(0) + 'px');
    if (bandGrip) bandGrip.style.right = cap() + 'px';   // ride the band's own edge
    // .frame does not change size when --maxw does, so its ResizeObserver never fires and
    // the rings would keep their old geometry. Re-render them by hand.
    if (vport._renderRects) vport._renderRects();
    report();
  }

  // --- readout -------------------------------------------------------------
  const ui = document.createElement('div');
  ui.style.cssText = `position:fixed;left:12px;bottom:12px;z-index:99999;max-width:430px;
    font:11px/1.5 ui-monospace,Menlo,monospace;color:#eae6dc;background:rgba(10,10,10,.94);
    border:1px solid #333;padding:10px 12px;white-space:pre;pointer-events:auto;
    border-radius:4px;box-shadow:0 6px 30px rgba(0,0,0,.6)`;
  document.body.appendChild(ui);

  // --maxw lives here rather than on the band edge: that edge is exactly where you need to
  // grab the browser window itself, so an interactive handle there fights the OS.
  const maxwRow = document.createElement('div');
  maxwRow.style.cssText = `cursor:ew-resize;user-select:none;padding:3px 6px;margin:-2px -6px 6px;
    background:rgba(232,150,60,.14);border:1px solid rgba(232,150,60,.5);border-radius:3px;
    color:#e8963c;white-space:pre`;
  const body = document.createElement('div');
  ui.appendChild(maxwRow); ui.appendChild(body);

  function K(v0, v1, span){ return ((v1 - v0) / span).toFixed(8).replace(/0+$/,'').replace(/\.$/,''); }

  const SPAN_AT_LOAD = bandCap() - KF0;
  function report(){
    const w = innerWidth, C = bandCap(), span = C - KF0, S = step();
    const atMax = w >= C, atMin = w <= KF0;
    const which = atMax ? `EDITING THE ${C}px KEYFRAME`
                : atMin ? `EDITING THE ${KF0}px KEYFRAME`
                : `⚠ BETWEEN KEYFRAMES (${w}px) — widen to ${C}+ or narrow to ${KF0} first`;
    // small-keyframe values are read straight off the stylesheet's own floors
    const p0 = 60, bw0 = 82, br0 = 80;   // br0 = ring-step x 2, ring 3's inset
    // How far AHEAD of the cap's drop the 360 drop has to run for the hero to sit in the
    // same place at both ends: the frame is 16px taller at 360, the block 64.39px shorter
    // and its margin-bottom 13.55px smaller, and gapBelow is (frameH - drop - blockH + mb)/2.
    const DROP_OFF = 66.84;
    const gC = innerHeight - state.drop;          // guard constant this drop implies
    const ceilC = 424 + (525 - gC);               // ceiling that keeps the two in lockstep
    const lines = atMax ? [
      `--hero-size  (54 -> ${state.heroSize.toFixed(0)})`,
      `   clamp(54px, calc(54px + var(--kf-x) * ${K(54,state.heroSize,span)}), ${state.heroSize.toFixed(0)}px)`,
      ``,
      `--kicker-fs  (9 -> ${state.kickerFs.toFixed(1)})`,
      `   clamp(9px, calc(9px + var(--kf-x) * ${K(9,state.kickerFs,span)}), ${state.kickerFs.toFixed(1)}px)`,
      ``,
      `--bar-tag-size (18 -> ${state.barTag.toFixed(1)})`,
      `   clamp(18px, calc(18px + var(--kf-x) * ${K(18,state.barTag,span)}), ${state.barTag.toFixed(1)}px)`,
      ``,
      // --hero-drop's pair is on its two LIMITS, not on the value: which one binds depends
      // on window height. A drag fixes the drop at THIS height, which pins the guard
      // constant (100svh - drop); the ceiling is then derived so the two stay in lockstep,
      // and each limit's 360 endpoint is DROP_OFF away. See the big comment in site.css.
      `--hero-drop  ${state.drop.toFixed(0)} at ${innerHeight}px tall`,
      `   guard 100svh - clamp(${(gC - DROP_OFF).toFixed(2)}px, calc(${(gC - DROP_OFF).toFixed(2)}px + var(--kf-x) * ${K(gC - DROP_OFF, gC, span)}), ${gC.toFixed(2)}px)`,
      `   ceiling clamp(${ceilC.toFixed(2)}px, calc(${(ceilC + DROP_OFF).toFixed(2)}px + var(--kf-x) * ${K(ceilC + DROP_OFF, ceilC, span)}), ${(ceilC + DROP_OFF).toFixed(2)}px)`,
      ``,
      `hero pad left (60 -> ${state.padLeft.toFixed(0)})`,
      `   clamp(60px, calc(60px + var(--kf-x) * ${K(p0,state.padLeft,span)}), ${state.padLeft.toFixed(0)}px)`,
      ``,
      `badge width  (82 -> ${state.badgeW.toFixed(0)})`,
      `   clamp(82px, calc(82px + var(--kf-x) * ${K(bw0,state.badgeW,span)}), ${state.badgeW.toFixed(0)}px)`,
    ] : [
      `hero pad left  ${state.padLeft.toFixed(1)}`,
      `--hero-drop    ${state.drop.toFixed(1)}`,
      `badge width    ${state.badgeW.toFixed(1)}`,
      `--hero-size    ${state.heroSize.toFixed(1)}`,
      `--kicker-fs    ${state.kickerFs.toFixed(2)}`,
      `--bar-tag-size ${state.barTag.toFixed(2)}`,
    ];
    const span0 = SPAN_AT_LOAD;
    maxwRow.textContent =
      `◀▶ --maxw ${state.maxw.toFixed(0)}   band ${C}   span ${span}` +
      (Math.abs(span - span0) > 0.5
        ? `\n   ⚠ span ${span0} → ${span}: rescale every K ×${(span0/span).toFixed(6)}`
        : ``);
    body.textContent =
      `${which}\n` +
      `viewport ${w} · band ${Math.min(w,C)} · ring step ${S}\n` +

      `──────────────────────────────────────────\n` +
      `badge top    ${state.badgeTop.toFixed(1)}px  = ring-step × ${(state.badgeTop/S).toFixed(2)}\n` +
      `badge right  ${state.badgeRight.toFixed(1)}px  = ring-step × ${(state.badgeRight/S).toFixed(2)}\n` +
      `   top:calc(var(--ring-step) * ${(state.badgeTop/S).toFixed(2)});\n` +
      // Both are constants again, and the badge is mobile only - so tune it at a MOBILE
      // width, not at the wide keyframe, and keep the multiplier small: a large inset
      // measured on a wide window is off the left of a 360px screen entirely.
      `   right:calc(var(--cap) + var(--ring-step) * ${(state.badgeRight/S).toFixed(2)});` +
      (w > 565 ? `   <- badge is mobile-only; measure this at <=565\n` : `\n`) +
      `──────────────────────────────────────────\n` +
      lines.join('\n') +
      `\n──────────────────────────────────────────\n` +
      `drag wordmark/badge to move · corner grip = badge size\n` +
      `side grips: yellow = hero · blue = kicker · purple = bar tagline\n` +
      `drag the orange row above = --maxw\n` +
      `shift = 10× slower · R = reset\n` +
      `H = hide panel · G = hide handles · B = badge / snake / none` +
      (gripsHidden ? `\n[handles hidden]` : ``) +
      `\ndecoration: ${DECOR[decor]}`;
  }

  // --- dragging ------------------------------------------------------------
  // The wordmark's vertical position comes from a MARGIN on a centred box, so it moves
  // half as far as the margin does - hence the 2x on dy. Horizontal is plain padding.
  function drag(target, onMove, cursor){
    target.style.cursor = cursor || 'move';
    target.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const x0 = e.clientX, y0 = e.clientY, snap = {...state};
      target.setPointerCapture(e.pointerId);
      const move = ev => {
        const f = ev.shiftKey ? 0.1 : 1;
        onMove((ev.clientX - x0) * f, (ev.clientY - y0) * f, snap);
        apply();
      };
      const up = ev => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
    });
  }

  drag(maxwRow, (dx, dy, s) => {
    state.maxw = Math.max(240, Math.round(s.maxw + dx * 2));   // band is centred: 2x pointer
  }, 'ew-resize');

  drag(block, (dx, dy, s) => {
    state.padLeft = Math.max(0, s.padLeft + dx);
    state.drop    = Math.max(0, s.drop + dy * 2);   // margin moves the centred box by half
  });

  // The badge is a real link to the App Store. Dragging it fires a click on release, so
  // swallow clicks in the capture phase for as long as the overlay is loaded - otherwise
  // every attempt to position it opens a new tab.
  badge.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, true);
  badge.style.cursor = 'move';

  drag(badge, (dx, dy, s) => {
    state.badgeRight = Math.max(0, s.badgeRight - dx);  // anchored from the RIGHT
    state.badgeTop   = s.badgeTop + dy;
  });

  // Type grips. A drag on the text itself is already taken (that moves the block), so each
  // resizable run gets its own handle pinned to its right edge. Sensitivity is per-element
  // because a 1px step means something very different to a 91px wordmark and a 9px kicker.
  const grips = [];

  // Band-width handle: a full-height rule sitting on the band's right edge. The band is
  // centred, so dragging the edge out by dx widens it by 2dx - --maxw moves at twice the
  // pointer. Changing this is the one edit that is NOT self-contained: the keyframe span is
  // (maxw + 64) - 360, so every K in the stylesheet has to be rescaled by oldSpan/newSpan.
  // The panel prints that factor rather than pretending the preview is the finished result.
  const frame = document.querySelector('.v-port .frame');
  let bandGrip = null;
  if (frame) {
    bandGrip = document.createElement('div');
    bandGrip.style.cssText = `position:absolute;top:0;height:100%;right:${cap()}px;width:1px;
      background:rgba(232,150,60,.5);pointer-events:none;z-index:4`;
    frame.appendChild(bandGrip); grips.push(bandGrip);
  }
  function typeGrip(el, key, perPx, colour){
    if (cs(el).position === 'static') el.style.position = 'relative';
    const g = document.createElement('div');
    g.style.cssText = `position:absolute;right:-9px;top:50%;width:14px;height:14px;
      margin-top:-7px;background:${colour};border:1px solid #06302e;cursor:ew-resize;z-index:6`;
    el.appendChild(g); grips.push(g);
    drag(g, (dx, dy, s) => { state[key] = Math.max(6, s[key] + dx * perPx); }, 'ew-resize');
  }
  typeGrip(h1,     'heroSize', 0.2,  '#e8c84a');
  typeGrip(kicker, 'kickerFs', 0.05, '#7ad4ff');
  typeGrip(barTag, 'barTag',   0.08, '#b9a6ff');

  const grip = document.createElement('div');
  grip.style.cssText = `position:absolute;left:-7px;top:-7px;width:16px;height:16px;
    background:#1fcbc4;border:1px solid #06302e;cursor:nwse-resize;z-index:5`;
  badge.appendChild(grip); grips.push(grip);
  drag(grip, (dx, dy, s) => {
    state.badgeW = Math.max(24, s.badgeW - dx);       // grows toward the left/top
    state.badgeRight = s.badgeRight;
  }, 'nwse-resize');

  // Collapsed state is a chip rather than nothing, so there is always a way back.
  let hidden = false;
  const chip = document.createElement('div');
  chip.textContent = 'tune ▸';
  chip.style.cssText = `position:fixed;left:12px;bottom:12px;z-index:99999;display:none;
    font:11px/1 ui-monospace,Menlo,monospace;color:#1fcbc4;background:rgba(10,10,10,.94);
    border:1px solid #333;padding:6px 9px;border-radius:4px;cursor:pointer`;
  chip.addEventListener('click', () => setHidden(false));
  document.body.appendChild(chip);
  function setHidden(v){
    hidden = v;
    ui.style.display   = v ? 'none' : '';
    chip.style.display = v ? 'block' : 'none';
  }

  // B cycles the hero's decoration: badge -> snake -> none. A view toggle only; it never
  // touches the tuned values, so what the panel reports stays true in every mode.
  // The snake ships disabled inside <template data-disabled="snake">, so the first switch
  // into it unwraps the template and asks site.js to boot it.
  // Snake mode keeps the BADGE ON: the badge is the snake's head, not an alternative to it.
  // Only 'none' hides it.
  const DECOR = ['badge', 'snake', 'none'];
  let decor = 0;
  let snakeReady = false;
  function ensureSnake(){
    if (snakeReady) return true;
    const tpl = document.querySelector('.v-port template[data-disabled="snake"]');
    if (tpl && !document.querySelector('.v-port .hero-snake')) {
      tpl.parentNode.insertBefore(tpl.content.cloneNode(true), tpl);
    }
    snakeReady = !!(vport._bootSnake && vport._bootSnake());
    return snakeReady;
  }
  function setDecor(i){
    decor = (i + DECOR.length) % DECOR.length;
    const mode = DECOR[decor];
    // Show the badge BEFORE booting: the snake measures the badge's rect and offsetWidth
    // on boot, and both read 0 while it is display:none - a 0 head erases the size taper.
    // 'block' rather than '', because the stylesheet's own default is display:none above
    // 565 - clearing the inline value would hand it straight back to that.
    badge.style.display = mode === 'none' ? 'none' : 'block';
    if (mode === 'snake') ensureSnake();
    const cv = document.querySelector('.v-port .hero-snake');
    if (cv) cv.style.display = mode === 'snake' ? '' : 'none';
    const snake = vport._snake;
    if (mode === 'snake') {
      // re-measure first: the canvas had no size while hidden, and start() gates on that
      if (snake) { snake.measure(); snake.start(); }
    } else if (snake) {
      // stop() alone doesn't hold - the stage driver's _onProgress restarts the loop on the
      // next update, and draw() writes the badge's transform every frame. Re-measuring with
      // the canvas hidden is what actually parks it: measure() zeroes the cached size, which
      // is the same gate start() and draw() already check, and hands the badge back to CSS.
      snake.stop();
      snake.measure();
    }
    report();
  }

  let gripsHidden = false;
  function setGrips(v){
    gripsHidden = v;
    grips.forEach(g => { g.style.display = v ? 'none' : ''; });
    // the move cursors are a handle too - drop them so nothing hints at edit mode
    [block, badge].forEach(el => { el.style.cursor = v ? '' : 'move'; });
    report();
  }

  addEventListener('keydown', e => {
    if (e.key === 'h' || e.key === 'H') { setHidden(!hidden); return; }
    if (e.key === 'g' || e.key === 'G') { setGrips(!gripsHidden); return; }
    if (e.key === 'b' || e.key === 'B') { setDecor(decor + 1); return; }
    if (e.key === 'r' || e.key === 'R') {
      setDecor(0);   // offsetWidth reads 0 while hidden, which would poison the reseed
      panel.style.paddingLeft = block.style.marginTop = '';
      vport.style.removeProperty('--hero-size');
      vport.style.removeProperty('--maxw');
      panel.style.removeProperty('--kicker-fs');
      bar.style.removeProperty('--bar-tag-size');
      badge.style.top = badge.style.right = badge.style.width = '';
      Object.assign(state, {
        padLeft: num(cs(panel).paddingLeft) - cap(), drop: num(cs(block).marginTop),
        badgeTop: num(cs(badge).top), badgeRight: num(cs(badge).right) - cap(),
        badgeW: badge.offsetWidth,
        heroSize: num(cs(h1).fontSize), kickerFs: num(cs(kicker).fontSize),
        barTag: num(cs(barTag).fontSize),
        maxw: num(cs(vport).getPropertyValue('--maxw')) });
      apply();
    }
  });
  addEventListener('resize', report);
  apply();
})();
