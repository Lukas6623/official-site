"use strict";


/* =========================================================
   SERVERGUARD DOCUMENTATION
   Shared page behaviour

   - documentation search (topbar) with "/" shortcut
   - copy buttons for prose code blocks

   Loaded on every documentation page. It is defensive:
   each feature only initialises when its markup exists and
   never duplicates work already done by js/module.js.
   ========================================================= */


/* =========================================================
   CODE COPY BUTTONS
   ========================================================= */

function docsCopyText(text) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        return navigator.clipboard
            .writeText(text)
            .then(() => true)
            .catch(() => docsCopyFallback(text));

    }

    return Promise.resolve(
        docsCopyFallback(text)
    );

}


function docsCopyFallback(text) {

    const textarea =
        document.createElement("textarea");

    textarea.value = text;

    textarea.setAttribute("readonly", "");

    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    textarea.select();


    let copied = false;

    try {

        copied = document.execCommand("copy");

    } catch (error) {

        copied = false;

    }

    textarea.remove();

    return copied;

}


function initializeDocsCopyButtons() {

    /* Any <pre> without a copy button yet. This covers the
       prose blocks on the testing guide; module pages already
       have buttons created by js/module.js. */

    document.querySelectorAll("pre").forEach(pre => {

        if (pre.querySelector(".copy-btn")) {

            return;

        }


        const code = pre.querySelector("code");

        if (!code) {

            return;

        }


        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "copy-btn";
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy code");


        button.addEventListener("click", () => {

            docsCopyText(code.textContent).then(copied => {

                button.textContent =
                    copied ? "Copied" : "Copy failed";

                window.setTimeout(() => {

                    button.textContent = "Copy";

                }, 1500);

            });

        });


        pre.appendChild(button);

    });

}


/* =========================================================
   DOCUMENTATION SEARCH
   ========================================================= */

function initializeDocsSearch() {

    const input =
        document.getElementById("docSearch");

    const panel =
        document.getElementById("docSearchResults");


    if (!input || !panel) {

        return;

    }


    /* Build a small in-memory index from the sidebar
       destinations and the headings on the current page. */

    const index = [];
    const seen = new Set();


    function addItem(label, href, context, extra) {

        if (!label || !href || seen.has(href)) {

            return;

        }

        seen.add(href);

        index.push({
            label: label,
            href: href,
            context: context,
            search:
                `${label} ${context} ${extra || ""}`.toLowerCase()
        });

    }


    /* Text of the section that follows a heading, up to the next
       heading. Combined with the heading text this gives light
       full-text matching while keeping results anchored to a
       heading that actually exists on the page. */

    function sectionText(heading) {

        let text = "";
        let node = heading.nextElementSibling;

        while (node && !/^H[1-6]$/.test(node.tagName)) {

            text += ` ${node.textContent}`;
            node = node.nextElementSibling;

        }

        return text;

    }


    document
        .querySelectorAll(".sidebar-nav a")
        .forEach(link => {

            const label =
                link.textContent.replace(/\s+/g, " ").trim();

            addItem(label, link.getAttribute("href"), "Documentation");

        });


    document
        .querySelectorAll("main h2[id], main h3[id]")
        .forEach(heading => {

            addItem(
                heading.textContent.trim(),
                `#${heading.id}`,
                "On this page",
                sectionText(heading)
            );

        });


    let matches = [];
    let activeIndex = -1;


    function close() {

        panel.hidden = true;
        panel.innerHTML = "";

        matches = [];
        activeIndex = -1;

    }


    function highlight(indexToActivate) {

        const items =
            panel.querySelectorAll(".doc-search-item");

        items.forEach((item, i) => {

            item.classList.toggle(
                "is-active",
                i === indexToActivate
            );

        });

        if (items[indexToActivate]) {

            items[indexToActivate].scrollIntoView({
                block: "nearest"
            });

        }

    }


    function render(query) {

        const q = query.trim().toLowerCase();

        if (!q) {

            close();

            return;

        }


        matches = index
            .filter(item => item.search.includes(q))
            .slice(0, 12);


        panel.innerHTML = "";


        if (!matches.length) {

            const empty =
                document.createElement("div");

            empty.className = "doc-search-empty";
            empty.textContent = "No results found.";

            panel.appendChild(empty);

            panel.hidden = false;

            return;

        }


        matches.forEach((item, i) => {

            const link =
                document.createElement("a");

            link.className = "doc-search-item";
            link.href = item.href;

            const strong =
                document.createElement("strong");

            strong.textContent = item.label;

            const context =
                document.createElement("span");

            context.textContent = item.context;

            link.appendChild(strong);
            link.appendChild(context);

            link.addEventListener("mouseenter", () => {

                activeIndex = i;
                highlight(i);

            });

            link.addEventListener("click", () => {

                close();
                input.blur();

            });

            panel.appendChild(link);

        });


        activeIndex = -1;
        panel.hidden = false;

    }


    input.addEventListener("input", () => {

        render(input.value);

    });


    input.addEventListener("focus", () => {

        if (input.value.trim()) {

            render(input.value);

        }

    });


    input.addEventListener("keydown", event => {

        const items =
            panel.querySelectorAll(".doc-search-item");


        if (event.key === "ArrowDown") {

            event.preventDefault();

            activeIndex =
                Math.min(activeIndex + 1, items.length - 1);

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


    document.addEventListener("click", event => {

        if (
            !event.target.closest(".doc-search")
        ) {

            close();

        }

    });


    /* "/" focuses the search field from anywhere on the page. */

    document.addEventListener("keydown", event => {

        if (
            event.key !== "/" ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
        ) {

            return;

        }


        const tag =
            (event.target.tagName || "").toLowerCase();

        if (
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            event.target.isContentEditable
        ) {

            return;

        }


        event.preventDefault();

        input.focus();
        input.select();

    });

}


/* =========================================================
   INITIALIZE
   ========================================================= */

initializeDocsCopyButtons();

initializeDocsSearch();
