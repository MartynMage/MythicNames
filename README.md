# MythicNames

Free fantasy name generator, live at [mythicnames.io](https://mythicnames.io).

I built this because naming D&D characters meant trawling through the same ten listicles every time. It's grown a bit since then — it now does full character backstories, adventuring parties, whole kingdoms, taverns, ships, weapons, spells... basically if it needs a name, there's probably a tab for it.

## What's in here

- `index.html` — the whole app. One file, vanilla JS, no build step. Yes, really.
- `generators/` — 27 standalone generators: races, creatures, places, factions, and magic items
- `blog/` — 21 articles on fantasy naming
- `styles.css` — shared styles for the generator and blog pages
- `consent.js` / `sw.js` — cookie banner and the service worker that makes the site work offline
- `functions/api/geo.js` — Cloudflare Pages Function; tells the browser whether the visitor needs a cookie banner
- `tools/` — the two build scripts (see Deploying)

`sitemap.html` and the 404 page's suggestion list are both generated, so don't hand-edit the bits between the `AUTO:` markers — they get overwritten.

## Running it locally

Use wrangler — it matches what Cloudflare actually serves:

```bash
npx wrangler pages dev .
```

Links are extensionless (`/blog/wizard-names-guide`, not `.html`) because that's the form Cloudflare serves, so a plain static server will 404 on them. Wrangler also runs `/api/geo`, which the cookie banner uses to decide whether to show itself.

## Deploying

Hosted on Cloudflare Pages, deployed straight from `main` — no build command, output directory `/`. Push and it goes live.

Whenever you add a page, rebuild the sitemaps (this also refreshes `sitemap.html` and the 404 suggestions):

```bash
node tools/generate-sitemaps.js
```

And the RSS feed whenever you add or edit a blog post:

```bash
node tools/generate-feed.js
```

## How it works

No frameworks, no dependencies. Character names are built from syllable pools tuned per style — Norse, Celtic, Lovecraftian, and about 17 others — while things like weapons and guilds are built from name patterns instead. Meanings are derived from the name itself, so a name always means the same thing.

Campaigns, favourites and history are saved to localStorage, so nothing leaves your browser. There's an export/import in the Campaigns tab for moving them between devices.

Every batch is generated from a seed, so `?seed=ember-4821&cat=taverns&style=norse` gives you the same taverns every time. Handy if you want your party to see the list you saw.

## Support

If the site's been useful, there's a [tip jar](https://ko-fi.com/meeeertyn). Found a bug or want a generator added? Open an issue.
