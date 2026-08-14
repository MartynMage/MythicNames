// Cookie consent banner + Google Consent Mode v2 updates.
// Consent defaults are set inline in each page's head before gtag.js loads;
// this script only renders the banner and records the visitor's choice.
(function () {
    var KEY = 'mythicConsent';

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function save(value) {
        try { localStorage.setItem(KEY, value); } catch (e) {}
    }

    function applyConsent(state) {
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                ad_storage: state,
                ad_user_data: state,
                ad_personalization: state,
                analytics_storage: state
            });
        }
    }

    function removeBanner() {
        var el = document.getElementById('mythic-consent');
        if (el) el.remove();
    }

    function showBanner() {
        if (document.getElementById('mythic-consent')) return;
        var wrap = document.createElement('div');
        wrap.id = 'mythic-consent';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-label', 'Cookie consent');
        wrap.innerHTML =
            '<style>' +
            '#mythic-consent{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#211d19;border-top:2px solid #d4a857;padding:1rem 1.25rem;font-family:Georgia,serif;color:#c4b8a8;box-shadow:0 -4px 20px rgba(0,0,0,0.5)}' +
            '#mythic-consent .mc-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}' +
            '#mythic-consent p{margin:0;flex:1 1 300px;font-size:0.9rem;line-height:1.5}' +
            '#mythic-consent a{color:#d4a857}' +
            '#mythic-consent .mc-btns{display:flex;gap:0.5rem;flex-wrap:wrap}' +
            '#mythic-consent button{font-family:Georgia,serif;font-size:0.85rem;padding:0.6rem 1.1rem;border-radius:6px;cursor:pointer;border:1px solid #3d352c}' +
            '#mythic-consent .mc-accept{background:linear-gradient(135deg,#d4a857,#e8c47c);color:#0d0b0e;border:none;font-weight:bold}' +
            '#mythic-consent .mc-reject{background:transparent;color:#c4b8a8}' +
            '#mythic-consent .mc-reject:hover,#mythic-consent .mc-accept:hover{filter:brightness(1.1)}' +
            '@media(max-width:600px){#mythic-consent .mc-btns{width:100%}#mythic-consent button{flex:1}}' +
            '</style>' +
            '<div class="mc-inner">' +
            '<p>We use cookies for ads and analytics. Choose "Essential only" and we\'ll still work fine &mdash; no personalised ads, no analytics cookies. See our <a href="/privacy.html">privacy policy</a>.</p>' +
            '<div class="mc-btns">' +
            '<button type="button" class="mc-reject">Essential only</button>' +
            '<button type="button" class="mc-accept">Accept all</button>' +
            '</div></div>';
        document.body.appendChild(wrap);
        wrap.querySelector('.mc-accept').addEventListener('click', function () {
            save('granted');
            applyConsent('granted');
            removeBanner();
        });
        wrap.querySelector('.mc-reject').addEventListener('click', function () {
            save('denied');
            applyConsent('denied');
            removeBanner();
        });
    }

    // Let the privacy page (or anything else) reopen the banner
    window.mythicShowConsent = function () { removeBanner(); showBanner(); };

    if (!stored()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showBanner);
        } else {
            showBanner();
        }
    }
})();
