const revealSelector = [
    ".home-sections .collection-banner-card",
    ".collection-banner-card img",
    ".products-catalog > h2",
    ".products-grid .product-card",
    ".product-accordion",
    ".product-details-container > *",
    ".cart-header",
    ".cart-item",
    ".empty-cart",
    ".checkout-form-section",
    ".order-summary-section",
    ".returns-card",
    ".login-card",
    ".dashboard-header",
    "#productForm",
    ".announcement-settings",
    ".products-header",
    ".table-scroll"
].join(",");

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -30px 0px", threshold: 0.12 });

    const markRevealTargets = root => {
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (root.matches(revealSelector)) observeTarget(root);
        root.querySelectorAll(revealSelector).forEach(observeTarget);
    };

    const observeTarget = element => {
        if (element.classList.contains("motion-reveal")) return;
        const index = Array.from(element.parentElement?.children || []).indexOf(element);
        element.style.setProperty("--reveal-order", String(Math.max(0, index % 6)));
        element.classList.add("motion-reveal");

        if (element.matches("img")) {
            element.classList.add("motion-image");
        } else if (element.matches(".collection-banner-card, .product-card")) {
            element.classList.add("motion-rise");
        } else if (element.matches(".product-details-container > *, .products-catalog > h2, .announcement-settings, #productForm")) {
            element.classList.add("motion-fade");
        }

        observer.observe(element);
    };

    markRevealTargets(document.body);
    document.documentElement.classList.add("motion-enabled");

    const mutationObserver = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(markRevealTargets));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}
