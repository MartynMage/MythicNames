// Structural and SEO check across every page. Read-only — reports, changes
// nothing. Run from the repo root after any site-wide edit:
//   node tools/check-pages.js
// Exits non-zero if anything is found, so it can gate a deploy.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE = 'https://mythicnames.io';

// Tag counting has to ignore <script> and <style> bodies. index.html builds an
// HTML document inside a template literal for the PDF export, so it contains
// the literal text "<html>" and "</body>" that are not markup at all. Counting
// them raised a false alarm on every run — and a regex that edits without
// stripping them first has already broken this file once.
function stripCode(html) {
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')
        .replace(/<!--[\s\S]*?-->/g, '');
}

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git', 'tools'].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.html')) out.push(p);
    }
    return out;
}

const problems = [];
const titles = new Map(), descs = new Map(), canons = new Map();
let scanned = 0;

for (const p of walk(root)) {
    const rel = path.relative(root, p).replace(/\\/g, '/');
    const raw = fs.readFileSync(p, 'utf8');
    const doc = stripCode(raw);
    const add = m => problems.push(rel + ' — ' + m);
    const count = re => (doc.match(re) || []).length;
    scanned++;

    // ---- structure (markup only, code stripped) ----
    for (const [tag, re, close] of [
        ['script', /<script\b/g, /<\/script>/g],
        ['header', /<header\b/g, /<\/header>/g],
        ['nav', /<nav\b/g, /<\/nav>/g],
        ['section', /<section\b/g, /<\/section>/g],
        ['ul', /<ul\b/g, /<\/ul>/g],
    ]) if (count(re) !== count(close)) add(tag + ' tags unbalanced');

    if (count(/<html\b/g) !== 1) add('expected exactly one <html>');
    if (count(/<body\b/g) !== 1) add('expected exactly one <body>');
    const h1s = count(/<h1\b/g);
    if (h1s !== 1) add(h1s === 0 ? 'no h1' : h1s + ' h1 tags');
    if (doc.includes('</a></button>')) add('malformed button/anchor nesting');
    if (/<\/nav>\n(?!\r)/.test(raw) && raw.includes('\r\n')) add('stray LF line ending at nav seam');

    // ---- head / SEO ----
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(raw);
    const title = (raw.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const desc = (raw.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    const canon = (raw.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];

    if (!title) add('no <title>');
    if (!noindex) {
        if (!desc) add('no meta description');
        if (!canon) add('no canonical');
        else {
            if (!canon.startsWith(SITE)) add('canonical on wrong host: ' + canon);
            if (/\.html($|\?)/.test(canon)) add('canonical points at .html: ' + canon);
            canons.set(canon, (canons.get(canon) || []).concat(rel));
        }
        for (const tag of ['og:title', 'og:image', 'twitter:card', 'twitter:description']) {
            if (!raw.includes('"' + tag + '"')) add('missing ' + tag);
        }
        if (title) titles.set(title.trim(), (titles.get(title.trim()) || []).concat(rel));
        if (desc) descs.set(desc, (descs.get(desc) || []).concat(rel));
    }

    // ---- inline CSS must balance ----
    // An unclosed brace kills every rule after it and fails silently, which
    // once left the homepage completely unstyled.
    for (const m of raw.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
        const open = (m[1].match(/\{/g) || []).length;
        const close = (m[1].match(/\}/g) || []).length;
        if (open !== close) add(`inline CSS unbalanced: ${open} { vs ${close} }`);
    }

    // ---- structured data must parse, or Google silently drops it ----
    for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try { JSON.parse(m[1].trim()); }
        catch (e) { add('invalid JSON-LD: ' + e.message.slice(0, 60)); }
    }

    // ---- FAQ schema must match the FAQs actually rendered ----
    // Google requires the answers to be visible on the page, so schema that
    // claims more Q&As than the page shows is a policy problem, not a nitpick.
    // The markup varies: generator pages and most posts use <div
    // class="faq-question"><span>, the homepage uses <h3 class="faq-question">.
    const rendered = [...raw.matchAll(/class="faq-question"/g)].length;
    const faqBlock = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map(m => { try { return JSON.parse(m[1].trim()); } catch (e) { return null; } })
        .find(j => j && j['@type'] === 'FAQPage');
    if (rendered && !faqBlock) add(rendered + ' FAQs rendered but no FAQPage schema');
    if (faqBlock && faqBlock.mainEntity.length !== rendered) {
        add('FAQ schema has ' + faqBlock.mainEntity.length + ' questions, page renders ' + rendered);
    }

    // ---- accessibility basics ----
    for (const m of raw.matchAll(/<label for="([^"]+)"/g)) {
        if (!new RegExp('id="' + m[1] + '"').test(raw)) add('label for="' + m[1] + '" matches no control');
    }
    if (/<label>\s*(&nbsp;|\s)*<\/label>/.test(raw)) add('empty <label> (use a non-label spacer)');
    for (const m of raw.matchAll(/<img\b((?!alt=)[^>])*>/g)) add('img without alt: ' + m[0].slice(0, 50));
}

for (const [t, r] of titles) if (r.length > 1) problems.push(r.join(', ') + ' — duplicate title: ' + t.slice(0, 50));
for (const [d, r] of descs) if (r.length > 1) problems.push(r.join(', ') + ' — duplicate description');
for (const [c, r] of canons) if (r.length > 1) problems.push(r.join(', ') + ' — duplicate canonical: ' + c);

console.log(scanned + ' pages checked');
if (!problems.length) {
    console.log('no problems found');
} else {
    console.log('\n' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ':');
    for (const p of problems) console.log('  ' + p);
    process.exitCode = 1;
}
