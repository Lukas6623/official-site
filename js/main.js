/* =====================================================
   SERVERGUARD MAIN.JS
===================================================== */


/* =====================================================
   CONFIGURATION
===================================================== */

const MANIFEST_URL =
    "https://raw.githubusercontent.com/Lukas6623/ServerGuard/main/updates/manifest.json";


/* =====================================================
   LOAD SERVERGUARD MANIFEST
===================================================== */

async function loadServerGuardManifest() {

    try {

        const response = await fetch(
            `${MANIFEST_URL}?t=${Date.now()}`,
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {

            throw new Error(
                `Manifest request failed: ${response.status}`
            );

        }


        const manifest = await response.json();


        /* =================================================
           SERVERGUARD VERSION

           Example:
           1.0.6
        ================================================= */

        const version =
            manifest.version || "Unknown";


        /* =================================================
           INSTALLER VERSION

           Example:
           0.0.1
        ================================================= */

        const installerVersion =
            manifest.installer_version || "Unknown";


        /* =================================================
           INSTALLER URL

           IMPORTANT:
           Website Download button uses
           installer_url, NOT url.
        ================================================= */

        const installerUrl =
            manifest.installer_url;


        if (!installerUrl) {

            throw new Error(
                "installer_url is missing in manifest.json"
            );

        }


        /* =================================================
           DOWNLOAD BUTTONS

           Download button downloads the INSTALLER.
        ================================================= */

        document
            .querySelectorAll(".download-installer")
            .forEach((button) => {

                button.href = installerUrl;

                button.target = "_blank";

                button.rel =
                    "noopener noreferrer";

                button.classList.remove(
                    "download-unavailable"
                );


                button.textContent =
                    "↓ Download ServerGuard";


            });


        /* =================================================
           LATEST INSTALLER VERSION

           IMPORTANT:
           This uses installer_version,
           because the Download button downloads
           the installer.
        ================================================= */

        document
            .querySelectorAll(".latest-version")
            .forEach((element) => {

                element.textContent =
                    `v${installerVersion}`;

            });


        /* =================================================
           INSTALLER VERSION
        ================================================= */

        document
            .querySelectorAll(".installer-version")
            .forEach((element) => {

                element.textContent =
                    `Installer v${installerVersion}`;

            });


        /* =================================================
           SERVERGUARD VERSION

           Elements with:
           data-serverguard-version

           will receive:
           1.0.6
        ================================================= */

        document
            .querySelectorAll(
                "[data-serverguard-version]"
            )
            .forEach((element) => {

                element.textContent =
                    version;

            });


        /* =================================================
           INSTALLER VERSION

           Elements with:
           data-installer-version

           will receive:
           0.0.1
        ================================================= */

        document
            .querySelectorAll(
                "[data-installer-version]"
            )
            .forEach((element) => {

                element.textContent =
                    installerVersion;

            });


        /* =================================================
           OPTIONAL DATA ATTRIBUTES

           Makes the URLs available in HTML
           if needed in the future.
        ================================================= */

        document
            .querySelectorAll(
                "[data-installer-url]"
            )
            .forEach((element) => {

                element.href =
                    installerUrl;

            });


        document
            .querySelectorAll(
                "[data-serverguard-url]"
            )
            .forEach((element) => {

                if (manifest.url) {

                    element.href =
                        manifest.url;

                }

            });


        /* =================================================
           SAVE MANIFEST GLOBALLY

           Other JS modules can access:

           window.serverGuardManifest
        ================================================= */

        window.serverGuardManifest =
            manifest;


        /* =================================================
           DEBUG INFORMATION
        ================================================= */

        console.log(
            "ServerGuard manifest loaded."
        );

        console.log(
            "ServerGuard version:",
            version
        );

        console.log(
            "Installer version:",
            installerVersion
        );

        console.log(
            "Installer URL:",
            installerUrl
        );


    } catch (error) {


        console.error(
            "ServerGuard manifest error:",
            error
        );


        /* =================================================
           DISABLE DOWNLOAD BUTTONS
        ================================================= */

        document
            .querySelectorAll(
                ".download-installer"
            )
            .forEach((button) => {

                button.removeAttribute(
                    "href"
                );

                button.removeAttribute(
                    "target"
                );

                button.removeAttribute(
                    "rel"
                );

                button.classList.add(
                    "download-unavailable"
                );

                button.textContent =
                    "Download unavailable";

            });


        /* =================================================
           VERSION FALLBACK
        ================================================= */

        document
            .querySelectorAll(
                ".latest-version"
            )
            .forEach((element) => {

                element.textContent =
                    "Unavailable";

            });


        /* =================================================
           INSTALLER VERSION FALLBACK
        ================================================= */

        document
            .querySelectorAll(
                ".installer-version"
            )
            .forEach((element) => {

                element.textContent =
                    "Installer unavailable";

            });

    }

}


/* =====================================================
   SCROLL REVEAL
===================================================== */

const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add(
                        "visible"
                    );

                    revealObserver.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: 0.12
        }
    );


document
    .querySelectorAll(".reveal")
    .forEach((el) => {

        revealObserver.observe(el);

    });


/* =====================================================
   SMOOTH NAVIGATION
===================================================== */

document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {

        link.addEventListener(
            "click",
            (event) => {

                const targetId =
                    link.getAttribute("href");


                /* Ignore empty "#" */

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


                /* Target does not exist */

                if (!target) {

                    return;

                }


                event.preventDefault();


                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );

    });


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadServerGuardManifest();

    }
);