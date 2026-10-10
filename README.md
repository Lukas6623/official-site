# ServerGuard — website

Static marketing site and documentation for **ServerGuard**, a Windows
application for managing and protecting Linux servers over SSH.

The site is plain **HTML, CSS and vanilla JavaScript** — no build step and no
frontend toolchain.

## Structure

```
index.html                     Landing page
css/tokens.css                 Shared design tokens, base styles, icon system
css/style.css                  Landing page styles
js/main.js                     Download/version wiring, navigation
js/news.js                     News feed (news/news.json)
js/globe.js                    Animated "protected network" canvas
js/land-data.js                Land-mask data for the canvas
documentation/index.html       Documentation: testing guide
documentation/security.html    Module docs: Security (brute-force protection)
documentation/telegram.html    Module docs: Telegram Bot
documentation/hardening.html   Module docs: SSH Hardening
documentation/sshkeys.html     Module docs: SSH Key Guard
documentation/fileguard.html   Module docs: FileGuard
documentation/css/*.css        Documentation styles
documentation/js/*.js          Documentation navigation, search, TOC, copy buttons
documentation/images/*.png     Product screenshots
news/news.json                 News entries
serve.ps1                      Dependency-free local preview server (Windows)
WINDOWS.md                     How to run the site locally on Windows
favicon.ico / favicon.svg      Favicons
robots.txt / sitemap.xml       SEO files
```

## Run it locally

The site needs to be served over HTTP (some parts use `fetch()`), so open it
through a local server rather than double-clicking the HTML file.

**Windows (no extra software required):** see **[WINDOWS.md](WINDOWS.md)**.

Quick version — open PowerShell in this folder and run:

```
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Then open http://localhost:8000/.

**Any OS with Python installed (optional):**

```
python -m http.server 8000
```

## External services

- The **installer URL and version** are read from a release manifest hosted on
  `raw.githubusercontent.com` (see the `MANIFEST_URL` constant in `js/main.js`).
  If it is unreachable, the download buttons show *"Download unavailable"* and
  the version shows *"Unavailable"*.
- The **Inter** font is loaded from Google Fonts, with system-font fallbacks.

## Notes

- SEO metadata, `robots.txt`, `sitemap.xml` and the favicons are preserved.
- The download URL comes from the release manifest; this repository does not
  host the installer itself.
