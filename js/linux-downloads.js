/* The HTML contains the complete current release as an offline/error fallback. */
(() => {
    "use strict";
    const container = document.getElementById("linuxPackages");
    const status = document.getElementById("releaseStatus");
    const versionLabel = document.getElementById("linuxVersion");
    if (!container || !status) return;
    const fallbackVersion = versionLabel.textContent;

    function validateRelease(release) {
        if (!release || !/^\d+\.\d+\.\d+$/.test(release.version) ||
            typeof release.architecture !== "string" || !release.architecture ||
            !Array.isArray(release.packages) || release.packages.length !== 3) {
            throw new Error("Invalid Linux release configuration");
        }
        release.packages.forEach(pkg => {
            for (const field of ["distribution", "format", "architecture", "filename", "url", "command"]) {
                if (typeof pkg[field] !== "string" || !pkg[field].trim()) throw new Error("Incomplete package");
            }
            const url = new URL(pkg.url);
            if (url.origin !== "https://serverguard.site" || url.search || url.hash ||
                url.pathname !== `/downloads/linux/${release.version}/${pkg.filename}` ||
                !/^[a-zA-Z0-9_.-]+\.(deb|rpm|pkg\.tar\.zst)$/.test(pkg.filename)) {
                throw new Error("Invalid package URL");
            }
        });
        return release;
    }

    async function loadRelease() {
        status.textContent = `${fallbackVersion} downloads are ready. Checking release information…`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch("/downloads/linux/releases.json", { cache: "no-cache", signal: controller.signal });
            if (!response.ok) throw new Error(`Release request failed: ${response.status}`);
            const release = validateRelease(await response.json());
            const template = container.firstElementChild;
            const activeElement = document.activeElement;
            const activeCard = activeElement?.closest(".linux-card");
            const activeIndex = activeCard ? Array.from(container.children).indexOf(activeCard) : -1;
            const focusSelector = activeElement?.matches(".copy-btn") ? ".copy-btn" :
                activeElement?.matches(".package-download") ? ".package-download" : null;
            const cards = release.packages.map(pkg => {
                const card = template.cloneNode(true);
                card.querySelector("h2").textContent = pkg.distribution;
                card.querySelector(".chip").textContent = pkg.format;
                card.querySelector(".package-architecture").textContent = pkg.architecture;
                const link = card.querySelector(".package-download");
                link.href = pkg.url;
                link.textContent = `Download ${pkg.format}`;
                card.querySelector("code").textContent = pkg.command;
                const copyButton = card.querySelector(".copy-btn");
                // Never clone a pending copy operation or its temporary feedback.
                copyButton.textContent = "Copy";
                copyButton.disabled = false;
                copyButton.removeAttribute("aria-busy");
                copyButton.setAttribute("aria-label", `Copy ${pkg.distribution} installation command`);
                return card;
            });
            container.replaceChildren(...cards);
            if (activeIndex >= 0 && focusSelector) {
                cards[activeIndex]?.querySelector(focusSelector)?.focus({ preventScroll: true });
            }
            versionLabel.textContent = `Version ${release.version}`;
            document.getElementById("linuxArchitecture").textContent = release.architecture;
            status.textContent = `Release ${release.version} · Choose the package for your distribution.`;
        } catch (error) {
            status.textContent = `Release information could not be refreshed. ${fallbackVersion} downloads and commands remain available on this page.`;
            console.warn("Linux release information unavailable:", error);
        } finally {
            clearTimeout(timeout);
        }
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(text); return true; } catch { /* Try local fallback. */ }
        }
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.cssText = "position:fixed;top:-1000px;opacity:0";
        const previousFocus = document.activeElement;
        document.body.append(area);
        area.select();
        let copied = false;
        try { copied = document.execCommand("copy"); } catch { /* Manual copy remains available. */ }
        area.remove();
        previousFocus?.focus();
        return copied;
    }

    container.addEventListener("click", async event => {
        const button = event.target.closest(".copy-btn");
        if (!button || button.getAttribute("aria-busy") === "true") return;
        const code = button.closest(".code-panel").querySelector("code");
        // Keep the button focusable while copying, including in the fallback path.
        button.setAttribute("aria-busy", "true");
        const copied = await copyText(code.textContent);
        button.textContent = copied ? "Copied!" : "Copy failed";
        status.textContent = copied ? "Installation command copied." : "Could not copy automatically. Select the installation command and copy it manually.";
        setTimeout(() => { button.textContent = "Copy"; button.removeAttribute("aria-busy"); }, 1800);
    });
    loadRelease();
})();
