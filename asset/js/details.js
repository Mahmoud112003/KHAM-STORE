// 1. استيراد دالة جلب منتج واحد بالـ ID ودالة الـ Cart من ملف الـ store
import { getProductById, addToCart } from './store.js';

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

const productId = getQueryParam("productId");
let currentProduct = null; // سيتم تعبئته بمجرد وصول البيانات من الفايربيز
let qty = 1;

// سيتم استخدام هذا المتغير لتخزين اسم اللون النشط بدقة من البيانات مباشرة وليس من الـ DOM
let selectedColorName = "Standard"; 

function showToast(message) {
    const existingToast = document.querySelector(".kham-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = "kham-toast";
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fa-solid fa-circle-check"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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

    // معالجة الصور المتعددة والـ Thumbnails
    const mainImg = document.getElementById("mainImage");
    const thumbsContainer = document.getElementById("thumbs");

    const productImages = currentProduct.images || [];
    if (productImages.length === 0 && currentProduct.image) {
        productImages.push(currentProduct.image);
    }
    if (productImages.length === 0) {
        productImages.push("asset/images/placeholder.png");
    }

    if (mainImg) mainImg.src = productImages[0];

    if (thumbsContainer) {
        thumbsContainer.innerHTML = "";
        if (productImages.length > 1) {
            productImages.forEach((imgSrc, index) => {
                const thumb = document.createElement("img");
                thumb.src = imgSrc;
                thumb.className = "thumb-img" + (index === 0 ? " active" : "");
                thumb.onclick = () => {
                    if (mainImg) mainImg.src = imgSrc;
                    document.querySelectorAll(".thumb-img").forEach(t => t.classList.remove("active"));
                    thumb.classList.add("active");
                };
                thumbsContainer.appendChild(thumb);
            });
        }
    }

    // عرض الألوان
    const colorDotsContainer = document.getElementById("colorDots");
    const currentColorLabel = document.getElementById("currentColor");

    if (colorDotsContainer) {
        colorDotsContainer.innerHTML = "";
        const productColors = currentProduct.colors || [];

        if (productColors.length === 0) {
            selectedColorName = "Standard";
            if (currentColorLabel) currentColorLabel.innerText = "Color: Standard";
        } else {
            productColors.forEach((color, index) => {
                const dot = document.createElement("div");
                dot.className = "color-dot";

                const colorCode = typeof color === "object" ? color.code : color;
                const colorName = typeof color === "object" ? color.name : color;

                dot.style.backgroundColor = colorCode;
                dot.style.width = "25px";
                dot.style.height = "25px";
                dot.style.borderRadius = "50%";
                dot.style.display = "inline-block";
                dot.style.marginRight = "10px";
                dot.style.cursor = "pointer";
                dot.style.border = "2px solid #ccc";

                if (index === 0) {
                    dot.classList.add("active");
                    dot.style.borderColor = "#000";
                    selectedColorName = colorName || 'Default';
                    if (currentColorLabel) currentColorLabel.innerText = `Color: ${selectedColorName}`;
                }

                dot.onclick = () => {
                    document.querySelectorAll(".color-dot").forEach(d => {
                        d.classList.remove("active");
                        d.style.borderColor = "#ccc";
                    });
                    dot.classList.add("active");
                    dot.style.borderColor = "#000";
                    selectedColorName = colorName || 'Default';
                    if (currentColorLabel) currentColorLabel.innerText = `Color: ${selectedColorName}`;
                };

                colorDotsContainer.appendChild(dot);
            });
        }
    }

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
    showToast("Added to cart successfully!");
    
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