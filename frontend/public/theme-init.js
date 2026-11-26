// Blocking, CSP-compatible bootstrap. Keep its validation identical to storageConsent.ts;
// storageConsumers/themeInit tests run the actual script against the same permission matrix.
(function () {
  var theme = 'light';
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
  } catch (_) { /* The light fallback remains usable. */ }
  try {
    var consent = null;
    try { consent = JSON.parse(localStorage.getItem('orbita.consent') || 'null'); } catch (_) { /* Invalid answer. */ }
    var now = Date.now();
    var valid = consent && consent.version === 2 && Number.isSafeInteger(consent.decidedAt) &&
      consent.decidedAt > 0 && consent.decidedAt <= now &&
      now - consent.decidedAt < 180 * 24 * 60 * 60 * 1000 &&
      consent.permissions && typeof consent.permissions.theme === 'boolean' &&
      typeof consent.permissions.recentSearches === 'boolean';
    if (!valid || !consent.permissions.theme) localStorage.removeItem('orbita.theme');
    if (!valid || !consent.permissions.recentSearches) localStorage.removeItem('orbita.recentSearches');
    if (!valid) localStorage.removeItem('orbita.consent');
    if (valid && consent.permissions.theme) {
      var stored = localStorage.getItem('orbita.theme');
      if (stored === 'light' || stored === 'dark') theme = stored;
    }
  } catch (_) {
    // The app cannot treat a failed cleanup as an effective grant.
    document.documentElement.setAttribute('data-storage-unavailable', '');
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
