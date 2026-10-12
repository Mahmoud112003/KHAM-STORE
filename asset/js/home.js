// 1. استيراد دالة جلب المنتجات من ملف الـ store
import { getProducts } from './store.js';

// 2. تحويل الدالة لـ async علشان تنتظر جلب البيانات من الفايربيز أونلاين
async function renderHomeCollections() {
    let products = [];
    try {
        products = await getProducts();
    } catch (e) {
        console.error("Error reading products from Firebase", e);
    }

    window.khamLoaderState = window.khamLoaderState || { nav: true, footer: true, content: false };
    window.khamLoaderState.content = true;
    window.hideLoaderIfReady?.();

    const sectionsOrder = [
        "Oversized Hoodie Basic",
        "Oversized Hoodie Printed",
        "T-shirt Basic",
        "T-shirt Printed",
        "Sweatpants",
        "Jeans"
    ];

    const container = document.getElementById('homeSections') || document.querySelector('.home-sections');
    if (!container) {
        console.warn("renderHomeCollections: container element '#homeSections' not found.");
        return;
    }

    // تهيئة الـ Grid ومسح الـ Placeholder القديم
    container.className = "home-sections";
    container.innerHTML = "";

    sectionsOrder.forEach(section => {
        const sectionProducts = products.filter(product => {
            return product.section && product.section.toString().trim().toLowerCase() === section.trim().toLowerCase();
        });

        if (sectionProducts.length === 0) return;

        const hasCover = sectionProducts.find(p => p.sectionCover && p.sectionCover.trim() !== "");
        const coverSrc = hasCover ? hasCover.sectionCover : (sectionProducts[0].images ? sectionProducts[0].images[0] : "");

        const collectionCard = document.createElement("a");
        collectionCard.className = "collection-banner-card";
        collectionCard.href = `product.html?section=${encodeURIComponent(section)}`;

        collectionCard.innerHTML = `
            ${coverSrc ? `
                <img src="${coverSrc}" alt="${section}" loading="lazy">
            ` : ''}
            
            <div class="collection-overlay">
                <span class="collection-brand">${window.getText ? window.getText('homeBrand') : 'KHAM BRAND'}</span>
                <h3>
                    ${section}
                </h3>
                <div class="collection-discover">
                    ${window.getText ? window.getText('discoverNow') : 'DISCOVER NOW'} →
                </div>
            </div>
        `;

        container.appendChild(collectionCard);
    });

    if (container.children.length === 0) {
        container.style.display = "block";
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666; width: 100%;">
                <p style="font-size: 18px; font-weight: 600;">${window.getText ? window.getText('homeComingSoon') : 'Coming soon.. KHAM new collections will be launched. Stay tuned!'}</p>
            </div>`;
    }
}

window.renderHomeCollections = renderHomeCollections;

// 3. يفضل استخدام DOMContentLoaded بدلاً من load لتبدأ رندرة الأقسام أسرع فور تحميل الـ DOM
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHomeCollections);
} else {
    renderHomeCollections();
}

window.addEventListener("languagechange", () => {
    if (typeof window.renderHomeCollections === "function") {
        window.renderHomeCollections();
    }
});
