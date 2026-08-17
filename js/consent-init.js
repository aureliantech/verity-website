/* ============================================================================
   CONSENT BANNER INIT
   ----------------------------------------------------------------------------
   Shared across all sites. Only runs for gated (EEA/UK) visitors — tracking.js
   downloads the library and this file's dependencies for nobody else.

   Install alongside the other two, AFTER tracking.js:

       <script src="/js/tracking-config.js"></script>
       <script src="/js/tracking.js"></script>
       <script src="/js/consent-init.js"></script>

   Also place in the repo:
       /js/cookieconsent.umd.js   ← from vanilla-cookieconsent (MIT)
       /css/cookieconsent.css     ← ditto
   ========================================================================== */

(function () {
  'use strict';

  // Set by tracking.js. False for every US visitor, in which case the library
  // was never downloaded and there is nothing to initialise.
  if (!window.aurelianGated) return;

  document.addEventListener('aurelian:cmp-ready', function () {

    function apply(cookie) {
      if (cookie.categories.indexOf('analytics') !== -1) {
        // Updates Google's consent state AND loads CallRail. Do not replace
        // this with a bare gtag consent update — CallRail would stay blocked.
        window.aurelianGrantTracking();
      }
    }

    CookieConsent.run({
      guiOptions: {
        consentModal: { layout: 'box', position: 'bottom left' },
        preferencesModal: { layout: 'box' }
      },

      categories: {
        necessary: { enabled: true, readOnly: true },
        analytics: {}
      },

      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: 'Cookies',
              description:
                'We use cookies to measure how visitors find and use this site, ' +
                'including call tracking. Nothing is set until you choose.',
              acceptAllBtn: 'Accept',
              acceptNecessaryBtn: 'Reject',
              showPreferencesBtn: 'Manage'
            },
            preferencesModal: {
              title: 'Preferences',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save',
              closeIconLabel: 'Close',
              sections: [
                {
                  title: 'Strictly necessary',
                  description: 'Required for the site to function. Always on.',
                  linkedCategory: 'necessary'
                },
                {
                  title: 'Analytics and call tracking',
                  description:
                    'Google Analytics and CallRail. Lets us see which pages ' +
                    'and searches lead to enquiries. CallRail assigns a ' +
                    'temporary phone number to your visit and records calls.',
                  linkedCategory: 'analytics'
                }
              ]
            }
          }
        }
      },

      onConsent: function (p) { apply(p.cookie); },
      onChange:  function (p) { apply(p.cookie); }
    });
  });

})();
