'use client';

import { useEffect } from 'react';

/**
 * Every scroll/pin/reveal/parallax behavior on the marketing page, ported
 * from the original script.js as one single rAF-throttled controller. Two
 * independent scroll listeners fighting over the same element (e.g. the
 * hero video) is what caused real bugs during the original build — so
 * everything scroll-driven lives in this one effect, not spread across
 * per-section components. Nav open/close and the CTA form are React state
 * in their own components; this only touches DOM the JSX already renders
 * with the exact same ids/classes as before, so selectors below are
 * unchanged from the original.
 */
export default function ScrollFx() {
  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    // Clicking any in-page anchor link (nav, footer, CTA hrefs) starts its
    // own scroll toward that target. If it happens to pass through a pinned
    // snap zone, the snap logic below must not hijack it. Matches both bare
    // "#services" hrefs and next-intl's locale-prefixed "/en#services".
    let suppressSnap = false;
    let suppressSnapTimer: ReturnType<typeof setTimeout> | undefined;
    const onAnchorClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const a = target?.closest('a[href*="#"]');
      if (!a) return;
      suppressSnap = true;
      clearTimeout(suppressSnapTimer);
      const clearSuppress = () => {
        suppressSnap = false;
        removeEventListener('scrollend', clearSuppress);
      };
      addEventListener('scrollend', clearSuppress, { once: true });
      suppressSnapTimer = setTimeout(clearSuppress, 1200);
    };
    document.addEventListener('click', onAnchorClick);
    cleanups.push(() => document.removeEventListener('click', onAnchorClick));

    const nav = document.getElementById('siteNav');

    /* ---------- reveal-on-scroll ---------- */
    const revealItems: HTMLElement[] = [];
    document.querySelectorAll<HTMLElement>('.reveal-item').forEach(el => revealItems.push(el));
    document.querySelectorAll<HTMLElement>('.reveal-group').forEach(group => {
      Array.from(group.children).forEach((el, i) => {
        (el as HTMLElement).style.transitionDelay = (i * 0.06).toFixed(2) + 's';
        revealItems.push(el as HTMLElement);
      });
    });
    document.querySelectorAll<HTMLElement>('.step').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.08).toFixed(2) + 's';
      revealItems.push(el);
    });

    let io: IntersectionObserver | undefined;
    let revealFallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (reducedMotion) {
      revealItems.forEach(el => el.classList.add('is-visible'));
    } else {
      io = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            io!.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
      );
      revealItems.forEach(el => io!.observe(el));
      // catch anything already in view above the fold on load
      revealFallbackTimer = setTimeout(() => {
        revealItems.forEach(el => {
          if (el.classList.contains('is-visible')) return;
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-visible');
        });
      }, 400);
      cleanups.push(() => io?.disconnect());
      cleanups.push(() => clearTimeout(revealFallbackTimer));
    }

    /* ---------- pinned-section snap: a small scroll into a pinned block
       auto-completes the rest of it with a smooth scrollTo, instead of
       making the user manually scroll through the whole drive distance.
       forwardFraction is how far through the drive the assisted snap
       carries you: 1 = fully past the section (hero), <1 = only through
       the "reveal" part, leaving the rest as an unassisted dwell zone
       (fix-scrub) so there's real time to read the end state. ---------- */
    function createSnap(wrapperEl: HTMLElement | null, stickyEl: HTMLElement | null, forwardFraction = 1) {
      let locked = false;
      return function attemptSnap(direction: 1 | -1) {
        if (locked || reducedMotion || suppressSnap || !wrapperEl || !stickyEl) return;
        const rect = wrapperEl.getBoundingClientRect();
        const range = wrapperEl.offsetHeight - stickyEl.offsetHeight;
        if (range <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / range));
        if (p <= 0.05 || p >= 0.95) return;
        if (direction > 0 && p >= forwardFraction - 0.02) return;
        const elTop = rect.top + scrollY;
        // Forward lands past the wrapper's full height (sticky child fully
        // scrolled away, next section flush below the fixed nav) rather
        // than just the unpin point (range), which would still leave the
        // sticky child's own height of the wrapper left to clear — and
        // without the nav-height offset, a short next section (like the
        // ticker) lands flush at the viewport top, hidden behind the nav.
        const target =
          direction > 0
            ? forwardFraction >= 1
              ? elTop + wrapperEl.offsetHeight - (nav?.offsetHeight ?? 0)
              : elTop + range * forwardFraction
            : elTop;
        locked = true;
        scrollTo({ top: target, behavior: 'smooth' });
        const unlock = () => {
          locked = false;
          removeEventListener('scrollend', unlock);
        };
        addEventListener('scrollend', unlock, { once: true });
        setTimeout(unlock, 700);
      };
    }

    /* ---------- hero: continuous scroll-scrub video ---------- */
    const heroScrub = document.querySelector<HTMLElement>('.hero-scrub');
    const heroSticky = document.querySelector<HTMLElement>('.hero-sticky');
    const heroVideo = document.getElementById('heroVideo') as HTMLVideoElement | null;
    const heroFallback = document.getElementById('heroFallback') as HTMLElement | null;
    const heroCopy = document.getElementById('heroCopy');
    const heroTrust = document.getElementById('heroTrust');
    const heroScrollCue = document.querySelector<HTMLElement>('.hero-scroll-cue');
    const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    const fixSticky = document.querySelector<HTMLElement>('.fix-sticky');
    const fixStage = document.querySelector<HTMLElement>('.fix-stage');
    const fixBefore = document.getElementById('fixBefore');
    const fixAfter = document.getElementById('fixAfter');
    const snapHero = createSnap(heroScrub, heroSticky);
    const FIX_REVEAL_FRACTION = 0.3;
    const snapFix = createSnap(fixSticky, fixStage, FIX_REVEAL_FRACTION);
    let lastFixY = scrollY;

    const heroInFrame = requestAnimationFrame(() => heroCopy?.classList.add('is-in'));
    cleanups.push(() => cancelAnimationFrame(heroInFrame));

    let videoReady = false;
    let videoFailed = false;

    function useFallback() {
      if (videoFailed || !heroVideo || !heroFallback) return;
      videoFailed = true;
      heroVideo.hidden = true;
      heroFallback.hidden = false;
    }

    function markReady() {
      if (videoReady || videoFailed || !heroVideo) return;
      if (heroVideo.duration && isFinite(heroVideo.duration)) videoReady = true;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (heroVideo) {
      heroVideo.addEventListener('loadedmetadata', markReady);
      heroVideo.addEventListener('durationchange', markReady);
      heroVideo.addEventListener('canplay', markReady);
      heroVideo.addEventListener('error', useFallback);
      // nudge iOS Safari to decode the first frame without visibly playing it
      heroVideo.play().then(
        () => heroVideo.pause(),
        () => {},
      );
      fallbackTimer = setTimeout(() => {
        if (!videoReady && !videoFailed) useFallback();
      }, 6000);
      cleanups.push(() => {
        heroVideo.removeEventListener('loadedmetadata', markReady);
        heroVideo.removeEventListener('durationchange', markReady);
        heroVideo.removeEventListener('canplay', markReady);
        heroVideo.removeEventListener('error', useFallback);
        clearTimeout(fallbackTimer);
      });
    }

    // Plays forward only while the user is actively scrolling down through
    // the pinned hero block, freezes on the current frame once scrolling
    // stops or reverses (native <video> can't play backwards).
    let heroInRange = false;
    let lastHeroY = scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    function driveHeroVideo(progress: number, moved: boolean, goingDown: boolean) {
      if (!heroVideo) return;
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
        if (goingDown) {
          if (heroVideo.paused) heroVideo.play().catch(() => {});
        } else heroVideo.pause();
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
        if (heroMoved) {
          lastHeroY = scrollY;
          snapHero(heroGoingDown ? 1 : -1);
        }
        driveHeroVideo(progress, heroMoved, heroGoingDown);

        const fade = 1 - Math.min(1, progress / 0.32);
        if (heroCopy) {
          heroCopy.style.opacity = String(fade);
          heroCopy.style.transform = `translateY(${(1 - fade) * -24}px)`;
        }
        if (heroScrollCue) heroScrollCue.style.opacity = String(Math.max(0, 1 - progress * 6));

        // Crossfades in as heroCopy fades out, starting once the copy is
        // mostly gone (0.25) and fully in shortly after (0.40), so the
        // pinned hero has something to show for the rest of its scroll
        // range instead of sitting blank.
        if (heroTrust) {
          const trustFade = Math.max(0, Math.min(1, (progress - 0.25) / 0.15));
          heroTrust.style.opacity = String(trustFade);
          heroTrust.style.transform = `translateY(${(1 - trustFade) * 16}px)`;
        }
      }

      // fix-scrub: scroll-driven before/after crossfade, Moto-card-flip
      // style. The crossfade itself is compressed into the first
      // FIX_REVEAL_FRACTION of the drive (cp reaches 1 there and holds) —
      // snapFix carries a small scroll through that reveal automatically,
      // and everything past it is a plain, unassisted dwell so there's
      // real time to read the "after" card.
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
        if (fixMoved) {
          const fixGoingDown = scrollY > lastFixY;
          lastFixY = scrollY;
          snapFix(fixGoingDown ? 1 : -1);
        }
      }

      // background parallax (quote + about imagery)
      if (!reducedMotion) {
        parallaxEls.forEach(el => {
          const depth = parseFloat(el.dataset.parallax ?? '') || 0.3;
          const host = el.parentElement;
          if (!host) return;
          const r = host.getBoundingClientRect();
          const prog = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
          el.style.transform = `translate3d(0, ${(-prog * depth * 140).toFixed(2)}px, 0)`;
        });
      }

      nav?.classList.toggle('is-scrolled', scrollY > 12);
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
    cleanups.push(() => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  return null;
}
