// Cloudflare Pages Function: tells the browser whether this visitor needs a
// cookie banner. Cloudflare resolves the country at the edge, so the client
// never has to guess and we never ship a geo-IP database.
//
// Runs at /api/geo. If it is unreachable (local dev, or any non-Cloudflare
// host) consent.js falls back to showing the banner, which is the safe default.

// EU 27 + the three extra EEA states + UK + Switzerland. This matches the
// scope of Google's EU user consent policy.
const CONSENT_REQUIRED = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',           // EU
    'IS', 'LI', 'NO',           // rest of the EEA
    'GB',                       // UK GDPR
    'CH'                        // Swiss FADP
]);

export function onRequestGet({ request }) {
    const country = (request.cf && request.cf.country) ||
        request.headers.get('CF-IPCountry') || null;

    // Cloudflare uses T1 for Tor exit nodes and XX when it can't tell. Treat
    // both as consent-required rather than assuming they're outside the EEA.
    const unknown = !country || country === 'T1' || country === 'XX';
    const required = unknown || CONSENT_REQUIRED.has(country);

    return new Response(JSON.stringify({ country: unknown ? null : country, consentRequired: required }), {
        headers: {
            'Content-Type': 'application/json',
            // Per-visitor answer: never let a CDN or browser cache reuse one
            // country's response for another visitor.
            'Cache-Control': 'no-store',
            'Vary': 'CF-IPCountry'
        }
    });
}
