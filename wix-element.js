/* Die Nachfolge-Reise – Custom Element für nachfolgetalk.de (Wix)
 * Tag: <nachfolge-reise>
 * - lädt das Spiel von spiel.nachfolgetalk.de in einem Rahmen ohne eigenen Scrollbalken
 * - passt die eigene Höhe an das Spiel an (Seite scrollt, nicht das Spiel)
 * - führt die Seite bei jedem neuen Spielzug zum Spielzug
 * - Seitencode: Attribut "mitglied" (JSON) setzen; Ereignisse "bereit" und "abgeschlossen" abhören
 */
(function () {
  var STANDARD = 'https://spiel.nachfolgetalk.de';
  var SPIEL = STANDARD;
  try {
    var o = new URL(document.currentScript.src).origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) SPIEL = o; // nur für lokale Tests
  } catch (e) {}

  function kopfHoehe() {
    // fixierte Kopfzeile der Wix-Seite berücksichtigen
    var h = document.querySelector('header, #SITE_HEADER');
    if (!h) return 80;
    var cs = getComputedStyle(h);
    return (cs.position === 'fixed' || cs.position === 'sticky') ? h.getBoundingClientRect().height + 16 : 16;
  }

  class NachfolgeReise extends HTMLElement {
    static get observedAttributes() { return ['mitglied']; }
    constructor() {
      super();
      this._f = null;
      this._nachricht = this._nachricht.bind(this);
    }
    connectedCallback() {
      if (this._f) return;
      this.style.display = 'block';
      // Wix gibt Breite/Höhe aus dem Editor als CSS-Variablen vor
      this.style.width = 'var(--custom-element-width, 100%)';
      this.style.maxWidth = '100%';
      if (!this.style.height) this.style.height = 'var(--custom-element-height, 1000px)';
      var f = document.createElement('iframe');
      f.src = SPIEL + '/?wix=1';
      f.title = 'Die Nachfolge-Reise';
      f.setAttribute('allow', 'fullscreen; clipboard-write');
      f.setAttribute('scrolling', 'no');
      f.style.cssText = 'border:0;width:100%;height:100%;display:block;background:#0B162E;overflow:hidden';
      this.appendChild(f);
      this._f = f;
      window.addEventListener('message', this._nachricht);
    }
    disconnectedCallback() { window.removeEventListener('message', this._nachricht); }
    attributeChangedCallback(name, alt, neu) {
      if (name !== 'mitglied') return;
      var daten = null;
      try { daten = neu ? JSON.parse(neu) : null; } catch (e) {}
      if (daten && daten.__nonce !== undefined) delete daten.__nonce;
      this._senden({ typ: 'mitglied', daten: daten && Object.keys(daten).length ? daten : null });
    }
    _senden(m) {
      if (this._f && this._f.contentWindow) {
        var n = { quelle: 'reise-wix' };
        for (var k in m) n[k] = m[k];
        this._f.contentWindow.postMessage(n, SPIEL);
      }
    }
    _nachricht(e) {
      if (!this._f || e.source !== this._f.contentWindow || e.origin !== SPIEL) return;
      var m = e.data || {};
      if (m.quelle !== 'reise') return;
      if (m.typ === 'hoehe') {
        var h = Math.max(400, Math.min(20000, Math.ceil(Number(m.h) || 0)));
        this.style.height = h + 'px';
        return;
      }
      if (m.typ === 'oben') {
        var ziel = this.getBoundingClientRect().top + (Number(m.y) || 0) - kopfHoehe();
        if (ziel < 0 || ziel > window.innerHeight * 0.45) window.scrollBy({ top: ziel, behavior: 'smooth' });
        return;
      }
      this.dispatchEvent(new CustomEvent(m.typ, { detail: m.daten || {} }));
    }
  }
  if (!customElements.get('nachfolge-reise')) customElements.define('nachfolge-reise', NachfolgeReise);
  // Der Wix-Editor speichert den Tag-Namen nicht zuverlässig – deshalb auch unter dem Standard-Tag registrieren
  if (!customElements.get('wix-default-custom-element')) customElements.define('wix-default-custom-element', class extends NachfolgeReise {});
})();
