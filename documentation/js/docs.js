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

    var tocObserver = null;
    var navToken = 0;
    var searchIndex = [];
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


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function sidebarEl() {
        return document.getElementById("sidebar");
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

        var title = document.createElement("div");
        title.className = "page-toc-title";
        title.textContent = "ON THIS PAGE";
        toc.appendChild(title);

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

            toc.appendChild(link);
        });

        observeSections();
    }

    function observeSections() {
        if (tocObserver) {
            tocObserver.disconnect();
            tocObserver = null;
        }

        var toc = document.getElementById(TOC_ID);

        if (!toc || !("IntersectionObserver" in window)) {
            return;
        }

        var links = $$("a", toc);
        if (!links.length) {
            return;
        }

        var byId = {};

        links.forEach(function (link) {
            byId[link.getAttribute("data-target")] = link;
        });

        tocObserver = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    links.forEach(function (link) {
                        link.classList.remove("active");
                    });

                    var link = byId[entry.target.id];
                    if (link) {
                        link.classList.add("active");
                    }
                });
            },
            {
                rootMargin: "-20% 0px -65% 0px",
                threshold: 0
            }
        );

        Object.keys(byId).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                tocObserver.observe(el);
            }
        });
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

    function addCopyButtons() {
        $$("pre").forEach(function (pre) {
            if ($(".copy-btn", pre)) {
                return;
            }

            var code = $("code", pre);
            if (!code) {
                return;
            }

            var button = document.createElement("button");
            button.type = "button";
            button.className = "copy-btn";
            button.textContent = "Copy";
            button.setAttribute("aria-label", "Copy code");

            pre.appendChild(button);
        });
    }


    /* =====================================================
       SEARCH INDEX
       ===================================================== */

    function buildSearchIndex() {
        searchIndex = [];

        var seen = {};

        function add(label, href, context, body) {
            if (!label || !href || seen[href]) {
                return;
            }

            seen[href] = true;

            searchIndex.push({
                label: label,
                href: href,
                context: context,
                search: (
                    label + " " + context + " " + (body || "")
                ).toLowerCase()
            });
        }

        // Text of the block after a heading, up to the next heading,
        // so body-only terms (for example "firewall") are found too.
        function sectionText(heading) {
            var text = "";
            var node = heading.nextElementSibling;

            while (node && !/^H[1-6]$/.test(node.tagName)) {
                text += " " + node.textContent;
                node = node.nextElementSibling;
            }

            return text;
        }

        $$("#sidebar .sidebar-nav a").forEach(function (link) {
            add(
                link.textContent.replace(/\s+/g, " ").trim(),
                link.getAttribute("href"),
                "Documentation"
            );
        });

        var article = $(".doc-article");

        if (article) {
            $$(".doc-article h2[id], .doc-article h3[id]", article)
                .forEach(function (heading) {
                    add(
                        heading.textContent.trim(),
                        "#" + heading.id,
                        "On this page",
                        sectionText(heading)
                    );
                });
        } else {
            $$("#" + MAIN_ID + " .doc-section[id]").forEach(function (section) {
                var heading = section.querySelector("h1, h2");
                add(
                    heading
                        ? heading.textContent.replace(/\s+/g, " ").trim()
                        : section.id,
                    "#" + section.id,
                    "On this page",
                    section.textContent
                );
            });
        }
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
                context.textContent = item.context;

                link.appendChild(strong);
                link.appendChild(context);

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
            }
        });
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

        $$("#sidebar .sidebar-nav a").forEach(function (link) {
            var href = (link.getAttribute("href") || "").split("#")[0];
            var active = href === page;

            link.classList.toggle("active", active);

            if (active) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function loadDoc(url, push) {
        var target = new URL(url, window.location.href);

        if (target.pathname === currentPath) {
            if (target.hash) {
                var node = document.getElementById(target.hash.slice(1));
                if (node) {
                    node.scrollIntoView({ behavior: "smooth", block: "start" });
                }
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
                    if (node) {
                        node.scrollIntoView();
                    }
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
        addCopyButtons();
        buildSearchIndex();
        buildToc();
    }


    /* =====================================================
       GLOBAL EVENT DELEGATION (attached once)
       ===================================================== */

    function onDocumentClick(event) {
        // Copy buttons
        var copyButton = event.target.closest(".copy-btn");

        if (copyButton) {
            event.preventDefault();

            var pre = copyButton.closest("pre");
            var code = pre ? pre.querySelector("code") : null;

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
                node.scrollIntoView({ behavior: "smooth", block: "start" });
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
    }

    function bindGlobalEvents() {
        document.addEventListener("click", onDocumentClick);
        document.addEventListener("keydown", onDocumentKeydown);

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

        bindGlobalEvents();
        initSearch();
        render();
        externalizeLinks();

        if (window.location.hash) {
            var node = document.getElementById(window.location.hash.slice(1));
            if (node) {
                window.setTimeout(function () {
                    node.scrollIntoView();
                }, 60);
            }
        }
    }

    init();

})();
