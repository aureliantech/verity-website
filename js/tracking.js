/* ============================================================================
   AURELIAN TRACKING  —  v2.6.0
   ----------------------------------------------------------------------------
   SHARED LOGIC. Identical on every client site — byte for byte.
   Safe to overwrite wholesale when updating. Contains no per-site values.

   Install, in this order, as the LAST two elements inside <head>:

       <script src="/js/tracking-config.js"></script>
       <script src="/js/tracking.js"></script>

   Order matters and neither tag takes async/defer — config must parse first.

   Loads GA4 and CallRail, applies EEA consent gating, and tracks tel: and
   mailto: clicks. Per-site values live in tracking-config.js. If this file
   needs to change, it changes everywhere and the version number goes up.
   ========================================================================== */

(function () {
  'use strict';

  var VERSION = '2.6.0';

  /* --- config guard ------------------------------------------------------
     The cost of splitting config into its own file is a new failure mode:
     the config never loaded, or shipped with placeholders still in it. Both
     are silent without this check — worse, a placeholder GA4 ID means data
     goes nowhere while everything looks fine. Fail loudly instead.
     ---------------------------------------------------------------------- */

  var cfg = window.AURELIAN_CONFIG;

  if (!cfg || typeof cfg !== 'object') {
    console.error('[aurelian] tracking-config.js did not load. ' +
                  'It must appear BEFORE tracking.js in <head>. Tracking is off.');
    return;
  }

  var missing = ['ga4_id', 'callrail_company', 'callrail_swap', 'house_number']
    .filter(function (k) { return !cfg[k]; });

  if (missing.length) {
    console.error('[aurelian] config missing required keys: ' + missing.join(', '));
  }

  if (/^G-X+$/i.test(cfg.ga4_id || '') || /^0+$/.test(cfg.callrail_company || '')) {
    console.error('[aurelian] config still contains placeholder values. ' +
                  'This site is not sending real data.');
  }

  if (!cfg.ga4_id) return;

  var lastClick = { href: null, at: 0 };

  /* --- debug mode --------------------------------------------------------
     Detected, not just configured. Turns itself on for local dev and Vercel
     preview deploys, so `debug: true` never has to be pushed to production
     and can never be left on by accident.

     Also switchable on a live site with ?aurelian_debug=1 — persisted for the
     session so it survives navigation during QA.
     ---------------------------------------------------------------------- */

  var DEBUG = (function () {
    if (cfg.debug === true) return true;

    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' ||
        h === '' || h.slice(-6) === '.local' ||
        /\.vercel\.app$/.test(h)) return true;

    try {
      if (/[?&]aurelian_debug=1/.test(location.search)) {
        sessionStorage.setItem('aurelian_debug', '1');
        return true;
      }
      return sessionStorage.getItem('aurelian_debug') === '1';
    } catch (e) {
      return false;
    }
  })();

  // Non-production traffic is still sent, but flagged. debug_mode routes events
  // into GA4's DebugView (a live event stream with every parameter visible — far
  // better QA than console logs) and makes them removable with a Developer
  // traffic data filter.

  /* --- phone comparison --------------------------------------------------
     Never compare tel: hrefs as strings. `tel:+15555550142` and
     `tel:555-555-0142` are the same number, and a string compare would report
     "swap succeeded" on the second one forever — the alarm failing silently in
     the reassuring direction. Compare the last 10 digits instead (NANP), which
     is format-agnostic and ignores the country code.
     ---------------------------------------------------------------------- */

  function last10(s) {
    return String(s || '').replace(/\D/g, '').slice(-10);
  }

  // house_number accepts a string or an array, for firms with several lines.
  var houseNumbers = [].concat(cfg.house_number || [])
                       .map(last10)
                       .filter(function (n) { return n.length === 10; });

  /* --- script injection ------------------------------------------------- */

  function inject(src, onload) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (onload) s.onload = onload;
    (document.head || document.documentElement).appendChild(s);
  }

  function injectCss(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    (document.head || document.documentElement).appendChild(l);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  /* --- consent ------------------------------------------------------------
     Two independent mechanisms, deliberately:

     1. Google tags are gated by Consent Mode's own `region` parameter, which
        uses Google's IP geolocation. That is authoritative and nothing below
        can weaken it.

     2. CallRail is not a Google tag, so Consent Mode cannot gate it. We use a
        local timezone read instead — a synchronous browser API, no network
        request, so the US path loses nothing — and it fails CLOSED: anything
        European-looking or unreadable is treated as EEA and held back.

     This block must run before any Google tag loads. Do not move it.
     ---------------------------------------------------------------------- */

  var EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
             'HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL',
             'PT','RO','SK','SI','ES','SE','GB','CH'];

  function looksEuropean() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return /^(Europe\/|Atlantic\/(Canary|Azores|Madeira|Reykjavik|Faroe)|Arctic\/)/.test(tz);
    } catch (e) {
      return true;   // can't tell → assume EEA
    }
  }

  // QA bypass: ?aurelian_ungate=1 forces the non-EEA path for the session, so
  // the US visitor experience can be tested from a European timezone. Debug
  // builds only — has no effect on a normal production page load.
  var ungate = false;
  try {
    if (/[?&]aurelian_ungate=1/.test(location.search)) {
      sessionStorage.setItem('aurelian_ungate', '1');
    }
    ungate = DEBUG && sessionStorage.getItem('aurelian_ungate') === '1';
  } catch (e) {}

  var gated = !!cfg.consent_mode && looksEuropean() && !ungate;

  // Readable by CMP init code so it can skip work entirely for US visitors.
  window.aurelianGated = gated;

  if (cfg.consent_mode) {
    // The regional default is skipped entirely when ungated. Google evaluates
    // `region` against the visitor's IP, not our timezone check — so leaving it
    // in place would keep a European tester denied no matter what the QA flag
    // says, which is exactly the trap this bypass exists to avoid.
    if (!ungate) {
      gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500,
        region: EEA
      });
    }
    gtag('consent', 'default', {       // everywhere else — today's behaviour
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    // The CMP is downloaded ONLY for gated visitors. A US visitor never
    // requests the library or its stylesheet at all — no banner, no payload.
    if (gated && cfg.cmp_src) {
      if (cfg.cmp_css) injectCss(cfg.cmp_css);
      inject(cfg.cmp_src, function () {
        document.dispatchEvent(new CustomEvent('aurelian:cmp-ready'));
        if (DEBUG) console.log('[aurelian] CMP loaded');
      });
    }
  }

  if (ungate && DEBUG) {
    console.log('[aurelian] UNGATED for QA — simulating a US visitor. ' +
                'Clear with sessionStorage.removeItem("aurelian_ungate")');
  }

  /* --- GA4 -------------------------------------------------------------- */

  gtag('js', new Date());

  // debug_mode must be set globally, not just in config. A config-level param
  // does not reliably carry to separate gtag('event') calls, which is why
  // DebugView can sit empty while Realtime shows traffic arriving normally.
  if (DEBUG) gtag('set', { debug_mode: true });

  gtag('config', cfg.ga4_id, {
    tracking_version: VERSION,
    debug_mode: DEBUG || undefined
  });

  inject('https://www.googletagmanager.com/gtag/js?id=' + cfg.ga4_id);

  /* --- CallRail dynamic number insertion -------------------------------- */
  /* Injected synchronously at parse time so the swap lands as early as
     possible. Any tap before the swap completes goes to the house number and
     is attributed to nothing — number_swapped below is how you measure
     whether that is actually happening. */

  var callrailLoaded = false;

  function loadCallRail() {
    if (callrailLoaded || !cfg.callrail_company || !cfg.callrail_swap) return;
    callrailLoaded = true;

    inject('//cdn.callrail.com/companies/' + cfg.callrail_company +
           '/' + cfg.callrail_swap + '/12/swap.js');

    // Silent-failure alarm. If swap.js never lands, number_swapped will never
    // report it unless someone happens to click. Fires ONLY on failure, so a
    // healthy site sends nothing extra.
    setTimeout(function () {
      if (typeof window.CallTrk === 'undefined') {
        gtag('event', 'callrail_missing', {
          page_path: window.location.pathname,
          tracking_version: VERSION
        });
        if (DEBUG) console.warn('[aurelian] CallRail swap.js did not load');
      }
    }, 5000);
  }

  if (gated) {
    // Held until the CMP calls this on Accept. A US visitor never reaches here.
    // This is a COMPLETE grant handler: it updates Google's consent state as
    // well as loading CallRail. A CMP wired only to this callback would
    // otherwise leave Google tags denied forever, collecting nothing.
    window.aurelianGrantTracking = function () {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted'
      });
      loadCallRail();
      if (DEBUG) console.log('[aurelian] consent granted');
    };
    if (DEBUG) {
      console.log('[aurelian] EEA visitor — tracking held pending consent. ' +
                  'For QA, call aurelianGrantTracking() or reload with ' +
                  '?aurelian_ungate=1');
    }
  } else {
    loadCallRail();
  }

  /* --- where on the page was the link? ---------------------------------- */
  /* Derived from DOM position, so it works on any site with zero markup
     changes. Override on a specific link with data-track-position="hero". */

  function positionOf(el) {
    var override = el.closest('[data-track-position]');
    if (override) return override.getAttribute('data-track-position');

    // Landmarks are checked BEFORE sticky on purpose. Most headers are sticky,
    // so a sticky-first order would file header links under 'sticky' on some
    // sites and 'header' on others — making the dimension incomparable across
    // the portfolio. Landmark first means 'sticky' is left to mean what it
    // should: a floating call bar sitting outside any landmark.
    if (el.closest('header, [role="banner"]')) return 'header';
    if (el.closest('footer, [role="contentinfo"]')) return 'footer';
    if (el.closest('nav, [role="navigation"]')) return 'nav';

    var node = el;
    for (var i = 0; node && i < 8; i++) {
      var pos = window.getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'sticky') return 'sticky';
      node = node.parentElement;
    }

    return 'body';
  }

  /* --- markup convention check -------------------------------------------
     positionOf() degrades silently: a site built with <div class="header">
     instead of <header> returns 'body' for every click, and the dimension is
     quietly useless with nothing to indicate it. Fires ONLY on a page missing
     all landmarks, so a correctly built site sends nothing extra.
     ---------------------------------------------------------------------- */

  window.addEventListener('load', function () {
    var hasLandmarks = document.querySelector(
      'header, [role="banner"], footer, [role="contentinfo"], nav, [role="navigation"]'
    );
    if (!hasLandmarks && document.querySelector('a[href^="tel:"]')) {
      gtag('event', 'markup_nonstandard', {
        page_path: window.location.pathname,
        tracking_version: VERSION
      });
      if (DEBUG) {
        console.warn('[aurelian] no semantic landmarks on this page — ' +
                     'link_position will report "body" for every click');
      }
    }
  });

  /* --- tel: click tracking ---------------------------------------------- */
  /* Delegated to document and reads the href at click time, so it survives
     CallRail's number swap, sticky bars, modals, and any markup change. */

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!link) return;

    var href = link.getAttribute('href');
    var now = Date.now();
    if (href === lastClick.href && now - lastClick.at < 1000) return;
    lastClick = { href: href, at: now };

    var dialed = last10(href.replace(/^tel:/, ''));
    var swapped = !houseNumbers.length ? 'unknown'
                : houseNumbers.indexOf(dialed) !== -1 ? 'no' : 'yes';

    var payload = {
      debug_mode: DEBUG || undefined,
      phone_number: dialed,
      number_swapped: swapped,
      link_position: positionOf(link),
      page_path: window.location.pathname,
      tracking_version: VERSION
    };

    gtag('event', 'tel_click', payload);

    if (DEBUG) console.log('[aurelian] tel_click', payload);
  }, true);

  /* --- mailto: click tracking ------------------------------------------- */
  /* Diagnostic only. NEVER import this to Google Ads — an email click is an
     unverified intent signal with no qualification step behind it, unlike a
     CallRail-scored call. Its job is to show how much contact volume is
     leaking to an untracked channel. */

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!link) return;

    var payload = {
      debug_mode: DEBUG || undefined,
      email_address: link.getAttribute('href').replace(/^mailto:/, '').split('?')[0],
      link_position: positionOf(link),
      page_path: window.location.pathname,
      tracking_version: VERSION
    };

    gtag('event', 'email_click', payload);

    if (DEBUG) console.log('[aurelian] email_click', payload);
  }, true);

  if (DEBUG) {
    console.log('[aurelian] v' + VERSION + ' loaded — ' +
                (cfg.client_name || 'unnamed site'));
  }

})();
