# MythicNames

Free fantasy name generator, live at [mythicnames.io](https://mythicnames.io).

I built this because naming D&D characters meant trawling through the same ten listicles every time. It's grown a bit since then — it now does full character backstories, adventuring parties, whole kingdoms, taverns, ships, weapons, spells... basically if it needs a name, there's probably a tab for it.

## What's in here

- `index.html` — the whole app. One file, vanilla JS, no build step. Yes, really.
- `generators/` — standalone pages for each race (elf, dwarf, orc, tiefling, and so on)
- `blog/` — articles on fantasy naming
- `styles.css` — shared styles for the generator and blog pages

## Running it locally

It's a static site, so just open `index.html` in a browser, or serve the folder with whatever you like (`python -m http.server` works fine). The live site is hosted on GitHub Pages with a custom domain.

## How it works

No frameworks, no dependencies. Names are generated client-side from syllable pools tuned per style — Norse, Celtic, Lovecraftian, and about 17 others. Campaigns, favourites and history are saved to localStorage, so nothing leaves your browser.

## Support

If the site's been useful, there's a [tip jar](https://ko-fi.com/meeeertyn). Found a bug or want a generator added? Open an issue.
