(() => {
  'use strict';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clicking any in-page anchor link (nav, footer, CTA hrefs) starts its own
  // scroll toward that target. If it happens to pass through a pinned
  // snap zone, the snap logic below must not hijack it — otherwise a click
  // on "Services" or "Plans" gets redirected mid-flight to the nearest
  // pinned section's snap point instead of reaching the clicked anchor.
  let suppressSnap = false;
  let suppressSnapTimer = null;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    suppressSnap = true;
    clearTimeout(suppressSnapTimer);
    const clearSuppress = () => { suppressSnap = false; removeEventListener('scrollend', clearSuppress); };
    addEventListener('scrollend', clearSuppress, { once: true });
    suppressSnapTimer = setTimeout(clearSuppress, 1200);
  });

  /* ---------- nav ---------- */
  const nav = document.getElementById('siteNav');
  const navToggle = document.getElementById('navToggle');
  const navSheet = document.getElementById('navSheet');

  function closeNav() {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navSheet.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
  matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) closeNav(); });

  /* ---------- reveal-on-scroll ---------- */
  const revealItems = [];
  document.querySelectorAll('.reveal-item').forEach(el => revealItems.push(el));
  document.querySelectorAll('.reveal-group').forEach(group => {
    Array.from(group.children).forEach((el, i) => {
      el.style.transitionDelay = (i * 0.06).toFixed(2) + 's';
      revealItems.push(el);
    });
  });
  document.querySelectorAll('.step').forEach((el, i) => {
    el.style.transitionDelay = (i * 0.08).toFixed(2) + 's';
    revealItems.push(el);
  });

  if (reducedMotion) {
    revealItems.forEach(el => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach(el => io.observe(el));
    // catch anything already in view above the fold on load
    setTimeout(() => {
      revealItems.forEach(el => {
        if (el.classList.contains('is-visible')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-visible');
      });
    }, 400);
  }

  /* ---------- pinned-section snap: a small scroll into a pinned block
     auto-completes the rest of it with a smooth scrollTo, instead of making
     the user manually scroll through the whole drive distance. Works for any
     tall-wrapper > sticky-child pair; one lock per instance so the
     in-flight animation's own scroll events don't re-trigger it. ---------- */
  // forwardFraction is how far through the drive range the assisted snap
  // carries you: 1 = fully past the section (hero — nothing to linger on
  // once the video's playing), <1 = only through the "reveal" part, leaving
  // the rest of the drive as ordinary, unassisted scroll so there's a real
  // dwell zone to read the end state before it moves on (fix-scrub).
  function createSnap(wrapperEl, stickyEl, forwardFraction = 1) {
    let locked = false;
    return function attemptSnap(direction) {
      if (locked || reducedMotion || suppressSnap || !wrapperEl || !stickyEl) return;
      const rect = wrapperEl.getBoundingClientRect();
      const range = wrapperEl.offsetHeight - stickyEl.offsetHeight;
      if (range <= 0) return;
      const p = Math.min(1, Math.max(0, -rect.top / range));
      if (p <= 0.05 || p >= 0.95) return;
      if (direction > 0 && p >= forwardFraction - 0.02) return;
      const elTop = rect.top + scrollY;
      // forward lands past the wrapper's full height (sticky child fully
      // scrolled away, next section flush below the fixed nav) rather than
      // just the unpin point (range), which would still leave the sticky
      // child's own height of the wrapper left to clear — and without the
      // nav-height offset, a short next section (like the ticker) lands
      // flush at the viewport top and ends up hidden behind the nav bar.
      const target = direction > 0
        ? (forwardFraction >= 1 ? elTop + wrapperEl.offsetHeight - nav.offsetHeight : elTop + range * forwardFraction)
        : elTop;
      locked = true;
      scrollTo({ top: target, behavior: 'smooth' });
      const unlock = () => { locked = false; removeEventListener('scrollend', unlock); };
      addEventListener('scrollend', unlock, { once: true });
      setTimeout(unlock, 700);
    };
  }

  /* ---------- hero: continuous scroll-scrub video ---------- */
  const heroScrub = document.querySelector('.hero-scrub');
  const heroSticky = document.querySelector('.hero-sticky');
  const heroVideo = document.getElementById('heroVideo');
  const heroFallback = document.getElementById('heroFallback');
  const heroCopy = document.getElementById('heroCopy');
  const heroScrollCue = document.querySelector('.hero-scroll-cue');
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  const fixSticky = document.querySelector('.fix-sticky');
  const fixStage = document.querySelector('.fix-stage');
  const fixBefore = document.getElementById('fixBefore');
  const fixAfter = document.getElementById('fixAfter');
  const snapHero = createSnap(heroScrub, heroSticky);
  const FIX_REVEAL_FRACTION = 0.3;
  const snapFix = createSnap(fixSticky, fixStage, FIX_REVEAL_FRACTION);
  let lastFixY = scrollY;

  requestAnimationFrame(() => heroCopy.classList.add('is-in'));

  let videoReady = false;
  let videoFailed = false;

  function useFallback() {
    if (videoFailed) return;
    videoFailed = true;
    heroVideo.hidden = true;
    heroFallback.hidden = false;
  }

  function markReady() {
    if (videoReady || videoFailed) return;
    if (heroVideo.duration && isFinite(heroVideo.duration)) videoReady = true;
  }
  heroVideo.addEventListener('loadedmetadata', markReady);
  heroVideo.addEventListener('durationchange', markReady);
  heroVideo.addEventListener('canplay', markReady);
  heroVideo.addEventListener('error', useFallback);
  // nudge iOS Safari to decode the first frame without visibly playing it
  heroVideo.play().then(() => heroVideo.pause()).catch(() => {});
  setTimeout(() => { if (!videoReady && !videoFailed) useFallback(); }, 6000);

  // plays forward only while the user is actively scrolling down through the
  // pinned hero block, freezes on the current frame once scrolling stops or
  // reverses (native <video> can't play backwards) — the video stays the
  // background layer throughout, never covering the copy in front of it.
  // Driven from the single rAF-throttled updateScroll loop below — two
  // independent scroll listeners fighting over play()/pause() on the same
  // element is what made this flaky, so there is exactly one controller.
  let heroInRange = false;
  let lastHeroY = scrollY;
  let idleTimer = null;

  function driveHeroVideo(progress, moved, goingDown) {
    const inRange = progress > 0 && progress < 1;

    if (!inRange) {
      if (heroInRange && videoReady) {
        heroVideo.pause();
        clearTimeout(idleTimer);
        if (progress <= 0) heroVideo.currentTime = 0;
      }
      heroInRange = inRange;
      return;
    }
    heroInRange = inRange;

    if (moved && videoReady) {
      if (goingDown) { if (heroVideo.paused) heroVideo.play().catch(() => {}); }
      else heroVideo.pause();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => heroVideo.pause(), 220);
    }
  }

  function updateScroll() {
    // hero scrub progress
    if (heroScrub) {
      const rect = heroScrub.getBoundingClientRect();
      const range = heroScrub.offsetHeight - innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;

      const heroMoved = scrollY !== lastHeroY;
      const heroGoingDown = scrollY > lastHeroY;
      if (heroMoved) { lastHeroY = scrollY; snapHero(heroGoingDown ? 1 : -1); }
      driveHeroVideo(progress, heroMoved, heroGoingDown);

      const fade = 1 - Math.min(1, progress / 0.32);
      heroCopy.style.opacity = String(fade);
      heroCopy.style.transform = `translateY(${(1 - fade) * -24}px)`;
      if (heroScrollCue) heroScrollCue.style.opacity = String(Math.max(0, 1 - progress * 6));
    }

    // fix-scrub: scroll-driven before/after crossfade, Moto-card-flip style.
    // The crossfade itself is compressed into the first FIX_REVEAL_FRACTION
    // of the drive (cp reaches 1 there and holds) — snapFix carries a small
    // scroll through that reveal automatically, and everything past it is a
    // plain, unassisted dwell so there's real time to read the "after" card.
    if (fixSticky && fixStage && fixBefore && fixAfter && !reducedMotion) {
      const rect = fixSticky.getBoundingClientRect();
      const range = fixSticky.offsetHeight - fixStage.offsetHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
      const cp = Math.min(1, p / FIX_REVEAL_FRACTION);

      fixBefore.style.opacity = String(1 - cp);
      fixBefore.style.transform = `scale(${(1 - cp * 0.08).toFixed(3)}) rotate(${(-cp * 6).toFixed(2)}deg) translateY(${(-cp * 10).toFixed(1)}px)`;
      fixAfter.style.opacity = String(cp);
      fixAfter.style.transform = `scale(${(0.94 + cp * 0.06).toFixed(3)}) rotate(${((1 - cp) * 6).toFixed(2)}deg) translateY(${((1 - cp) * 10).toFixed(1)}px)`;

      const fixMoved = scrollY !== lastFixY;
      if (fixMoved) { const fixGoingDown = scrollY > lastFixY; lastFixY = scrollY; snapFix(fixGoingDown ? 1 : -1); }
    }

    // background parallax (quote + about imagery)
    if (!reducedMotion) {
      parallaxEls.forEach(el => {
        const depth = parseFloat(el.dataset.parallax) || 0.3;
        const host = el.parentElement;
        const r = host.getBoundingClientRect();
        const prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
        el.style.transform = `translate3d(0, ${(-prog * depth * 140).toFixed(2)}px, 0)`;
      });
    }

    nav.classList.toggle('is-scrolled', scrollY > 12);
    ticking = false;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScroll);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateScroll();

  /* ---------- cta form — posts to /api/callback-request ---------- */
  const ctaForm = document.getElementById('ctaForm');
  const ctaEmail = document.getElementById('ctaEmail');
  const ctaCompany = document.getElementById('ctaCompany');
  const ctaNote = document.getElementById('ctaNote');
  const ctaButton = ctaForm ? ctaForm.querySelector('button[type="submit"]') : null;
  const ctaNoteDefault = ctaNote ? ctaNote.innerHTML : '';

  function resetCtaNote() {
    ctaNote.innerHTML = ctaNoteDefault;
    ctaNote.classList.remove('is-confirmed', 'is-error');
  }

  if (ctaForm) {
    ctaForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!ctaEmail.checkValidity()) {
        ctaEmail.reportValidity();
        return;
      }
      ctaButton.disabled = true;
      try {
        const res = await fetch('/api/callback-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ctaEmail.value.trim(), company: ctaCompany ? ctaCompany.value : '' }),
        });
        if (!res.ok) throw new Error('request failed');
        ctaNote.textContent = 'Thanks — a technician will call you back shortly.';
        ctaNote.classList.remove('is-error');
        ctaNote.classList.add('is-confirmed');
        ctaForm.reset();
      } catch {
        ctaNote.textContent = 'Something went wrong — call us instead at 1-888-402-7714.';
        ctaNote.classList.remove('is-confirmed');
        ctaNote.classList.add('is-error');
      } finally {
        ctaButton.disabled = false;
        setTimeout(resetCtaNote, 6000);
      }
    });
  }
})();
