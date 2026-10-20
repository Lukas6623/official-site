/* Platform selection is independent of the Windows release manifest. */
(() => {
    "use strict";
    const dialog = document.getElementById("downloadDialog");
    if (!dialog) return;
    let trigger;
    const close = () => dialog.close();
    document.querySelectorAll("[data-download-dialog]").forEach(button => {
        button.addEventListener("click", () => {
            trigger = button;
            const mobileNav = document.getElementById("mobileNav");
            const navToggle = document.getElementById("navToggle");
            if (mobileNav?.classList.contains("open")) navToggle.click();
            dialog.showModal();
            document.documentElement.classList.add("download-dialog-open");
            dialog.querySelector("[data-dialog-close]").focus();
        });
    });
    dialog.querySelector("[data-dialog-close]").addEventListener("click", close);
    let backdropPress = false;
    const outside = event => {
        const rect = dialog.getBoundingClientRect();
        return event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener("pointerdown", event => { backdropPress = outside(event); });
    dialog.addEventListener("click", event => {
        if (event.target === dialog && backdropPress && outside(event)) close();
        if (event.target.closest('[aria-disabled="true"]')) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
        document.documentElement.classList.remove("download-dialog-open");
        // A mobile menu trigger is hidden after its menu closes.
        if (trigger?.getClientRects().length) trigger.focus();
        else document.getElementById("navToggle")?.focus();
    });
})();
