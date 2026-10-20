# ServerGuard — website

Static marketing site and documentation for **ServerGuard**, a Windows and Linux desktop
application for managing and protecting Linux servers over SSH.

The site is plain **HTML, CSS and vanilla JavaScript** — no build step and no
frontend toolchain.

## Structure

```
index.html                     Landing page
css/tokens.css                 Shared design tokens, base styles, icon system
css/style.css                  Landing page styles
js/main.js                     Download/version wiring, navigation
js/news.js                     News feed (FastAPI, with local JSON fallback)
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
  If it is unreachable, the Windows option shows *"Download unavailable"* and
  the version shows *"Unavailable"*.
- The **Inter** font is loaded from Google Fonts, with system-font fallbacks.
- News is loaded from `https://api.serverguard.site/api/news`, served by the
  FastAPI service in `/home/kr1m12/Desktop/bots` and populated by Telegram.
  Set `window.SERVERGUARD_NEWS_API` before `js/news.js` for another API host.

## Notes

- SEO metadata, `robots.txt`, `sitemap.xml` and the favicons are preserved.
- The download URL comes from the release manifest; this repository does not
  host the installer itself.

## Linux downloads

`downloads/linux/index.html` is a physical static page. The home page's four
Download buttons open the native platform dialog (`js/download-dialog.js`).
Only its Windows link depends on the existing manifest's `installer_url`.
Linux downloads never call `api.serverguard.site`.

Update `downloads/linux/releases.json` for future releases: version,
architecture, distribution, format, exact filename, URL and install command.
Keep the three static fallback cards and version in `downloads/linux/index.html`
in sync. They remain usable if JavaScript or the JSON request fails. Rendering
and copy feedback live in `js/linux-downloads.js`; scoped styles are in
`css/downloads.css`. No build or dependencies are required.

Run `python3 -m http.server 8000` from the repository root, then open
`http://localhost:8000/` and `http://localhost:8000/downloads/linux/`.
The existing PowerShell preview server also supports directory indexes.
Python normally redirects `/downloads/linux` to `/downloads/linux/`.
The canonical page URL includes the trailing slash. Serving the exact URL
without a redirect requires checking the production web-server configuration.

Package binaries are managed separately and are not included in this checkout.
Preserve `/downloads/linux/<version>/<filename>` and all previous releases.
Do not apply an HTML catch-all to download paths. Before publication, inspect
existing `root`/`alias` rules and ensure deployment synchronization cannot delete
externally managed packages. Verify actual binary responses and 404s separately
from page responses; local missing binaries do not imply production failure.
Do not modify the API virtual host to serve this page.
