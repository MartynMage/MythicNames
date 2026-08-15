// Pings IndexNow (Bing, Yandex, Seznam, Naver) with the site's URLs so they
// crawl changes without waiting to rediscover the sitemap.
//
//   node tools/indexnow.js              # dry run, prints what would be sent
//   node tools/indexnow.js --submit     # actually submits
//   node tools/indexnow.js --submit --since HEAD~5   # only URLs whose files changed
//
// The key is public by design: IndexNow verifies ownership by fetching
// https://mythicnames.io/<key>.txt and checking it contains the same key, so
// both the key and the key file live in the repo.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://mythicnames.io';
const HOST = 'mythicnames.io';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const root = path.join(__dirname, '..');

const args = process.argv.slice(2);
const submit = args.includes('--submit');
const sinceIdx = args.indexOf('--since');
const since = sinceIdx > -1 ? args[sinceIdx + 1] : null;

// The key file is the single source of truth for the key.
const keyFile = fs.readdirSync(root).find(f => /^[a-zA-Z0-9-]{8,128}\.txt$/.test(f) && f !== 'robots.txt');
if (!keyFile) {
    console.error('No IndexNow key file found in the repo root.');
    console.error('Create one: a file named <key>.txt whose contents are exactly <key>.');
    process.exit(1);
}
const key = keyFile.replace(/\.txt$/, '');
const keyFileBody = fs.readFileSync(path.join(root, keyFile), 'utf8').trim();
if (keyFileBody !== key) {
    console.error(`${keyFile} must contain exactly "${key}", found "${keyFileBody}".`);
    process.exit(1);
}

// Every indexable URL, taken from the sitemaps so this can never disagree with
// what was submitted to Search Console.
const sitemaps = ['sitemap-pages.xml', 'sitemap-generators.xml', 'sitemap-blog.xml'];
let urls = [];
for (const s of sitemaps) {
    const p = path.join(root, s);
    if (!fs.existsSync(p)) { console.error('missing ' + s + ' — run generate-sitemaps.js first'); process.exit(1); }
    urls.push(...[...fs.readFileSync(p, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
}
urls = [...new Set(urls)];

// Narrow to what actually changed, so a routine deploy does not re-submit the
// whole site.
if (since) {
    const changed = new Set(
        execSync(`git diff --name-only ${since} HEAD`, { cwd: root })
            .toString().split('\n').filter(f => f.endsWith('.html'))
            .map(f => f === 'index.html' ? SITE + '/'
                : f.endsWith('/index.html') ? SITE + '/' + f.slice(0, -'index.html'.length)
                : SITE + '/' + f.replace(/\.html$/, ''))
    );
    const before = urls.length;
    urls = urls.filter(u => changed.has(u));
    console.log(`--since ${since}: ${urls.length} of ${before} URLs changed`);
}

if (!urls.length) { console.log('nothing to submit'); process.exit(0); }

const body = { host: HOST, key, keyLocation: `${SITE}/${keyFile}`, urlList: urls };

console.log(`key       ${key}`);
console.log(`keyFile   ${body.keyLocation}`);
console.log(`urls      ${urls.length}`);
console.log(urls.slice(0, 5).map(u => '          ' + u).join('\n'));
if (urls.length > 5) console.log(`          ...and ${urls.length - 5} more`);

if (!submit) {
    console.log('\nDry run. Re-run with --submit to send.');
    process.exit(0);
}

(async () => {
    // IndexNow rejects the whole batch if the key file is not reachable, so
    // check it first rather than burning the submission.
    const probe = await fetch(body.keyLocation).catch(e => ({ ok: false, status: e.message }));
    if (!probe.ok) {
        console.error(`\nKey file not reachable at ${body.keyLocation} (${probe.status}).`);
        console.error('Deploy it before submitting.');
        process.exit(1);
    }
    const served = (await probe.text()).trim();
    if (served !== key) {
        console.error(`\nKey file served "${served}", expected "${key}".`);
        process.exit(1);
    }
    console.log('\nkey file verified live');

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log(`submitted -> ${res.status} ${res.statusText}${text ? ' ' + text.slice(0, 200) : ''}`);
    // 200 accepted, 202 accepted pending key validation.
    process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
})();
