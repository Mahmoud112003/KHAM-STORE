// 1. استيراد دالة جلب منتج واحد بالـ ID ودالة الـ Cart من ملف الـ store
import { getProductById, addToCart, showToast } from './store.js';
import { trackViewContent, trackAddToCart } from './analytics.js';

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

const productId = getQueryParam("productId");
let currentProduct = null; // سيتم تعبئته بمجرد وصول البيانات من الفايربيز
let qty = 1;

// سيتم استخدام هذا المتغير لتخزين اسم اللون النشط بدقة من البيانات مباشرة وليس من الـ DOM
let selectedColorName = "Standard";
const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const COLOR_CODE_MAP = {
    black: "#000000", white: "#ffffff", navy: "#001f3f", grey: "#9e9e9e", gray: "#9e9e9e",
    red: "#f44336", blue: "#2196f3", green: "#4caf50", yellow: "#ffeb3b", beige: "#f5f5dc"
};

function isSupportedGalleryImage(source) {
    return typeof source === "string" && (
        /^data:image\/[a-z0-9.+-]+;base64,/i.test(source) ||
        /^https?:\/\//i.test(source) ||
        /^(?:\.\/|\/)?asset\/[a-z0-9_./-]+$/i.test(source)
    );
}

function getLegacyProductImages() {
    const images = Array.isArray(currentProduct?.images)
        ? currentProduct.images.filter(isSupportedGalleryImage)
        : [];

    if (images.length === 0 && isSupportedGalleryImage(currentProduct?.image)) {
        images.push(currentProduct.image);
    }

    return images.length > 0 ? images : ["asset/images/placeholder.png"];
}

function normalizeProductColors(colors) {
    if (!Array.isArray(colors)) return [];

    return colors.map(color => {
        const name = typeof color === "string" ? color.trim() : String(color?.name || "").trim();
        if (!name) return null;

        const rawCode = typeof color === "string" && COLOR_HEX_PATTERN.test(color)
            ? color
            : color?.code || color?.value;
        const code = COLOR_HEX_PATTERN.test(rawCode || "")
            ? rawCode
            : COLOR_CODE_MAP[name.toLowerCase()];
        if (!code) return null;

        return {
            name,
            code,
            images: Array.isArray(color?.images) ? color.images.filter(isSupportedGalleryImage) : []
        };
    }).filter(Boolean);
}

function renderProductGallery(images) {
    const mainImg = document.getElementById("mainImage");
    const thumbsContainer = document.getElementById("thumbs");
    const galleryImages = Array.isArray(images) ? images.filter(isSupportedGalleryImage) : [];

    if (mainImg) mainImg.src = galleryImages[0] || "";
    if (!thumbsContainer) return;

    thumbsContainer.innerHTML = "";
    if (galleryImages.length <= 1) return;

    galleryImages.forEach((imageSource, index) => {
        const thumb = document.createElement("img");
        thumb.src = imageSource;
        thumb.alt = `${currentProduct.name || "Product"} image ${index + 1}`;
        thumb.className = "thumb-img" + (index === 0 ? " active" : "");
        thumb.addEventListener("click", () => {
            if (mainImg) mainImg.src = imageSource;
            thumbsContainer.querySelectorAll(".thumb-img").forEach(item => item.classList.remove("active"));
            thumb.classList.add("active");
        });
        thumbsContainer.appendChild(thumb);
    });
}

function renderColorOptions() {
    const colorOptions = document.getElementById("colorOptions");
    const colorDotsContainer = document.getElementById("colorDots");
    const currentColorLabel = document.getElementById("currentColor");
    const colors = normalizeProductColors(currentProduct.colors);

    if (!colorOptions || !colorDotsContainer) {
        selectedColorName = "Standard";
        renderProductGallery(getLegacyProductImages());
        return;
    }

    colorDotsContainer.innerHTML = "";
    if (colors.length === 0) {
        colorOptions.hidden = true;
        selectedColorName = "Standard";
        renderProductGallery(getLegacyProductImages());
        return;
    }

    colorOptions.hidden = false;
    colors.forEach((color, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "color-option";
        button.setAttribute("aria-label", color.name);
        button.setAttribute("aria-pressed", "false");
        button.title = color.name;

        const swatch = document.createElement("span");
        swatch.className = "color-option-swatch";
        swatch.style.backgroundColor = color.code;
        swatch.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = color.name;
        button.append(swatch, label);

        button.addEventListener("click", () => {
            colorDotsContainer.querySelectorAll(".color-option").forEach(option => {
                option.classList.remove("active");
                option.setAttribute("aria-pressed", "false");
            });
            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");
            selectedColorName = color.name;
            if (currentColorLabel) currentColorLabel.textContent = `Color: ${color.name}`;
            renderProductGallery(color.images.length > 0 ? color.images : getLegacyProductImages());
        });

        colorDotsContainer.appendChild(button);
        if (index === 0) button.click();
    });
}

// 2. دالة التهيئة الأساسية تحولت إلى async لتنتظر الفايربيز
async function initDetailsPage() {
    if (!productId) {
        console.error("No product ID provided in URL.");
        return;
    }

    // جلب بيانات المنتج من الفايربيز مباشرة وانتظارها
    currentProduct = await getProductById(productId);

    // حماية الصفحة وتوفير بيانات افتراضية إذا لم يعثر على المنتج
    if (!currentProduct) {
        console.warn("Product not found in Firebase database!");
        currentProduct = {
            id: productId,
            name: "KHAM Piece",
            price: 0,
            status: "in-stock",
            images: ["asset/images/placeholder.png"],
            colors: [],
            sizes: ["S", "M", "L", "XL", "XXL"],
            description: "No description available.",
            sizeGuide: ""
        };
    }

    // رندرة وتوزيع البيانات على الـ DOM بعد التأكد من وصولها
    renderProductData();
}

// دالة توزيع البيانات والرندرة
function renderProductData() {
    const titleEl = document.getElementById("productTitle");
    const priceEl = document.getElementById("productPrice");
    const descEl = document.getElementById("productDesc");

    if (titleEl) titleEl.innerText = currentProduct.name;
    if (priceEl) priceEl.innerText = `${currentProduct.price} EGP`;
    if (descEl) descEl.innerText = currentProduct.description || "No description available.";

    trackViewContent(currentProduct);

    renderColorOptions();

    // عرض المقاسات
    const sizeSelector = document.getElementById("sizeSelector");
    if (sizeSelector) {
        sizeSelector.innerHTML = "";
        const productSizes = currentProduct.sizes || ["S", "M", "L", "XL", "XXL"];
        productSizes.forEach((size, index) => {
            const btn = document.createElement("button");
            btn.className = "size-btn" + (index === 0 ? " active" : "");
            btn.innerText = size;
            btn.onclick = () => {
                document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            };
            sizeSelector.appendChild(btn);
        });
    }

    // تفعيل الـ Size Guide
    const sizeGuideBtn = document.getElementById("sizeGuideBtn");
    const sizeGuideBox = document.getElementById("sizeGuideBox");
    const sizeGuideImage = document.getElementById("sizeGuideImage");

    if (sizeGuideBtn && sizeGuideBox) {
        const guideSrc = currentProduct.sizeGuide || currentProduct.sizeGuideImg;

        if (guideSrc) {
            if (sizeGuideImage) sizeGuideImage.src = guideSrc;

            sizeGuideBtn.onclick = (e) => {
                e.stopPropagation();
                sizeGuideBox.style.display = sizeGuideBox.style.display === "block" ? "none" : "block";
            };
        } else {
            sizeGuideBtn.style.display = "none";
        }
    }

    // معالجة حالة نفاد الكمية (Sold Out) وتحديث الأزرار
    if (currentProduct.status === "out-of-stock") {
        const addToCartBtn = document.getElementById("addToCartBtn") || document.querySelector(".add-to-cart-btn");
        const buyNowBtn = document.getElementById("buyNowBtn") || document.querySelector(".buy-now-btn");
        if (addToCartBtn) {
            addToCartBtn.innerText = "SOLD OUT";
            addToCartBtn.disabled = true;
            addToCartBtn.style.opacity = "0.5";
        }
        if (buyNowBtn) {
            buyNowBtn.disabled = true;
            buyNowBtn.style.opacity = "0.5";
        }
    }
}

// إغلاق بوكس المقاسات عند الضغط في أي مكان بالخارج
document.addEventListener("click", () => {
    const sizeGuideBox = document.getElementById("sizeGuideBox");
    if (sizeGuideBox) sizeGuideBox.style.display = "none";
});

// ============ التحكم بالكمية ============
if (document.getElementById("plusBtn")) {
    document.getElementById("plusBtn").onclick = () => {
        qty++;
        document.getElementById("qty").innerText = qty;
    };
}

if (document.getElementById("minusBtn")) {
    document.getElementById("minusBtn").onclick = () => {
        if (qty > 1) {
            qty--;
            document.getElementById("qty").innerText = qty;
        }
    };
}

// ============ إضافة للسلة ============
function addToCartFromDetails() {
    if (!currentProduct || currentProduct.status === "out-of-stock") {
        showToast("This product is sold out!");
        return;
    }

    const activeSize = document.querySelector(".size-btn.active");
    if (!activeSize) {
        showToast("Please select a size first!");
        return;
    }

    const cartItem = {
        id: `${currentProduct.id}-${activeSize.innerText}-${selectedColorName}`,
        productId: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: document.getElementById("mainImage")?.src || "asset/images/placeholder.png",
        size: activeSize.innerText,
        color: selectedColorName,
        qty: qty
    };

    addToCart(cartItem);
    trackAddToCart({
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        color: selectedColorName,
        size: activeSize.innerText
    }, qty);

    showToast(window.getText ? window.getText('addedToCart') : 'Added to cart successfully!');
    // إعادة ضبط العداد بعد نجاح الإضافة
    qty = 1;
    const qtyEl = document.getElementById("qty");
    if (qtyEl) qtyEl.innerText = qty;
}

// تصدير الدالة لربطها بحدث الـ onclick للـ HTML إذا لزم الأمر
window.addToCartFromDetails = addToCartFromDetails;

// ============ الشراء الفوري (Buy Now) والتنصت للأحداث ============

document.addEventListener("DOMContentLoaded", () => {
    const addToCartBtn = document.getElementById("addToCartBtn");
    if (addToCartBtn) {
        addToCartBtn.addEventListener("click", addToCartFromDetails);
    }

    const buyNowBtn = document.getElementById("buyNowBtn") || document.querySelector(".buy-now-btn");
    if (buyNowBtn) {
        buyNowBtn.addEventListener("click", () => {
            if (!currentProduct || currentProduct.status === "out-of-stock") {
                showToast(window.getText ? window.getText('soldOutMessage') : 'This product is sold out!');
                return;
            }

            const activeSize = document.querySelector(".size-btn.active");
            if (!activeSize) {
                showToast(window.getText ? window.getText('selectSizeFirst') : 'Please select a size first!');
                return;
            }

            const cartItem = {
                id: `${currentProduct.id}-${activeSize.innerText}-${selectedColorName}`,
                productId: currentProduct.id,
                name: currentProduct.name,
                price: currentProduct.price,
                image: document.getElementById("mainImage")?.src || "asset/images/placeholder.png",
                size: activeSize.innerText,
                color: selectedColorName,
                qty: qty
            };

            addToCart(cartItem);
            window.location.href = "checkout.html";
        });
    }
});

// تشغيل دالة التهيئة الأساسية عند تحميل الـ DOM لانتظار الفايربيز
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDetailsPage);
} else {
    initDetailsPage();
}