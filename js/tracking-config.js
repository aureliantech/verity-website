/* ============================================================================
   AURELIAN TRACKING — PER-SITE CONFIG
   ----------------------------------------------------------------------------
   THIS FILE IS UNIQUE TO THIS SITE. Never copy it between clients.
   tracking.js is shared and can be overwritten freely; this one cannot.

   Loads before tracking.js. Both live in /js/.
   ========================================================================== */

var AURELIAN_CONFIG = {

  // For the console banner and sanity-checking you're in the right repo.
  client_name: 'Verity Law',

  // GA4 → Admin → Data Streams → your web stream
  ga4_id: 'G-NMT8TQM9NX',

  // CallRail → Settings → Integrations → JavaScript Snippet
  // Snippet looks like: //cdn.callrail.com/companies/COMPANY/SWAP/12/swap.js
  callrail_company: '959296881',
  callrail_swap: 'd9b76fcc453bd9f5dd36',

  // The firm's REAL number(s). Any format — comparison is digits-only.
  // A string, or an array like ['+15555550142', '+15555550188'] for multi-line firms.
  house_number: '+16362140546',

  // GDPR. true → EEA/UK visitors are gated until they consent.
  // US visitors are unaffected either way.
  consent_mode: false,

  // Consent banner library. Downloaded ONLY for EEA/UK visitors — a US visitor
  // never requests either file. Leave both '' to skip the banner entirely.
  cmp_src: '/js/cookieconsent.umd.js',
  cmp_css: '/css/cookieconsent.css',

  // Leave false. Debug turns itself on automatically for localhost and Vercel
  // preview deploys, and can be switched on for any live page with
  // ?aurelian_debug=1. Only set true here to force it on in production.
  debug: false

};
