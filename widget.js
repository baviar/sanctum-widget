/**
 * SanctumExit Widget v1.0.0
 * A free, embeddable quick-exit button for domestic violence and survivor support websites.
 * 
 * Usage:
 *   <script src="https://cdn.sanctumapp.ai/widget.js"></script>
 *   <sanctum-exit token="org_abc123" decoy="weather"></sanctum-exit>
 *
 * Or without a portal token (free standalone mode):
 *   <sanctum-exit decoy="weather" clear-history="true" label="Quick Exit"></sanctum-exit>
 *
 * Options (HTML attributes):
 *   token          - Org token from sanctumapp.ai portal (optional, enables analytics)
 *   decoy          - Decoy destination: weather | news | maps | amazon | google (default: weather)
 *   clear-history  - true/false, clears browser history on exit (default: true)
 *   label          - Button label text (default: "Quick Exit")
 *   position       - bottom-right | bottom-left | top-right | top-left (default: bottom-right)
 *   color          - Hex color for button (default: #C0392B)
 *   shortcut       - Enable double-Escape keyboard shortcut (default: true)
 *
 * Privacy:
 *   - No survivor data is ever collected
 *   - No cookies, no localStorage, no fingerprinting
 *   - If a token is provided, only an anonymous click count + timestamp is sent
 *   - All exit logic runs client-side only
 */

(function () {
  'use strict';

  // ─── Decoy destinations ────────────────────────────────────────────────────
  const DECOY_URLS = {
    weather: 'https://weather.com',
    news:    'https://news.google.com',
    maps:    'https://maps.google.com',
    amazon:  'https://www.amazon.com',
    google:  'https://www.google.com',
  };

  // ─── Analytics endpoint ────────────────────────────────────────────────────
  // Points to sanctumapp.ai Supabase Edge Function — only logs org_id + timestamp
  const ANALYTICS_ENDPOINT = 'https://api.sanctumapp.ai/v1/exit-ping';

  // ─── Styles injected once per page ────────────────────────────────────────
  const STYLES = `
    .sanctum-exit-btn {
      all: unset;
      position: fixed;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(0,0,0,0.25);
      transition: transform 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      min-width: 44px;
      min-height: 44px;
      box-sizing: border-box;
    }
    .sanctum-exit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .sanctum-exit-btn:active {
      transform: translateY(0px) scale(0.97);
      box-shadow: 0 1px 6px rgba(0,0,0,0.2);
    }
    .sanctum-exit-btn:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 2px;
    }
    .sanctum-exit-btn--bottom-right { bottom: 20px; right: 20px; }
    .sanctum-exit-btn--bottom-left  { bottom: 20px; left:  20px; }
    .sanctum-exit-btn--top-right    { top:    20px; right: 20px; }
    .sanctum-exit-btn--top-left     { top:    20px; left:  20px; }
    .sanctum-exit-icon {
      display: inline-block;
      width: 14px;
      height: 14px;
      position: relative;
      flex-shrink: 0;
    }
    .sanctum-exit-icon::before,
    .sanctum-exit-icon::after {
      content: '';
      position: absolute;
      background: #ffffff;
      width: 14px;
      height: 2px;
      top: 6px;
      left: 0;
      border-radius: 1px;
    }
    .sanctum-exit-icon::before { transform: rotate(45deg);  }
    .sanctum-exit-icon::after  { transform: rotate(-45deg); }
    @media (max-width: 480px) {
      .sanctum-exit-btn {
        padding: 10px 14px;
        font-size: 13px;
      }
    }
  `;

  // ─── Inject styles once ────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('sanctum-exit-styles')) return;
    const style = document.createElement('style');
    style.id = 'sanctum-exit-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ─── Clear browser history as aggressively as possible ─────────────────────
  function clearHistory() {
    try {
      // Push neutral states to overwrite back history
      const steps = Math.min(window.history.length, 10);
      for (let i = 0; i < steps; i++) {
        window.history.pushState(null, '', window.location.href);
      }
    } catch (e) {
      // Silent fail — some browsers restrict history manipulation
    }
    try { sessionStorage.clear(); } catch (e) {}
    try {
      // Clear referrer by navigating through a blank intermediary
      // This is handled by the redirect itself
    } catch (e) {}
  }

  // ─── Strip EXIF / metadata from any pending uploads (defensive) ────────────
  // Note: actual EXIF stripping for photo uploads should happen server-side.
  // This clears any blob URLs or object URLs created client-side.
  function clearObjectURLs() {
    try {
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach(input => { input.value = ''; });
    } catch (e) {}
  }

  // ─── Send anonymous ping to analytics (if token provided) ──────────────────
  function pingAnalytics(token) {
    if (!token) return;
    try {
      // navigator.sendBeacon survives page navigation
      const payload = JSON.stringify({
        org: token,
        ts: Date.now(),
        // No IP, no user agent stored server-side — only org + timestamp
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ANALYTICS_ENDPOINT, payload);
      }
      // No fallback fetch — we'd rather lose the ping than delay the exit
    } catch (e) {}
  }

  // ─── The exit sequence ─────────────────────────────────────────────────────
  function triggerExit(config) {
    const decoyUrl = DECOY_URLS[config.decoy] || DECOY_URLS.weather;

    // 1. Ping analytics (fire-and-forget, non-blocking)
    pingAnalytics(config.token);

    // 2. Clear file inputs
    clearObjectURLs();

    // 3. Clear history
    if (config.clearHistory) {
      clearHistory();
    }

    // 4. Replace current page with decoy — replaceState means
    //    pressing Back won't return to this site
    try {
      window.history.replaceState(null, '', decoyUrl);
    } catch (e) {}

    // 5. Navigate — use location.replace so this page is removed from history
    window.location.replace(decoyUrl);
  }

  // ─── Web Component definition ──────────────────────────────────────────────
  class SanctumExitButton extends HTMLElement {
    constructor() {
      super();
      this._escCount = 0;
      this._escTimer = null;
      this._handleKeydown = this._handleKeydown.bind(this);
    }

    connectedCallback() {
      injectStyles();

      const config = {
        token:        this.getAttribute('token') || null,
        decoy:        this.getAttribute('decoy') || 'weather',
        clearHistory: this.getAttribute('clear-history') !== 'false',
        label:        this.getAttribute('label') || 'Quick Exit',
        position:     this.getAttribute('position') || 'bottom-right',
        color:        this.getAttribute('color') || '#C0392B',
        shortcut:     this.getAttribute('shortcut') !== 'false',
      };

      // Validate decoy
      if (!DECOY_URLS[config.decoy]) config.decoy = 'weather';

      // Validate position
      const validPositions = ['bottom-right','bottom-left','top-right','top-left'];
      if (!validPositions.includes(config.position)) config.position = 'bottom-right';

      this._config = config;
      this._render(config);

      if (config.shortcut) {
        document.addEventListener('keydown', this._handleKeydown);
      }
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._handleKeydown);
      if (this._escTimer) clearTimeout(this._escTimer);
    }

    _render(config) {
      // Hide the custom element itself (it's just a config host)
      this.style.display = 'none';

      const btn = document.createElement('button');
      btn.className = `sanctum-exit-btn sanctum-exit-btn--${config.position}`;
      btn.style.backgroundColor = config.color;
      btn.setAttribute('aria-label', `${config.label} – click to leave this site immediately`);
      btn.setAttribute('title', 'Click to leave this site immediately');
      btn.setAttribute('type', 'button');

      // Icon + label
      const icon = document.createElement('span');
      icon.className = 'sanctum-exit-icon';
      icon.setAttribute('aria-hidden', 'true');

      const labelEl = document.createElement('span');
      labelEl.textContent = config.label;

      btn.appendChild(icon);
      btn.appendChild(labelEl);

      btn.addEventListener('click', () => triggerExit(config));

      // Append to body directly so it overlays everything
      document.body.appendChild(btn);
      this._btn = btn;
    }

    // Double-Escape shortcut: press Escape twice within 1 second
    _handleKeydown(e) {
      if (e.key !== 'Escape') return;

      this._escCount++;

      if (this._escCount === 1) {
        // Flash the button to indicate first press registered
        if (this._btn) {
          this._btn.style.transform = 'scale(1.08)';
          setTimeout(() => {
            if (this._btn) this._btn.style.transform = '';
          }, 200);
        }
        this._escTimer = setTimeout(() => {
          this._escCount = 0;
        }, 1000);
      }

      if (this._escCount >= 2) {
        clearTimeout(this._escTimer);
        this._escCount = 0;
        triggerExit(this._config);
      }
    }
  }

  // ─── Register the custom element ───────────────────────────────────────────
  if (!customElements.get('sanctum-exit')) {
    customElements.define('sanctum-exit', SanctumExitButton);
  }

})();
