// Rebuilds the sitemaps. Run from the repo root after adding or editing pages:
//   node tools/generate-sitemaps.js
// Writes sitemap-pages.xml, sitemap-generators.xml, sitemap-blog.xml and
// sitemap.xml (a sitemap index pointing at the other three). lastmod comes
// from each file's last git commit; uncommitted changes use today's date.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://mythicnames.io';
const root = path.join(__dirname, '..');
const today = new Date().toISOString().slice(0, 10);

const dirty = new Set(
    execSync('git status --porcelain', { cwd: root }).toString()
        .split('\n').filter(Boolean).map(l => l.slice(3).trim().replace(/"/g, ''))
);

function lastmod(rel) {
    if (dirty.has(rel)) return today;
    try {
        const d = execSync(`git log -1 --format=%cs -- "${rel}"`, { cwd: root }).toString().trim();
        return d || today;
    } catch (e) { return today; }
}

// Cloudflare Pages serves extensionless URLs (/foo.html 308s to /foo), so the
// sitemap must list the form it actually serves or every entry is a redirect.
function urlFor(rel) {
    if (rel === 'index.html') return SITE + '/';
    if (rel.endsWith('/index.html')) return SITE + '/' + rel.slice(0, -'index.html'.length);
    return SITE + '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '');
}

function listHtml(dir) {
    return fs.readdirSync(path.join(root, dir))
        .filter(f => f.endsWith('.html'))
        .map(f => dir + '/' + f);
}

const sections = {
    'sitemap-pages.xml': ['index.html', 'generators/index.html', 'blog/index.html', 'sitemap.html', 'privacy.html', 'search.html'],
    'sitemap-generators.xml': listHtml('generators').filter(f => !f.endsWith('index.html')),
    'sitemap-blog.xml': listHtml('blog').filter(f => !f.endsWith('index.html')),
};

const indexEntries = [];
for (const [name, files] of Object.entries(sections)) {
    const urls = files.map(rel => {
        const mod = lastmod(rel);
        return `  <url><loc>${urlFor(rel)}</loc><lastmod>${mod}</lastmod></url>`;
    });
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.join('\n') + '\n</urlset>\n';
    fs.writeFileSync(path.join(root, name), xml);
    const newest = files.map(lastmod).sort().pop();
    indexEntries.push(`  <sitemap><loc>${SITE}/${name}</loc><lastmod>${newest}</lastmod></sitemap>`);
    console.log(`${name}: ${files.length} URLs`);
}

const indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    indexEntries.join('\n') + '\n</sitemapindex>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), indexXml);
console.log('sitemap.xml: index of ' + indexEntries.length + ' sitemaps');

// ---- The human-readable sitemap.html -------------------------------------
// Its link lists live between <!-- AUTO:key --> markers and are rebuilt here,
// so the page can never drift from what is actually on disk.

const GROUPS = {
    races: ['elf', 'dwarf', 'orc', 'human', 'halfling', 'gnome', 'tiefling', 'dragonborn', 'half-elf', 'drow', 'goblin'],
    creatures: ['fairy', 'angel', 'demon', 'vampire'],
    world: ['tavern', 'town', 'kingdom', 'ship', 'dungeon', 'guild'],
    archetypes: ['wizard', 'knight', 'villain', 'monster', 'npc', 'family'],
    items: ['weapon', 'spell', 'artifact'],
    games: ['wow', 'elderscrolls', 'ffxiv', 'bg3', 'gw2'],
};
const ICONS = {
    elf: '🧝', dwarf: '⛏️', orc: '⚔️', human: '👤', halfling: '🧑‍🌾', gnome: '🎩',
    tiefling: '😈', dragonborn: '🐲', 'half-elf': '🌗', drow: '🕷️', goblin: '👹',
    fairy: '🧚', angel: '👼', demon: '👿', vampire: '🧛',
    tavern: '🍺', kingdom: '👑', ship: '⛵',
    wizard: '🧙', knight: '🛡️', villain: '💀', monster: '🐲', town: '🏘️', npc: '🧑‍🌾', family: '📜', dungeon: '🗝️', guild: '🏛️', weapon: '⚔️', spell: '✨', artifact: '🏺', wow: '🐺', elderscrolls: '🐉', ffxiv: '🌙', bg3: '🎲', gw2: '🌿',
};
const titleCase = s => s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-');

function readTitle(rel) {
    const m = fs.readFileSync(path.join(root, rel), 'utf8').match(/<title>([^<]*)<\/title>/);
    return m ? m[1].replace(/\s*\|\s*MythicNames.*$/, '').trim() : rel;
}

const htmlPath = path.join(root, 'sitemap.html');
if (fs.existsSync(htmlPath)) {
    let page = fs.readFileSync(htmlPath, 'utf8');
    const eol = page.includes('\r\n') ? '\r\n' : '\n';
    const link = (href, icon, label) =>
        `                <a href="${href}" class="sitemap-link"><span class="icon">${icon}</span><span class="label">${label}</span></a>`;

    const blocks = {};
    for (const [key, slugs] of Object.entries(GROUPS)) {
        blocks[key] = slugs
            .filter(s => fs.existsSync(path.join(root, 'generators', s + '-name-generator.html')))
            .map(s => link(`generators/${s}-name-generator`, ICONS[s] || '📄', titleCase(s) + ' Name Generator'))
            .join(eol);
    }
    blocks.blog = listHtml('blog')
        .filter(f => !f.endsWith('index.html'))
        .sort()
        .map(f => link(f.replace(/\.html$/, ''), '📝', readTitle(f)))
        .join(eol);

    let filled = 0;
    for (const [key, body] of Object.entries(blocks)) {
        const re = new RegExp('(<!-- AUTO:' + key + ' -->)[\\s\\S]*?(<!-- /AUTO:' + key + ' -->)');
        if (!re.test(page)) continue;
        page = page.replace(re, (m, a, b) => a + eol + body + eol + '                ' + b);
        filled++;
    }
    fs.writeFileSync(htmlPath, page);
    const count = (page.match(/class="sitemap-link"/g) || []).length;
    console.log(`sitemap.html: ${filled} sections, ${count} links`);
}

// ---- 404 suggestion index ------------------------------------------------
// The error page matches the requested path against this list, so a typo or a
// dead inbound link still lands the visitor somewhere useful.

const notFoundPath = path.join(root, '404.html');
if (fs.existsSync(notFoundPath)) {
    const entries = [];
    for (const s of Object.values(GROUPS).flat()) {
        const rel = 'generators/' + s + '-name-generator.html';
        if (fs.existsSync(path.join(root, rel))) {
            entries.push({u: '/generators/' + s + '-name-generator', t: titleCase(s) + ' Name Generator'});
        }
    }
    for (const f of listHtml('blog').filter(f => !f.endsWith('index.html')).sort()) {
        entries.push({u: '/' + f.replace(/\.html$/, ''), t: readTitle(f)});
    }
    entries.push({u: '/', t: 'Main Name Generator'});
    entries.push({u: '/generators/', t: 'All Name Generators'});
    entries.push({u: '/blog/', t: 'Blog'});

    let nf = fs.readFileSync(notFoundPath, 'utf8');
    const eol = nf.includes('\r\n') ? '\r\n' : '\n';
    const payload = '        const PAGES = ' + JSON.stringify(entries) + ';';
    const re = /(\/\* AUTO:pages \*\/)[\s\S]*?(\/\* \/AUTO:pages \*\/)/;
    if (re.test(nf)) {
        nf = nf.replace(re, (m, a, b) => a + eol + payload + eol + '        ' + b);
        fs.writeFileSync(notFoundPath, nf);
        console.log(`404.html: ${entries.length} suggestable pages`);
    }
}

// ---- Search index --------------------------------------------------------
// /search reads this list. Titles and descriptions are pulled from each page's
// own head, so the index cannot drift from the pages themselves.

function readDesc(rel) {
    const m = fs.readFileSync(path.join(root, rel), 'utf8')
        .match(/<meta name="description" content="([^"]*)"/);
    return m ? m[1] : '';
}

const searchPath = path.join(root, 'search.html');
if (fs.existsSync(searchPath)) {
    const CATEGORY = {
        races: 'Race Generator', creatures: 'Creature Generator', world: 'World Generator',
        archetypes: 'Character Generator', items: 'Item Generator', games: 'Game Generator'
    };
    const idx = [];
    for (const [key, slugs] of Object.entries(GROUPS)) {
        for (const sg of slugs) {
            const rel = 'generators/' + sg + '-name-generator.html';
            if (!fs.existsSync(path.join(root, rel))) continue;
            idx.push({
                u: '/generators/' + sg + '-name-generator',
                t: titleCase(sg) + ' Name Generator',
                d: readDesc(rel),
                c: CATEGORY[key] || 'Generator',
                k: sg
            });
        }
    }
    for (const rel of listHtml('blog').filter(x => !x.endsWith('index.html')).sort()) {
        idx.push({u: '/' + rel.replace(/\.html$/, ''), t: readTitle(rel), d: readDesc(rel), c: 'Article', k: ''});
    }
    idx.push({u: '/', t: 'Main Name Generator', d: readDesc('index.html'), c: 'Tool', k: 'character party world campaign seed'});
    idx.push({u: '/generators/', t: 'All Name Generators', d: readDesc('generators/index.html'), c: 'Index', k: ''});
    idx.push({u: '/blog/', t: 'Blog', d: readDesc('blog/index.html'), c: 'Index', k: ''});

    let sp = fs.readFileSync(searchPath, 'utf8');
    const seol = sp.includes('\r\n') ? '\r\n' : '\n';
    const sre = /(\/\* AUTO:index \*\/)[\s\S]*?(\/\* \/AUTO:index \*\/)/;
    if (sre.test(sp)) {
        sp = sp.replace(sre, (m, a, b) =>
            a + seol + '    const INDEX = ' + JSON.stringify(idx) + ';' + seol + '    ' + b);
        fs.writeFileSync(searchPath, sp);
        console.log('search.html: ' + idx.length + ' indexed pages');
    }
}
