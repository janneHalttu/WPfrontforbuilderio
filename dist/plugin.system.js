(function () {
  var src = 'https://cdn.jsdelivr.net/gh/janneHalttu/WPfrontforbuilderio@main/src/plugin.js';
  var existing = document.querySelector('script[data-wpfront-plugin="1"]');
  if (existing) return;
  var script = document.createElement('script');
  script.setAttribute('data-wpfront-plugin', '1');
  script.src = src;
  script.async = false;
  document.head.appendChild(script);
})();
