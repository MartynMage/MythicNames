# MythicNames

Free fantasy name generator, live at [mythicnames.io](https://mythicnames.io).

I built this because naming D&D characters meant trawling through the same ten listicles every time. It's grown a bit since then — it now does full character backstories, adventuring parties, whole kingdoms, taverns, ships, weapons, spells... basically if it needs a name, there's probably a tab for it.

## What's in here

- `index.html` — the whole app. One file, vanilla JS, no build step. Yes, really.
- `generators/` — standalone pages for each race (elf, dwarf, orc, tiefling, and so on)
- `blog/` — articles on fantasy naming
- `styles.css` — shared styles for the generator and blog pages
- `consent.js` / `sw.js` — cookie banner and the service worker that makes the site work offline
- `functions/api/geo.js` — Cloudflare Pages Function; tells the browser whether the visitor needs a cookie banner
- `tools/generate-sitemaps.js` — rebuilds the sitemaps; run it after adding pages

## Running it locally

It's a static site, so just open `index.html` in a browser, or serve the folder with whatever you like (`npx http-server` works fine). The `/api/geo` endpoint won't exist locally — that's fine, the cookie banner falls back to showing itself.

To run the Cloudflare bits locally too:

```bash
npx wrangler pages dev .
```

## Deploying

Hosted on Cloudflare Pages, deployed straight from `main` — no build command, output directory `/`. Push and it goes live.

Regenerate the sitemaps whenever you add a page:

```bash
node tools/generate-sitemaps.js
```

## How it works

No frameworks, no dependencies. Names are generated client-side from syllable pools tuned per style — Norse, Celtic, Lovecraftian, and about 17 others. Campaigns, favourites and history are saved to localStorage, so nothing leaves your browser.

Every batch is generated from a seed, so `?seed=ember-4821&cat=taverns&style=norse` gives you the same taverns every time. Handy if you want your party to see the list you saw.

## Support

If the site's been useful, there's a [tip jar](https://ko-fi.com/meeeertyn). Found a bug or want a generator added? Open an issue.
