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
  if (!vport || !panel || !block || !badge) return;

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
  };

  function apply(){
    panel.style.paddingLeft = `calc(${cap()}px + ${state.padLeft.toFixed(1)}px)`;
    block.style.marginTop   = state.drop.toFixed(1) + 'px';
    badge.style.top    = state.badgeTop.toFixed(1) + 'px';
    badge.style.right  = `calc(${cap()}px + ${state.badgeRight.toFixed(1)}px)`;
    badge.style.width  = state.badgeW.toFixed(1) + 'px';
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
      `drag wordmark · drag badge · drag badge's ▘ corner\n` +
      `shift = 10× slower · R = reset`;
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

  drag(badge, (dx, dy, s) => {
    state.badgeRight = Math.max(0, s.badgeRight - dx);  // anchored from the RIGHT
    state.badgeTop   = s.badgeTop + dy;
  });

  const grip = document.createElement('div');
  grip.style.cssText = `position:absolute;left:-7px;top:-7px;width:16px;height:16px;
    background:#1fcbc4;border:1px solid #06302e;cursor:nwse-resize;z-index:5`;
  badge.appendChild(grip);
  drag(grip, (dx, dy, s) => {
    state.badgeW = Math.max(24, s.badgeW - dx);       // grows toward the left/top
    state.badgeRight = s.badgeRight;
  }, 'nwse-resize');

  addEventListener('keydown', e => {
    if (e.key === 'r' || e.key === 'R') {
      panel.style.paddingLeft = block.style.marginTop = '';
      badge.style.top = badge.style.right = badge.style.width = '';
      Object.assign(state, {
        padLeft: num(cs(panel).paddingLeft) - cap(), drop: num(cs(block).marginTop),
        badgeTop: num(cs(badge).top), badgeRight: num(cs(badge).right) - cap(),
        badgeW: badge.offsetWidth });
      apply();
    }
  });
  addEventListener('resize', report);
  apply();
})();
