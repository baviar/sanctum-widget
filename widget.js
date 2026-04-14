/**
 * Sanctum Exit Widget v1.0.0
 * Free, embeddable quick-exit button for domestic violence and survivor support websites.
 *
 * Usage:
 *   <script src="https://baviar.github.io/sanctum-widget/widget.js"></script>
 *   <sanctum-exit decoy="weather"></sanctum-exit>
 *
 * Options (HTML attributes):
 *   decoy          - weather | news | maps | amazon | google (default: weather)
 *   clear-history  - true/false (default: true)
 *   label          - Button text (default: "Quick Exit")
 *   position       - bottom-right | bottom-left | top-right | top-left (default: bottom-right)
 *   color          - Any hex color (default: #C0392B)
 *   shortcut       - Enable double-Escape shortcut (default: true)
 *   token          - Org token for analytics (optional)
 *
 * Privacy: No survivor data ever collected or transmitted.
 * Built by Sanctum — sanctumapp.ai
 */

(function () {
  'use strict';

  var DECOY_URLS = {
    weather: 'https://weather.com',
    news:    'https://news.google.com',
    maps:    'https://maps.google.com',
    amazon:  'https://www.amazon.com',
    google:  'https://www.google.com'
  };

  var STYLES = [
    '.sanctum-exit-btn {',
    '  all: unset;',
    '  position: fixed;',
    '  z-index: 2147483647;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 7px;',
    '  padding: 11px 20px;',
    '  border-radius: 8px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  color: #ffffff;',
    '  cursor: pointer;',
    '  box-shadow: 0 2px 12px rgba(0,0,0,0.25);',
    '  transition: transform 0.1s ease, box-shadow 0.1s ease;',
    '  user-select: none;',
    '  -webkit-tap-highlight-color: transparent;',
    '  min-width: 44px;',
    '  min-height: 44px;',
    '  box-sizing: border-box;',
    '}',
    '.sanctum-exit-btn:hover {',
    '  transform: translateY(-1px);',
    '  box-shadow: 0 4px 16px rgba(0,0,0,0.3);',
    '}',
    '.sanctum-exit-btn:active {',
    '  transform: scale(0.97);',
    '}',
    '.sanctum-exit-btn--bottom-right { bottom: 20px; right: 20px; }',
    '.sanctum-exit-btn--bottom-left  { bottom: 20px; left:  20px; }',
    '.sanctum-exit-btn--top-right    { top:    20px; right: 20px; }',
    '.sanctum-exit-btn--top-left     { top:    20px; left:  20px; }',
    '.sanctum-exit-icon {',
    '  display: inline-block;',
    '  width: 13px; height: 13px;',
    '  position: relative; flex-shrink: 0;',
    '}',
    '.sanctum-exit-icon::before, .sanctum-exit-icon::after {',
    '  content: "";',
    '  position: absolute;',
    '  background: #ffffff;',
    '  width: 13px; height: 2px;',
    '  top: 5.5px; left: 0;',
    '  border-radius: 1px;',
    '}',
    '.sanctum-exit-icon::before { transform: rotate(45deg); }',
    '.sanctum-exit-icon::after  { transform: rotate(-45deg); }',
    '@media (max-width: 480px) {',
    '  .sanctum-exit-btn { padding: 10px 14px; font-size: 13px; }',
    '}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('sanctum-exit-styles')) return;
    var style = document.createElement('style');
    style.id = 'sanctum-exit-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function clearHistory() {
    try {
      var steps = Math.min(window.history.length, 10);
      for (var i = 0; i < steps; i++) {
        window.history.pushState(null, '', window.location.href);
      }
    } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
  }

  function clearObjectURLs() {
    try {
      var inputs = document.querySelectorAll('input[type="file"]');
      for (var i = 0; i < inputs.length; i++) { inputs[i].value = ''; }
    } catch(e) {}
  }

  function pingAnalytics(token) {
    if (!token) return;
    try {
      var payload = JSON.stringify({ org: token, ts: Date.now() });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('https://api.sanctumapp.ai/v1/exit-ping', payload);
      }
    } catch(e) {}
  }

  function triggerExit(config) {
    var decoyUrl = DECOY_URLS[config.decoy] || DECOY_URLS.weather;
    pingAnalytics(config.token);
    clearObjectURLs();
    if (config.clearHistory) clearHistory();
    try { window.history.replaceState(null, '', decoyUrl); } catch(e) {}
    window.location.replace(decoyUrl);
  }

  class SanctumExitButton extends HTMLElement {
    constructor() {
      super();
      this._escCount = 0;
      this._escTimer = null;
      this._handleKeydown = this._handleKeydown.bind(this);
    }

    connectedCallback() {
      injectStyles();

      var config = {
        token:        this.getAttribute('token') || null,
        decoy:        this.getAttribute('decoy') || 'weather',
        clearHistory: this.getAttribute('clear-history') !== 'false',
        label:        this.getAttribute('label') || 'Quick Exit',
        position:     this.getAttribute('position') || 'bottom-right',
        color:        this.getAttribute('color') || '#C0392B',
        shortcut:     this.getAttribute('shortcut') !== 'false'
      };

      if (!DECOY_URLS[config.decoy]) config.decoy = 'weather';
      var validPos = ['bottom-right','bottom-left','top-right','top-left'];
      if (validPos.indexOf(config.position) === -1) config.position = 'bottom-right';

      this._config = config;
      this._render(config);

      if (config.shortcut) {
        document.addEventListener('keydown', this._handleKeydown);
      }
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._handleKeydown);
      if (this._escTimer) clearTimeout(this._escTimer);
      if (this._btn && this._btn.parentNode) {
        this._btn.parentNode.removeChild(this._btn);
      }
    }

    _render(config) {
      this.style.display = 'none';

      var btn = document.createElement('button');
      btn.className = 'sanctum-exit-btn sanctum-exit-btn--' + config.position;
      btn.style.backgroundColor = config.color;
      btn.setAttribute('aria-label', config.label + ' - click to leave this site immediately');
      btn.setAttribute('title', 'Click to leave this site immediately');
      btn.setAttribute('type', 'button');

      var icon = document.createElement('span');
      icon.className = 'sanctum-exit-icon';
      icon.setAttribute('aria-hidden', 'true');

      var label = document.createElement('span');
      label.textContent = config.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      var self = this;
      btn.addEventListener('click', function() { triggerExit(self._config); });

      document.body.appendChild(btn);
      this._btn = btn;
    }

    _handleKeydown(e) {
      if (e.key !== 'Escape') return;
      var self = this;
      this._escCount++;

      if (this._escCount === 1) {
        if (this._btn) {
          this._btn.style.transform = 'scale(1.1)';
          setTimeout(function() {
            if (self._btn) self._btn.style.transform = '';
          }, 200);
        }
        this._escTimer = setTimeout(function() {
          self._escCount = 0;
        }, 1000);
      }

      if (this._escCount >= 2) {
        clearTimeout(this._escTimer);
        this._escCount = 0;
        triggerExit(this._config);
      }
    }
  }

  if (!customElements.get('sanctum-exit')) {
    customElements.define('sanctum-exit', SanctumExitButton);
  }

})();
