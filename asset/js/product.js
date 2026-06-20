let allProducts = [];

function loadProducts() {
    if (typeof getProducts === "function") {
        allProducts = getProducts();
    }
    applyFilters();
    setupEventListeners();
}

function renderProducts(products) {
    const grid = document.getElementById("mainGrid");
    const countEl = document.getElementById("productCount");

    if (!grid) return;
    grid.innerHTML = "";

    if (countEl) countEl.innerText = `${products.length} products`;

    if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">No products found.</div>`;
        return;
    }

    products.forEach(p => {
        const image = p.images?.[0] || "asset/images/placeholder.png";
        const priceValue = parseFloat(p.price) || 0;

        const card = document.createElement("div");
        card.className = "product-card";
        card.style.cursor = "pointer";
        card.innerHTML = `
            <div class="product-img-wrapper">
        <img src="${image}" alt="${p.name || 'Product'}" loading="lazy">       
         ${p.status === "out-of-stock" ? `<span class="sold-out-badge">sold out</span>` : ""}
            </div>
            <div class="product-details">
                <h3>${p.name || "KHAM Piece"}</h3>
                <p>LE ${priceValue.toFixed(2)} EGP</p>
            </div>
        `;
        card.onclick = () => window.location.href = `details.html?productId=${p.id}`;
        grid.appendChild(card);
    });
}

// تربط أحداث الفلترة والترتيب
function setupEventListeners() {
    const sortOptions = document.querySelectorAll(".sort-option");
    sortOptions.forEach(option => {
        option.addEventListener("click", function () {
            sortOptions.forEach(opt => opt.classList.remove("active"));
            this.classList.add("active");

            const currentSortText = document.getElementById("currentSort");
            if (currentSortText) {
                currentSortText.innerHTML = `${this.innerText} <i class="fa-solid fa-chevron-down"></i>`;
            }
            applyFilters();
        });
    });

    // 2. الفلاتر (Checkboxes)
    document.querySelectorAll(".filter-check").forEach(check => {
        check.addEventListener("change", applyFilters);
    });

    // 3. التحكم في الـ Dropdowns
    document.querySelectorAll(".dropdown-trigger").forEach(trigger => {
        trigger.onclick = (e) => {
            e.stopPropagation();
            const content = trigger.nextElementSibling;
            if (content && content.classList.contains('dropdown-content')) {
                content.classList.toggle("open");
            }
        };
    });

    document.onclick = () => {
        document.querySelectorAll(".dropdown-content").forEach(d => d.classList.remove("open"));
    };
}

// التحكم بالفلاتر والترتيب والربط مع الهوم
function applyFilters() {
    let filtered = [...allProducts];

    // ربط الهوم: الفلترة بناءً علة الأقسام
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');

    if (sectionParam) {
        filtered = filtered.filter(p =>
            p.section && p.section.trim().toLowerCase() === sectionParam.trim().toLowerCase()
        );

        // تغيير عنوان الكتالوج تلقائياً
        const catalogTitle = document.querySelector(".catalog-main-title");
        if (catalogTitle) {
            catalogTitle.innerText = `${sectionParam.charAt(0).toUpperCase() + sectionParam.slice(1)} Collection`;
        }
    }

    // فلتر التوفر
    const inStock = document.querySelector(".filter-check[value='in-stock']")?.checked;
    const outStock = document.querySelector(".filter-check[value='out-of-stock']")?.checked;

    if (inStock && !outStock) filtered = filtered.filter(p => p.status === "in-stock");
    else if (outStock && !inStock) filtered = filtered.filter(p => p.status === "out-of-stock");

    // منطق السعر والترتيب
    const activeSortBtn = document.querySelector(".sort-option.active");
    const sortType = activeSortBtn ? activeSortBtn.getAttribute("data-sort") : "az";

    if (sortType === "price-low") {
        filtered.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    } else if (sortType === "price-high") {
        filtered.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
    } else {
        filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    renderProducts(filtered);
}

document.addEventListener("DOMContentLoaded", loadProducts);