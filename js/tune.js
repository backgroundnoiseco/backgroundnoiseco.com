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
  const badge = document.querySelector('.p-badge');
  const h1     = document.querySelector('.panel--hero h1');
  const kicker = document.querySelector('.panel--hero .kicker');
  const barTag = document.querySelector('.sub-panel--hero .tag');
  const bar    = document.querySelector('.p-sub');
  if (!vport || !panel || !block || !badge || !h1 || !kicker || !barTag || !bar) return;

  const KF0 = 360;
  const num = v => parseFloat(v) || 0;
  const cs  = el => getComputedStyle(el);
  const cap = () => num(cs(vport).getPropertyValue('--cap'));
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
    report();
  }

  // --- readout -------------------------------------------------------------
  const ui = document.createElement('div');
  ui.style.cssText = `position:fixed;left:12px;bottom:12px;z-index:99999;max-width:430px;
    font:11px/1.5 ui-monospace,Menlo,monospace;color:#eae6dc;background:rgba(10,10,10,.94);
    border:1px solid #333;padding:10px 12px;white-space:pre;pointer-events:auto;
    border-radius:4px;box-shadow:0 6px 30px rgba(0,0,0,.6)`;
  document.body.appendChild(ui);

  function K(v0, v1, span){ return ((v1 - v0) / span).toFixed(8).replace(/0+$/,'').replace(/\.$/,''); }

  function report(){
    const w = innerWidth, C = bandCap(), span = C - KF0, S = step();
    const atMax = w >= C, atMin = w <= KF0;
    const which = atMax ? `EDITING THE ${C}px KEYFRAME`
                : atMin ? `EDITING THE ${KF0}px KEYFRAME`
                : `⚠ BETWEEN KEYFRAMES (${w}px) — widen to ${C}+ or narrow to ${KF0} first`;
    // small-keyframe values are read straight off the stylesheet's own floors
    const p0 = 60, d0 = 60, bw0 = 82;
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
      `--hero-drop  (60 -> ${state.drop.toFixed(0)})`,
      `   min(clamp(60px, calc(60px + var(--kf-x) * ${K(d0,state.drop,span)}), ${state.drop.toFixed(0)}px),`,
      `       max(0px, calc(100svh - 580px)))`,
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
    ui.textContent =
      `${which}\n` +
      `viewport ${w} · band ${Math.min(w,C)} · ring step ${S}\n` +
      `──────────────────────────────────────────\n` +
      `badge top    ${state.badgeTop.toFixed(1)}px  = ring-step × ${(state.badgeTop/S).toFixed(2)}\n` +
      `badge right  ${state.badgeRight.toFixed(1)}px  = ring-step × ${(state.badgeRight/S).toFixed(2)}\n` +
      `   top:calc(var(--ring-step) * ${(state.badgeTop/S).toFixed(2)});\n` +
      `   right:calc(var(--cap) + var(--ring-step) * ${(state.badgeRight/S).toFixed(2)});\n` +
      `──────────────────────────────────────────\n` +
      lines.join('\n') +
      `\n──────────────────────────────────────────\n` +
      `drag wordmark/badge to move · corner grip = badge size\n` +
      `side grips: yellow = hero · blue = kicker · purple = bar tagline\n` +
      `shift = 10× slower · R = reset · H = hide panel · G = hide handles` +
      (gripsHidden ? `  [handles hidden]` : ``);
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
    if (e.key === 'r' || e.key === 'R') {
      panel.style.paddingLeft = block.style.marginTop = '';
      vport.style.removeProperty('--hero-size');
      panel.style.removeProperty('--kicker-fs');
      bar.style.removeProperty('--bar-tag-size');
      badge.style.top = badge.style.right = badge.style.width = '';
      Object.assign(state, {
        padLeft: num(cs(panel).paddingLeft) - cap(), drop: num(cs(block).marginTop),
        badgeTop: num(cs(badge).top), badgeRight: num(cs(badge).right) - cap(),
        badgeW: badge.offsetWidth,
        heroSize: num(cs(h1).fontSize), kickerFs: num(cs(kicker).fontSize),
        barTag: num(cs(barTag).fontSize) });
      apply();
    }
  });
  addEventListener('resize', report);
  apply();
})();
