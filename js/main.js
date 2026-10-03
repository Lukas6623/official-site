
const MANIFEST_URL =
    "https://raw.githubusercontent.com/Lukas6623/ServerGuard/main/updates/manifest.json";

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

        const version =
            manifest.version || "Unknown";

        const installerVersion =
            manifest.installer_version || "Unknown";

        const installerUrl =
            manifest.installer_url;

        if (!installerUrl) {

            throw new Error(
                "installer_url is missing in manifest.json"
            );

        }

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

        document
            .querySelectorAll(".latest-version")
            .forEach((element) => {

                element.textContent =
                    `v${installerVersion}`;

            });

        document
            .querySelectorAll(".installer-version")
            .forEach((element) => {

                element.textContent =
                    `Installer v${installerVersion}`;

            });

        document
            .querySelectorAll(
                "[data-serverguard-version]"
            )
            .forEach((element) => {

                element.textContent =
                    version;

            });

        document
            .querySelectorAll(
                "[data-installer-version]"
            )
            .forEach((element) => {

                element.textContent =
                    installerVersion;

            });

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

        window.serverGuardManifest =
            manifest;

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

        document
            .querySelectorAll(
                ".latest-version"
            )
            .forEach((element) => {

                element.textContent =
                    "Unavailable";

            });

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

document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {

        link.addEventListener(
            "click",
            (event) => {

                const targetId =
                    link.getAttribute("href");

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

            }
        );

    });

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadServerGuardManifest();

    }
);
