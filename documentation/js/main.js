"use strict";


/* =========================================================
   SERVERGUARD DOCUMENTATION
   Main JavaScript
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
   ACTIVE SIDEBAR SECTION
========================================================= */

const sections =
    document.querySelectorAll(".doc-section");

const navigationLinks =
    document.querySelectorAll(".sidebar-nav a");


if (
    sections.length &&
    navigationLinks.length
) {

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    const id =
                        entry.target.id;

                    navigationLinks.forEach(link => {

                        link.classList.remove(
                            "active"
                        );

                        if (
                            link.getAttribute("href") ===
                            `#${id}`
                        ) {

                            link.classList.add(
                                "active"
                            );

                        }

                    });

                });

            },
            {
                rootMargin:
                    "-20% 0px -65% 0px",

                threshold: 0
            }
        );


    sections.forEach(section => {

        observer.observe(section);

    });

}


/* =========================================================
   SCREENSHOT LIGHTBOX
========================================================= */

function createLightbox() {

    const lightbox =
        document.createElement("div");

    lightbox.className =
        "image-lightbox";


    const closeButton =
        document.createElement("button");

    closeButton.className =
        "lightbox-close";

    closeButton.type =
        "button";

    closeButton.setAttribute(
        "aria-label",
        "Close image"
    );

    closeButton.textContent =
        "×";


    const image =
        document.createElement("img");

    image.alt =
        "ServerGuard screenshot";


    lightbox.appendChild(
        closeButton
    );

    lightbox.appendChild(
        image
    );

    document.body.appendChild(
        lightbox
    );


    function close() {

        lightbox.classList.remove(
            "active"
        );

        document.body.style.overflow =
            "";

    }


    closeButton.addEventListener(
        "click",
        close
    );


    lightbox.addEventListener(
        "click",
        event => {

            if (
                event.target === lightbox
            ) {

                close();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                close();

            }

        }
    );


    return {
        open(src, alt) {

            image.src =
                src;

            image.alt =
                alt || "ServerGuard screenshot";

            lightbox.classList.add(
                "active"
            );

            document.body.style.overflow =
                "hidden";

        },

        close

    };

}


const lightbox =
    createLightbox();


document
    .querySelectorAll(".screenshot img")
    .forEach(image => {

        image.addEventListener(
            "click",
            () => {

                lightbox.open(
                    image.src,
                    image.alt
                );

            }
        );

    });


/* =========================================================
   IMAGE ERROR HANDLING
========================================================= */

document
    .querySelectorAll(".screenshot img")
    .forEach(image => {

        image.addEventListener(
            "error",
            () => {

                image.style.minHeight =
                    "180px";

                image.style.objectFit =
                    "contain";

                image.style.padding =
                    "40px";

                image.alt =
                    "Screenshot will be added here";

                image.src =
                    createPlaceholderImage(
                        "Screenshot will be added here"
                    );

            },
            {
                once: true
            }
        );

    });


function createPlaceholderImage(text) {

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1200"
            height="600"
            viewBox="0 0 1200 600"
        >

            <rect
                width="1200"
                height="600"
                fill="#0d111a"
            />

            <rect
                x="40"
                y="40"
                width="1120"
                height="520"
                rx="18"
                fill="#111722"
                stroke="#252e3d"
            />

            <circle
                cx="75"
                cy="75"
                r="7"
                fill="#394456"
            />

            <circle
                cx="100"
                cy="75"
                r="7"
                fill="#394456"
            />

            <circle
                cx="125"
                cy="75"
                r="7"
                fill="#394456"
            />

            <text
                x="600"
                y="300"
                text-anchor="middle"
                fill="#687286"
                font-family="Arial, sans-serif"
                font-size="26"
            >
                ${text}
            </text>

        </svg>
    `;

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );

}


/* =========================================================
   SMOOTH INTERNAL LINKS
========================================================= */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            event => {

                const targetId =
                    link.getAttribute(
                        "href"
                    );

                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }

                const target =
                    document.querySelector(
                        targetId
                    );

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                history.replaceState(
                    null,
                    "",
                    targetId
                );

            }
        );

    });


/* =========================================================
   OPEN SECTION FROM URL
========================================================= */

window.addEventListener(
    "load",
    () => {

        const hash =
            window.location.hash;

        if (!hash) {
            return;
        }

        const target =
            document.querySelector(
                hash
            );

        if (!target) {
            return;
        }

        setTimeout(
            () => {

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            100
        );

    }
);


/* =========================================================
   EXTERNAL LINKS
========================================================= */

document
    .querySelectorAll(
        'a[href^="http"]'
    )
    .forEach(link => {

        if (
            !link.hasAttribute("target")
        ) {

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

        }

    });


/* =========================================================
   CONSOLE INFORMATION
========================================================= */

console.log(
    "%cServerGuard Documentation",
    "color:#7ea9ff;font-size:18px;font-weight:bold;"
);

console.log(
    "Documentation loaded successfully."
);