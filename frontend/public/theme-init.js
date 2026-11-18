// Sets the colour theme before the first paint, so a dark-theme user never sees a white flash.
// A plain script (the gateway's CSP allows no inline scripts). Keep in step with shared/lib/theme.ts.
(function () {
  var theme = 'light';
  try {
    var stored = localStorage.getItem('orbita.theme');
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
