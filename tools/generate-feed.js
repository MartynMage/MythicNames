// Builds feed.xml from the blog posts. Run after adding or editing a post:
//   node tools/generate-feed.js
// Titles, descriptions and dates are read out of each post's own head, so the
// feed can't drift from the pages.
const fs = require('fs');
const path = require('path');

const SITE = 'https://mythicnames.io';
const root = path.join(__dirname, '..');
const blogDir = path.join(root, 'blog');

const esc = s => String(s)
    .replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const pick = (src, re) => { const m = src.match(re); return m ? m[1] : null; };

const items = [];
for (const f of fs.readdirSync(blogDir)) {
    if (!f.endsWith('.html') || f === 'index.html') continue;
    const src = fs.readFileSync(path.join(blogDir, f), 'utf8');

    const title = (pick(src, /<title>([^<]*)<\/title>/) || f)
        .replace(/\s*\|\s*MythicNames.*$/, '').trim();
    const desc = pick(src, /<meta name="description" content="([^"]*)"/) || '';
    const date = pick(src, /"datePublished"\s*:\s*"([^"]+)"/) || '2026-01-01';
    const slug = f.replace(/\.html$/, '');

    items.push({ title, desc, date, url: `${SITE}/blog/${slug}` });
}

// Newest first; ties broken by title so the order is stable between runs.
items.sort((a, b) => (b.date.localeCompare(a.date)) || a.title.localeCompare(b.title));

const rfc822 = d => new Date(d + 'T09:00:00Z').toUTCString();
const latest = items.length ? rfc822(items[0].date) : new Date(0).toUTCString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MythicNames Blog</title>
    <link>${SITE}/blog/</link>
    <description>Guides, tips and inspiration for naming characters, places and worlds.</description>
    <language>en</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(i => `    <item>
      <title>${esc(i.title)}</title>
      <link>${i.url}</link>
      <guid isPermaLink="true">${i.url}</guid>
      <pubDate>${rfc822(i.date)}</pubDate>
      <description>${esc(i.desc)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(root, 'feed.xml'), xml);
console.log(`feed.xml: ${items.length} items, newest ${items[0] && items[0].date}`);
