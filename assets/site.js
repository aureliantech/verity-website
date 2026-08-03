/* =========================================================
   Verity Law Firm — site behaviour
   Shared by every page. Each concern is isolated in its own
   guarded IIFE: pages differ (the homepage has a .hero and a
   services fan rail, inner pages do not), so a missing element
   must never stop later blocks from running.
   ========================================================= */

/* ---------- 1. hero height -----------------------------------------------
   The hero should fill exactly one viewport below the header. The utility
   bar above the header isn't sticky and the header itself can change
   height (scrolled state, font load, text wrap on narrow screens), so this
   is measured rather than hard-coded, and re-measured when any of that
   could have changed. */
(function () {
  var hero = document.querySelector('.svc-hero');
  if (!hero) return;
  function setOffset() {
    var top = hero.getBoundingClientRect().top + window.scrollY;
    document.documentElement.style.setProperty('--hero-offset', Math.max(0, Math.round(top)) + 'px');
  }
  setOffset();
  window.addEventListener('load', setOffset);
  window.addEventListener('resize', setOffset, { passive: true });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(setOffset); }
})();

/* ---------- 2. loading screen -------------------------------------------
   Runs first. Whatever else fails, the overlay must lift. */
(function () {
  var root = document.documentElement;
  var screen = document.getElementById('loadingScreen');
  if (!screen) { root.classList.remove('is-loading'); return; }

  // already seen this session (flag set by the inline <head> script)
  if (root.classList.contains('intro-seen')) {
    root.classList.remove('is-loading');
    if (screen.parentNode) screen.parentNode.removeChild(screen);
    return;
  }

  var MIN_MS = 1900;
  var shownAt = Date.now();
  var done = false;

  function dismiss() {
    if (done) return;
    done = true;
    setTimeout(function () {
      screen.classList.add('is-done');
      root.classList.remove('is-loading');
      var kill = function () { if (screen.parentNode) screen.parentNode.removeChild(screen); };
      screen.addEventListener('transitionend', kill, { once: true });
      setTimeout(kill, 1200); // in case transitionend never fires
    }, Math.max(0, MIN_MS - (Date.now() - shownAt)));
  }

  if (document.readyState === 'complete') dismiss();
  else window.addEventListener('load', dismiss);
  setTimeout(dismiss, 6000); // hard safety net
})();

/* ---------- 3. scroll reveal --------------------------------------------
   Content is opacity:0 until this runs, so it goes early. */
(function () {
  var els = document.querySelectorAll('.reveal, .reveal-text');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    for (var i = 0; i < els.length; i++) els[i].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();

/* ---------- 4. footer year ---------------------------------------------- */
(function () {
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* ---------- 5. header shadow on scroll ---------------------------------- */
(function () {
  var header = document.getElementById('siteHeader');
  if (!header) return;
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---------- 6. sticky call bar ------------------------------------------
   Hidden until the hero is scrolled past. The homepage uses .hero, inner
   pages use .svc-hero; with neither, fall back to a scroll distance. */
(function () {
  var bar = document.getElementById('stickyCall');
  if (!bar) return;
  var hero = document.querySelector('.hero, .svc-hero');
  function toggle() {
    var past = hero ? hero.getBoundingClientRect().bottom <= 0 : window.scrollY > 420;
    bar.style.transform = past ? 'translateY(0)' : 'translateY(120%)';
  }
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
  window.addEventListener('resize', toggle, { passive: true });
})();

/* ---------- 7. mega menu (desktop) -------------------------------------- */
(function () {
  var item = document.querySelector('[data-mega-item]');
  var trigger = document.getElementById('megaTrigger');
  var scrim = document.getElementById('megaScrim');
  if (!item || !trigger) return;
  var timer;

  function open() {
    clearTimeout(timer);
    item.classList.add('mega-open');
    trigger.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.classList.add('show');
  }
  function close() {
    item.classList.remove('mega-open');
    trigger.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.classList.remove('show');
  }
  function closeSoon() { clearTimeout(timer); timer = setTimeout(close, 260); }

  trigger.addEventListener('click', function () {
    if (item.classList.contains('mega-open')) { close(); } else { open(); }
  });
  function fine() { return window.matchMedia('(hover:hover) and (pointer:fine)').matches; }
  item.addEventListener('mouseenter', function () { if (fine()) open(); });
  item.addEventListener('mouseleave', function () { if (fine()) closeSoon(); });
  document.addEventListener('click', function (e) { if (!item.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

/* ---------- 8. mobile drawer + services drill-down ---------------------- */
(function () {
  var burger = document.getElementById('hamburgerBtn');
  var drawer = document.getElementById('mobileDrawer');
  if (!burger || !drawer) return;
  var backdrop = document.getElementById('drawerBackdrop');
  var closeBtn = document.getElementById('drawerClose');
  var scene = document.getElementById('drawerScene');
  var svcOpen = document.getElementById('servicesTrigger');
  var svcBack = document.getElementById('servicesBack');

  function open() {
    drawer.classList.add('open');
    burger.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    drawer.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (scene) scene.classList.remove('services-open');
    if (svcOpen) svcOpen.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    if (drawer.classList.contains('open')) { close(); } else { open(); }
  });
  if (backdrop) backdrop.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  Array.prototype.forEach.call(drawer.querySelectorAll('.mobile-nav-root > a'), function (a) {
    a.addEventListener('click', close);
  });
  Array.prototype.forEach.call(drawer.querySelectorAll('.mobile-services-panel a'), function (a) {
    a.addEventListener('click', close);
  });

  if (svcOpen && scene) {
    svcOpen.addEventListener('click', function () {
      scene.classList.add('services-open');
      svcOpen.setAttribute('aria-expanded', 'true');
    });
  }
  if (svcBack && scene) {
    svcBack.addEventListener('click', function () {
      scene.classList.remove('services-open');
      if (svcOpen) svcOpen.setAttribute('aria-expanded', 'false');
    });
  }
})();

/* ---------- 9. services fan panels (homepage only) ---------------------- */
(function () {
  var rail = document.getElementById('fanRail');
  if (!rail) return;
  var panels = Array.prototype.slice.call(rail.querySelectorAll('[data-panel]'));
  if (!panels.length) return;
  var canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var active = null;

  function render() {
    rail.classList.toggle('has-active', active !== null);
    panels.forEach(function (p, i) {
      var on = active === i;
      p.classList.toggle('is-active', on);
      var t = p.querySelector('.fan-trigger');
      if (t) t.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  panels.forEach(function (p, i) {
    var trigger = p.querySelector('.fan-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      active = (active === i) ? null : i;
      render();
    });
    if (canHover) p.addEventListener('mouseenter', function () { active = i; render(); });
  });
  if (canHover) rail.addEventListener('mouseleave', function () { active = null; render(); });
})();

/* ---------- 10. FAQ accordion -------------------------------------------- */
(function () {
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;
  Array.prototype.forEach.call(items, function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      Array.prototype.forEach.call(document.querySelectorAll('.faq-item.open'), function (other) {
        if (other === item) return;
        other.classList.remove('open');
        var oq = other.querySelector('.faq-q'), oa = other.querySelector('.faq-a');
        if (oq) oq.setAttribute('aria-expanded', 'false');
        if (oa) oa.style.maxHeight = null;
      });
      if (isOpen) {
        item.classList.remove('open');
        q.setAttribute('aria-expanded', 'false');
        a.style.maxHeight = null;
      } else {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });
})();

/* ---------- 11. dir-acc accordion (What it does / doesn't do / mistakes) */
(function () {
  var buttons = document.querySelectorAll('.dir-acc-q');
  if (!buttons.length) return;
  Array.prototype.forEach.call(buttons, function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.style.maxHeight = isOpen ? null : panel.scrollHeight + 'px';
    });
  });
})();

/* ---------- 12. FAQ category filter ------------------------------------- */
(function () {
  var row = document.getElementById('faqFilters');
  if (!row) return;
  var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
  row.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.filter-chip') : null;
    if (!btn) return;
    Array.prototype.forEach.call(row.querySelectorAll('.filter-chip'), function (c) {
      c.classList.remove('active');
    });
    btn.classList.add('active');
    var f = btn.getAttribute('data-filter');
    groups.forEach(function (g) {
      g.hidden = !(f === 'All' || g.getAttribute('data-cat') === f);
    });
  });
})();

/* ---------- 13. last-resort safety net ----------------------------------
   If anything above ever throws, the page must still be readable rather
   than a blank screen of opacity:0 sections behind a stuck overlay. */
window.addEventListener('error', function () {
  document.documentElement.classList.remove('is-loading');
  var s = document.getElementById('loadingScreen');
  if (s && s.parentNode) s.parentNode.removeChild(s);
  Array.prototype.forEach.call(document.querySelectorAll('.reveal, .reveal-text'), function (el) {
    el.classList.add('in');
  });
});
