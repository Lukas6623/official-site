# Running the ServerGuard website locally on Windows

This website is a **static site** (HTML, CSS and vanilla JavaScript).
It must be served over **HTTP** rather than opened as a file, because a few
parts use `fetch()` (the news feed and the installer manifest), which browsers
block on `file://` URLs.

No Node.js, npm, Python, or other runtime is required. The included
`serve.ps1` uses only built-in Windows PowerShell / .NET classes.


## 1. Get the files

**Option A — clone with Git**

```
git clone <repository-url>
cd <repository-folder>
```

**Option B — download a ZIP**

On GitHub: **Code → Download ZIP**, then extract the folder.


## 2. Open PowerShell in the project folder

The folder must be the one that contains `index.html`, `css`, `js`,
`documentation` and `serve.ps1`.

- In File Explorer, open that folder, click the address bar, type
  `powershell`, and press Enter. PowerShell opens in that folder.
- Or hold **Shift** and right-click the folder background, then choose
  **Open PowerShell window here**.

Confirm you are in the right place:

```
dir index.html
```


## 3. Start the local server

```
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Use a different port if 8000 is taken:

```
powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080
```

You should see:

```
  ServerGuard - local preview
  Folder : C:\...\official-site
  URL    : http://localhost:8000/

  Press Ctrl + C to stop.
```

If Windows shows a **Firewall** prompt, it is not required for a localhost
preview — you can cancel it.


## 4. Open the website

Open a browser and go to:

- Landing page — http://localhost:8000/
- Documentation — http://localhost:8000/documentation/index.html


## 5. Stop the server

Switch back to the PowerShell window and press **Ctrl + C** (or close it).


## Notes and external services

- **Download button / version.** The installer URL and version come from a
  release manifest on `raw.githubusercontent.com` (see `js/main.js`). This
  requires an internet connection. If the manifest cannot be reached, the
  download buttons show *"Download unavailable"* and the version shows
  *"Unavailable"* — this is the intended fallback, not an error.
- **Fonts.** The **Inter** font is loaded from Google Fonts. If you are
  offline, the site falls back to the system sans-serif and still works.
- **News.** `news/news.json` is part of this repository and is served locally.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `... cannot be loaded because running scripts is disabled` | Use the `-ExecutionPolicy Bypass` flag exactly as shown above. |
| `HttpListener`/port error or *"address already in use"* | Start with `-Port 8080` (or another free port). |
| Download button says *"Download unavailable"* | No internet, or GitHub is unreachable. The rest of the site still works. |
| Fonts look different from the screenshots | Offline — expected system-font fallback. |

## Alternative (only if Python is already installed)

```
python -m http.server 8000
```

Then open http://localhost:8000/. This is optional; `serve.ps1` needs no
extra software.
