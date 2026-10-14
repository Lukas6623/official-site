"use strict";


/* =========================================================
   SERVERGUARD DOCUMENTATION RUNTIME

   One script for every documentation page. It:

   - keeps the documentation shell persistent (topbar, sidebar
     and footer are never reloaded);
   - navigates between documentation pages in the current tab
     by fetching the target page and swapping only the content
     and table of contents (History API, no framework);
   - keeps direct URLs, refreshes and Back/Forward working
     because every page still exists as a real HTML file;
   - rebuilds the table of contents, copy buttons and search
     index after each navigation without accumulating
     listeners or observers.

   Global listeners are attached exactly once; per-navigation
   work is limited to DOM-scoped initialisation.
   ========================================================= */


(function () {

    var MAIN_ID = "docsMain";
    var TOC_ID = "pageToc";
    var MOBILE_BREAKPOINT = 820;

    var activeTocLink = null;
    var tocRafId = null;
    var navToken = 0;
    var searchIndex = [];
    var searchReady = false;
    var searchBuildToken = 0;
    var currentPath = window.location.pathname;

    var closeSearchPanel = function () {};


    /* =====================================================
       SMALL HELPERS
       ===================================================== */

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return Array.prototype.slice.call(
            (root || document).querySelectorAll(selector)
        );
    }

    function slugify(text) {
        return String(text == null ? "" : text)
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, "-")
            .replace(/^-+|-+$/g, "");
    }

    function currentDocsDir() {
        var path = window.location.pathname;
        return path.slice(0, path.lastIndexOf("/") + 1);
    }

    function scrollToElement(node, options) {
        if (node && typeof node.scrollIntoView === "function") {
            node.scrollIntoView(options || true);
        }
    }


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function sidebarEl() {
        return document.getElementById("sidebar");
    }

    function initDocumentationShell() {
        var layout = $(".module-layout");
        if (!layout) return;

        if (!$(".icon-rail", layout)) {
            var rail = document.createElement("nav");
            rail.className = "icon-rail";
            rail.setAttribute("aria-label", "Documentation areas");
            rail.innerHTML =
                '<a href="../index.html" aria-label="Home"><svg class="icon" aria-hidden="true"><use href="#i-external"></use></svg></a>' +
                '<a href="index.html" class="is-active" aria-label="Documentation" aria-current="page"><svg class="icon" aria-hidden="true"><use href="#i-book"></use></svg></a>' +
                '<a href="security.html" aria-label="Security"><svg class="icon" aria-hidden="true"><use href="#i-shield-check"></use></svg></a>' +
                '<a href="index.html#terminal" aria-label="Terminal"><svg class="icon" aria-hidden="true"><use href="#i-terminal"></use></svg></a>' +
                '<a href="../index.html#news" aria-label="Updates"><svg class="icon" aria-hidden="true"><use href="#i-zap"></use></svg></a>' +
                '<a href="index.html#troubleshooting" aria-label="Troubleshooting"><svg class="icon" aria-hidden="true"><use href="#i-sliders"></use></svg></a>' +
                '<a href="index.html#requirements" aria-label="Information"><svg class="icon" aria-hidden="true"><use href="#i-help"></use></svg></a>';
            layout.insertBefore(rail, layout.firstElementChild);
        }

        var brand = $(".brand", document);
        if (brand && !$(".brand-copy", brand)) {
            var word = $(".brand-word", brand);
            if (word) {
                var copy = document.createElement("span");
                copy.className = "brand-copy";
                copy.appendChild(word.cloneNode(true));
                var tagline = document.createElement("small");
                tagline.textContent = "Secure · Manage · Protect";
                copy.appendChild(tagline);
                word.replaceWith(copy);
            }
        }

        var search = document.getElementById("docSearch");
        if (search) search.placeholder = "Search documentation…";
        var primary = $(".topbar-nav");
        if (primary) {
            primary.innerHTML =
                '<a href="../index.html#overview">Overview</a>' +
                '<a href="index.html" class="is-active" aria-current="page">Documentation</a>' +
                '<a href="security.html">Security</a>' +
                '<a href="../index.html#news">Changelog <i class="nav-notice" aria-label="New updates"></i></a>';
        }
        var help = $(".help-button");
        if (help) {
            help.href = "https://github.com/Lukas6623/ServerGuardCode";
            help.target = "_blank";
            help.rel = "noopener noreferrer";
            help.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-github"></use></svg>GitHub';
        }
        var download = $(".topbar-download");
        if (download) download.classList.add("download-installer");
    }

    function setSidebarOpen(open) {
        var sidebar = sidebarEl();
        var button = document.getElementById("mobileMenuButton");

        if (!sidebar || !button) {
            return;
        }

        sidebar.classList.toggle("open", open);
        button.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", open ? "true" : "false");
        button.setAttribute(
            "aria-label",
            open ? "Close documentation menu" : "Open documentation menu"
        );

        var backdrop = document.getElementById("sidebarBackdrop");
        if (backdrop) {
            backdrop.classList.toggle("is-visible", open);
            backdrop.setAttribute("aria-hidden", open ? "false" : "true");
        }

        document.body.classList.toggle("sidebar-is-open", open);
    }

    function initSidebar() {
        var sidebar = sidebarEl();
        if (!sidebar) return;

        var backdrop = document.getElementById("sidebarBackdrop");
        if (!backdrop) {
            backdrop = document.createElement("button");
            backdrop.type = "button";
            backdrop.id = "sidebarBackdrop";
            backdrop.className = "sidebar-backdrop";
            backdrop.setAttribute("aria-label", "Close documentation menu");
            backdrop.setAttribute("aria-hidden", "true");
            document.body.appendChild(backdrop);
            backdrop.addEventListener("click", function () { setSidebarOpen(false); });
        }

        $$(".sidebar-group", sidebar).forEach(function (group, index) {
            if (group.dataset.enhanced === "true") return;

            var title = $(".sidebar-group-title", group);
            var links = $(".sidebar-links", group);
            if (!title || !links) return;

            var button = document.createElement("button");
            button.type = "button";
            button.className = "sidebar-group-title";
            button.textContent = title.textContent;
            button.setAttribute("aria-controls", "sidebar-group-" + index);
            button.setAttribute("aria-expanded", "true");
            links.id = "sidebar-group-" + index;

            title.replaceWith(button);
            group.dataset.enhanced = "true";
            group.classList.toggle("is-collapsed", button.getAttribute("aria-expanded") !== "true");

            button.addEventListener("click", function () {
                var expanded = button.getAttribute("aria-expanded") === "true";
                setSidebarGroupExpanded(group, button, !expanded);
            });
        });

        // These are real anchors on the introduction page, not invented routes.
        var started = $(".sidebar-group", sidebar);
        if (started && !started.dataset.anchorsAdded) {
            var links = $(".sidebar-links", started);
            var guide = links.querySelector('a[href="index.html"]');
            if (guide) {
                Array.prototype.slice.call(guide.childNodes).forEach(function (node) {
                    if (node.nodeType === 3 && node.nodeValue.trim()) {
                        node.nodeValue = "Introduction / Testing Guide";
                    }
                });
            }
            var items = [
                ["#installation", "Installation", "i-download"],
                ["#connection", "Connecting to a Linux server", "i-server"],
                ["#terminal", "ServerGuard terminal", "i-terminal"],
                ["#troubleshooting", "Troubleshooting", "i-help"]
            ];
            items.forEach(function (item) {
                var anchor = document.createElement("a");
                anchor.href = "index.html" + item[0];
                anchor.innerHTML = '<span><svg class="icon" aria-hidden="true"><use href="#' + item[2] + '"></use></svg></span>' + item[1];
                links.appendChild(anchor);
            });
            started.dataset.anchorsAdded = "true";
        }

        var reference = $$(".sidebar-group", sidebar).find(function (group) {
            return /reference/i.test(group.textContent);
        });
        if (reference && !reference.dataset.anchorsAdded) {
            var referenceLinks = $(".sidebar-links", reference);
            var command = document.createElement("a");
            command.href = "index.html#terminal";
            command.innerHTML = '<span><svg class="icon" aria-hidden="true"><use href="#i-terminal"></use></svg></span>Command reference';
            referenceLinks.insertBefore(command, referenceLinks.firstChild);
            reference.dataset.anchorsAdded = "true";
        }
    }

    function setSidebarGroupExpanded(group, button, expanded) {
        var links = $(".sidebar-links", group);
        if (!links) return;

        button.setAttribute("aria-expanded", expanded ? "true" : "false");

        var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
            group.classList.toggle("is-collapsed", !expanded);
            links.style.height = expanded ? "" : "0px";
            return;
        }

        if (expanded) {
            group.classList.remove("is-collapsed");
            links.style.height = "0px";
            requestAnimationFrame(function () {
                links.style.height = links.scrollHeight + "px";
            });
        } else {
            links.style.height = links.scrollHeight + "px";
            void links.offsetHeight;
            requestAnimationFrame(function () {
                links.style.height = "0px";
            });
        }

        var clearHeight = function () {
            links.removeEventListener("transitionend", clearHeight);
            if (expanded) links.style.height = "";
            else group.classList.add("is-collapsed");
        };
        links.addEventListener("transitionend", clearHeight);
    }


    /* =====================================================
       TABLE OF CONTENTS
       ===================================================== */

    function ensureHeadingId(heading, used) {
        if (heading.id) {
            used[heading.id] = true;
            return heading.id;
        }

        var base = slugify(heading.textContent) || "section";
        var id = base;
        var counter = 2;

        while (used[id]) {
            id = base + "-" + counter;
            counter++;
        }

        used[id] = true;
        heading.id = id;

        return id;
    }

    function buildToc() {
        var toc = document.getElementById(TOC_ID);
        if (!toc) {
            return;
        }

        toc.innerHTML = "";
        toc.classList.remove("is-open", "is-compact");

        var article = $(".doc-article");
        var items = [];

        if (article) {
            $$(".doc-article h2, .doc-article h3", article).forEach(function (heading) {
                items.push({
                    el: heading,
                    level: heading.tagName === "H3" ? 3 : 2
                });
            });
        } else {
            $$("#" + MAIN_ID + " .doc-section[id]").forEach(function (section) {
                var heading = section.querySelector("h1, h2");
                items.push({
                    id: section.id,
                    el: section,
                    level: 2,
                    label: heading
                        ? heading.textContent.replace(/\s+/g, " ").trim()
                        : section.id
                });
            });
        }

        if (!items.length) {
            toc.hidden = true;
            return;
        }

        toc.hidden = false;

        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "page-toc-toggle";
        toggle.setAttribute("aria-controls", "pageTocList");
        toggle.setAttribute("aria-expanded", "false");

        var toggleLabel = document.createElement("span");
        toggleLabel.textContent = "On this page";

        var chevron = document.createElement("span");
        chevron.className = "page-toc-chevron";
        chevron.setAttribute("aria-hidden", "true");

        toggle.appendChild(toggleLabel);
        toggle.appendChild(chevron);

        var list = document.createElement("div");
        list.className = "page-toc-list";
        list.id = "pageTocList";

        toc.appendChild(toggle);
        toc.appendChild(list);

        var used = {};
        $$("[id]").forEach(function (node) {
            used[node.id] = true;
        });

        items.forEach(function (item) {
            var id = item.id || ensureHeadingId(item.el, used);

            var link = document.createElement("a");
            link.href = "#" + id;
            link.setAttribute("data-target", id);
            link.textContent = item.label || item.el.textContent.trim();

            if (item.level === 3) {
                link.classList.add("toc-h3");
            }

            list.appendChild(link);
        });

        toggle.addEventListener("click", function () {
            if (toc.classList.contains("is-compact")) {
                setTocExpanded(!toc.classList.contains("is-open"));
            }
        });

        updateTocMode();
        measureTocTargets();
        trackActiveSection();
    }


    /* =====================================================
       TOC DISPLAY MODE (expanded column vs collapsible)
       ===================================================== */

    var COMPACT_TOC_QUERY = "(max-width: 1250px)";

    function tocIsCompact() {
        return !!(window.matchMedia && window.matchMedia(COMPACT_TOC_QUERY).matches);
    }

    function updateTocMode() {
        var toc = document.getElementById(TOC_ID);
        var toggle = toc ? $(".page-toc-toggle", toc) : null;

        if (!toc || !toggle) {
            return;
        }

        if (tocIsCompact()) {
            toc.classList.add("is-compact");
            toggle.tabIndex = 0;
            toggle.removeAttribute("aria-hidden");
            setTocExpanded(toc.classList.contains("is-open"));
        } else {
            toc.classList.remove("is-compact", "is-open");
            toggle.tabIndex = -1;
            toggle.setAttribute("aria-hidden", "true");
            toggle.setAttribute("aria-expanded", "true");
        }
    }

    function setTocExpanded(open) {
        var toc = document.getElementById(TOC_ID);
        var toggle = toc ? $(".page-toc-toggle", toc) : null;

        if (!toc || !toggle) {
            return;
        }

        toc.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function collapseTocIfCompact() {
        var toc = document.getElementById(TOC_ID);

        if (toc && toc.classList.contains("is-compact")) {
            setTocExpanded(false);
        }
    }

    /* Keep the active link visible by scrolling only the TOC's own
       scroll container, never the page. */
    function keepActiveVisible(link) {
        if (!link) {
            return;
        }

        var toc = document.getElementById(TOC_ID);
        var list = document.getElementById("pageTocList");
        var container = null;

        if (list && list.scrollHeight > list.clientHeight + 1) {
            container = list;
        } else if (toc && toc.scrollHeight > toc.clientHeight + 1) {
            container = toc;
        }

        if (!container) {
            return;
        }

        var containerRect = container.getBoundingClientRect();
        var linkRect = link.getBoundingClientRect();

        if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
            container.scrollTop +=
                (linkRect.top - containerRect.top) -
                (container.clientHeight / 2 - link.offsetHeight / 2);
        }
    }

    /* Force a specific heading's link to be the active entry. Used
       when navigation jumps straight to a section (direct URL,
       refresh or a table-of-contents click) so the highlight is
       correct immediately, before the next scroll update runs. */
    function activateTocTarget(id) {
        if (!id) {
            return;
        }

        var toc = document.getElementById(TOC_ID);

        if (!toc) {
            return;
        }

        var target = null;

        $$("a[data-target]", toc).forEach(function (link) {
            var match = link.getAttribute("data-target") === id;

            link.classList.toggle("active", match);

            if (match) {
                target = link;
            }
        });

        activeTocLink = target;
        keepActiveVisible(target);
    }

    /* Active-section tracking.

       An IntersectionObserver alone only reacts while a heading is
       crossing a thin band, so an instant jump (scrollbar drag, direct
       URL, refresh, Back/Forward) could leave the highlight stale or
       empty. The active entry is therefore derived from the heading
       closest to, and above, a reading line just below the fixed
       topbar.

       Heading positions are measured once per navigation/resize and
       cached, so the scroll handler only does arithmetic. Reading
       getBoundingClientRect for every heading on every scroll frame
       forced a synchronous layout on long modules and was the main
       cause of scroll jank on low-powered phones. */

    var tocTargets = [];
    var tocHeaderOffset = 64;

    function readHeaderOffset() {
        var header = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
            10
        );

        tocHeaderOffset = header || 64;
    }

    function measureTocTargets() {
        var toc = document.getElementById(TOC_ID);

        if (!toc) {
            tocTargets = [];
            return;
        }

        readHeaderOffset();

        var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

        tocTargets = $$("a[data-target]", toc)
            .map(function (link) {
                var el = document.getElementById(link.getAttribute("data-target"));

                return el
                    ? { link: link, top: el.getBoundingClientRect().top + scrollY }
                    : null;
            })
            .filter(Boolean);
    }

    function trackActiveSection() {
        activeTocLink = null;
        updateActiveToc();
    }

    function scheduleActiveTocUpdate() {
        if (tocRafId !== null) {
            return;
        }

        tocRafId = window.requestAnimationFrame(function () {
            tocRafId = null;
            updateActiveToc();
        });
    }

    function updateActiveToc() {
        if (!tocTargets.length) {
            return;
        }

        var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

        // Reading line: just below the header, biased up so the active
        // entry changes as a heading reaches the top of the article.
        var line = scrollY + tocHeaderOffset + Math.max(24, window.innerHeight * 0.28);
        var current = tocTargets[0].link;

        for (var i = 0; i < tocTargets.length; i++) {
            if (tocTargets[i].top <= line) {
                current = tocTargets[i].link;
            } else {
                break;
            }
        }

        if (current === activeTocLink) {
            return;
        }

        tocTargets.forEach(function (item) {
            item.link.classList.remove("active");
        });

        current.classList.add("active");
        activeTocLink = current;
        keepActiveVisible(current);
    }


    /* =====================================================
       COPY BUTTONS
       ===================================================== */

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard
                .writeText(text)
                .then(function () { return true; })
                .catch(function () { return copyFallback(text); });
        }

        return Promise.resolve(copyFallback(text));
    }

    function copyFallback(text) {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        area.style.opacity = "0";

        document.body.appendChild(area);
        area.select();

        var copied = false;

        try {
            copied = document.execCommand("copy");
        } catch (error) {
            copied = false;
        }

        area.remove();

        return copied;
    }

    function makeCopyButton() {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "copy-btn";
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy code");
        return button;
    }

    // Use the nearest preceding heading as the configuration/command
    // context shown in the block header.
    function codeLabel(pre) {
        var node = pre.previousElementSibling;

        while (node) {
            if (/^H[1-6]$/.test(node.tagName)) {
                return node.textContent.replace(/\s+/g, " ").trim().slice(0, 64);
            }
            node = node.previousElementSibling;
        }

        var first = (pre.textContent || "").trim().split("\n")[0];
        return first.length > 40 ? "Code" : (first || "Code");
    }

    /* Every code block gets a working Copy control. Article blocks are
       wrapped in a bordered frame with a compact context header; blocks
       that already live in a terminal or code panel reuse that header
       instead of nesting a second one. */
    function decorateCodeBlocks() {
        $$("pre").forEach(function (pre) {
            if (!pre.querySelector("code") || pre.closest(".code-frame")) {
                return;
            }

            var panel = pre.closest(".code-panel");

            if (panel) {
                var panelHead = $(".code-panel-head", panel);
                if (panelHead && !$(".copy-btn", panelHead)) {
                    panelHead.appendChild(makeCopyButton());
                }
                return;
            }

            if (pre.closest(".terminal")) {
                if (!$(".copy-btn", pre)) {
                    pre.appendChild(makeCopyButton());
                }
                return;
            }

            var frame = document.createElement("div");
            frame.className = "code-frame";

            var head = document.createElement("div");
            head.className = "code-frame-head";

            var label = document.createElement("span");
            label.className = "code-frame-label";
            label.textContent = codeLabel(pre);

            head.appendChild(label);
            head.appendChild(makeCopyButton());

            pre.parentNode.insertBefore(frame, pre);
            frame.appendChild(head);
            frame.appendChild(pre);
        });
    }


    /* =====================================================
       SEARCH INDEX
       ===================================================== */

    function buildSearchIndex() {
        var token = ++searchBuildToken;
        searchReady = false;
        searchIndex = [];
        var seen = {};
        var pages = ["index.html", "security.html", "hardening.html", "sshkeys.html", "fileguard.html", "telegram.html"];

        function clean(text) {
            return String(text || "").replace(/\s+/g, " ").trim();
        }

        function add(label, href, context, body, pageTitle) {
            if (!label || !href || seen[href]) return;
            seen[href] = true;
            var excerpt = clean(body).slice(0, 180);
            searchIndex.push({
                label: clean(label),
                href: href,
                context: clean(context),
                pageTitle: clean(pageTitle),
                excerpt: excerpt,
                search: (label + " " + context + " " + pageTitle + " " + (body || "")).toLowerCase()
            });
        }

        function sectionText(heading) {
            var text = "";
            var node = heading.nextElementSibling;
            while (node && !/^H[1-6]$/.test(node.tagName)) {
                text += " " + node.textContent;
                node = node.nextElementSibling;
            }
            return text;
        }

        function indexDocument(doc, page) {
            var main = doc.getElementById(MAIN_ID);
            if (!main) return;
            var title = (doc.title || page).replace(/^ServerGuard\s*[—-]\s*/i, "");
            var firstHeading = main.querySelector("h1, h2");
            add(title, page, "Documentation page", main.textContent, title);
            $$("h1[id], h2[id], h3[id]", main).forEach(function (heading) {
                add(
                    heading.textContent,
                    page + "#" + heading.id,
                    title,
                    sectionText(heading),
                    title
                );
            });
            if (!firstHeading && main.textContent) add(page, page, "Documentation", main.textContent, title);
        }

        // Index the currently rendered document immediately, then hydrate the
        // same client-side index with every real documentation page.
        indexDocument(document, currentPath.slice(currentPath.lastIndexOf("/") + 1) || "index.html");
        Promise.all(pages.map(function (page) {
            return fetch(page, { credentials: "same-origin" })
                .then(function (response) { return response.ok ? response.text() : ""; })
                .then(function (html) {
                    if (!html) return;
                    var doc = new DOMParser().parseFromString(html, "text/html");
                    indexDocument(doc, page);
                })
                .catch(function () {});
        })).then(function () {
            if (token === searchBuildToken) searchReady = true;
        });
    }


    /* =====================================================
       SEARCH UI
       ===================================================== */

    function initSearch() {
        var input = document.getElementById("docSearch");
        var panel = document.getElementById("docSearchResults");

        if (!input || !panel) {
            return;
        }

        var matches = [];
        var activeIndex = -1;

        function close() {
            panel.hidden = true;
            panel.innerHTML = "";
            matches = [];
            activeIndex = -1;
        }

        closeSearchPanel = close;

        function highlight(index) {
            var items = $$(".doc-search-item", panel);

            items.forEach(function (item, i) {
                item.classList.toggle("is-active", i === index);
            });

            if (items[index]) {
                items[index].scrollIntoView({ block: "nearest" });
            }
        }

        function render(query) {
            var q = query.trim().toLowerCase();

            if (!q) {
                close();
                return;
            }

            if (!searchReady && !searchIndex.length) {
                panel.innerHTML = '<div class="doc-search-empty">Indexing documentation…</div>';
                panel.hidden = false;
                return;
            }

            matches = searchIndex
                .filter(function (item) {
                    return item.search.indexOf(q) !== -1;
                })
                .slice(0, 12);

            panel.innerHTML = "";

            if (!matches.length) {
                var empty = document.createElement("div");
                empty.className = "doc-search-empty";
                empty.textContent = "No results found.";
                panel.appendChild(empty);
                panel.hidden = false;
                return;
            }

            matches.forEach(function (item, i) {
                var link = document.createElement("a");
                link.className = "doc-search-item";
                link.href = item.href;

                var strong = document.createElement("strong");
                strong.textContent = item.label;

                var context = document.createElement("span");
                context.textContent = item.pageTitle + " · " + item.context;

                var excerpt = document.createElement("small");
                excerpt.textContent = item.excerpt || "Open this documentation section";

                link.appendChild(strong);
                link.appendChild(context);
                link.appendChild(excerpt);

                link.addEventListener("mouseenter", function () {
                    activeIndex = i;
                    highlight(i);
                });

                panel.appendChild(link);
            });

            activeIndex = -1;
            panel.hidden = false;
        }

        input.addEventListener("input", function () {
            render(input.value);
        });

        input.addEventListener("focus", function () {
            if (input.value.trim()) {
                render(input.value);
            }
        });

        input.addEventListener("keydown", function (event) {
            var items = $$(".doc-search-item", panel);

            if (event.key === "ArrowDown") {
                event.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                highlight(activeIndex);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                highlight(activeIndex);
            } else if (event.key === "Enter") {
                if (items[activeIndex]) {
                    event.preventDefault();
                    items[activeIndex].click();
                }
            } else if (event.key === "Escape") {
                close();
                input.blur();
            }
        });

        input.setAttribute("aria-controls", "docSearchResults");
        input.setAttribute("aria-haspopup", "listbox");
    }

    function initCommandReference() {
        var root = $(".terminal-reference");
        if (!root || root.dataset.ready === "true") return;
        root.dataset.ready = "true";

        var data = {
            "help": ["General navigation", "Show the complete ServerGuard help page, including general commands, modules, Port Manager and troubleshooting."],
            "ls": ["General navigation", "List files and directories in the current remote directory on the Linux server."],
            "cd <directory>": ["General navigation", "Change the current remote directory. Supported examples include /, .., /opt and /var/log."],
            "security": ["Security", "Open the Security module. Its verified menu covers installation, start, stop, automatic startup, status, logs and updates."],
            "hardening": ["SSH Hardening", "Open SSH Hardening. The verified menu provides apply, status/configuration, validation, backups, restore and update actions."],
            "sshkeys": ["SSH Key Guard", "Open SSH Key Guard. The module provides install, start, stop, restart, status, baseline, scan, events, logs, audit and update actions."],
            "fileguard": ["FileGuard", "Open FileGuard. The verified help describes install, start, stop, automatic startup, status, logs, baseline rebuild and update actions."],
            "telegram": ["Telegram Bot", "Open the Telegram Bot module for ServerGuard notifications and protection management."],
            "ports": ["Diagnostics and maintenance", "Open Port Manager for firewall status, listening ports, rules, protected ports and safe port operations."],
            "web install": ["Diagnostics and maintenance", "Install the local web interface on the connected server. The terminal also supports web status, web url and web remove."],
        };
        var command = $("#commandReferenceCommand");
        var description = $("#commandReferenceDescription");
        var category = $("#commandReferenceCategory");

        function select(button) {
            $$(".command-ref-item", root).forEach(function (item) { item.classList.toggle("is-active", item === button); });
            var value = button.dataset.command;
            command.textContent = value;
            description.textContent = data[value] ? data[value][1] : "Verified ServerGuard terminal command.";
            category.textContent = data[value] ? data[value][0] : "Command reference";
        }
        $$(".command-ref-item", root).forEach(function (button) { button.addEventListener("click", function () { select(button); }); });
    }


    /* =====================================================
       LIGHTBOX
       ===================================================== */

    function initLightbox() {
        var lightbox = document.createElement("div");
        lightbox.className = "image-lightbox";

        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "lightbox-close";
        closeButton.setAttribute("aria-label", "Close image");
        closeButton.textContent = "×";

        var image = document.createElement("img");
        image.alt = "ServerGuard screenshot";

        lightbox.appendChild(closeButton);
        lightbox.appendChild(image);
        document.body.appendChild(lightbox);

        closeButton.addEventListener("click", function () {
            lightbox.classList.remove("active");
            document.body.style.overflow = "";
        });

        lightbox.addEventListener("click", function (event) {
            if (event.target === lightbox) {
                lightbox.classList.remove("active");
                document.body.style.overflow = "";
            }
        });

        lightbox.openImage = function (src, alt) {
            image.src = src;
            image.alt = alt || "ServerGuard screenshot";
            lightbox.classList.add("active");
            document.body.style.overflow = "hidden";
        };

        return lightbox;
    }

    var lightbox = null;


    /* =====================================================
       IN-PAGE NAVIGATION
       ===================================================== */

    function isInternalDocLink(anchor) {
        if (!anchor || anchor.hasAttribute("target")) {
            return false;
        }

        var href = anchor.getAttribute("href");

        if (!href || href.charAt(0) === "#") {
            return false;
        }

        if (/^(?:https?:)?\/\//i.test(href)) {
            return false;
        }

        if (/^(?:mailto:|tel:|javascript:)/i.test(href)) {
            return false;
        }

        var url = new URL(anchor.href, window.location.href);

        if (url.origin !== window.location.origin) {
            return false;
        }

        if (!/\.html?$/i.test(url.pathname)) {
            return false;
        }

        return url.pathname.indexOf(currentDocsDir()) === 0;
    }

    function updateSidebarActive(url) {
        var page = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
        var hash = url.hash || "";

        $$("#sidebar .sidebar-nav a").forEach(function (link) {
            var rawHref = link.getAttribute("href") || "";
            var parts = rawHref.split("#");
            var href = parts[0];
            var linkHash = parts[1] ? "#" + parts[1] : "";
            var active = href === page && (hash ? linkHash === hash : !linkHash);

            link.classList.toggle("active", active);

            if (active) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        var active = $("#sidebar .sidebar-nav a.active");
        var group = active ? active.closest(".sidebar-group") : null;
        if (group) {
            var button = $(".sidebar-group-title", group);
            if (button && button.getAttribute("aria-expanded") !== "true") {
                setSidebarGroupExpanded(group, button, true);
            }
        }
    }

    function loadDoc(url, push) {
        var target = new URL(url, window.location.href);

        if (target.pathname === currentPath) {
            updateSidebarActive(target);
            if (target.hash) {
                var node = document.getElementById(target.hash.slice(1));
                scrollToElement(node, { behavior: "smooth", block: "start" });
                activateTocTarget(target.hash.slice(1));
                history.replaceState(null, "", target.hash);
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return;
        }

        var token = ++navToken;

        fetch(target.href, { credentials: "same-origin" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }
                return response.text();
            })
            .then(function (html) {
                if (token !== navToken) {
                    return;
                }

                var parsed = new DOMParser().parseFromString(html, "text/html");
                var newMain = parsed.getElementById(MAIN_ID);
                var currentMain = document.getElementById(MAIN_ID);

                if (!newMain || !currentMain) {
                    throw new Error("content region not found");
                }

                var newToc = parsed.getElementById(TOC_ID);
                var currentToc = document.getElementById(TOC_ID);

                if (newToc && currentToc) {
                    currentToc.replaceWith(newToc);
                }

                currentMain.replaceWith(newMain);

                currentPath = target.pathname;

                if (parsed.title) {
                    document.title = parsed.title;
                }

                updateSidebarActive(target);
                render();
                externalizeLinks();
                setSidebarOpen(false);

                if (target.hash) {
                    var node = document.getElementById(target.hash.slice(1));
                    scrollToElement(node);
                    activateTocTarget(target.hash.slice(1));
                } else {
                    window.scrollTo(0, 0);
                }

                if (push) {
                    history.pushState({ docsNav: true }, "", target.href);
                }
            })
            .catch(function (error) {
                // Never leave the user stuck: fall back to a normal load.
                console.warn("In-page documentation navigation failed:", error);
                window.location.href = target.href;
            });
    }


    /* =====================================================
       EXTERNAL LINKS
       ===================================================== */

    function externalizeLinks() {
        $$('a[href^="http"]').forEach(function (link) {
            if (!link.hasAttribute("target")) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
        });
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function render() {
        initSidebar();
        decorateCodeBlocks();
        initCommandReference();
        // buildToc() assigns ids to headings; buildSearchIndex() needs
        // those ids to index section titles and body text.
        buildToc();
        buildSearchIndex();
    }


    /* =====================================================
       GLOBAL EVENT DELEGATION (attached once)
       ===================================================== */

    function onDocumentClick(event) {
        // Copy buttons
        var copyButton = event.target.closest(".copy-btn");

        if (copyButton) {
            event.preventDefault();

            var container = copyButton.closest(".code-frame, .code-panel, .terminal, .terminal-reference-detail, pre");
            var code = container ? container.querySelector("code") : null;

            copyText(code ? code.textContent : "").then(function (copied) {
                copyButton.textContent = copied ? "Copied" : "Copy failed";

                window.setTimeout(function () {
                    copyButton.textContent = "Copy";
                }, 1500);
            });

            return;
        }

        // Screenshot lightbox
        var shot = event.target.closest(".screenshot img");

        if (shot) {
            event.preventDefault();
            if (lightbox) {
                lightbox.openImage(shot.src, shot.alt);
            }
            return;
        }

        // Close search when clicking outside it
        if (!event.target.closest(".doc-search")) {
            closeSearchPanel();
        }

        var anchor = event.target.closest("a[href]");

        if (!anchor) {
            return;
        }

        // Any sidebar link closes the mobile drawer
        if (anchor.closest("#sidebar")) {
            setSidebarOpen(false);
        }

        if (event.defaultPrevented) {
            return;
        }

        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        var href = anchor.getAttribute("href") || "";

        // Same-page anchor
        if (href.charAt(0) === "#") {
            var node = document.getElementById(href.slice(1));
            if (node) {
                event.preventDefault();
                // Collapse first on mobile so the smooth scroll targets
                // the final position instead of jumping afterwards.
                collapseTocIfCompact();
                scrollToElement(node, { behavior: "smooth", block: "start" });
                activateTocTarget(href.slice(1));
                history.replaceState(null, "", href);
            }
            return;
        }

        // Internal documentation page -> swap in place
        if (isInternalDocLink(anchor)) {
            event.preventDefault();
            closeSearchPanel();
            loadDoc(anchor.href, true);
        }
    }

    function onDocumentKeydown(event) {
        if (event.key === "Escape") {
            setSidebarOpen(false);
            closeSearchPanel();
            return;
        }

        if (
            event.key === "/" &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey
        ) {
            var tag = (event.target.tagName || "").toLowerCase();

            if (
                tag === "input" ||
                tag === "textarea" ||
                tag === "select" ||
                event.target.isContentEditable
            ) {
                return;
            }

            var input = document.getElementById("docSearch");

            if (input) {
                event.preventDefault();
                input.focus();
                input.select();
            }
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            var search = document.getElementById("docSearch");
            if (search) {
                event.preventDefault();
                search.focus();
                search.select();
            }
        }
    }

    function bindGlobalEvents() {
        document.addEventListener("click", onDocumentClick);
        document.addEventListener("keydown", onDocumentKeydown);

        var resizeTimer = null;
        var button = document.getElementById("mobileMenuButton");

        if (button) {
            button.addEventListener("click", function () {
                var sidebar = sidebarEl();
                setSidebarOpen(
                    !(sidebar && sidebar.classList.contains("open"))
                );
            });
        }

        window.addEventListener("resize", function () {
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                setSidebarOpen(false);
            }

            updateTocMode();

            // Re-measure heading positions after the layout settles so
            // the cached offsets stay correct without measuring on scroll.
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                measureTocTargets();
                updateActiveToc();
            }, 140);
        });

        window.addEventListener("scroll", scheduleActiveTocUpdate, { passive: true });

        // Images/text can change the document height after first paint;
        // refresh the cached heading offsets once the page is complete.
        window.addEventListener("load", function () {
            measureTocTargets();
            updateActiveToc();
        });

        window.addEventListener("popstate", function () {
            loadDoc(window.location.href, false);
        });

        // Delegated image error handling for screenshots
        document.addEventListener(
            "error",
            function (event) {
                var img = event.target;

                if (!img || img.tagName !== "IMG" || !img.closest(".screenshot")) {
                    return;
                }

                img.style.minHeight = "180px";
                img.style.objectFit = "contain";
                img.style.padding = "40px";
                img.alt = "Screenshot will be added here";
                img.src = placeholderImage("Screenshot will be added here");
            },
            true
        );
    }

    function placeholderImage(text) {
        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" ' +
            'viewBox="0 0 1200 600"><rect width="1200" height="600" fill="#0d111a"/>' +
            '<text x="600" y="300" text-anchor="middle" fill="#687286" ' +
            'font-family="Arial, sans-serif" font-size="26">' + text + "</text></svg>";

        return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
    }


    /* =====================================================
       INIT
       ===================================================== */

    function init() {
        lightbox = initLightbox();

        initDocumentationShell();
        initSidebar();
        bindGlobalEvents();
        initSearch();
        render();
        externalizeLinks();

        if (window.location.hash) {
            var node = document.getElementById(window.location.hash.slice(1));
            if (node) {
                window.setTimeout(function () {
                    scrollToElement(node);
                    activateTocTarget(window.location.hash.slice(1));
                }, 60);
            }
        }
    }

    init();

})();
