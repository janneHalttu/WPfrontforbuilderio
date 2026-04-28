(function () {
  var current = document.currentScript;
  var currentSrc = (current && current.src) ? current.src : '';

  function inject(url) {
    if (!url) return;
    var existing = document.querySelector('script[data-wpfront-plugin="1"]');
    if (existing) return;
    var script = document.createElement('script');
    script.setAttribute('data-wpfront-plugin', '1');
    script.src = url;
    script.async = false;
    document.head.appendChild(script);
  }

  if (currentSrc && currentSrc.indexOf('/dist/plugin.system.js') !== -1) {
    var base = currentSrc.split('/dist/plugin.system.js')[0];
    inject(base + '/src/plugin.js');
    return;
  }

  inject('https://unpkg.com/wpfrontforbuilderio@latest/src/plugin.js');
})();
