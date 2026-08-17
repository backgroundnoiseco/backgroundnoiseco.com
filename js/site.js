  // Decode the obfuscated email link (matches the pattern used in index.html)
  document.querySelectorAll('a.email[data-a][data-b]').forEach(el => {
    const addr = atob(el.dataset.a) + '@' + atob(el.dataset.b);
    el.href = 'mailto:' + addr;
    el.textContent = addr;
  });



  // Respect the OS reduced-motion preference for programmatic scrolls
  const SCROLL_BEHAVIOR = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  // The layout's two keyframe widths. Everything fluid on the page interpolates between
  // them - in CSS via --kf-x (see the keyframe table at the top of css/site.css), and here
  // for the one piece of positioning JS still owns. Keep these in sync with the CSS.
  const KF0 = 360, KF1 = 1000;

  // Portrait stage — one scroll-progress value drives everything: the panels translate by
  // (index - progress) * 100%, and the rail reads the same number. No IntersectionObserver,
  // no second source of truth to drift out of sync.
  (function(){
    const root   = document.querySelector('.page[data-page="portrait"]');
    const vport  = document.querySelector('.v-port');
    const track  = document.querySelector('.v-port .stage-track');
    const stage  = document.querySelector('.v-port .stage');
    const outro  = document.querySelector('.v-port .p-outro');
    const panels = [...document.querySelectorAll('.v-port .panel')];
    const marks  = [...document.querySelectorAll('.v-port .p-rail button')];
    if (!root || !vport || !track || !stage || !panels.length) return;
    const last = panels.length - 1;

    // All geometry is measured once (and on real size changes), never in the scroll hot
    // path: reading getComputedStyle/getBoundingClientRect right after writing --progress
    // forces a full synchronous style recalc of everything var-dependent, every frame -
    // which is exactly the Safari jank. The hot path is one scrollTop read + one var write.
    let stickyTopV = 0, trackStart = 0, travel = 1, outroLine = Infinity;
    function measure(){
      const rootTop = root.getBoundingClientRect().top;
      stickyTopV = parseFloat(getComputedStyle(stage).top) || 0;
      travel = Math.max(1, track.offsetHeight - stage.offsetHeight);   // === last * 100svh
      trackStart = track.getBoundingClientRect().top - rootTop + root.scrollTop - stickyTopV;
      // clamp to max scroll: on short pages the outro's top never reaches the sticky
      // line, which used to leave the rail stuck on 03 at the very bottom
      const maxScroll = root.scrollHeight - root.clientHeight;
      outroLine = outro ? Math.min(
        outro.getBoundingClientRect().top - rootTop + root.scrollTop - stickyTopV - 2,
        maxScroll - 2
      ) : Infinity;
      schedule();
    }
    const stickyTop = () => stickyTopV;

    let raf = 0, lastActive = null;
    function update(){
      raf = 0;
      const st = root.scrollTop;
      const p = Math.min(Math.max((st - trackStart) / travel, 0), 1) * last;
      vport.style.setProperty('--progress', p);
      let active = panels[Math.round(p)].dataset.idx;
      if (st >= outroLine) active = 'contact';
      if (active === lastActive) return;
      lastActive = active;
      marks.forEach(m => {
        const on = m.dataset.s === active;
        m.classList.toggle('on', on);
        if (on) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current');
      });
    }
    function schedule(){ if (!raf) raf = requestAnimationFrame(update); }

    root.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();

    // expose for the click-to-scroll handler below
    vport._stage = {track, stage, panels, last, stickyTop, update, measure};
  })();

  // Portrait — position each project's phone/info pair. Sizing (title, CTA, shell radius)
  // is now pure CSS via cqb against the .frame container; this only handles the wide-screen
  // composition shift, which is keyed to viewport width and so can't be a container query.
  (function(){
    const slots = [...document.querySelectorAll('.v-port .panel--project')];
    if (!slots.length || typeof ResizeObserver === 'undefined') return;
    function positionAll(){
      slots.forEach(slot => {
        const phone = slot.querySelector('.p-phone');
        const info = slot.querySelector('.p-info');
        if (!phone) return;
        phone.style.transform = '';
        if (info) info.style.transform = '';
        const pRect = phone.getBoundingClientRect();
        if (pRect.width <= 0) return;
        // Shift the pair so the phone's centre lands ~37% of width. Past the layout cap
        // (maxw + 64 = 1000) freeze the target at a constant offset left of centre, so the
        // pair stops drifting left as the window widens (37% of viewport keeps sliding left
        // of the centred, capped content otherwise). The two branches meet exactly at
        // CAP_W (0.37 x 1000 === 1000/2 - 130), so there is no step there.
        const CAP_W = 1000;
        const phoneCenter = pRect.left + pRect.width / 2;
        const vw = window.innerWidth;
        const target = vw <= CAP_W ? vw * 0.37 : vw / 2 - CAP_W * 0.13;
        // Ease the shift in across the SAME keyframes the CSS uses (--kf-x, 360 -> 1000)
        // rather than switching it on at a threshold. This used to be `vw < 860 ? 0 : full`,
        // which snapped the phone 100px sideways the moment you crossed 860.
        const t = Math.min(1, Math.max(0, (vw - KF0) / (KF1 - KF0)));
        const delta = Math.max(0, Math.round((target - phoneCenter) * t));
        phone.style.transform = 'translateX(' + delta + 'px)';
        if (info) info.style.transform = 'translateX(' + delta + 'px)';
      });
      fitTitles();
    }
    // On narrow windows the info column can run past the frame's right edge and clip the
    // project title. Shrink the title's font just enough that its rendered text fits inside
    // the frame. Measured with a Range (the actual glyph extent), reset to the CSS cqb size
    // each pass so it grows back when there's room. All panels share the same x (inset:0,
    // vertical translate only), so the off-screen panels measure correctly too.
    const frameEl = document.querySelector('.v-port .frame');
    function fitTitles(){
      if (!frameEl) return;
      const fr = frameEl.getBoundingClientRect();
      slots.forEach(slot => {
        const role = slot.querySelector('.p-info .role');
        if (!role) return;
        role.style.fontSize = '';
        const range = document.createRange();
        range.selectNodeContents(role);
        const tr = range.getBoundingClientRect();
        // stop at the panel's content edge, not the frame's - that way the CSS right
        // padding is the single source of breathing room and this can't undercut it
        const pr = slot.getBoundingClientRect();
        const padR = parseFloat(getComputedStyle(slot).paddingRight) || 0;
        const avail = Math.min(fr.right, pr.right - padR) - tr.left;
        if (tr.width > avail && avail > 0) {
          const cur = parseFloat(getComputedStyle(role).fontSize);
          role.style.fontSize = Math.max(14, cur * avail / tr.width).toFixed(1) + 'px';
        }
      });
    }
    slots.forEach(slot => {
      const phone = slot.querySelector('.p-phone');
      if (phone) new ResizeObserver(positionAll).observe(phone);
    });
    window.addEventListener('resize', positionAll);
    positionAll();
  })();

// Portrait — sync scroll-padding-top to the sticky header's real height
  (function(){
    const page = document.querySelector('.page[data-page="portrait"]');
    const topNav = document.querySelector('.v-port .p-top');
    if (!page || !topNav || typeof ResizeObserver === 'undefined') return;
    const sync = () => { page.style.setProperty('--p-top-h', topNav.offsetHeight + 'px'); };
    new ResizeObserver(sync).observe(topNav);
    sync();
  })();

  // Portrait rail — grow the section numbers to fill the rail's leftover height.
  // The rail is anchored under the header and level with the info bar's divider, so its
  // height tracks the viewport while the labels don't; the surplus would otherwise sit as
  // dead gaps between the sections. Each number takes leading zeros (00 -> 000 -> 0000)
  // until only a couple of characters of gap are left, so the rail reads as one run.
  (function(){
    const rail = document.querySelector('.v-port .p-rail');
    if (!rail) return;
    const btns = [...rail.querySelectorAll('button')];
    if (btns.length < 2) return;

    const GAP_CH = 2;   // characters of breathing room kept between sections

    // split each label so the zeros can be swapped without touching the accessible name
    const pads = btns.map(b => {
      const label = b.textContent.trim();
      b.setAttribute('aria-label', label);
      b.textContent = label;
      const pad = document.createElement('span');
      pad.className = 'pad';
      pad.setAttribute('aria-hidden', 'true');
      b.insertBefore(pad, b.firstChild);
      return pad;
    });

    // the rail is vertical-rl, so a text run measures along the box's HEIGHT
    const probe = document.createElement('span');
    probe.textContent = '0000000000';
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';

    function padRail(){
      pads.forEach(p => { p.textContent = ''; });
      rail.appendChild(probe);
      const adv = probe.getBoundingClientRect().height / 10;   // advance + letter-spacing
      rail.removeChild(probe);
      if (!(adv > 0)) return;
      const free = rail.getBoundingClientRect().height
                 - btns.reduce((s, b) => s + b.getBoundingClientRect().height, 0)
                 - (btns.length - 1) * GAP_CH * adv;
      // Spend the budget one whole character at a time and hand the remainder out singly
      // rather than splitting four ways and flooring - a floored quarter throws away up to
      // four characters, which lands back in the gaps and makes them drift wide.
      const budget = Math.max(0, Math.floor(free / adv));
      const each = Math.floor(budget / btns.length), spare = budget % btns.length;
      pads.forEach((p, i) => { p.textContent = '0'.repeat(each + (i < spare ? 1 : 0)); });
    }

    // The rail's height has exactly two inputs - the viewport (svh) and the header, which
    // JS measures into --p-top-h. Watch both directly rather than observing the rail: the
    // zeros change its content on every call, and observing what you rewrite invites a loop.
    window.addEventListener('resize', padRail);
    const topNav = document.querySelector('.v-port .p-top');
    if (topNav && typeof ResizeObserver !== 'undefined') new ResizeObserver(padRail).observe(topNav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(padRail);
    padRail();
  })();

  // Portrait frame — concentric rectangles, drawn as a live <svg> element rather than a
  // data-URI background so the fill can inherit currentColor and tint per panel.
  (function(){
    const frame = document.querySelector('.v-port .frame');
    if (!frame || typeof ResizeObserver === 'undefined') return;
    const STEP = 40;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rects');
    svg.setAttribute('aria-hidden', 'true');
    frame.prepend(svg);
    function render(){
      const r = frame.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // match the section background band, which starts at --cap (= --gutter minus its floor)
      const maxw = parseFloat(getComputedStyle(frame).getPropertyValue('--maxw')) || Infinity;
      const edge = Math.max(0, (r.width - maxw) / 2 - 32);
      const W = r.width - 2 * edge, H = r.height;
      // Collect ring insets, stopping before any rect whose shorter side would be under one
      // STEP — otherwise a frame height that's just past a STEP boundary leaves a thin sliver
      // as the innermost rect. MIN_SIDE keeps the centre rect a sane proportion.
      const MIN_SIDE = STEP;
      const insets = [];
      for (let inset = 0; W - 2 * inset >= MIN_SIDE && H - 2 * inset >= MIN_SIDE; inset += STEP) insets.push(inset);
      // ring colour ramps warm-white (outermost) -> pink (innermost); the CSS fill blends this
      // toward black by --rect-mix so it only shows on the Porcupine panel. Colour is keyed to
      // each ring's pixel depth against a FIXED reference (RAMP_PX), NOT its index-over-count —
      // so a given ring keeps its colour when the window (and thus the ring count) changes.
      // 240px = 6 steps, the innermost depth at desktop, so the centre still reaches full pink
      // there; narrower windows simply don't ramp as deep (consistent, no recolour on resize).
      const WHITE = [252, 205, 226], PINK = [231, 81, 157];  // pink-tinted white -> the outer ring reads clearly pink
      const RAMP_PX = 240;
      let out = '';
      insets.forEach((inset, i) => {
        const w = W - 2 * inset, h = H - 2 * inset;
        const t = Math.min(inset / RAMP_PX, 1);
        const c = WHITE.map((v, k) => Math.round(v + (PINK[k] - v) * t)).join(',');
        out += '<rect x="'+inset+'" y="'+inset+'" width="'+w+'" height="'+h+'" style="--c:rgb('+c+')" fill-opacity="0.15"/>';
      });
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.innerHTML = out;
    }
    new ResizeObserver(render).observe(frame);
  })();

// Portrait rail + Contact nav — click to scroll to section
  (function(){
    const vport = document.querySelector('.v-port');
    if (!vport) return;
    function go(idx){
      const st = vport._stage;
      if (idx === 'contact' || !st) {
        // scroll the container directly - scrollIntoView also scrolls ancestor scrollers
        // (including the window) and can leave the document offset out of bounds
        const t = vport.querySelector('[data-idx="' + idx + '"]');
        const root = document.querySelector('.page[data-page="portrait"]');
        if (t && root) {
          const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
          root.scrollTo({top: root.scrollTop + t.getBoundingClientRect().top - pad, behavior: SCROLL_BEHAVIOR});
        }
        return;
      }
      const i = st.panels.findIndex(p => p.dataset.idx === idx);
      if (i < 0) return;
      const root = document.querySelector('.page[data-page="portrait"]');
      const travel = st.track.offsetHeight - st.stage.offsetHeight;
      const trackTop = root.scrollTop + st.track.getBoundingClientRect().top - st.stickyTop();
      root.scrollTo({top: trackTop + (i / st.last) * travel, behavior:SCROLL_BEHAVIOR});
    }
    document.querySelectorAll('.v-port .p-rail button').forEach(s => {
      s.addEventListener('click', () => go(s.dataset.s));
    });
    const contactLink = document.querySelector('.v-port .p-top nav a');
    if (contactLink) {
      contactLink.addEventListener('click', (e) => { e.preventDefault(); go('contact'); });
    }
    const toTop = document.querySelector('.v-port .p-foot .to-top');
    if (toTop) {
      toTop.addEventListener('click', (e) => {
        e.preventDefault();
        const root = document.querySelector('.page[data-page="portrait"]');
        if (root) root.scrollTo({top: 0, behavior: SCROLL_BEHAVIOR});
      });
    }
  })();

