"use strict";


/* =========================================================
   SERVERGUARD DOCUMENTATION
   Module pages JavaScript
   
   Provides the behaviour shared by the module
   documentation pages:
   - mobile sidebar / menu
   - automatic table of contents (#pageToc)
   - code copy buttons
   ========================================================= */


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const sidebar =
    document.getElementById("sidebar");


if (mobileMenuButton && sidebar) {

    mobileMenuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle("open");

            mobileMenuButton.classList.toggle(
                "is-open",
                sidebar.classList.contains("open")
            );

        }
    );


    const sidebarLinks =
        sidebar.querySelectorAll("a");

    sidebarLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                sidebar.classList.remove("open");

                mobileMenuButton.classList.remove(
                    "is-open"
                );

            }
        );

    });

}


/* =========================================================
   TABLE OF CONTENTS
   ========================================================= */

const pageToc =
    document.getElementById("pageToc");

const tocHeadings =
    document.querySelectorAll(
        ".doc-article h2, .doc-article h3"
    );


/* Track ids that are already in use so generated
   anchors never collide with existing ones. */

const usedHeadingIds =
    new Set();


tocHeadings.forEach(heading => {

    if (heading.id) {

        usedHeadingIds.add(heading.id);

    }

});


/* Build a URL-safe slug from heading text.
   Unicode letters (including Cyrillic) are kept. */

function createHeadingSlug(text) {

    return String(text ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "");

}


/* Ensure a heading has an id and return it. */

function ensureHeadingId(heading) {

    if (heading.id) {

        return heading.id;

    }


    const base =
        createHeadingSlug(heading.textContent) ||
        "section";

    let id = base;
    let counter = 2;


    while (usedHeadingIds.has(id)) {

        id = `${base}-${counter}`;
        counter++;

    }


    usedHeadingIds.add(id);

    heading.id = id;


    return id;

}


/* Generate the table of contents. */

function buildTableOfContents() {

    if (!pageToc || !tocHeadings.length) {

        return;

    }


    const title =
        document.createElement("div");

    title.className =
        "page-toc-title";

    title.textContent =
        "ON THIS PAGE";


    pageToc.appendChild(title);


    tocHeadings.forEach(heading => {

        const id =
            ensureHeadingId(heading);


        const link =
            document.createElement("a");

        link.href =
            `#${id}`;

        link.dataset.target =
            id;

        link.textContent =
            heading.textContent.trim();


        if (heading.tagName === "H3") {

            link.classList.add("toc-h3");

        }


        pageToc.appendChild(link);

    });

}


/* Highlight the table of contents entry
   for the section currently in view. */

function initializeTocHighlight() {

    if (
        !pageToc ||
        !tocHeadings.length ||
        !("IntersectionObserver" in window)
    ) {

        return;

    }


    const links =
        pageToc.querySelectorAll("a");


    if (!links.length) {

        return;

    }


    const linksById =
        new Map();


    links.forEach(link => {

        linksById.set(
            link.dataset.target,
            link
        );

    });


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {

                        return;

                    }


                    links.forEach(link => {

                        link.classList.remove(
                            "active"
                        );

                    });


                    const link =
                        linksById.get(
                            entry.target.id
                        );


                    if (link) {

                        link.classList.add(
                            "active"
                        );

                    }

                });

            },
            {
                rootMargin:
                    "-20% 0px -65% 0px",

                threshold: 0
            }
        );


    tocHeadings.forEach(heading => {

        observer.observe(heading);

    });

}


/* =========================================================
   CODE COPY BUTTONS
   ========================================================= */

function copyTextToClipboard(text) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        return navigator.clipboard
            .writeText(text)
            .then(() => true)
            .catch(() => copyTextFallback(text));

    }


    return Promise.resolve(
        copyTextFallback(text)
    );

}


function copyTextFallback(text) {

    const textarea =
        document.createElement("textarea");

    textarea.value =
        text;

    textarea.setAttribute("readonly", "");

    textarea.style.position =
        "fixed";

    textarea.style.top =
        "-1000px";

    textarea.style.opacity =
        "0";


    document.body.appendChild(textarea);

    textarea.select();


    let copied = false;


    try {

        copied =
            document.execCommand("copy");

    } catch (error) {

        copied = false;

    }


    textarea.remove();


    return copied;

}


function initializeCopyButtons() {

    const article =
        document.querySelector(".doc-article");


    if (!article) {

        return;

    }


    article.querySelectorAll("pre").forEach(pre => {

        const code =
            pre.querySelector("code");


        if (!code) {

            return;

        }


        const button =
            document.createElement("button");

        button.type =
            "button";

        button.className =
            "copy-btn";

        button.textContent =
            "Copy";

        button.setAttribute(
            "aria-label",
            "Copy code"
        );


        button.addEventListener(
            "click",
            () => {

                copyTextToClipboard(
                    code.textContent
                ).then(copied => {

                    button.textContent =
                        copied
                            ? "Copied"
                            : "Copy failed";


                    window.setTimeout(
                        () => {

                            button.textContent =
                                "Copy";

                        },
                        1500
                    );

                });

            }
        );


        pre.appendChild(button);

    });

}


/* =========================================================
   INITIALIZE
   ========================================================= */

buildTableOfContents();

initializeTocHighlight();

initializeCopyButtons();


/* =========================================================
   CONSOLE INFORMATION
   ========================================================= */

console.log(
    "%cServerGuard Module Documentation",
    "color:#7ea9ff;font-size:16px;font-weight:bold;"
);

console.log(
    "Module documentation loaded successfully."
);
