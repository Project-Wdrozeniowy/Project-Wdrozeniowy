// Sets the colour theme before the first paint, so a dark-theme user never sees a white flash.
// A plain script (the gateway's CSP allows no inline scripts). Keep in step with shared/lib/theme.ts.
(function () {
  var theme = 'light';
  try {
    // A stored theme counts only if the user accepted optional storage (shared/lib/storageConsent.ts).
    var stored =
      localStorage.getItem('orbita.consent') === 'granted' ? localStorage.getItem('orbita.theme') : null;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (error) {
    // Storage blocked: the system preference above still applies.
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
