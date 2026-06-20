function renderHomeCollections() {
    let products = [];
    try {
        const rawProducts = localStorage.getItem("products");
        products = rawProducts ? JSON.parse(rawProducts) : [];
    } catch (e) {
        console.error("Error reading products", e);
    }

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

    // إضافة الكلاس الجديد بدلاً من كتابة الستايل الثابت هنا يدوياً
    container.className = "home-sections";
    container.innerHTML = ""; // مسح أي محتوى قديم لتهيئة الـ Grid

    sectionsOrder.forEach(section => {
        const sectionProducts = products.filter(product => {
            return product.section && product.section.toString().trim().toLowerCase() === section.trim().toLowerCase();
        });

        if (sectionProducts.length === 0) return;

        const hasCover = sectionProducts.find(p => p.sectionCover && p.sectionCover.trim() !== "");
        const coverSrc = hasCover ? hasCover.sectionCover : (sectionProducts[0].images ? sectionProducts[0].images[0] : "");

        const collectionCard = document.createElement("div");
        collectionCard.className = "collection-banner-card";

        collectionCard.style.position = "relative";
        collectionCard.style.height = "420px";
        collectionCard.style.borderRadius = "16px";
        collectionCard.style.overflow = "hidden";
        collectionCard.style.cursor = "pointer";
        collectionCard.style.backgroundColor = "#111";
        collectionCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
        collectionCard.style.transition = "transform 0.3s ease, box-shadow 0.3s ease";

        collectionCard.addEventListener("mouseenter", () => {
            collectionCard.style.transform = "translateY(-8px)";
            collectionCard.style.boxShadow = "0 15px 35px rgba(0,0,0,0.15)";
            if (collectionCard.querySelector('img')) {
                collectionCard.querySelector('img').style.transform = "scale(1.04)";
            }
        });
        collectionCard.addEventListener("mouseleave", () => {
            collectionCard.style.transform = "translateY(0)";
            collectionCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
            if (collectionCard.querySelector('img')) {
                collectionCard.querySelector('img').style.transform = "scale(1)";
            }
        });

        collectionCard.addEventListener("click", () => {
            window.location.href = `product.html?section=${encodeURIComponent(section)}`;
        });

        collectionCard.innerHTML = `
            ${coverSrc ? `
                <img src="${coverSrc}" alt="${section}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s ease;">
            ` : ''}
            
            <div class="collection-overlay" style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 25px;">
                <span style="color: #a1a1a1; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; font-weight: 500; margin-bottom: 4px;">KHAM BRAND</span>
                <h3 style="color: #fff; margin: 0 0 12px 0; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${section}
                </h3>
                <div style="display: inline-flex; align-items: center; color: #fff; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #fff; width: max-content; padding-bottom: 2px;">
                    DISCOVER NOW →
                </div>
            </div>
        `;

        container.appendChild(collectionCard);
    });

    if (container.children.length === 0) {
        container.style.display = "block";
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666; width: 100%;">
                <p style="font-size: 18px; font-weight: 600;">Coming soon.. KHAM new collections will be launched. Stay tuned!</p>
            </div>`;
    }
}

window.addEventListener("load", renderHomeCollections);