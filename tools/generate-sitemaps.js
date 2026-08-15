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
    'sitemap-pages.xml': ['index.html', 'generators/index.html', 'blog/index.html', 'sitemap.html', 'privacy.html'],
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
