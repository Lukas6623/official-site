
/* =========================================================
   SERVERGUARD NEWS SYSTEM
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

/* FastAPI is populated by the Telegram administration bot. */
const NEWS_API_URL = window.SERVERGUARD_NEWS_API ||
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:8000"
        : "https://api.serverguard.site");
const NEWS_URL = "news/news.json";


/* =========================================================
   LOAD NEWS
========================================================= */

async function loadServerGuardNews() {

    const container =
        document.getElementById("news-list");

    const errorElement =
        document.getElementById("news-error");


    /*
     * Make sure the news container exists.
     */

    if (!container) {

        console.warn(
            "ServerGuard News: #news-list not found."
        );

        return;
    }


    /*
     * Hide previous error.
     */

    if (errorElement) {

        errorElement.hidden = true;
    }


    /*
     * Loading state.
     */

    container.innerHTML = `
        <div class="news-loading">

            <div class="news-loading-spinner"></div>

            <span>
                Loading latest news...
            </span>

        </div>
    `;


    try {

        /*
         * Add timestamp to prevent browser/CDN cache.
         */

        const response = await fetch(
            `${NEWS_API_URL.replace(/\/$/, "")}/api/news?limit=100&t=${Date.now()}`,
            {
                method: "GET",
                headers: { Accept: "application/json" },
                cache: "no-store"
            }
        );


        /*
         * HTTP error.
         */

        if (!response.ok) {

            throw new Error(
                `News request failed: ${response.status}`
            );
        }


        /*
         * Parse JSON.
         */

        const payload = await response.json();
        const news = (Array.isArray(payload) ? payload : payload.posts || [])
            .map(normalizeApiNews);


        /*
         * Validate response.
         */

        /*
         * No news.
         */

        if (news.length === 0) {

            container.innerHTML = `
                <div class="news-empty">

                    <div class="news-empty-icon">
                        📰
                    </div>

                    <h3>
                        No news yet
                    </h3>

                    <p>
                        ServerGuard updates will appear here.
                    </p>

                </div>
            `;

            return;
        }


        /*
         * Sort newest first.
         *
         * The news file can technically be in
         * any order.
         */

        const sortedNews = [...news].sort(
            (a, b) => {

                const dateA =
                    new Date(a.dateISO || a.date || 0);

                const dateB =
                    new Date(b.dateISO || b.date || 0);

                return dateB - dateA;
            }
        );


        /*
         * Generate cards.
         */

        container.innerHTML =
            sortedNews
                .map(createServerGuardNewsCard)
                .join("");


        /*
         * Start reveal animation for newly
         * generated news cards.
         */

        initializeNewsReveal();


        console.log(
            "ServerGuard News loaded:",
            sortedNews
        );


    } catch (error) {

        console.warn("ServerGuard News API unavailable; using local JSON.", error);

        /* Keep the static site usable while the API is being deployed. */
        try {
            const fallbackResponse = await fetch(`${NEWS_URL}?t=${Date.now()}`, {
                cache: "no-store"
            });
            if (!fallbackResponse.ok) throw new Error("Local news request failed");
            const fallbackNews = await fallbackResponse.json();
            if (!Array.isArray(fallbackNews)) throw new Error("Invalid local news format");
            container.innerHTML = fallbackNews
                .sort((a, b) => new Date(b.dateISO || b.date || 0) - new Date(a.dateISO || a.date || 0))
                .map(createServerGuardNewsCard)
                .join("");
            initializeNewsReveal();
            return;
        } catch (fallbackError) {
            console.error("ServerGuard News error:", fallbackError);
        }


        /*
         * Clear loading state.
         */

        container.innerHTML = "";


        /*
         * Show error.
         */

        if (errorElement) {

            errorElement.hidden = false;
        }

    }

}


/* Convert the FastAPI/SQLite shape to the shape used by the existing cards. */
function normalizeApiNews(post) {
    const published = post.published_at || post.created_at || "";
    return {
        id: post.id,
        title: post.title,
        text: post.content ?? post.text ?? "",
        date: published
            ? new Date(published).toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric"
            })
            : "Unknown date",
        dateISO: published,
        category: post.category,
        image: post.image_url || post.image || "",
        link: post.link || ""
    };
}


/* =========================================================
   CREATE NEWS CARD
========================================================= */

function createServerGuardNewsCard(news, index) {

    /*
     * Safe values.
     */

    const title =
        escapeNewsHtml(news.title || "ServerGuard Update");


    const text =
        escapeNewsHtml(news.text || "");


    const date =
        escapeNewsHtml(
            news.date || "Unknown date"
        );


    const category =
        escapeNewsHtml(
            news.category || "ServerGuard News"
        );


    /*
     * Image.
     */

    let imageHtml = "";


    if (news.image) {

        const image =
            escapeNewsHtml(news.image);


        imageHtml = `
            <div class="news-image">

                <img
                    src="${image}"
                    alt="${title}"
                    loading="lazy"
                    onerror="this.parentElement.classList.add('news-image-error')"
                >

                <div class="news-image-overlay"></div>

            </div>
        `;

    }


    /*
     * Optional link.
     */

    let linkHtml = "";


    if (news.link) {

        const link =
            escapeNewsHtml(news.link);


        linkHtml = `
            <a
                href="${link}"
                class="news-read-more"
                target="_blank"
                rel="noopener noreferrer"
            >
                Read more
                <span>↗</span>
            </a>
        `;

    }


    /*
     * Featured news.
     *
     * The first news item can automatically
     * become larger.
     */

    const featuredClass =
        index === 0
            ? "news-card-featured"
            : "";


    return `
        <article
            class="news-card ${featuredClass} reveal"
        >

            ${imageHtml}


            <div class="news-content">

                <div class="news-meta">

                    <span class="news-category">
                        ${category}
                    </span>

                    <span class="news-dot">
                        •
                    </span>

                    <time>
                        ${date}
                    </time>

                </div>


                <h3>
                    ${title}
                </h3>


                <p>
                    ${text}
                </p>


                <div class="news-card-footer">

                    <div class="news-status">

                        <span class="news-status-dot"></span>

                        ServerGuard

                    </div>

                    ${linkHtml}

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeNewsHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NEWS REVEAL ANIMATION
========================================================= */

function initializeNewsReveal() {

    const cards =
        document.querySelectorAll(
            "#news-list .news-card"
        );


    /*
     * If IntersectionObserver isn't available,
     * simply display cards.
     */

    if (!("IntersectionObserver" in window)) {

        cards.forEach((card) => {

            card.classList.add("visible");

        });

        return;
    }


    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "visible"
                        );


                        observer.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.08
            }
        );


    cards.forEach((card) => {

        observer.observe(card);

    });

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadServerGuardNews();

    }
);
